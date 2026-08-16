/**
 * Evidence capture helpers.
 *
 * Kept deliberately small and synchronous-ish: these run at the exact moment a
 * violation fires, so anything slow here would be felt as a hitch in the exam UI.
 */

/**
 * Stored-evidence geometry.
 *
 * Deliberately smaller than the camera track (see `proctorCapture.js`): this is
 * what a human invigilator looks at to adjudicate a violation, and it is paid
 * for in upload bandwidth and database bytes on every single detection. The
 * engine's own view is sized independently, so improving detection no longer
 * means inflating every stored frame.
 */
export const EVIDENCE_WIDTH = 320
export const EVIDENCE_HEIGHT = 240

/**
 * JPEG quality for stored evidence. 0.5 keeps a 320x240 frame around 10-15 KB,
 * which is legible enough for a human invigilator to adjudicate while staying
 * cheap to ship and store.
 */
const EVIDENCE_QUALITY = 0.5

/**
 * Shared re-entrancy guard between evidence capture and the anti-recording
 * defences in `useBrowserHardening`.
 *
 * That hook patches `HTMLCanvasElement.prototype.toDataURL` to flag scripted
 * readback of exam content. Our own capture path — and react-webcam's internal
 * screenshot canvas, which we do not control and cannot tag — goes through the
 * very same call. Without this flag every violation snapshot would itself be
 * reported as a canvas-scraping violation, cascading a single strike into three.
 */
export const evidenceCaptureGuard = { active: false }

/**
 * Grabs a low-resolution JPEG snapshot from a react-webcam ref.
 *
 * Returns a bare base64 string (no `data:` prefix) or `null` when the camera is
 * not ready. Never throws: a violation must still be reported even if the
 * snapshot fails, so callers can treat `null` as "no evidence available".
 *
 * @param {{ current: { getScreenshot?: Function, video?: HTMLVideoElement } }} webcamRef
 * @returns {string | null}
 */
export const captureEvidenceFrame = (webcamRef) => {
  // Suppress the canvas-readback guard for the duration of our own capture.
  evidenceCaptureGuard.active = true

  try {
    const webcam = webcamRef?.current
    if (!webcam) {
      return null
    }

    // react-webcam's own screenshot path is preferred; it already honours the
    // mirrored/aspect settings applied to the visible preview.
    if (typeof webcam.getScreenshot === 'function') {
      const dataUri = webcam.getScreenshot({ width: EVIDENCE_WIDTH, height: EVIDENCE_HEIGHT })
      if (dataUri) {
        return stripDataUriPrefix(dataUri)
      }
    }

    // Fallback for the window between stream attachment and react-webcam being
    // ready to screenshot.
    const video = webcam.video
    if (!video || video.readyState < 2) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = EVIDENCE_WIDTH
    canvas.height = EVIDENCE_HEIGHT
    // Tags this canvas as ours for the readback guard.
    canvas.dataset.proctorEvidence = 'true'

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }

    ctx.drawImage(video, 0, 0, EVIDENCE_WIDTH, EVIDENCE_HEIGHT)
    return stripDataUriPrefix(canvas.toDataURL('image/jpeg', EVIDENCE_QUALITY))
  } catch (error) {
    console.warn('Evidence capture failed; violation will be reported without a frame:', error)
    return null
  } finally {
    evidenceCaptureGuard.active = false
  }
}

/**
 * Removes an RFC 2397 data-URI prefix, leaving raw base64.
 *
 * The backend accepts either form, but stripping here keeps the payload smaller
 * and makes the stored column uniform.
 */
export const stripDataUriPrefix = (value) => {
  if (typeof value !== 'string') {
    return null
  }
  const commaIndex = value.indexOf(',')
  if (value.startsWith('data:') && commaIndex !== -1) {
    return value.slice(commaIndex + 1)
  }
  return value
}
