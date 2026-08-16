/* eslint-disable no-undef */
/**
 * proctor.worker.js — background computer-vision worker for the exam portal.
 *
 * WHY THIS IS A CLASSIC WORKER SERVED FROM /public
 * ------------------------------------------------
 * `importScripts` is only available in classic workers, and the TensorFlow.js
 * CDN bundles are UMD. Keeping this file in /public means Vite serves it
 * verbatim instead of trying to bundle it as an ES module.
 *
 * THREADING CONTRACT
 * ------------------
 * The React thread never touches a tensor. It transfers an `ImageBitmap` (a
 * transferable, so the copy is zero-cost) and this worker owns that bitmap's
 * lifetime: every code path ends in `bitmap.close()`. Model inference,
 * tensor allocation and disposal all happen here, off the main thread, so the
 * UI keeps painting at 60 FPS while inference runs.
 *
 * MESSAGE PROTOCOL
 * ----------------
 *   in  { type: 'INIT', config }
 *   in  { type: 'FRAME', task: 'PHONE' | 'FACE', bitmap, frameId }
 *   in  { type: 'CALIBRATE' }        reset the neutral-pose baseline
 *   in  { type: 'RESET_FRAMING' }    discard the setup-gate verdict and re-judge
 *   in  { type: 'DISPOSE' }
 *   out { type: 'READY', capabilities }
 *   out { type: 'INIT_FAILED', message }
 *   out { type: 'FRAME_DONE', task, frameId, inferenceMs }
 *   out { type: 'VIOLATION', violationType, description, confidence, task }
 *   out { type: 'STATUS', task, status }   FACE status carries `framing`, the
 *                                          setup-gate verdict the host uses to
 *                                          allow or block the exam start.
 *   out { type: 'LOG', level, message }
 */

/**
 * Every asset is served same-origin out of public/, vendored by
 * `npm run fetch:proctor-assets`. Nothing here touches a third-party host.
 *
 * This is a security property, not just a performance one: when the engine
 * loaded from public CDNs, a candidate who blocked those hostnames (hosts
 * file, extension, offline proxy) disabled proctoring while leaving the exam
 * fully functional. Same-origin assets cannot be selectively blocked without
 * also breaking the exam itself.
 *
 * It also removes a decay path we already hit: face-landmarks-detection@1.0.6
 * has tfhub.dev URLs compiled in, and tfhub.dev has since been retired, so the
 * face/gaze models silently 400'd and the engine quietly ran without them.
 * Local weights + explicit model URLs below make that failure impossible.
 */
const ASSETS = {
  tfjs: '/vendor/tfjs/tf.min.js',
  wasmBackend: '/vendor/tfjs/tf-backend-wasm.min.js',
  wasmBinaries: '/vendor/tfjs/',
  cocoSsd: '/vendor/tfjs/coco-ssd.min.js',
  faceLandmarks: '/vendor/tfjs/face-landmarks-detection.min.js',
  cocoSsdModel: '/models/coco-ssd/model.json',
  faceDetectorModel: '/models/face-detection/model.json',
  faceMeshModel: '/models/face-mesh/model.json'
}

/** Tunables; every one of these can be overridden by the INIT config. */
const DEFAULTS = {
  // Confidence a COCO detection needs before it is even considered.
  //
  // 0.35, not the 0.55 this started at: at 320x240 a phone occupies a small
  // fraction of the frame and SSD rarely scores it above 0.5, so the higher
  // bar silently discarded real detections. The consecutive-frame streak
  // below, not a high single-frame score, is what suppresses false positives.
  phoneMinScore: 0.35,
  personMinScore: 0.5,

  // Consecutive positive frames required before a violation is emitted. The
  // single biggest defence against false positives: a candidate scratching
  // their ear must not cost them a strike.
  phoneStreak: 2,
  faceAwayStreak: 4,
  eyesDownStreak: 5,
  faceMissingStreak: 6,
  multipleFacesStreak: 3,

  // Per-violation cooldown (ms) so one sustained event cannot drain all
  // three strikes within a couple of seconds.
  cooldownMs: 15000,

  /*
   * Pose thresholds are FLOORS, not fixed cutoffs.
   *
   * Every one of these is measured as a deviation from the candidate's own
   * calibrated neutral pose, and the effective threshold is
   *   max(floor, poseSensitivity x observed noise of that metric).
   * See resolveThreshold(). A candidate on a crisp, well-lit camera gets the
   * floor; one on a noisy 320x240 laptop camera automatically gets a wider
   * band instead of a stream of false strikes.
   *
   * The floors below replace absolute thresholds that were the reason head and
   * eye movement went undetected in practice:
   *   - yaw was compared against a fixed 0.34 with NO baseline at all, so an
   *     off-centre camera or a candidate who habitually sits at an angle
   *     carried a permanent offset, and 0.34 itself needs a near-profile turn
   *     (roughly 40 degrees) before it trips.
   *   - looking down required head pitch AND a 38% eyelid closure together;
   *     reading a phone below the desk moves the head far less than that.
   */
  yawDeviationFloor: 0.13,
  pitchDropFloor: 0.055,
  eyeOpennessDropRatio: 0.78,
  poseSensitivity: 3.5,

  /*
   * Gaze floors. Horizontal is in eye-span ratio units (0..1, 0.5 = centred).
   * Vertical is in face-width units — see computeGazeMetrics() for why the
   * eyelid-relative measure it replaced could not work.
   */
  gazeHorizontalFloor: 0.085,
  gazeVerticalFloor: 0.016,

  // Frames of neutral pose collected before head-pose/gaze rules go live.
  calibrationFrames: 20,

  /*
   * SETUP GATE — what an acceptable camera geometry looks like before any
   * baseline exists.
   *
   * Every other rule in this file measures deviation from the candidate's own
   * calibrated neutral pose, which is the right design for detecting movement
   * and the wrong one for detecting a bad *starting position*. A candidate who
   * sits with the laptop in their lap and reads a phone held just beside it
   * defeats the deviation rules structurally:
   *
   *   1. Screen and phone occupy almost the same visual angle, so the gaze
   *      deviation that EYES_OFF_SCREEN looks for is a degree or two — below
   *      the noise floor of any webcam-grade iris estimate.
   *   2. Worse, calibration runs in whatever position the candidate is already
   *      sitting in, so the lap posture BECOMES the definition of "looking at
   *      the screen". The baseline is poisoned before the first question loads.
   *
   * These bounds are absolute by necessity — they are what runs when there is
   * no baseline to compare against. They are deliberately generous: the goal is
   * to reject clearly unusable geometry (camera in the lap pointing up at the
   * ceiling), not to police posture. Every measured value is published in the
   * FACE status payload alongside the bound it has to clear, so these can be
   * tuned against real hardware instead of guessed at — see the same treatment
   * given to the pose thresholds above.
   */
  framing: {
    // Face width as a fraction of frame width. Too small and every landmark is
    // quantisation noise; too large and the mesh runs out of context.
    faceWidthRatioMin: 0.16,
    faceWidthRatioMax: 0.62,

    // Where the face sits in frame. A laptop in the lap looks up past the
    // candidate, pushing the face high and filling the rest with ceiling.
    faceCenterXMin: 0.18,
    faceCenterXMax: 0.82,
    faceCenterYMin: 0.18,
    faceCenterYMax: 0.80,

    /*
     * The camera-pitch signal: (nose->chin) / (forehead->nose).
     *
     * Perspective, not anatomy, is what makes this work. A camera below eye
     * level is closer to the jaw than to the forehead, so the lower face is
     * magnified and the upper face foreshortens — the ratio climbs. A camera
     * above does the reverse. It is far more sensitive to camera pitch than
     * pitchRatio (eye-line to chin over face width) because it measures the
     * DIFFERENCE between the two halves rather than the size of one of them,
     * which cancels most of the per-face anatomical variation.
     */
    faceBalanceMin: 0.32,
    faceBalanceMax: 0.95,

    // Roll: eye-line tilt over face width. Catches a laptop resting at an angle.
    eyeTiltMax: 0.20,

    // Absolute yaw, so a candidate seated well off to one side is corrected
    // before that offset is calibrated in as neutral.
    yawMax: 0.26
  },

  /**
   * Consecutive acceptable frames before the gate reports itself stable. Stops
   * the start button flickering while the candidate settles into position.
   */
  framingStableFrames: 6,

  /**
   * Consecutive unacceptable frames, mid-exam, before the setup is reported as
   * a violation. ~9s at the 300ms face cadence, so leaning out of frame to
   * stretch does not trip it but relocating the laptop to a lap does.
   */
  framingViolationStreak: 30
}

