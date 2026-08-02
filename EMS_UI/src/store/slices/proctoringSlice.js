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
    recordViolation: (state, action) => {
      state.violations.push({
        timestamp: new Date().toISOString(),
        type: action.payload.type,
        description: action.payload.description,
        severity: action.payload.severity || 'MEDIUM'
      })
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
    syncViolationCount: (state, action) => {
      if (!Number.isInteger(action.payload)) {
        return
      }
      state.violationCount = Math.min(Math.max(action.payload, state.violationCount), 3)
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