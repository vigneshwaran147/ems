import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Owns the microphone graph feeding the sound-event engine.
 *
 * The engine itself lives in `/workers/proctor.audio.worklet.js` and runs on the
 * audio render thread; this hook is the main-thread half — permissions, the
 * AudioContext lifecycle, and republishing what the engine reports at a rate
 * React can afford.
 *
 * DELIBERATELY IMPERATIVE
 * -----------------------
 * `primeAudioContext` and `startListening` are separate, and both are exposed
 * rather than driven by an effect, because the order they run in is load-bearing.
 * Constructing an AudioContext needs no permission, but *starting* one needs user
 * activation, and the exam-start sequence spends its activation almost
 * immediately — screen share, an awaited API call, a fullscreen transition. The
 * context therefore has to be created and resumed synchronously inside the click
 * handler, before anything is awaited. An effect would always run too late, and
 * the symptom is a context stuck in `suspended` for the entire exam, reporting a
 * perfectly silent room from a perfectly healthy microphone.
 *
 * WHAT IT REPORTS
 * ---------------
 * Every sound event the engine segments, regardless of class. Which of them
 * deserves a strike is a policy decision that belongs to the exam page, not
 * here — this hook's contract is that if something made a noise near the
 * candidate, `onSoundEvent` hears about it.
 */

const WORKLET_URL = '/workers/proctor.audio.worklet.js'
const PROCESSOR_NAME = 'proctor-sound-monitor'

/**
 * How often engine telemetry reaches React state.
 *
 * The worklet posts a level every 250ms, which is the right cadence for a meter
 * that has to look live but the wrong one for `setState` on a page the candidate
 * is typing into. Halving it costs nothing visually and halves the re-renders;
 * the AI worker's frame counters are throttled the same way for the same reason.
 */
const PUBLISH_INTERVAL_MS = 500

const EMPTY_LEVEL = {
  db: -120,
  floorDb: -120,
  thresholdDb: -120,
  active: false,
  eventOpen: false
}