/**
 * Backend preference, in order.
 *
 * WebGL leads, which is a change: this used to try WASM first.
 *
 * The refined (attention-mesh) face model builds its landmark-refinement
 * sampling grid with an INT32 MatMul — three of them, one per refined region
 * (lips, eyes, iris), inside `SpatialTransformer/transform/interpolate/repeat`.
 * The WASM backend's matmul kernel is float32-only and throws
 *   "BatchMatMul for non non-float32 tensors not yet supported."
 * so on WASM every single FACE frame failed while COCO-SSD — which contains no
 * matmul at all — kept working perfectly. That asymmetry is what made this read
 * as a broken face model rather than a backend limitation.
 *
 * CPU is last and deliberately below WASM even though it can run the face
 * model: ssdlite inference on the CPU backend takes seconds, which blows both
 * detection cadences. Losing gaze tracking is a smaller loss than losing phone
 * detection, and presence still falls back to COCO — see init().
 */
const BACKEND_PREFERENCE = ['webgl', 'wasm', 'cpu']

/**
 * How long one backend gets to come up before it is treated as unavailable.
 *
 * Bring-up is local work — compiling shaders or instantiating a .wasm module —
 * so a healthy backend is ready in well under a second. This is not a
 * performance budget, it is an escape hatch from a call that never returns.
 */
const BACKEND_INIT_TIMEOUT_MS = 15000

/**
 * Ceiling for the optional face-mesh download.
 *
 * Its `catch` already degrades to presence-only tracking, but a request that
 * hangs rather than fails never reaches that catch, and the mandatory phone
 * detection loaded before it would be held hostage to an optional model.
 */
const FACE_MODEL_LOAD_TIMEOUT_MS = 45000

/**
 * Rejects if `promise` has not settled in `ms`.
 *
 * The timer is always cleared, including on the success path: a worker that
 * lives for a two-hour exam cannot afford to leave a pending timeout per call.
 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} did not respond within ${Math.round(ms / 1000)}s`))
    }, ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * Consecutive FACE inference failures tolerated before face tracking is
 * switched off and presence rules are handed back to COCO-SSD.
 */
const FACE_FAILURE_LIMIT = 5

