// ems_frontend/src/store/slices/proctoringSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isRecording: false,
  cameraEnabled: false,
  microphoneEnabled: false,
  violationCount: 0,
  violations: [],
  recordingUrl: null,
  isLoading: false,
  error: null,
  browserTabSwitches: 0,
  windowBlurs: 0,
  cameraDisabledCount: 0
}

const proctoringSlice = createSlice({
  name: 'proctoring',
  initialState,
  reducers: {
    initializeProctoring: (state, action) => {
      state.isRecording = false
      state.cameraEnabled = action.payload.cameraEnabled || false
      state.microphoneEnabled = action.payload.microphoneEnabled || false
      state.violationCount = 0
      state.violations = []
    },
    startRecording: (state) => {
      state.isRecording = true
      state.error = null
    },
    stopRecording: (state, action) => {
      state.isRecording = false
      state.recordingUrl = action.payload
    },
    /**
     * Records a detection in the local timeline, and — only when asked to —
     * advances the strike counter.
     *
     * `countsLocally: false` is passed for every detection that is being sent to
     * the server, because the server is the only party that knows whether one
     * costs a strike: review-only types never do, and an unidentified sound does
     * not until the attempt's grace for coughs is spent. Counting those here
     * would inflate the candidate's number past the truth, and the exam
     * auto-terminates off that number.
     */
    recordViolation: (state, action) => {
      state.violations.push({
        timestamp: new Date().toISOString(),
        type: action.payload.type,
        description: action.payload.description,
        severity: action.payload.severity || 'MEDIUM'
      })
      if (action.payload.countsLocally === false) {
        return
      }
      if (Number.isInteger(action.payload.violationLevel)) {
        state.violationCount = Math.min(Math.max(action.payload.violationLevel, state.violationCount), 3)
      } else {
        state.violationCount = Math.min(state.violationCount + 1, 3)
      }
    },
    recordBrowserSwitch: (state) => {
      state.browserTabSwitches += 1
      state.violations.push({
        timestamp: new Date().toISOString(),
        type: 'TAB_SWITCH',
        description: 'Candidate switched browser tabs',
        severity: 'HIGH'
      })
      state.violationCount = Math.min(state.violationCount + 1, 3)
    },
    recordWindowBlur: (state) => {
      state.windowBlurs += 1
      state.violations.push({
        timestamp: new Date().toISOString(),
        type: 'WINDOW_BLUR',
        description: 'Candidate minimized or switched window',
        severity: 'HIGH'
      })
      state.violationCount = Math.min(state.violationCount + 1, 3)
    },
    recordCameraDisabled: (state) => {
      state.cameraDisabledCount += 1
      state.violations.push({
        timestamp: new Date().toISOString(),
        type: 'CAMERA_DISABLED',
        description: 'Camera was disabled during exam',
        severity: 'CRITICAL'
      })
      state.violationCount = Math.min(state.violationCount + 1, 3)
    },
    setCameraEnabled: (state, action) => {
      state.cameraEnabled = action.payload
    },
    setMicrophoneEnabled: (state, action) => {
      state.microphoneEnabled = action.payload
    },
    clearViolations: (state) => {
      state.violations = []
      state.violationCount = 0
      state.browserTabSwitches = 0
      state.windowBlurs = 0
      state.cameraDisabledCount = 0
    },
    setProctoringError: (state, action) => {
      state.error = action.payload
    },
    /**
     * Adopts the server's strike count verbatim.
     *
     * Assignment, not `Math.max` against the local value. The old ratchet could
     * only ever raise the count, so a local number that had run ahead of the
     * server — which is what happens the moment a detection turns out to cost no
     * strike — could never be walked back, and the exam then terminated itself
     * on a count the server did not share. The server is the only counter; if it
     * says 1, the answer is 1.
     */
    syncViolationCount: (state, action) => {
      if (!Number.isInteger(action.payload)) {
        return
      }
      state.violationCount = Math.min(Math.max(action.payload, 0), 3)
    }
  }
})

export const {
  initializeProctoring,
  startRecording,
  stopRecording,
  recordViolation,
  recordBrowserSwitch,
  recordWindowBlur,
  recordCameraDisabled,
  setCameraEnabled,
  setMicrophoneEnabled,
  clearViolations,
  setProctoringError,
  syncViolationCount
} = proctoringSlice.actions

export default proctoringSlice.reducer