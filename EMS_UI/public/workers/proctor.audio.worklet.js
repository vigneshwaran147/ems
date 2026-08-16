/**
 * Sound-event proctoring engine.
 *
 * WHAT THIS REPLACES, AND WHY
 * ---------------------------
 * The previous noise monitor asked one question ten times a second: "is the
 * current RMS above a threshold?" Two things were wrong with that.
 *
 * First, it could not hear. `getByteTimeDomainData` returns the analyser's
 * CURRENT window — 1024 samples, ~21ms — not a summary of the time since the
 * last read. Polling it every 100ms therefore inspected 21ms out of every 100ms
 * and discarded 79% of the audio outright. A whisper, a single spoken word, a
 * phone buzzing on the desk: all of them fit comfortably in the gap between two
 * polls. An AudioWorklet runs on the audio render thread and is handed every
 * 128-sample quantum, so nothing can fall between samples any more. That is the
 * whole reason this moved out of the main thread — not performance.
 *
 * Second, loudness alone cannot answer "what was that?". A fan, a cough, a
 * dropped pen and someone whispering an answer are four completely different
 * events to an invigilator and one identical number to an RMS threshold. So
 * this engine segments the audio into discrete SOUND EVENTS and classifies each
 * one, instead of sampling a level and comparing it to a line.
 *
 * HOW IT WORKS
 * ------------
 *   1. Every 256 samples (~5ms) a 1024-sample frame is analysed: level in dBFS,
 *      spectral flux, flatness, centroid, voice-band energy share, and — when
 *      there is enough energy to bother — pitch and harmonicity from a
 *      decimated autocorrelation.
 *   2. The room's noise floor is tracked continuously by an asymmetric follower
 *      that drops fast and rises slowly, and is frozen entirely while an event
 *      is open. A one-shot calibration at exam start could be poisoned by a
 *      candidate who happened to begin mid-conversation; a floor that keeps
 *      learning but refuses to learn from the sounds it is judging cannot be.
 *   3. An event opens when the level rises clearly above that floor, or when the
 *      spectrum changes sharply at a more modest level rise — the second path is
 *      what catches quiet speech that never gets loud enough for the first.
 *      It closes after a hangover of quiet, and the accumulated frames are
 *      classified as HUMAN_VOICE / IMPULSE / SUSTAINED_NOISE / UNKNOWN_SOUND.
 *
 * Nothing is suppressed. Every event that opens is reported, including the ones
 * classified UNKNOWN_SOUND — deciding which of them deserves a strike is a
 * policy question, and policy lives on the main thread, not here.
 *
 * Globals used below (`sampleRate`, `currentTime`, `AudioWorkletProcessor`,
 * `registerProcessor`) are supplied by AudioWorkletGlobalScope.
 */

/* --- Analysis geometry ---------------------------------------------------- */

/** ~21ms at 48kHz. Long enough for a usable spectrum, short enough to localise. */
const FRAME_SIZE = 1024

/**
 * ~5ms at 48kHz.
 *
 * The hop, not the frame, sets how precisely an onset can be placed in time,
 * which is what separates a keystroke from the start of a word.
 */
const HOP_SIZE = 256

/**
 * Pitch needs a longer view than the spectrum does.
 *
 * A 70Hz male voice has a 14ms period, and estimating a period reliably wants
 * several of them. Decimated to ~12kHz, 2048 samples leave enough overlap at
 * the longest lag for the correlation to mean something; 1024 would not.
 */
const PITCH_WINDOW = 2048

/** Must exceed PITCH_WINDOW; power of two so the write index can mask. */
const HISTORY_SIZE = 4096

/* --- Event segmentation --------------------------------------------------- */

/**
 * How far above the learned floor opens an event, in dB.
 *
 * 8dB is roughly "clearly audible over the room" — a doubling of loudness and
 * then some. Below this the room's own variation would open events constantly.
 */
const ONSET_DB = 8