const state = {
  ready: false,
  config: { ...DEFAULTS },
  cocoModel: null,
  faceModel: null,
  faceModelAvailable: false,
  streaks: Object.create(null),
  lastEmittedAt: Object.create(null),
  calibration: {
    samples: [],
    yawAsymmetry: null,
    pitchRatio: null,
    eyeOpenness: null,
    gazeH: null,
    gazeV: null,
    // Robust spread of each metric during calibration, used to widen the
    // thresholds on cameras that are simply noisier. See resolveThreshold().
    spread: {},
    complete: false
  },
  // Guards against overlapping inference on the same task if a frame arrives
  // while the previous one is still running.
  busy: { PHONE: false, FACE: false },
  // Consecutive failed FACE inferences; reset by the first success. See
  // noteFaceFailure().
  faceFailureStreak: 0,
  // Live setup-gate state, republished to the host on every face frame.
  framing: {
    ok: false,
    reasons: ['NO_FACE_DETECTED'],
    stable: false,
    stableFrames: 0,
    metrics: null
  }
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function post(message, transfer) {
  if (transfer && transfer.length) {
    self.postMessage(message, transfer)
  } else {
    self.postMessage(message)
  }
}

function logToHost(level, message) {
  post({ type: 'LOG', level, message })
}

/**
 * Emits a violation only when it has been seen on `streakTarget` consecutive
 * frames AND its cooldown has elapsed. Returns true when emitted.
 */
function emitViolation(key, violationType, description, confidence, task) {
  const now = Date.now()
  const lastAt = state.lastEmittedAt[key] || 0

  if (now - lastAt < state.config.cooldownMs) {
    return false
  }

  state.lastEmittedAt[key] = now
  post({
    type: 'VIOLATION',
    violationType,
    description,
    confidence: typeof confidence === 'number' ? Number(confidence.toFixed(4)) : null,
    task,
    detectedAt: new Date(now).toISOString()
  })
  return true
}

/** Increments a streak and reports whether it just crossed its threshold. */
function bumpStreak(key, positive, target) {
  if (!positive) {
    state.streaks[key] = 0
    return false
  }
  state.streaks[key] = (state.streaks[key] || 0) + 1
  return state.streaks[key] >= target
}

/* ------------------------------------------------------------------ */
/* Initialisation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Can the active backend multiply int32 tensors?
 *
 * Asked directly, and cheaply, because the answer decides whether the face
 * model can run at all — see the note on BACKEND_PREFERENCE. Probing beats
 * hard-coding a backend allow-list: the kernel coverage of each backend moves
 * between TFJS releases, and a probe that runs the exact operation the model
 * needs cannot drift out of date the way a list would.
 */
function supportsInt32MatMul() {
  let a = null
  let b = null
  let product = null

  try {
    a = tf.tensor2d([[1, 2], [3, 4]], [2, 2], 'int32')
    b = tf.tensor2d([[1, 0], [0, 1]], [2, 2], 'int32')
    product = tf.matMul(a, b)
    // Forces the result back to JS: a backend that defers work would otherwise
    // report success here and throw later, mid-exam, on a real frame.
    product.dataSync()
    return true
  } catch (error) {
    logToHost('info', `Backend '${tf.getBackend()}' cannot run int32 matMul: ${error && error.message}`)
    return false
  } finally {
    if (a) a.dispose()
    if (b) b.dispose()
    if (product) product.dispose()
  }
}

/**
 * Brings up the best available TFJS backend and reports what it can do.
 *
 * `tf.setBackend()` resolves to `false` rather than throwing when a backend
 * cannot initialise (missing .wasm binary, blocked CDN, no WebGL context, no
 * OffscreenCanvas in this worker). The original version ignored that return
 * value, so a failed bring-up fell through to `tf.ready()` and surfaced later
 * as an opaque error that killed the whole engine — including phone detection,
 * which has no reason to care which backend it runs on. Trying each in turn
 * keeps proctoring alive on locked-down machines, just slower.
 *
 * Returns the chosen backend plus whether the face model can run on it, rather
 * than searching for a backend that supports the face model: that search would
 * happily land on CPU and trade fast phone detection for slow gaze tracking.
 */
async function initBackend() {
  if (self.tf && self.tf.wasm && typeof self.tf.wasm.setWasmPaths === 'function') {
    // The bundle probes for SIMD/threads and picks the matching binary from
    // this directory (tfjs-backend-wasm-simd.wasm / -threaded-simd.wasm).
    self.tf.wasm.setWasmPaths(ASSETS.wasmBinaries)
  }

  for (const backend of BACKEND_PREFERENCE) {
    try {
      // Bounded because `false` is not the only way a backend fails to come up.
      // Requesting a WebGL context inside a worker goes through OffscreenCanvas
      // and the GPU process, and on some driver/Chrome combinations that request
      // neither resolves nor rejects — it simply never answers. Unbounded, that
      // hangs init forever on the FIRST preference and never reaches the wasm
      // fallback sitting behind it, so the engine never reports ready and never
      // reports failed. A timeout converts that into just another backend that
      // did not work, which the loop below already knows how to handle.
      const ok = await withTimeout(
        tf.setBackend(backend),
        BACKEND_INIT_TIMEOUT_MS,
        `backend '${backend}' bring-up`
      )
      if (!ok) {
        logToHost('warn', `TFJS backend '${backend}' unavailable, trying next.`)
        continue
      }
      await withTimeout(tf.ready(), BACKEND_INIT_TIMEOUT_MS, `backend '${backend}' readiness`)
      return { backend, faceLandmarksSupported: supportsInt32MatMul() }
    } catch (error) {
      logToHost('warn', `TFJS backend '${backend}' failed to initialise: ${error && error.message}`)
    }
  }

  throw new Error(
    `No TensorFlow.js backend could be initialised (tried ${BACKEND_PREFERENCE.join(', ')})`
  )
}

/**
 * Confirms the vendored assets are actually deployed before touching them.
 *
 * Without this, a deployment that skipped `npm run fetch:proctor-assets` fails
 * as an `importScripts` exception on a 404 HTML page — which surfaces as a
 * syntax error and sends whoever debugs it hunting through worker code rather
 * than checking whether the files shipped.
 */
async function assertAssetsDeployed() {
  let response
  try {
    response = await fetch('/models/manifest.json', { cache: 'no-store' })
  } catch (error) {
    throw new Error(`Could not reach the proctoring asset manifest: ${error && error.message}`)
  }

  if (!response.ok) {
    throw new Error(
      'Proctoring assets are not deployed (missing /models/manifest.json). ' +
      'Run "npm run fetch:proctor-assets" and redeploy.'
    )
  }
}

async function init(config) {
  try {
    // `framing` is merged one level deeper than the rest: a shallow spread would
    // let a host overriding a single bound silently drop every other one and
    // leave the gate comparing against undefined.
    const overrides = config || {}
    state.config = {
      ...DEFAULTS,
      ...overrides,
      framing: { ...DEFAULTS.framing, ...(overrides.framing || {}) }
    }

    logToHost('info', 'Checking proctoring assets are deployed...')
    await assertAssetsDeployed()

    logToHost('info', 'Loading TensorFlow.js runtime...')
    importScripts(ASSETS.tfjs)
    importScripts(ASSETS.wasmBackend)

    logToHost('info', 'Selecting compute backend...')

    const { backend: activeBackend, faceLandmarksSupported } = await initBackend()

    // SIMD/threads describe the WASM backend specifically, and both flags are
    // registered as ASYNC probes. Reading them with the synchronous getBool()
    // throws outright unless the WASM backend was brought up — which is no
    // longer guaranteed now that WebGL is preferred — so they are read with
    // getAsync(), and only when they describe the backend actually in use.
    let simd = false
    let threads = false
    if (activeBackend === 'wasm') {
      simd = await tf.env().getAsync('WASM_HAS_SIMD_SUPPORT')
      threads = await tf.env().getAsync('WASM_HAS_MULTITHREAD_SUPPORT')
    }
    logToHost(
      'info',
      `TFJS backend=${activeBackend} simd=${simd} threads=${threads} int32MatMul=${faceLandmarksSupported}`
    )

    // COCO-SSD carries the phone and person classes; it is the mandatory model.
    // `modelUrl` overrides coco-ssd's built-in `base` lookup, which would
    // otherwise reach out to storage.googleapis.com.
    logToHost('info', 'Downloading phone-detection model (~18MB, one time)...')
    importScripts(ASSETS.cocoSsd)
    state.cocoModel = await cocoSsd.load({ modelUrl: ASSETS.cocoSsdModel })
    logToHost('info', 'Phone-detection model ready.')

    // FaceMesh is what makes real head-pose and gaze possible. It is optional:
    // if the CDN or the model host is unreachable the worker still enforces
    // phone and presence rules rather than failing the whole exam.
    //
    // refineLandmarks: true loads the extra iris sub-model. Without it the
    // mesh only exposes head pose (yaw/pitch of the whole skull), which misses
    // the case a candidate reads notes or a second monitor by moving only
    // their eyes while keeping their head pointed at the camera. Iris
    // landmarks let computePoseMetrics() track gaze direction independently
    // of head position, at the cost of a few extra milliseconds per frame —
    // still bounded by the same 300ms cadence and still off the main thread.
    //
    // detectorModelUrl/landmarkModelUrl are mandatory here, not optional
    // tuning: without them the library falls back to its compiled-in
    // tfhub.dev URLs, which now return HTTP 400 since that host was retired.
    // That failure is caught below and silently disables face/gaze tracking,
    // so the engine reports itself healthy while doing half its job.
    //
    // Skipped outright on a backend that cannot multiply int32 tensors. Loading
    // it there costs ~3MB of weights to produce a detector that throws on every
    // frame — and, worse, one that sets faceModelAvailable and so switches OFF
    // the COCO presence checks below in favour of a model that never returns.
    if (!faceLandmarksSupported) {
      state.faceModelAvailable = false
      logToHost(
        'warn',
        `Backend '${activeBackend}' has no int32 matMul kernel, which the refined face-mesh ` +
          'model requires; face and gaze tracking are disabled and presence falls back to COCO-SSD.'
      )
    } else {
      try {
        logToHost('info', 'Downloading face and gaze model (~3MB, one time)...')
        importScripts(ASSETS.faceLandmarks)
        state.faceModel = await withTimeout(
          faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
              runtime: 'tfjs',
              refineLandmarks: true,
              maxFaces: 2,
              detectorModelUrl: ASSETS.faceDetectorModel,
              landmarkModelUrl: ASSETS.faceMeshModel
            }
          ),
          FACE_MODEL_LOAD_TIMEOUT_MS,
          'face-mesh model load'
        )
        state.faceModelAvailable = true
      } catch (faceError) {
        state.faceModelAvailable = false
        logToHost('warn', `Face landmark model unavailable, degrading to presence-only: ${faceError.message}`)
      }
    }

    state.ready = true
    post({
      type: 'READY',
      capabilities: {
        backend: tf.getBackend(),
        simd: Boolean(simd),
        threads: Boolean(threads),
        phoneDetection: true,
        faceLandmarks: state.faceModelAvailable
      }
    })
  } catch (error) {
    state.ready = false
    post({ type: 'INIT_FAILED', message: error && error.message ? error.message : String(error) })
  }
}