const useSoundEnvironmentMonitor = ({ onSoundEvent } = {}) => {
  const [contextState, setContextState] = useState('idle')
  const [engineError, setEngineError] = useState(null)
  const [micSilent, setMicSilent] = useState(false)
  const [level, setLevel] = useState(EMPTY_LEVEL)
  /** 'unknown' before the first level arrives, then 'quiet' | 'sound'. */
  const [soundState, setSoundState] = useState('unknown')
  const [lastEvent, setLastEvent] = useState(null)
  const [eventCounts, setEventCounts] = useState({ total: 0 })
  const [diagnostics, setDiagnostics] = useState(null)

  const contextRef = useRef(null)
  const streamRef = useRef(null)
  const sourceRef = useRef(null)
  const nodeRef = useRef(null)
  /** Zero-gain terminator; see the graph comment in startListening. */
  const sinkRef = useRef(null)
  /** Detaches the pending "resume on next gesture" listeners, if any are armed. */
  const resumeDetachRef = useRef(null)
  /** Guards against a second startListening() while the first is still awaiting. */
  const startingRef = useRef(false)
  const lastPublishAtRef = useRef(0)
  const countsRef = useRef({ total: 0 })

  // Read from the message handler without making it a dependency, which would
  // rebuild the port callback on every render of the exam page.
  const onSoundEventRef = useRef(onSoundEvent)
  useEffect(() => {
    onSoundEventRef.current = onSoundEvent
  }, [onSoundEvent])

  const readDiagnostics = useCallback(() => {
    const track = streamRef.current?.getAudioTracks?.()[0]
    return {
      contextState: contextRef.current?.state ?? 'none',
      label: track?.label || '(unlabelled)',
      muted: track?.muted ?? null,
      enabled: track?.enabled ?? null,
      readyState: track?.readyState ?? 'none'
    }
  }, [])

  /**
   * Creates the AudioContext synchronously. Call this from inside the click
   * handler, before anything is awaited — see the note at the top of the file.
   */
  const primeAudioContext = useCallback(() => {
    if (contextRef.current) {
      return contextRef.current
    }

    try {
      const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext
      if (!AudioContextCtor) {
        setContextState('unsupported')
        setEngineError('This browser has no Web Audio support, so sound monitoring cannot run.')
        return null
      }

      const context = new AudioContextCtor()
      contextRef.current = context
      // Not awaited: awaiting here would push the rest of the click handler past
      // the activation boundary this function exists to stay inside.
      void context.resume().catch(() => undefined)
      setContextState(context.state)
      return context
    } catch (err) {
      console.warn('Could not create the audio context for sound monitoring:', err)
      setContextState('failed')
      setEngineError(`Audio context could not be created: ${err.message}`)
      return null
    }
  }, [])

  /**
   * Brings the context out of `suspended`, and keeps trying if it cannot be done
   * right now.
   *
   * Autoplay policy only lets a context start while the page holds user
   * activation, and by the time this runs the exam-start click may be long spent.
   * The state — not `resume()`'s promise — is the source of truth, because the
   * promise can resolve and leave the context suspended anyway. If it is still
   * suspended, re-arm on the candidate's next click or keypress: that gesture is
   * the one thing browsers accept, and during an exam it arrives within seconds.
   */
  const ensureRunning = useCallback(async (context) => {
    if (context.state === 'closed') {
      return false
    }

    if (context.state !== 'running') {
      try {
        await context.resume()
      } catch (err) {
        console.warn('AudioContext.resume() was rejected:', err)
      }
    }

    setContextState(context.state)
    if (context.state === 'running') {
      return true
    }

    // Guarded before the warning, not after: this is re-checked whenever the
    // context is found suspended, and an unguarded warn floods the console.
    if (resumeDetachRef.current) {
      return false
    }

    console.warn(
      'Sound monitoring is inert: the audio context is suspended, so the microphone reads as ' +
      'permanent silence. Waiting for a user gesture to resume it.'
    )

    const retry = async () => {
      try {
        await context.resume()
      } catch {
        /* still blocked; the listener stays armed for the next gesture */
      }
      setContextState(context.state)
      if (context.state === 'running') {
        console.info('Audio context resumed; sound monitoring is live.')
        resumeDetachRef.current?.()
      }
    }

    resumeDetachRef.current = () => {
      resumeDetachRef.current = null
      globalThis.removeEventListener('pointerdown', retry, true)
      globalThis.removeEventListener('keydown', retry, true)
    }
    globalThis.addEventListener('pointerdown', retry, true)
    globalThis.addEventListener('keydown', retry, true)
    return false
  }, [])

  const handleEngineMessage = useCallback((message) => {
    const data = message?.data
    if (!data) {
      return
    }

    switch (data.type) {
      case 'LEVEL': {
        // Throttled into React state; the engine posts twice as often as this.
        const now = Date.now()
        if (now - lastPublishAtRef.current < PUBLISH_INTERVAL_MS) {
          return
        }
        lastPublishAtRef.current = now

        setLevel({
          db: data.db,
          floorDb: data.floorDb,
          thresholdDb: data.thresholdDb,
          active: data.active,
          eventOpen: data.eventOpen
        })
        setSoundState(data.active || data.eventOpen ? 'sound' : 'quiet')
        // Republished alongside the level so the track's state is always read
        // from the same moment as the number it is meant to explain.
        setDiagnostics(readDiagnostics())
        break
      }

      case 'SOUND_EVENT': {
        const counts = countsRef.current
        counts[data.soundClass] = (counts[data.soundClass] || 0) + 1
        counts.total += 1
        setEventCounts({ ...counts })
        setLastEvent(data)
        onSoundEventRef.current?.(data)
        break
      }

      case 'SILENT_INPUT':
        setMicSilent(Boolean(data.silent))
        if (data.silent) {
          console.error(
            'Microphone is delivering digital silence — sound monitoring is not running.',
            readDiagnostics()
          )
        }
        break

      default:
        break
    }
  }, [readDiagnostics])

  const startListening = useCallback(async (config = {}) => {
    if (nodeRef.current || startingRef.current) {
      return
    }
    startingRef.current = true

    try {
      // Reuses the context primed in the click handler when there is one.
      const context = primeAudioContext()
      if (!context) {
        return
      }

      if (!context.audioWorklet) {
        // Surfaced rather than silently degraded to a poll: a candidate is
        // entitled to know the rule being enforced against them is switched off,
        // and so is whoever has to explain the recording afterwards.
        setEngineError('This browser does not support AudioWorklet, so sound monitoring cannot run.')
        setContextState('unsupported')
        return
      }

      // OS-level cleanup is explicitly off. Every one of these is designed to
      // remove exactly what this engine is looking for: noise suppression eats
      // background sound, echo cancellation eats anything correlated with the
      // room, and automatic gain makes the level meaningless by construction.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      })
      streamRef.current = stream

      await context.audioWorklet.addModule(WORKLET_URL)

      // Re-checked after the awaits: the exam may have ended, or cleanup may
      // have closed the context, while the module was loading.
      if (context.state === 'closed') {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        return
      }

      const source = context.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(context, PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: config
      })
      node.port.onmessage = handleEngineMessage
      node.onprocessorerror = () => {
        setEngineError('The sound monitoring engine stopped unexpectedly.')
      }

      /*
       * Terminated into a muted sink rather than left dangling.
       *
       * A graph branch that reaches nothing is not guaranteed to be pulled by
       * the renderer, and an engine that is never called looks exactly like a
       * silent room — the failure this whole pipeline is built to make visible.
       * Routing to the destination guarantees it is rendered every quantum. The
       * gain is zero and `process()` never writes to its output, so two
       * independent things would both have to break before the candidate's own
       * microphone reached their speakers.
       */
      const sink = context.createGain()
      sink.gain.value = 0
      source.connect(node)
      node.connect(sink)
      sink.connect(context.destination)

      // All three retained deliberately: nodes referenced only by the graph are
      // collectable, and when that happens the engine stops being called and
      // the microphone appears to have gone quiet.
      sourceRef.current = source
      nodeRef.current = node
      sinkRef.current = sink

      await ensureRunning(context)
      setDiagnostics(readDiagnostics())

      const track = stream.getAudioTracks()[0]
      console.info('Sound monitoring initialised:', {
        contextState: context.state,
        sampleRate: context.sampleRate,
        device: track?.label || '(no label — permission may be limited)',
        trackMuted: track?.muted,
        trackEnabled: track?.enabled,
        trackReadyState: track?.readyState
      })
    } catch (err) {
      setContextState('failed')
      setEngineError(`Sound monitoring could not start: ${err.message}`)
      console.warn('Sound monitoring setup failed:', err)
    } finally {
      startingRef.current = false
    }
  }, [primeAudioContext, ensureRunning, handleEngineMessage, readDiagnostics])

  const stopListening = useCallback(async () => {
    // Detach before closing: a pending resume-on-gesture listener would
    // otherwise outlive the page and call resume() on a closed context.
    resumeDetachRef.current?.()

    if (nodeRef.current) {
      try {
        nodeRef.current.port.postMessage({ type: 'DISPOSE' })
      } catch {
        /* port already torn down */
      }
      nodeRef.current.port.onmessage = null
      nodeRef.current.disconnect()
      nodeRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (sinkRef.current) {
      sinkRef.current.disconnect()
      sinkRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (contextRef.current) {
      try {
        await contextRef.current.close()
      } catch (err) {
        console.warn('Failed to close the sound monitoring context:', err)
      }
      contextRef.current = null
    }

    setContextState('idle')
    setSoundState('unknown')
    setLevel(EMPTY_LEVEL)
    setMicSilent(false)
  }, [])

  /**
   * Re-checks the context on a slow timer.
   *
   * A context that started healthy can be suspended later by the browser — a
   * backgrounded tab, an audio device change — and unlike the old polling
   * monitor there is no per-sample loop that would notice. Without this the
   * engine would simply stop receiving quanta and go on reporting the last level
   * it saw for the rest of the exam.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const context = contextRef.current
      if (!context || !nodeRef.current) {
        return
      }
      if (context.state !== 'running') {
        setContextState(context.state)
        void ensureRunning(context)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [ensureRunning])

  useEffect(() => () => { void stopListening() }, [stopListening])

  return {
    contextState,
    engineError,
    micSilent,
    level,
    soundState,
    lastEvent,
    eventCounts,
    diagnostics,
    primeAudioContext,
    startListening,
    stopListening
  }
}

export default useSoundEnvironmentMonitor
