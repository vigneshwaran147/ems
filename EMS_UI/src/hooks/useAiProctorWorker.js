import { useCallback, useEffect, useRef, useState } from 'react'
import { TASK_CAPTURE_SIZE } from '../utils/proctorCapture'

/**
 * Drives the background computer-vision worker.
 *
 * PERFORMANCE CONTRACT
 * --------------------
 * The React thread's only job in this pipeline is to call `createImageBitmap`
 * on the webcam video element and hand the result to the worker as a
 * transferable. Decoding, inference and tensor churn all happen off-thread, so
 * the exam UI never blocks and typing never stutters.
 *
 * The two detection tasks run on deliberately different cadences:
 *   - PHONE (COCO-SSD) every 1000ms. It is the expensive model, and a phone
 *     that matters is on screen for far longer than a second.
 *   - FACE  (FaceMesh)  every 300ms. Head turns are brief, so this needs a
 *     tighter loop; the model is small enough to afford it.
 *
 * MEMORY DISCIPLINE
 * -----------------
 * Every ImageBitmap has exactly one owner. On a successful transfer the
 * main-thread handle is neutered by structured clone and the worker closes it
 * in a `finally`. On any failure path before transfer, this hook closes it
 * itself. That invariant is what keeps a two-hour exam from leaking frames.
 */

const WORKER_URL = '/workers/proctor.worker.js'

const PHONE_INTERVAL_MS = 1000
const FACE_INTERVAL_MS = 300

/**
 * How long INIT may run before it is declared failed.
 *
 * Nothing in the init path was bounded: `importScripts`, `tf.ready()` and each
 * `model.load()` can all stall indefinitely — a half-open connection, a WebGL
 * context that never returns, a proxy holding a large response open. When that
 * happened the worker simply never answered, and because the UI only ever
 * branched on `ready`/`error` it sat on "loading the AI engine" forever with no
 * diagnostics and no way forward but a page reload, which also discards the
 * camera permission the candidate just granted.
 *
 * Generous on purpose: the models are ~23MB in total and a cold load over a
 * slow link legitimately takes a while. This bounds the pathological case
 * without failing a merely slow one.
 */
const INIT_TIMEOUT_MS = 120000

/** How often the frame counters are copied out of their ref into React state. */
const STATS_PUBLISH_INTERVAL_MS = 2000