/* ------------------------------------------------------------------ */
/* Phone / presence detection (COCO-SSD, 1000ms cadence)               */
/* ------------------------------------------------------------------ */

/** COCO classes treated as a handheld device. See the note in runPhoneTask. */
const PHONE_CLASSES = new Set(['cell phone', 'remote'])

async function runPhoneTask(bitmap) {
  // fromPixels accepts an ImageBitmap and gives us an explicit handle to
  // dispose, rather than letting the model allocate one we cannot see.
  const tensor = tf.browser.fromPixels(bitmap)

  try {
    // detect()'s third argument is the model's OWN cutoff: anything scoring
    // below it is discarded inside the model and never reaches our per-class
    // filters. Passing personMinScore here (as this once did) silently capped
    // phone detection at the person threshold, so lowering phoneMinScore had
    // no effect whatsoever. Pass the lowest threshold any class needs, then
    // apply the per-class thresholds below.
    const modelCutoff = Math.min(state.config.phoneMinScore, state.config.personMinScore)
    const predictions = await state.cocoModel.detect(tensor, 20, modelCutoff)

    // COCO has no "phone held at arm's length" class, and SSD routinely labels
    // a dark rectangular handset as 'remote' — a well-known confusion between
    // two visually near-identical COCO classes. Treating both as a phone
    // materially raises recall; a candidate holding a TV remote during an exam
    // is not a case worth protecting either way.
    const phone = predictions
      .filter((p) => PHONE_CLASSES.has(p.class) && p.score >= state.config.phoneMinScore)
      .sort((a, b) => b.score - a.score)[0]

    const people = predictions.filter((p) => p.class === 'person' && p.score >= state.config.personMinScore)

    if (bumpStreak('phone', Boolean(phone), state.config.phoneStreak)) {
      emitViolation(
        'phone',
        'PHONE_DETECTED',
        `A mobile phone was detected in the candidate camera frame (matched '${phone.class}').`,
        phone.score,
        'PHONE'
      )
    }

    // Presence and head-count are only judged here when FaceMesh is
    // unavailable; otherwise the face task owns them at a finer cadence.
    // Sharing a streak key across two different cadences would let the 1s loop
    // and the 300ms loop corrupt each other's counters.
    if (!state.faceModelAvailable) {
      if (bumpStreak('multipleFacesCoco', people.length > 1, state.config.multipleFacesStreak)) {
        emitViolation(
          'multipleFaces',
          'MULTIPLE_FACES',
          `${people.length} people detected in the candidate camera frame.`,
          people[0] ? people[0].score : null,
          'PHONE'
        )
      }

      if (bumpStreak('faceMissing', people.length === 0, state.config.faceMissingStreak)) {
        emitViolation(
          'faceMissing',
          'FACE_NOT_VISIBLE',
          'No candidate detected in the camera frame.',
          null,
          'PHONE'
        )
      }
    }

    post({
      type: 'STATUS',
      task: 'PHONE',
      status: {
        phonePresent: Boolean(phone),
        phoneScore: phone ? Number(phone.score.toFixed(3)) : 0,
        peopleCount: people.length,
        // Everything the model saw this frame, above the model cutoff. Without
        // this there is no way to tell "the model never saw the phone" apart
        // from "it saw it but scored below threshold" — the two have opposite
        // fixes, and the second is invisible from the outside.
        topDetections: predictions
          .slice()
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((p) => `${p.class}:${p.score.toFixed(2)}`)
      }
    })
  } finally {
    tensor.dispose()
  }
}

/* ------------------------------------------------------------------ */
/* Head pose / gaze (FaceMesh, 300ms cadence)                          */
/* ------------------------------------------------------------------ */