/**
 * The level path is not the only way in.
 *
 * Speech at conversational volume across a room can sit only a few dB over a
 * fan, and would never clear ONSET_DB — but it is spectrally nothing like the
 * fan, and the flux spikes hard when it starts. Requiring a modest level rise
 * AND an unusual flux catches it without opening an event every time the floor
 * wobbles.
 */
const SOFT_ONSET_DB = 3
const FLUX_ONSET_RATIO = 4

/** Hysteresis: an open event stays open until the level falls back to this. */
const RELEASE_DB = 4

/**
 * Nothing quieter than this can open an event, whatever the floor says.
 *
 * In a genuinely silent room the tracked floor approaches the quantisation
 * noise, and a pure "rise above ambient" rule would then fire permanently on
 * dither — the loudest possible false positive rate, for the quietest
 * candidates. This is the same failure the old absolute floor guarded against,
 * expressed in dB.
 */
const ABSOLUTE_FLOOR_DB = -62

/** Consecutive frames above the open threshold before an event starts. */
const OPEN_FRAMES = 2

/** Quiet frames tolerated inside an event before it closes. */
const HANGOVER_MS = 350

/** Shorter than this is a click in the signal path, not a sound in the room. */
const MIN_EVENT_MS = 40

/**
 * A drone never goes quiet, so it would otherwise never close and never be
 * reported. At this age the event is emitted and immediately reopened, which
 * turns "a television has been on for an hour" into recurring evidence rather
 * than one event that never ends.
 */
const MAX_EVENT_MS = 15000

/* --- Noise-floor follower ------------------------------------------------- */

/**
 * Asymmetric by design: adopt quiet quickly, adopt loud reluctantly.
 *
 * ~50ms down means the floor settles almost immediately when a room falls
 * silent. ~30s up means a sustained noise is treated as an event for a long
 * time before it is ever accepted as this room's new normal.
 */
const FLOOR_FALL_COEFF = 0.1
const FLOOR_RISE_COEFF = 0.0002

/** Same follower shape for the flux baseline the soft-onset path compares to. */
const FLUX_FALL_COEFF = 0.05
const FLUX_RISE_COEFF = 0.002

/* --- Voicing -------------------------------------------------------------- */

const VOICE_MIN_HZ = 70
const VOICE_MAX_HZ = 400
/** Normalised autocorrelation peak above which a frame is periodic enough to be voiced. */
const HARMONICITY_MIN = 0.42
/** Telephone band, near enough. Where speech energy actually is. */
const VOICE_BAND_LO_HZ = 200
const VOICE_BAND_HI_HZ = 3600
const VOICE_BAND_RATIO_MIN = 0.45

/** Frames voiced / frames total, above which the whole event is called speech. */
const VOICED_RATIO_MIN = 0.3
/** Speech needs to last; a single voiced frame is a creak with a resonance. */
const VOICE_MIN_MS = 180

/* --- Classification boundaries -------------------------------------------- */

const IMPULSE_MAX_MS = 250
const IMPULSE_MAX_ATTACK_MS = 40
const SUSTAINED_MIN_MS = 1800

/* --- Reporting ------------------------------------------------------------ */

/** How often the live meter is posted to the main thread. */
const LEVEL_POST_INTERVAL_MS = 250

/** Below this a frame is digital silence, not a quiet room. */
const SILENCE_EPSILON = 1e-5
/** ~8s of unbroken digital silence means no audio is arriving at all. */
const SILENT_INPUT_MS = 8000

const DB_FLOOR = -120

const toDb = (amplitude) => (amplitude <= 0 ? DB_FLOOR : Math.max(DB_FLOOR, 20 * Math.log10(amplitude)))

/**
 * Iterative in-place radix-2 complex FFT.
 *
 * Bundled rather than imported because an AudioWorklet module cannot reach the
 * app's module graph, and the transform is small enough that a dependency would
 * cost more than it saves.
 */