const useAiProctorWorker = ({ enabled, videoRef, onViolation, config }) => {
  const [workerReady, setWorkerReady] = useState(false)
  const [workerError, setWorkerError] = useState(null)
  /** Incremented by restart() to force the init effect to re-run. */
  const [generation, setGeneration] = useState(0)
  const [capabilities, setCapabilities] = useState(null)
  const [detectionStatus, setDetectionStatus] = useState({
    phonePresent: false,
    /*
     * Null, not 0. The setup gate treats "no presence verdict yet" and "a
     * verdict of nobody" as different states — the first is the check starting
     * up, the second is a candidate who is not in frame — and seeding a real
     * count here would make the engine look as though it had already looked and
     * found the seat empty.
     */
    peopleCount: null,
    faceVisible: null,
    turnedAway: false,
    lookingDown: false,
    calibrated: false,
    /**
     * Setup-gate verdict from the face task.
     *
     * Starts closed and unstable so the exam cannot be started in the window
     * before the first face frame is analysed — an open-by-default gate would
     * be trivially beaten by starting quickly.
     */
    framing: { ok: false, stable: false, reasons: ['ENGINE_WARMING_UP'] }
  })
  /**
   * Throughput counters, published on a slow timer.
   *
   * These exist because every way this pipeline fails silently looks identical
   * from the outside: models that never loaded, a video element that was never
   * attached, and a candidate the models genuinely see nothing wrong with all
   * present as "no violations". `framesAnalysed` separates them — if it is
   * climbing, the engine is looking at real frames and the thresholds are the
   * thing to question; if it is stuck at zero while the engine reports ready,
   * no frame ever left the main thread.
   */
  const [throughput, setThroughput] = useState({
    framesAnalysed: 0,
    framesSkipped: 0,
    lastInferenceMs: null,
    lastFrameAt: null,
    /**
     * When the FACE task last published a verdict.
     *
     * Separate from `lastFrameAt` because the two answer different questions:
     * the phone task alone keeps `lastFrameAt` moving, so a pipeline where only
     * the face model is starved still looks healthy by that measure. Kept as a
     * diagnostic rather than a gate — presence is now answered by whichever
     * model is alive, so a starved face task degrades gaze and pose tracking
     * without blocking anyone, and this is what makes that visible.
     */
    lastFaceStatusAt: null
  })

  /**
   * Last thing the worker said about its own progress.
   *
   * Surfaced next to the loading notice so a slow cold start reads as work in
   * progress rather than as a hang. It is the difference between "still
   * loading" and "stopped responding", which is the only question anyone
   * watching that screen actually has.
   */
  const [lastStatusLog, setLastStatusLog] = useState(null)

  const workerRef = useRef(null)
  const phoneTimerRef = useRef(null)
  const faceTimerRef = useRef(null)
  const statsTimerRef = useRef(null)
  const initTimerRef = useRef(null)
  const frameIdRef = useRef(0)
  /** Mutated per frame; copied into state on the slow timer below. */
  const statsRef = useRef({
    framesAnalysed: 0,
    framesSkipped: 0,
    lastInferenceMs: null,
    lastFrameAt: null,
    lastFaceStatusAt: null
  })

  // Read inside interval callbacks without making them dependencies, which
  // would tear down and rebuild the timers on every render.
  const enabledRef = useRef(enabled)
  const onViolationRef = useRef(onViolation)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    onViolationRef.current = onViolation
  }, [onViolation])

  /** Disarms the INIT watchdog; the engine has answered one way or the other. */
  const clearInitWatchdog = useCallback(() => {
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current)
      initTimerRef.current = null
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (phoneTimerRef.current) {
      clearInterval(phoneTimerRef.current)
      phoneTimerRef.current = null
    }
    if (faceTimerRef.current) {
      clearInterval(faceTimerRef.current)
      faceTimerRef.current = null
    }
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current)
      statsTimerRef.current = null
    }
  }, [])

  /**
   * Grabs one frame and transfers it to the worker.
   *
   * `createImageBitmap` does the downscale on the browser's decode thread, so
   * no pixel work happens in React's render path.
   */
  const dispatchFrame = useCallback(async (task) => {
    const worker = workerRef.current
    const video = videoRef?.current

    if (!worker || !enabledRef.current) {
      return
    }
    // HAVE_CURRENT_DATA — anything less and there is no frame to read.
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      statsRef.current.framesSkipped += 1
      return
    }

    let bitmap = null
    try {
      // Sized per task rather than globally: the face task needs every pixel the
      // camera gives it to resolve iris movement, while the phone task would only
      // pay for pixels COCO-SSD immediately throws away. See proctorCapture.js.
      const { width, height } = TASK_CAPTURE_SIZE[task] || TASK_CAPTURE_SIZE.PHONE
      bitmap = await createImageBitmap(video, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'low'
      })

      // Re-check: an await boundary means the exam may have ended, or cleanup
      // may have terminated the worker, while the bitmap was being produced.
      if (!workerRef.current || !enabledRef.current) {
        bitmap.close()
        return
      }

      frameIdRef.current += 1
      // Transferring hands ownership to the worker; `bitmap` is neutered here
      // and must not be closed on this side.
      workerRef.current.postMessage(
        { type: 'FRAME', task, bitmap, frameId: frameIdRef.current },
        [bitmap]
      )
    } catch (error) {
      // Close only if we still own it — a successful transfer neuters the handle.
      if (bitmap) {
        try {
          bitmap.close()
        } catch {
          /* already transferred or closed; nothing to reclaim */
        }
      }
      console.warn(`Failed to dispatch ${task} frame to proctoring worker:`, error)
    }
  }, [videoRef])

  const handleWorkerMessage = useCallback((event) => {
    const data = event.data || {}

    switch (data.type) {
      case 'READY':
        clearInitWatchdog()
        setWorkerReady(true)
        setWorkerError(null)
        setCapabilities(data.capabilities || null)
        break

      case 'INIT_FAILED':
        clearInitWatchdog()
        setWorkerReady(false)
        setWorkerError(data.message || 'Proctoring worker failed to initialise')
        break

      case 'VIOLATION':
        onViolationRef.current?.({
          type: data.violationType,
          description: data.description,
          confidence: data.confidence,
          source: 'AI_WORKER',
          task: data.task,
          timestamp: data.detectedAt || new Date().toISOString()
        })
        break

      case 'STATUS':
        // Recorded in the ref rather than in state for the same reason as the
        // frame counters: FACE publishes every 300ms and re-rendering the exam
        // page at that rate is felt as input lag. The slow timer below carries
        // it out.
        if (data.task === 'FACE') {
          statsRef.current.lastFaceStatusAt = Date.now()
        }
        setDetectionStatus((previous) => ({ ...previous, ...(data.status || {}) }))
        break

      case 'LOG':
        setLastStatusLog(data.message || null)
        if (data.level === 'error') {
          console.error('[proctor.worker]', data.message)
        } else if (data.level === 'warn') {
          console.warn('[proctor.worker]', data.message)
        } else {
          console.info('[proctor.worker]', data.message)
        }
        break

      case 'FRAME_DONE':
        // Accumulated in a ref, never in state: a frame completes every 300ms
        // and re-rendering the exam page that often would be felt as input lag.
        // The slow timer below publishes the totals.
        if (data.dropped) {
          statsRef.current.framesSkipped += 1
        } else {
          statsRef.current.framesAnalysed += 1
          statsRef.current.lastInferenceMs = data.inferenceMs
          statsRef.current.lastFrameAt = Date.now()
        }
        break

      default:
        break
    }
  }, [clearInitWatchdog])

  /** Discards the calibrated neutral pose, e.g. after the candidate repositions. */
  const recalibrate = useCallback(() => {
    workerRef.current?.postMessage({ type: 'CALIBRATE' })
  }, [])

  /**
   * Re-runs the setup gate from a clean slate.
   *
   * The local state is reset here as well as in the worker, and not left to the
   * STATUS message that follows: if the pipeline is starved — which is the
   * failure this control exists to recover from — that message may be a long
   * time coming or never arrive at all, and the candidate would be looking at
   * the stale verdict the whole time. Resetting both ends means the recheck
   * always reads as having done something.
   */
  const resetFraming = useCallback(() => {
    statsRef.current.lastFaceStatusAt = null
    statsRef.current.lastFrameAt = null
    setThroughput((previous) => ({ ...previous, lastFaceStatusAt: null, lastFrameAt: null }))
    setDetectionStatus((previous) => {
      // Dropped rather than set false: the setup gate reads presence as
      // "unknown" only while both keys are absent, and that is what tells the
      // candidate the check is still starting instead of accusing them of
      // having left the camera.
      const { faceVisible, peopleCount, ...rest } = previous || {}
      void faceVisible
      void peopleCount
      return {
        ...rest,
        framing: { ok: false, stable: false, reasons: ['ENGINE_WARMING_UP'] }
      }
    })
    workerRef.current?.postMessage({ type: 'RESET_FRAMING' })
  }, [])

  /**
   * Tears down and rebuilds the worker.
   *
   * Model loading fails for reasons that are often transient — a flaky
   * connection, a CDN blip, a proxy that was slow to warm. Without this the
   * only recovery was a full page reload, which on the pre-start screen also
   * throws away the camera and screen-share permissions the candidate just
   * granted. Bumping the generation counter re-runs the init effect.
   */
  const restart = useCallback(() => {
    setWorkerError(null)
    setWorkerReady(false)
    setLastStatusLog(null)
    setGeneration((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') {
      setWorkerError('This browser does not support the background proctoring engine.')
      return undefined
    }

    let worker
    try {
      // Classic worker: the TFJS CDN bundles are UMD and need importScripts.
      worker = new Worker(WORKER_URL)
    } catch (error) {
      setWorkerError(`Unable to start the proctoring engine: ${error.message}`)
      return undefined
    }

    workerRef.current = worker
    statsRef.current = {
      framesAnalysed: 0,
      framesSkipped: 0,
      lastInferenceMs: null,
      lastFrameAt: null,
      lastFaceStatusAt: null
    }
    worker.onmessage = handleWorkerMessage
    worker.onerror = (event) => {
      setWorkerReady(false)
      setWorkerError(event.message || 'Proctoring worker crashed')
    }

    worker.postMessage({ type: 'INIT', config: config || {} })

    initTimerRef.current = setTimeout(() => {
      initTimerRef.current = null
      // Only the init path is bounded. A worker that has already reported READY
      // is doing per-frame work under its own error handling, and failing it
      // here would tear down proctoring mid-exam over a slow inference.
      setWorkerReady((alreadyReady) => {
        if (!alreadyReady) {
          setWorkerError(
            'The AI proctoring engine did not finish loading within ' +
              `${Math.round(INIT_TIMEOUT_MS / 1000)} seconds. This is usually a slow or blocked ` +
              'connection to the model files. Check your network and use Retry below.'
          )
        }
        return alreadyReady
      })
    }, INIT_TIMEOUT_MS)

    phoneTimerRef.current = setInterval(() => {
      void dispatchFrame('PHONE')
    }, PHONE_INTERVAL_MS)

    faceTimerRef.current = setInterval(() => {
      void dispatchFrame('FACE')
    }, FACE_INTERVAL_MS)

    statsTimerRef.current = setInterval(() => {
      setThroughput({ ...statsRef.current })
    }, STATS_PUBLISH_INTERVAL_MS)

    return () => {
      clearTimers()
      clearInitWatchdog()
      // Null the ref before terminating so any in-flight dispatchFrame that is
      // mid-await closes its bitmap instead of posting to a dead worker.
      workerRef.current = null
      try {
        worker.postMessage({ type: 'DISPOSE' })
      } catch {
        /* worker already gone */
      }
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      setWorkerReady(false)
      setCapabilities(null)
    }
    // `config` is read once at INIT; re-initialising the models on every config
    // object identity change would reload ~10MB of weights mid-exam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, generation, clearTimers, clearInitWatchdog, dispatchFrame, handleWorkerMessage])

  return {
    workerReady,
    workerError,
    lastStatusLog,
    capabilities,
    detectionStatus,
    throughput,
    recalibrate,
    resetFraming,
    restart
  }
}

export default useAiProctorWorker