/** MediaPipe FaceMesh landmark indices used for the pose heuristics. */
const LM = {
  noseTip: 1,
  chin: 152,
  forehead: 10,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftCheek: 234,
  rightCheek: 454,
  leftEyeUpper: 159,
  leftEyeLower: 145,
  rightEyeUpper: 386,
  rightEyeLower: 374,
  // Inner eye corners, needed alongside the outer corners above to bound the
  // horizontal span the iris moves within.
  leftEyeInner: 133,
  rightEyeInner: 362,
  // Iris centres. Only present when the detector was created with
  // refineLandmarks: true; computePoseMetrics() checks for them explicitly
  // and degrades to head-pose-only when they are missing.
  leftIrisCenter: 468,
  rightIrisCenter: 473
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Position of a point within a span, as a 0..1 ratio. 0.5 is centred; 0/1 are
 * the span's two ends. Order-independent, so it does not matter whether
 * `corner1` is the inner or outer eye corner.
 */
function ratioWithinSpan(point, corner1, corner2, axis) {
  const lo = Math.min(corner1[axis], corner2[axis])
  const hi = Math.max(corner1[axis], corner2[axis])
  const span = hi - lo
  if (span <= 0.0001) {
    return null
  }
  return (point[axis] - lo) / span
}

/**
 * Gaze direction from iris position, independent of head pose.
 *
 * This is what catches a candidate who reads a phone or a second monitor by
 * moving only their eyes while keeping their head pointed at the webcam —
 * the yaw/pitch checks above cannot see that, since the skull never moves.
 * Returns `null` when iris landmarks are unavailable (refineLandmarks failed
 * to load, or the mesh only partially resolved), in which case the caller
 * falls back to head-pose-only detection.
 */
function computeGazeMetrics(keypoints, faceWidth) {
  const leftIris = keypoints[LM.leftIrisCenter]
  const rightIris = keypoints[LM.rightIrisCenter]
  const leftOuter = keypoints[LM.leftEyeOuter]
  const leftInner = keypoints[LM.leftEyeInner]
  const rightOuter = keypoints[LM.rightEyeOuter]
  const rightInner = keypoints[LM.rightEyeInner]

  if (!leftIris || !rightIris || !leftOuter || !leftInner || !rightOuter || !rightInner) {
    return null
  }

  const leftH = ratioWithinSpan(leftIris, leftOuter, leftInner, 'x')
  const rightH = ratioWithinSpan(rightIris, rightOuter, rightInner, 'x')

  if (leftH === null || rightH === null) {
    return null
  }

  /*
   * Vertical gaze is measured against the EYE-CORNER LINE, normalised by face
   * width — not against the eyelid opening.
   *
   * The eyelid version this replaces could not detect anything: the upper lid
   * tracks the eyeball, so as the candidate looks down the lid comes down with
   * the iris and the iris stays near the middle of whatever opening remains.
   * The ratio therefore sits at ~0.5 no matter where the candidate is looking.
   * On top of that the lid opening is 4-8 pixels tall at 320x240, so the few
   * hundredths it did move were buried in landmark quantisation noise.
   *
   * The eye corners are rigid features of the skull: they do not move when the
   * eye rotates. Iris displacement from the line joining them is therefore a
   * real measurement of vertical gaze, and dividing by face width keeps it
   * scale-invariant the way every other metric here is.
   */
  const leftV = (leftIris.y - (leftOuter.y + leftInner.y) / 2) / faceWidth
  const rightV = (rightIris.y - (rightOuter.y + rightInner.y) / 2) / faceWidth

  // Averaging both eyes cancels out most of the per-frame landmark jitter a
  // single eye would carry on its own.
  return { gazeH: (leftH + rightH) / 2, gazeV: (leftV + rightV) / 2 }
}

/**
 * How the candidate is presented to the camera, independent of any baseline.
 *
 * Separate from computePoseMetrics() on purpose: those metrics answer "has this
 * candidate moved since calibration", these answer "is this camera geometry
 * usable at all". Only the second kind can be judged before a baseline exists,
 * and only the second kind survives a baseline that was captured in a bad
 * position to begin with.
 *
 * Returns null when the landmarks or frame dimensions needed are unavailable.
 */
function computeFramingMetrics(keypoints, faceWidth, frameWidth, frameHeight) {
  const forehead = keypoints[LM.forehead]
  const nose = keypoints[LM.noseTip]
  const chin = keypoints[LM.chin]
  const leftEye = keypoints[LM.leftEyeOuter]
  const rightEye = keypoints[LM.rightEyeOuter]
  const leftCheek = keypoints[LM.leftCheek]
  const rightCheek = keypoints[LM.rightCheek]

  if (!forehead || !nose || !chin || !leftEye || !rightEye || !leftCheek || !rightCheek
      || !frameWidth || !frameHeight) {
    return null
  }

  const upperFace = nose.y - forehead.y
  const lowerFace = chin.y - nose.y

  // A non-positive upper face means the mesh resolved into something that is
  // not an upright face; reporting a ratio from it would be noise dressed up as
  // a measurement.
  if (upperFace <= 0.0001 || lowerFace <= 0) {
    return null
  }

  return {
    faceBalance: lowerFace / upperFace,
    eyeTilt: Math.abs(leftEye.y - rightEye.y) / faceWidth,
    faceWidthRatio: faceWidth / frameWidth,
    faceCenterX: ((leftCheek.x + rightCheek.x) / 2) / frameWidth,
    faceCenterY: ((forehead.y + chin.y) / 2) / frameHeight
  }
}

/**
 * Judges framing metrics against the setup-gate bounds.
 *
 * Reasons are stable codes rather than prose: the host renders them as
 * corrective instructions ("raise your device to eye level"), and a code
 * survives rewording without breaking the UI that maps it.
 */
function evaluateFraming(framingMetrics, yawAsymmetry) {
  if (!framingMetrics) {
    return { ok: false, reasons: ['FACE_NOT_MEASURABLE'] }
  }

  const bounds = state.config.framing
  const reasons = []

  if (framingMetrics.faceWidthRatio < bounds.faceWidthRatioMin) {
    reasons.push('TOO_FAR_FROM_CAMERA')
  } else if (framingMetrics.faceWidthRatio > bounds.faceWidthRatioMax) {
    reasons.push('TOO_CLOSE_TO_CAMERA')
  }

  if (framingMetrics.faceCenterY < bounds.faceCenterYMin) {
    reasons.push('FACE_TOO_HIGH_IN_FRAME')
  } else if (framingMetrics.faceCenterY > bounds.faceCenterYMax) {
    reasons.push('FACE_TOO_LOW_IN_FRAME')
  }

  if (framingMetrics.faceCenterX < bounds.faceCenterXMin
      || framingMetrics.faceCenterX > bounds.faceCenterXMax) {
    reasons.push('FACE_OFF_CENTRE')
  }

  // The lap-laptop signature.
  if (framingMetrics.faceBalance > bounds.faceBalanceMax) {
    reasons.push('CAMERA_BELOW_EYE_LEVEL')
  } else if (framingMetrics.faceBalance < bounds.faceBalanceMin) {
    reasons.push('CAMERA_ABOVE_EYE_LEVEL')
  }

  if (framingMetrics.eyeTilt > bounds.eyeTiltMax) {
    reasons.push('DEVICE_NOT_LEVEL')
  }

  if (Math.abs(yawAsymmetry) > bounds.yawMax) {
    reasons.push('NOT_FACING_CAMERA')
  }

  return { ok: reasons.length === 0, reasons }
}

/** Folds one frame's verdict into the running gate state. */
function updateFramingState(framingMetrics, yawAsymmetry) {
  const verdict = evaluateFraming(framingMetrics, yawAsymmetry)

  state.framing.ok = verdict.ok
  state.framing.reasons = verdict.reasons
  state.framing.metrics = framingMetrics
  state.framing.stableFrames = verdict.ok ? state.framing.stableFrames + 1 : 0
  state.framing.stable = state.framing.stableFrames >= state.config.framingStableFrames

  return state.framing
}

/** Marks the gate as unmeasurable, e.g. on a frame with no face at all. */
function resetFramingState(reason) {
  state.framing.ok = false
  state.framing.reasons = [reason]
  state.framing.stableFrames = 0
  state.framing.stable = false
  state.framing.metrics = null
  return state.framing
}

/** The gate state as published to the host. */
function framingStatusPayload() {
  const bounds = state.config.framing
  const metrics = state.framing.metrics

  return {
    ok: state.framing.ok,
    stable: state.framing.stable,
    reasons: state.framing.reasons,
    // Measured value beside the bound it must clear, so a candidate stuck on
    // "reposition your device" can be diagnosed from the screen rather than
    // guessed at. Same rationale as the pose numbers in the status below.
    faceBalance: metrics ? Number(metrics.faceBalance.toFixed(3)) : null,
    faceBalanceRange: [bounds.faceBalanceMin, bounds.faceBalanceMax],
    faceWidthRatio: metrics ? Number(metrics.faceWidthRatio.toFixed(3)) : null,
    faceWidthRatioRange: [bounds.faceWidthRatioMin, bounds.faceWidthRatioMax],
    faceCenterY: metrics ? Number(metrics.faceCenterY.toFixed(3)) : null,
    faceCenterYRange: [bounds.faceCenterYMin, bounds.faceCenterYMax],
    eyeTilt: metrics ? Number(metrics.eyeTilt.toFixed(3)) : null,
    eyeTiltMax: bounds.eyeTiltMax
  }
}

/**
 * Derives scale-invariant pose metrics from the landmark set.
 *
 * Everything is normalised by face width so the numbers hold regardless of how
 * close the candidate sits to the camera or how large their face is.
 */
function computePoseMetrics(keypoints, frameWidth, frameHeight) {
  const nose = keypoints[LM.noseTip]
  const chin = keypoints[LM.chin]
  const leftCheek = keypoints[LM.leftCheek]
  const rightCheek = keypoints[LM.rightCheek]
  const leftEye = keypoints[LM.leftEyeOuter]
  const rightEye = keypoints[LM.rightEyeOuter]
  const leftLidUpper = keypoints[LM.leftEyeUpper]
  const leftLidLower = keypoints[LM.leftEyeLower]
  const rightLidUpper = keypoints[LM.rightEyeUpper]
  const rightLidLower = keypoints[LM.rightEyeLower]

  // Every landmark used below is checked here. A partially-resolved mesh would
  // otherwise throw inside distance() and cost us the whole inference pass.
  if (!nose || !chin || !leftCheek || !rightCheek || !leftEye || !rightEye
      || !leftLidUpper || !leftLidLower || !rightLidUpper || !rightLidLower) {
    return null
  }

  const faceWidth = distance(leftCheek, rightCheek)
  if (faceWidth <= 1) {
    return null
  }

  // Yaw: as the head turns, the nose tip drifts toward the cheek it turns
  // away from, so the left/right gap ratio becomes asymmetric.
  const leftGap = Math.abs(nose.x - leftCheek.x)
  const rightGap = Math.abs(rightCheek.x - nose.x)
  const yawAsymmetry = (leftGap - rightGap) / (leftGap + rightGap || 1)

  // Pitch: looking down foreshortens the eye-to-chin span relative to face
  // width. Compared against a calibrated neutral pose rather than an absolute.
  const eyeLineY = (leftEye.y + rightEye.y) / 2
  const pitchRatio = (chin.y - eyeLineY) / faceWidth

  // Eye openness corroborates the pitch signal: reading something below the
  // screen lowers the eyelids as well as the head.
  const leftOpen = distance(leftLidUpper, leftLidLower)
  const rightOpen = distance(rightLidUpper, rightLidLower)
  const eyeOpenness = (leftOpen + rightOpen) / 2 / faceWidth

  // Gaze is optional: absent when refineLandmarks failed to load, in which
  // case gazeH/gazeV stay null and the caller relies on head pose alone.
  const gaze = computeGazeMetrics(keypoints, faceWidth)

  return {
    yawAsymmetry,
    pitchRatio,
    eyeOpenness,
    faceWidth,
    gazeH: gaze ? gaze.gazeH : null,
    gazeV: gaze ? gaze.gazeV : null,
    framing: computeFramingMetrics(keypoints, faceWidth, frameWidth, frameHeight)
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Robust spread (median absolute deviation, scaled to be comparable to a
 * standard deviation). Used instead of a plain standard deviation because a
 * single blink or glance during calibration would inflate the latter enough to
 * disable the corresponding rule for the rest of the exam.
 */
function robustSpread(values, centre) {
  if (values.length < 4) {
    return 0
  }
  return 1.4826 * median(values.map((v) => Math.abs(v - centre)))
}

/**
 * The band a metric must leave before it counts as a deviation.
 *
 * Wider of a fixed floor and a multiple of how much that metric was already
 * moving while the candidate sat still. This is what lets one set of numbers
 * work across a sharp external webcam and a grainy built-in one without either
 * going deaf or crying wolf.
 */
function resolveThreshold(key, floor) {
  const spread = state.calibration.spread[key] || 0
  return Math.max(floor, state.config.poseSensitivity * spread)
}

/**
 * Collects a neutral-pose baseline before head-pose rules are enforced.
 *
 * Samples are admitted only from acceptably-framed frames. Without that check
 * this function will happily learn ANY posture as neutral, including the one it
 * exists to catch: a candidate calibrating with the laptop in their lap makes
 * "looking down at my lap" the origin every later deviation is measured from,
 * and the gaze rules then have nothing left to detect. A poisoned baseline is
 * worse than no baseline, because the engine goes on reporting itself healthy.
 */
function updateCalibration(metrics, framing) {
  if (state.calibration.complete) {
    return
  }

  if (!framing.ok) {
    // Discarded, not merely skipped: the run has to be unbroken, otherwise a
    // baseline could be stitched together from frames spanning a repositioning.
    state.calibration.samples = []
    return
  }

  state.calibration.samples.push(metrics)

  if (state.calibration.samples.length < state.config.calibrationFrames) {
    return
  }

  const samples = state.calibration.samples
  const calibrate = (key, values) => {
    const centre = median(values)
    state.calibration.spread[key] = robustSpread(values, centre)
    return centre
  }

  // Median rather than mean: a candidate who glances away mid-calibration
  // should not skew their own baseline.
  //
  // Yaw is calibrated here alongside the rest. Judging it against an absolute
  // zero (as this used to) assumes the camera is dead centre and the candidate
  // faces it square on; in practice a laptop sitting slightly to one side puts
  // a constant offset on every reading, which either masks real head turns or
  // reports one continuously.
  state.calibration.yawAsymmetry = calibrate('yawAsymmetry', samples.map((s) => s.yawAsymmetry))
  state.calibration.pitchRatio = calibrate('pitchRatio', samples.map((s) => s.pitchRatio))
  state.calibration.eyeOpenness = calibrate('eyeOpenness', samples.map((s) => s.eyeOpenness))

  // Gaze samples can be individually null (a frame where iris landmarks did
  // not resolve) even when refineLandmarks loaded successfully overall.
  // Filtered rather than defaulted to 0, which would silently pull a real
  // baseline toward "looking hard left".
  const gazeHSamples = samples.map((s) => s.gazeH).filter((v) => v !== null)
  const gazeVSamples = samples.map((s) => s.gazeV).filter((v) => v !== null)
  const gazeCalibrated = gazeHSamples.length >= state.config.calibrationFrames * 0.5
    && gazeVSamples.length >= state.config.calibrationFrames * 0.5

  state.calibration.gazeH = gazeCalibrated ? calibrate('gazeH', gazeHSamples) : null
  state.calibration.gazeV = gazeCalibrated ? calibrate('gazeV', gazeVSamples) : null
  state.calibration.complete = true
  state.calibration.samples = []

  logToHost(
    'info',
    `Head-pose baseline calibrated: yaw=${state.calibration.yawAsymmetry.toFixed(3)} ` +
      `pitchRatio=${state.calibration.pitchRatio.toFixed(3)} ` +
      `eyeOpenness=${state.calibration.eyeOpenness.toFixed(3)} ` +
      `gaze=${gazeCalibrated ? `(${state.calibration.gazeH.toFixed(3)}, ${state.calibration.gazeV.toFixed(3)})` : 'unavailable'} ` +
      `thresholds: yaw>${resolveThreshold('yawAsymmetry', state.config.yawDeviationFloor).toFixed(3)} ` +
      `pitch>${resolveThreshold('pitchRatio', state.config.pitchDropFloor).toFixed(3)} ` +
      `gazeH>${resolveThreshold('gazeH', state.config.gazeHorizontalFloor).toFixed(3)} ` +
      `gazeV>${resolveThreshold('gazeV', state.config.gazeVerticalFloor).toFixed(3)}`
  )
  post({ type: 'STATUS', task: 'FACE', status: { calibrated: true, gazeTrackingAvailable: gazeCalibrated } })
}

async function runFaceTask(bitmap) {
  if (!state.faceModelAvailable) {
    return
  }

  // Read before the tensor is built: the setup gate needs the frame's own
  // dimensions to express face size and position as fractions of it, and those
  // are now per-task rather than a single global constant.
  const frameWidth = bitmap.width
  const frameHeight = bitmap.height
  const tensor = tf.browser.fromPixels(bitmap)

  try {
    const faces = await state.faceModel.estimateFaces(tensor, { flipHorizontal: false })

    if (!faces.length) {
      if (bumpStreak('faceMissing', true, state.config.faceMissingStreak)) {
        emitViolation('faceMissing', 'FACE_NOT_VISIBLE', 'Candidate face not visible in the camera frame.', null, 'FACE')
      }
      // Clear the pose streaks: absence is its own violation, and a face that
      // reappears should not inherit a stale "turned away" run.
      state.streaks.faceAway = 0
      state.streaks.eyesDown = 0
      // Framing too: absence is already its own violation, and a face that
      // reappears correctly positioned must not inherit a half-built run from
      // before it left the frame.
      state.streaks.framing = 0
      resetFramingState('NO_FACE_DETECTED')
      post({
        type: 'STATUS',
        task: 'FACE',
        status: { faceVisible: false, framing: framingStatusPayload() }
      })
      return
    }

    state.streaks.faceMissing = 0

    // Bump unconditionally so a single-face frame resets the run; bumping only
    // when >1 would let two spurious frames minutes apart accumulate into a strike.
    if (bumpStreak('multipleFacesMesh', faces.length > 1, state.config.multipleFacesStreak)) {
      emitViolation('multipleFaces', 'MULTIPLE_FACES', `${faces.length} faces detected in frame.`, null, 'FACE')
    }

    const metrics = computePoseMetrics(faces[0].keypoints, frameWidth, frameHeight)
    if (!metrics) {
      resetFramingState('FACE_NOT_MEASURABLE')
      post({
        type: 'STATUS',
        task: 'FACE',
        status: { faceVisible: true, poseResolved: false, framing: framingStatusPayload() }
      })
      return
    }

    const framing = updateFramingState(metrics.framing, metrics.yawAsymmetry)

    /*
     * Enforced continuously, not only at the gate.
     *
     * A gate that is checked once is defeated by passing it and then moving:
     * sit up straight, start the exam, put the laptop back in your lap. The
     * streak is long enough (~9s) that leaning out of frame to stretch is not a
     * violation, but relocating the device is.
     */
    if (bumpStreak('framing', !framing.ok, state.config.framingViolationStreak)) {
      emitViolation(
        'framing',
        'PROCTOR_SETUP_INVALID',
        `Camera setup no longer meets exam requirements (${framing.reasons.join(', ')}).`,
        null,
        'FACE'
      )
    }

    if (!state.calibration.complete) {
      updateCalibration(metrics, framing)
      post({
        type: 'STATUS',
        task: 'FACE',
        status: {
          faceVisible: true,
          calibrating: true,
          // Distinguishes "collecting samples" from "cannot collect samples
          // until the candidate repositions", which look identical otherwise
          // and have completely different fixes.
          calibrationBlocked: !framing.ok,
          framing: framingStatusPayload()
        }
      })
      return
    }

    // Deviation from this candidate's own neutral pose, not from an assumed
    // dead-centre camera.
    const yawDeviation = Math.abs(metrics.yawAsymmetry - state.calibration.yawAsymmetry)
    const yawThreshold = resolveThreshold('yawAsymmetry', state.config.yawDeviationFloor)
    const turnedAway = yawDeviation > yawThreshold

    if (bumpStreak('faceAway', turnedAway, state.config.faceAwayStreak)) {
      emitViolation(
        'faceAway',
        'FACE_TURNED_AWAY',
        `Candidate turned their head away from the screen (yaw deviation ${yawDeviation.toFixed(2)}).`,
        Math.min(1, yawDeviation / (yawThreshold * 2)),
        'FACE'
      )
    }

    /*
     * Looking down is accepted on head pitch alone once the drop is clear,
     * and on a smaller pitch drop when the eyelids corroborate it.
     *
     * Requiring both unconditionally (the previous rule) is what made this
     * undetectable: glancing down at a phone in your lap drops the eye-to-chin
     * span noticeably but barely narrows the eyelids, so the AND was never
     * satisfied and no strike was ever raised.
     */
    const pitchDrop = state.calibration.pitchRatio - metrics.pitchRatio
    const pitchThreshold = resolveThreshold('pitchRatio', state.config.pitchDropFloor)
    const pitchDropped = pitchDrop > pitchThreshold
    const pitchDroppedClearly = pitchDrop > pitchThreshold * 1.8
    const eyesLowered = metrics.eyeOpenness < state.calibration.eyeOpenness * state.config.eyeOpennessDropRatio
    const headIndicatesLookingDown = pitchDroppedClearly || (pitchDropped && eyesLowered)

    // Gaze catches what head pose structurally cannot: eyes moving away from
    // the screen (sideways to a phone/notes, or down to a second device)
    // while the head stays pointed at the webcam. Only evaluated when
    // calibration actually captured a gaze baseline — a deployment where the
    // iris model failed to load falls back to head-pose-only, same as before.
    let gazeAway = false
    let gazeDescription = null
    let gazeHDeviation = null
    let gazeVDeviation = null
    if (metrics.gazeH !== null && metrics.gazeV !== null
        && state.calibration.gazeH !== null && state.calibration.gazeV !== null) {
      gazeHDeviation = Math.abs(metrics.gazeH - state.calibration.gazeH)
      gazeVDeviation = Math.abs(metrics.gazeV - state.calibration.gazeV)
      const gazeShiftedHorizontally = gazeHDeviation > resolveThreshold('gazeH', state.config.gazeHorizontalFloor)
      const gazeShiftedVertically = gazeVDeviation > resolveThreshold('gazeV', state.config.gazeVerticalFloor)
      gazeAway = gazeShiftedHorizontally || gazeShiftedVertically
      gazeDescription = gazeShiftedHorizontally
        ? 'Candidate\'s eyes moved sideways, away from the exam window.'
        : 'Candidate\'s eyes moved down/up, away from the exam window.'
    }

    const lookingAway = headIndicatesLookingDown || gazeAway

    if (bumpStreak('eyesDown', lookingAway, state.config.eyesDownStreak)) {
      emitViolation(
        'eyesDown',
        'EYES_OFF_SCREEN',
        gazeAway && !headIndicatesLookingDown
          ? gazeDescription
          : 'Candidate is looking down and away from the exam screen.',
        null,
        'FACE'
      )
    }

    post({
      type: 'STATUS',
      task: 'FACE',
      status: {
        faceVisible: true,
        faceCount: faces.length,
        turnedAway,
        lookingDown: lookingAway,
        gazeAway,
        // Live measurements, surfaced so "it isn't detecting anything" can be
        // read off the screen as numbers rather than guessed at. Each pairs the
        // observed deviation with the threshold it has to beat.
        yawDeviation: Number(yawDeviation.toFixed(3)),
        yawThreshold: Number(yawThreshold.toFixed(3)),
        pitchDrop: Number(pitchDrop.toFixed(3)),
        pitchThreshold: Number(pitchThreshold.toFixed(3)),
        gazeHDeviation: gazeHDeviation === null ? null : Number(gazeHDeviation.toFixed(3)),
        gazeVDeviation: gazeVDeviation === null ? null : Number(gazeVDeviation.toFixed(3)),
        gazeTrackingAvailable: state.calibration.gazeH !== null,
        framing: framingStatusPayload()
      }
    })
  } finally {
    tensor.dispose()
  }
}

/* ------------------------------------------------------------------ */
/* Frame dispatch                                                      */
/* ------------------------------------------------------------------ */

/**
 * Retires the face model after a sustained run of inference failures.
 *
 * This is the safety net behind the init-time check, for anything that only
 * breaks once real frames arrive (a lost WebGL context, a driver reset, a
 * kernel gap a probe did not cover).
 *
 * It matters because runPhoneTask() hands presence and head-count over to
 * FaceMesh whenever faceModelAvailable is true. When every FACE frame throws,
 * nobody enforces them: the worker still reports itself READY, the console
 * fills with one error every 300ms, and the candidate goes effectively
 * unmonitored for the rest of the exam. Clearing the flag hands those rules
 * straight back to COCO-SSD at its 1s cadence — degraded, but never dark.
 */
function noteFaceFailure() {
  state.faceFailureStreak += 1

  if (!state.faceModelAvailable || state.faceFailureStreak < FACE_FAILURE_LIMIT) {
    return
  }

  state.faceModelAvailable = false
  logToHost(
    'error',
    `Face inference failed ${state.faceFailureStreak} frames in a row; disabling face and gaze ` +
      'tracking. Presence and head-count now fall back to COCO-SSD.'
  )
  post({
    type: 'STATUS',
    task: 'FACE',
    status: { faceLandmarksAvailable: false, gazeTrackingAvailable: false, calibrated: false }
  })
}

async function handleFrame(task, bitmap, frameId) {
  // Drop rather than queue. A backed-up frame is stale by definition, and
  // queueing them is how a slow laptop spirals into unbounded memory growth.
  if (!state.ready || state.busy[task]) {
    bitmap.close()
    post({ type: 'FRAME_DONE', task, frameId, inferenceMs: 0, dropped: true })
    return
  }

  state.busy[task] = true
  const startedAt = Date.now()

  try {
    if (task === 'PHONE') {
      await runPhoneTask(bitmap)
    } else if (task === 'FACE') {
      await runFaceTask(bitmap)
      // One clean pass clears the run: an isolated failure is not a broken
      // model, and only an unbroken streak should retire face tracking.
      state.faceFailureStreak = 0
    }
    post({ type: 'FRAME_DONE', task, frameId, inferenceMs: Date.now() - startedAt, dropped: false })
  } catch (error) {
    logToHost('error', `Inference failed for task ${task}: ${error && error.message ? error.message : error}`)
    if (task === 'FACE') {
      noteFaceFailure()
    }
    post({ type: 'FRAME_DONE', task, frameId, inferenceMs: Date.now() - startedAt, dropped: false, failed: true })
  } finally {
    // The single owner of this bitmap's lifetime. Every path above reaches
    // here, so a frame can never outlive its inference pass.
    bitmap.close()
    state.busy[task] = false
  }
}

function dispose() {
  try {
    if (state.faceModel && typeof state.faceModel.dispose === 'function') {
      state.faceModel.dispose()
    }
    if (state.cocoModel && typeof state.cocoModel.dispose === 'function') {
      state.cocoModel.dispose()
    }
    if (self.tf && typeof tf.disposeVariables === 'function') {
      tf.disposeVariables()
    }
  } catch (error) {
    logToHost('warn', `Dispose encountered an error: ${error.message}`)
  } finally {
    state.ready = false
    state.cocoModel = null
    state.faceModel = null
    state.faceModelAvailable = false
  }
}

self.onmessage = (event) => {
  const data = event.data || {}

  switch (data.type) {
    case 'INIT':
      init(data.config)
      break

    case 'FRAME':
      if (data.bitmap) {
        handleFrame(data.task, data.bitmap, data.frameId)
      }
      break

    case 'CALIBRATE':
      state.calibration = {
        samples: [],
        yawAsymmetry: null,
        pitchRatio: null,
        eyeOpenness: null,
        gazeH: null,
        gazeV: null,
        spread: {},
        complete: false
      }
      state.streaks = Object.create(null)
      logToHost('info', 'Head-pose baseline reset; recalibrating.')
      // Told to the host explicitly: without it the UI keeps rendering the last
      // pose numbers as if they were still being measured against a live
      // baseline, for the several seconds it takes to collect a new one.
      post({ type: 'STATUS', task: 'FACE', status: { calibrated: false } })
      break

    /*
     * Throws away the current gate verdict and starts judging from scratch.
     *
     * Exists for the candidate-facing "Recheck camera" control. Without it a
     * recheck is indistinguishable from doing nothing: the last verdict keeps
     * being rendered while the next face frame is computed, so a candidate who
     * has just corrected their position sees the old complaint for long enough
     * to conclude the button is dead. Resetting to ENGINE_WARMING_UP makes the
     * recheck visible immediately and re-arms `stableFrames`, so the gate has to
     * be earned again rather than passing on a verdict formed before the move.
     */
    case 'RESET_FRAMING':
      state.streaks.framing = 0
      resetFramingState('ENGINE_WARMING_UP')
      logToHost('info', 'Setup-gate verdict reset; re-checking camera framing.')
      post({ type: 'STATUS', task: 'FACE', status: { framing: framingStatusPayload() } })
      break

    case 'DISPOSE':
      dispose()
      break

    default:
      logToHost('warn', `Unknown message type received: ${data.type}`)
  }
}