class Fft {
  constructor(size) {
    this.size = size
    this.levels = Math.log2(size) | 0
    this.cos = new Float32Array(size / 2)
    this.sin = new Float32Array(size / 2)
    for (let i = 0; i < size / 2; i += 1) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / size)
      this.sin[i] = Math.sin((2 * Math.PI * i) / size)
    }
    this.reverse = new Uint16Array(size)
    for (let i = 0; i < size; i += 1) {
      let r = 0
      for (let bit = 0; bit < this.levels; bit += 1) {
        r = (r << 1) | ((i >>> bit) & 1)
      }
      this.reverse[i] = r
    }
  }

  transform(real, imag) {
    const n = this.size

    for (let i = 0; i < n; i += 1) {
      const j = this.reverse[i]
      if (j > i) {
        let swap = real[i]
        real[i] = real[j]
        real[j] = swap
        swap = imag[i]
        imag[i] = imag[j]
        imag[j] = swap
      }
    }

    for (let span = 2; span <= n; span *= 2) {
      const half = span / 2
      const step = n / span
      for (let base = 0; base < n; base += span) {
        for (let j = base, k = 0; j < base + half; j += 1, k += step) {
          const partner = j + half
          const tre = real[partner] * this.cos[k] + imag[partner] * this.sin[k]
          const tim = -real[partner] * this.sin[k] + imag[partner] * this.cos[k]
          real[partner] = real[j] - tre
          imag[partner] = imag[j] - tim
          real[j] += tre
          imag[j] += tim
        }
      }
    }
  }
}

class SoundEventProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()

    const config = options?.processorOptions || {}

    this.onsetDb = Number.isFinite(config.onsetDb) ? config.onsetDb : ONSET_DB
    this.absoluteFloorDb = Number.isFinite(config.absoluteFloorDb) ? config.absoluteFloorDb : ABSOLUTE_FLOOR_DB
    this.minEventMs = Number.isFinite(config.minEventMs) ? config.minEventMs : MIN_EVENT_MS

    this.history = new Float32Array(HISTORY_SIZE)
    this.historyWrite = 0
    /** Samples accumulated since the last analysed frame; triggers at HOP_SIZE. */
    this.sinceHop = 0
    /** False until HISTORY has been filled once, so startup cannot analyse zeros. */
    this.primed = false
    this.samplesSeen = 0

    this.fft = new Fft(FRAME_SIZE)
    this.real = new Float32Array(FRAME_SIZE)
    this.imag = new Float32Array(FRAME_SIZE)
    this.magnitude = new Float32Array(FRAME_SIZE / 2)
    this.previousMagnitude = new Float32Array(FRAME_SIZE / 2)
    this.frameBuffer = new Float32Array(FRAME_SIZE)
    this.pitchBuffer = new Float32Array(PITCH_WINDOW)

    this.window = new Float32Array(FRAME_SIZE)
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1))
    }

    this.hzPerBin = sampleRate / FRAME_SIZE
    this.frameIntervalMs = (HOP_SIZE / sampleRate) * 1000

    // Decimate to roughly 12kHz for the pitch estimate. Speech f0 lives two
    // orders of magnitude below that, so the lost top end costs nothing, and
    // the correlation gets 4x cheaper.
    this.pitchDecimation = Math.max(1, Math.round(sampleRate / 12000))
    this.pitchRate = sampleRate / this.pitchDecimation
    this.decimated = new Float32Array(Math.floor(PITCH_WINDOW / this.pitchDecimation))
    this.minLag = Math.floor(this.pitchRate / VOICE_MAX_HZ)
    this.maxLag = Math.min(Math.floor(this.pitchRate / VOICE_MIN_HZ), this.decimated.length - 64)

    this.voiceBandLoBin = Math.max(1, Math.floor(VOICE_BAND_LO_HZ / this.hzPerBin))
    this.voiceBandHiBin = Math.min(this.magnitude.length - 1, Math.ceil(VOICE_BAND_HI_HZ / this.hzPerBin))

    /** null until the first frame seeds it; see the follower in analyseFrame. */
    this.floorDb = null
    this.fluxBaseline = null

    this.event = null
    this.openCandidateFrames = 0
    this.lastLevelPostAt = 0
    this.silentMs = 0
    this.silentReported = false
    this.running = true

    this.port.onmessage = (message) => {
      if (message?.data?.type === 'DISPOSE') {
        this.running = false
      }
    }
  }

  /** Copies the most recent `count` samples out of the ring, oldest first. */
  readHistory(target, count) {
    const start = (this.historyWrite - count + HISTORY_SIZE) % HISTORY_SIZE
    const firstRun = Math.min(count, HISTORY_SIZE - start)
    target.set(this.history.subarray(start, start + firstRun), 0)
    if (firstRun < count) {
      target.set(this.history.subarray(0, count - firstRun), firstRun)
    }
  }

  process(inputs) {
    if (!this.running) {
      return false
    }

    const channel = inputs[0]?.[0]
    if (!channel || channel.length === 0) {
      // No input connected yet. Keep the node alive; the graph may still be
      // being wired, and returning false here would kill it permanently.
      return true
    }

    for (let i = 0; i < channel.length; i += 1) {
      this.history[this.historyWrite] = channel[i]
      this.historyWrite = (this.historyWrite + 1) % HISTORY_SIZE
    }

    this.samplesSeen += channel.length
    if (!this.primed && this.samplesSeen >= HISTORY_SIZE) {
      this.primed = true
    }

    this.sinceHop += channel.length
    while (this.sinceHop >= HOP_SIZE) {
      this.sinceHop -= HOP_SIZE
      if (this.primed) {
        this.analyseFrame()
      }
    }

    return true
  }

  analyseFrame() {
    this.readHistory(this.frameBuffer, FRAME_SIZE)

    let sumSquares = 0
    let peak = 0
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      const sample = this.frameBuffer[i]
      sumSquares += sample * sample
      const magnitude = Math.abs(sample)
      if (magnitude > peak) {
        peak = magnitude
      }
    }
    const rms = Math.sqrt(sumSquares / FRAME_SIZE)
    const db = toDb(rms)

    this.trackSilence(peak)

    // Windowed copy into the FFT input; the raw frame is kept for pitch, which
    // wants the untapered signal.
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      this.real[i] = this.frameBuffer[i] * this.window[i]
      this.imag[i] = 0
    }
    this.fft.transform(this.real, this.imag)

    const binCount = this.magnitude.length
    let totalEnergy = 0
    let voiceEnergy = 0
    let centroidNumerator = 0
    let magnitudeSum = 0
    let logSum = 0
    let flux = 0

    for (let bin = 0; bin < binCount; bin += 1) {
      const magnitude = Math.hypot(this.real[bin], this.imag[bin])
      this.magnitude[bin] = magnitude

      const energy = magnitude * magnitude
      totalEnergy += energy
      magnitudeSum += magnitude
      centroidNumerator += energy * bin * this.hzPerBin
      // Floored before the log so a silent bin cannot drive the geometric mean
      // to zero and make every frame read as perfectly tonal.
      logSum += Math.log(magnitude + 1e-10)

      if (bin >= this.voiceBandLoBin && bin <= this.voiceBandHiBin) {
        voiceEnergy += energy
      }

      // Half-wave rectified: only rises count. A sound ending is not an onset.
      const rise = magnitude - this.previousMagnitude[bin]
      if (rise > 0) {
        flux += rise
      }
    }

    const swap = this.previousMagnitude
    this.previousMagnitude = this.magnitude
    this.magnitude = swap

    // Wiener entropy: geometric over arithmetic mean of the magnitude spectrum.
    // Near 1 for white-ish noise (a fan), near 0 for a strongly pitched sound.
    const arithmeticMean = magnitudeSum / binCount
    const geometricMean = Math.exp(logSum / binCount)
    const flatness = arithmeticMean > 0 ? Math.min(1, geometricMean / arithmeticMean) : 1
    const centroid = totalEnergy > 0 ? centroidNumerator / totalEnergy : 0
    const voiceBandRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0

    if (this.floorDb === null) {
      this.floorDb = db
      this.fluxBaseline = flux
    }

    const openThresholdDb = Math.max(this.absoluteFloorDb, this.floorDb + this.onsetDb)
    const softThresholdDb = Math.max(this.absoluteFloorDb, this.floorDb + SOFT_ONSET_DB)
    const fluxThreshold = (this.fluxBaseline || 0) * FLUX_ONSET_RATIO

    const loudEnough = db >= openThresholdDb
    // The quiet-but-distinct path; see FLUX_ONSET_RATIO.
    const distinctEnough = db >= softThresholdDb && flux >= fluxThreshold
    const active = loudEnough || distinctEnough

    // Pitch is the most expensive thing here and is meaningless in silence, so
    // it is only estimated for frames that are actually carrying a sound.
    let pitch = 0
    let harmonicity = 0
    if (active || this.event) {
      const estimate = this.estimatePitch()
      pitch = estimate.pitch
      harmonicity = estimate.harmonicity
    }

    const voiced = harmonicity >= HARMONICITY_MIN &&
      pitch >= VOICE_MIN_HZ &&
      pitch <= VOICE_MAX_HZ &&
      voiceBandRatio >= VOICE_BAND_RATIO_MIN

    this.updateEvent({ db, flux, flatness, centroid, voiceBandRatio, pitch, harmonicity, voiced, active })

    /*
     * The floor learns only from frames that are not part of an event.
     *
     * This is what makes the measurement honest. A follower that kept adapting
     * through a conversation would gradually accept that conversation as the
     * room's baseline and stop reporting it — the audio equivalent of
     * calibrating the camera's neutral pose while the candidate is already
     * looking away.
     */
    if (!this.event && !active) {
      const floorCoeff = db < this.floorDb ? FLOOR_FALL_COEFF : FLOOR_RISE_COEFF
      this.floorDb += (db - this.floorDb) * floorCoeff

      const fluxCoeff = flux < this.fluxBaseline ? FLUX_FALL_COEFF : FLUX_RISE_COEFF
      this.fluxBaseline += (flux - this.fluxBaseline) * fluxCoeff
    }

    this.maybePostLevel(db, active)
  }

  /**
   * Normalised autocorrelation over the decimated frame.
   *
   * Normalising by the energy of both overlapping segments is what makes the
   * peak comparable across loudness: an unnormalised correlation peaks highest
   * on whatever is loudest, which would make "voiced" a synonym for "loud".
   */
  estimatePitch() {
    this.readHistory(this.pitchBuffer, PITCH_WINDOW)

    const factor = this.pitchDecimation
    const length = this.decimated.length
    for (let i = 0; i < length; i += 1) {
      let sum = 0
      for (let j = 0; j < factor; j += 1) {
        sum += this.pitchBuffer[i * factor + j]
      }
      this.decimated[i] = sum / factor
    }

    let mean = 0
    for (let i = 0; i < length; i += 1) {
      mean += this.decimated[i]
    }
    mean /= length
    for (let i = 0; i < length; i += 1) {
      this.decimated[i] -= mean
    }

    let bestLag = 0
    let bestScore = 0

    for (let lag = this.minLag; lag <= this.maxLag; lag += 1) {
      const overlap = length - lag
      let correlation = 0
      let energyA = 0
      let energyB = 0
      for (let i = 0; i < overlap; i += 1) {
        const a = this.decimated[i]
        const b = this.decimated[i + lag]
        correlation += a * b
        energyA += a * a
        energyB += b * b
      }
      const denominator = Math.sqrt(energyA * energyB)
      if (denominator <= 0) {
        continue
      }
      const score = correlation / denominator
      if (score > bestScore) {
        bestScore = score
        bestLag = lag
      }
    }

    if (bestLag === 0) {
      return { pitch: 0, harmonicity: 0 }
    }
    return { pitch: this.pitchRate / bestLag, harmonicity: Math.max(0, Math.min(1, bestScore)) }
  }

  updateEvent(frame) {
    if (!this.event) {
      if (!frame.active) {
        this.openCandidateFrames = 0
        return
      }

      // Two frames, not one: a single frame above the line is as likely to be a
      // buffer discontinuity or a cable knock as a sound in the room.
      this.openCandidateFrames += 1
      if (this.openCandidateFrames < OPEN_FRAMES) {
        return
      }

      this.openCandidateFrames = 0
      this.event = {
        startedAt: currentTime,
        floorDbAtOnset: this.floorDb,
        frames: 0,
        activeFrames: 0,
        voicedFrames: 0,
        quietMs: 0,
        peakDb: DB_FLOOR,
        sumDb: 0,
        sumFlatness: 0,
        sumCentroid: 0,
        sumVoiceBandRatio: 0,
        sumPitch: 0,
        pitchSamples: 0,
        peakHarmonicity: 0,
        framesToPeak: 0
      }
    }

    const event = this.event
    event.frames += 1
    event.sumDb += frame.db
    event.sumFlatness += frame.flatness
    event.sumCentroid += frame.centroid
    event.sumVoiceBandRatio += frame.voiceBandRatio

    if (frame.db > event.peakDb) {
      event.peakDb = frame.db
      event.framesToPeak = event.frames
    }
    if (frame.harmonicity > event.peakHarmonicity) {
      event.peakHarmonicity = frame.harmonicity
    }
    if (frame.pitch > 0) {
      event.sumPitch += frame.pitch
      event.pitchSamples += 1
    }
    if (frame.voiced) {
      event.voicedFrames += 1
    }

    const releaseDb = Math.max(this.absoluteFloorDb, event.floorDbAtOnset + RELEASE_DB)
    if (frame.active || frame.db >= releaseDb) {
      event.activeFrames += 1
      event.quietMs = 0
    } else {
      event.quietMs += this.frameIntervalMs
    }

    const durationMs = (currentTime - event.startedAt) * 1000

    if (event.quietMs >= HANGOVER_MS) {
      this.closeEvent(durationMs - event.quietMs, false)
      return
    }

    if (durationMs >= MAX_EVENT_MS) {
      // Emitted and immediately reopened so a drone keeps producing evidence
      // rather than sitting in one event that never ends.
      this.closeEvent(durationMs, true)
    }
  }

  closeEvent(durationMs, ongoing) {
    const event = this.event
    this.event = null
    this.openCandidateFrames = 0

    if (!event || event.frames === 0) {
      return
    }

    const effectiveMs = Math.max(0, durationMs)
    if (effectiveMs < this.minEventMs) {
      return
    }

    const voicedRatio = event.voicedFrames / event.frames
    const meanDb = event.sumDb / event.frames
    const meanFlatness = event.sumFlatness / event.frames
    const meanCentroid = event.sumCentroid / event.frames
    const meanVoiceBandRatio = event.sumVoiceBandRatio / event.frames
    const meanPitch = event.pitchSamples > 0 ? event.sumPitch / event.pitchSamples : 0
    const attackMs = event.framesToPeak * this.frameIntervalMs
    const peakAboveFloorDb = event.peakDb - event.floorDbAtOnset

    const classification = this.classify({
      durationMs: effectiveMs,
      voicedRatio,
      attackMs,
      meanFlatness,
      ongoing
    })

    this.port.postMessage({
      type: 'SOUND_EVENT',
      soundClass: classification.soundClass,
      confidence: Number(classification.confidence.toFixed(3)),
      ongoing,
      durationMs: Math.round(effectiveMs),
      peakDb: Number(event.peakDb.toFixed(1)),
      meanDb: Number(meanDb.toFixed(1)),
      floorDb: Number(event.floorDbAtOnset.toFixed(1)),
      peakAboveFloorDb: Number(peakAboveFloorDb.toFixed(1)),
      voicedRatio: Number(voicedRatio.toFixed(3)),
      pitchHz: Math.round(meanPitch),
      harmonicity: Number(event.peakHarmonicity.toFixed(3)),
      flatness: Number(meanFlatness.toFixed(3)),
      centroidHz: Math.round(meanCentroid),
      voiceBandRatio: Number(meanVoiceBandRatio.toFixed(3)),
      detectedAt: Date.now()
    })

    if (ongoing) {
      // Continue the same physical sound as a fresh event so its next segment is
      // measured against the floor from before it started, not the floor it has
      // been holding up for the last fifteen seconds.
      this.event = {
        startedAt: currentTime,
        floorDbAtOnset: event.floorDbAtOnset,
        frames: 0,
        activeFrames: 0,
        voicedFrames: 0,
        quietMs: 0,
        peakDb: DB_FLOOR,
        sumDb: 0,
        sumFlatness: 0,
        sumCentroid: 0,
        sumVoiceBandRatio: 0,
        sumPitch: 0,
        pitchSamples: 0,
        peakHarmonicity: 0,
        framesToPeak: 0
      }
    }
  }

  /**
   * Names the sound.
   *
   * The order matters. Voice is tested first because a person talking is the
   * one class with a consequence attached, and because speech satisfies the
   * duration test for "sustained" perfectly well — checking length first would
   * file every conversation as background noise. UNKNOWN_SOUND is a real answer
   * and not a failure: something happened, it was measured, and it did not look
   * like any of the three. An invigilator can listen to that judgement; a
   * threshold that silently dropped it could not.
   */
  classify({ durationMs, voicedRatio, attackMs, meanFlatness, ongoing }) {
    if (voicedRatio >= VOICED_RATIO_MIN && durationMs >= VOICE_MIN_MS) {
      // Scaled so a marginal 0.3 lands near 0.5 and a fully voiced event near 1.
      const confidence = Math.min(1, 0.45 + voicedRatio * 0.75)
      return { soundClass: 'HUMAN_VOICE', confidence }
    }

    if (durationMs <= IMPULSE_MAX_MS && attackMs <= IMPULSE_MAX_ATTACK_MS) {
      return { soundClass: 'IMPULSE', confidence: 0.6 }
    }

    if (durationMs >= SUSTAINED_MIN_MS || ongoing) {
      // Flat spectra are the machine noises this class is for — fans, drones,
      // road hum. A peaky one is more likely music or a television, which is
      // still sustained but a weaker claim to have identified.
      const confidence = meanFlatness > 0.3 ? 0.75 : 0.6
      return { soundClass: 'SUSTAINED_NOISE', confidence }
    }

    return { soundClass: 'UNKNOWN_SOUND', confidence: 0.4 }
  }

  /**
   * A perfect run of zeroes is a broken input, not a quiet room.
   *
   * Even an empty room reads a few thousandths of room tone, so digital silence
   * means no audio is arriving — a muted track, a device that stopped, a context
   * that never started. Reporting it is what stops sound proctoring from failing
   * invisibly for an entire exam, which is the failure mode that matters most
   * here: nothing detected and nothing wrong look identical from the outside.
   */
  trackSilence(peak) {
    if (peak < SILENCE_EPSILON) {
      this.silentMs += this.frameIntervalMs
      if (this.silentMs >= SILENT_INPUT_MS && !this.silentReported) {
        this.silentReported = true
        this.port.postMessage({ type: 'SILENT_INPUT', silent: true })
      }
      return
    }

    this.silentMs = 0
    if (this.silentReported) {
      this.silentReported = false
      this.port.postMessage({ type: 'SILENT_INPUT', silent: false })
    }
  }

  maybePostLevel(db, active) {
    const nowMs = currentTime * 1000
    if (nowMs - this.lastLevelPostAt < LEVEL_POST_INTERVAL_MS) {
      return
    }
    this.lastLevelPostAt = nowMs

    this.port.postMessage({
      type: 'LEVEL',
      db: Number(db.toFixed(1)),
      floorDb: Number((this.floorDb ?? DB_FLOOR).toFixed(1)),
      thresholdDb: Number(Math.max(this.absoluteFloorDb, (this.floorDb ?? DB_FLOOR) + this.onsetDb).toFixed(1)),
      active,
      eventOpen: this.event !== null
    })
  }
}

registerProcessor('proctor-sound-monitor', SoundEventProcessor)
