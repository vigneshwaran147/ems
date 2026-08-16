/**
 * Camera and per-task capture geometry for the proctoring pipeline.
 *
 * WHY CAPTURE SIZE IS NOT EVIDENCE SIZE
 * -------------------------------------
 * These used to be the same 320x240 constant, which quietly made the *evidence*
 * budget decide how well the engine could see. Iris landmarks are what detect a
 * candidate reading a second device with their eyes while their head stays
 * pointed at the webcam, and that signal is tiny: a 15-degree downward eye
 * rotation moves the iris about 0.022 face-widths, which at a 320x240 capture
 * (face roughly 100px wide) is about 2 pixels — the same order as landmark
 * quantisation noise. The refined face mesh crops the face and resamples it to
 * 192x192 regardless, so a 100px-wide face is upsampled and no detail exists to
 * recover.
 *
 * Capturing at 640x480 roughly doubles that displacement in pixels and lets the
 * mesh downsample into its 192x192 input instead of upsampling into it, which is
 * where the real precision comes from. Evidence JPEGs stay at 320x240 — a human
 * invigilator adjudicating "was there a phone" needs far less resolution than a
 * model measuring a 2-pixel iris shift, and evidence is the part that costs
 * bandwidth and storage on every violation.
 */

/**
 * Requested webcam track size. This is the ceiling for everything downstream:
 * `createImageBitmap` can only downscale, so a 320x240 track caps the face task
 * at 320x240 no matter what it asks for.
 */
export const CAMERA_WIDTH = 640
export const CAMERA_HEIGHT = 480

/**
 * Shared <Webcam> constraints, so the pre-start and in-exam render trees cannot
 * drift apart. `ideal` rather than `exact`: a camera that cannot do 640x480
 * should degrade to its best effort, not fail to open and take proctoring with
 * it.
 */
export const PROCTOR_VIDEO_CONSTRAINTS = {
  width: { ideal: CAMERA_WIDTH },
  height: { ideal: CAMERA_HEIGHT },
  facingMode: 'user',
  frameRate: { ideal: 15, max: 20 }
}

/**
 * Per-task capture size.
 *
 * FACE runs at full camera resolution because gaze precision is bounded by it.
 * PHONE stays at 320x240 deliberately: COCO-SSD resamples its input to 300x300
 * internally, so a larger frame buys nothing but costs a bigger `fromPixels`
 * upload on every pass of the 1s loop.
 */
export const TASK_CAPTURE_SIZE = {
  FACE: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT },
  PHONE: { width: 320, height: 240 }
}

/**
 * Corrective instructions for the worker's setup-gate reason codes.
 *
 * The worker deliberately emits codes rather than prose so the wording can
 * change here without touching detection logic. Each string is what the
 * candidate is asked to DO, not what the engine measured — "raise your device"
 * is actionable, "face balance 1.12 exceeds 0.95" is not.
 */
export const FRAMING_GUIDANCE = {
  ENGINE_WARMING_UP: 'Checking your camera setup…',
  NO_FACE_DETECTED: 'Your face is not visible. Sit in front of the camera in a well-lit place.',
  FACE_NOT_MEASURABLE: 'Your face could not be measured clearly. Improve the lighting and face the camera.',
  TOO_FAR_FROM_CAMERA: 'Move closer to the camera.',
  TOO_CLOSE_TO_CAMERA: 'Move back from the camera.',
  FACE_TOO_HIGH_IN_FRAME: 'Lower your camera or sit back so your whole face is centred in view.',
  FACE_TOO_LOW_IN_FRAME: 'Raise your camera so your whole face is centred in view.',
  FACE_OFF_CENTRE: 'Sit directly in front of the camera.',
  CAMERA_BELOW_EYE_LEVEL:
    'Place your laptop on a desk or table at eye level. It must not rest on your lap.',
  CAMERA_ABOVE_EYE_LEVEL: 'Lower your camera to roughly eye level.',
  DEVICE_NOT_LEVEL: 'Straighten your device so the camera is level.',
  NOT_FACING_CAMERA: 'Turn to face the camera directly.'
}

/**
 * Maps reason codes to instructions, de-duplicated and order-preserving.
 *
 * Unknown codes fall through as-is rather than being dropped: a worker emitting
 * a code this build has never heard of is a bug worth seeing on screen, not one
 * worth hiding behind an empty list.
 */
export const describeFramingReasons = (reasons) => {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return []
  }
  return [...new Set(reasons.map((code) => FRAMING_GUIDANCE[code] || code))]
}
