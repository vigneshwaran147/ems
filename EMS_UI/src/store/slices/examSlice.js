// ems_frontend/src/store/slices/examSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  examOptions: [],
  application: null,
  applications: [],
  currentSession: null,
  sessionQuestions: {},
  examInProgress: false,
  isLoading: false,
  error: null
}

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    fetchExamOptionsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchExamOptionsSuccess: (state, action) => {
      state.isLoading = false
      state.examOptions = action.payload
      state.error = null
    },
    fetchExamOptionsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    applyExamStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    applyExamSuccess: (state, action) => {
      state.isLoading = false
      state.application = action.payload
      state.error = null
    },
    applyExamFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    startExamStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    startExamSuccess: (state, action) => {
      state.isLoading = false
      state.currentSession = action.payload
      state.examInProgress = true
      state.error = null
    },
    startExamFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    loadSessionQuestion: (state, action) => {
      const { number, question } = action.payload
      state.sessionQuestions[number] = question
    },
    endExamSession: (state) => {
      state.currentSession = null
      state.examInProgress = false
      state.sessionQuestions = {}
    },
    fetchApplicationsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchApplicationsSuccess: (state, action) => {
      state.isLoading = false
      state.applications = action.payload
      state.error = null
    },
    fetchApplicationsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    }
  }
})

export const {
  fetchExamOptionsStart,
  fetchExamOptionsSuccess,
  fetchExamOptionsFailure,
  applyExamStart,
  applyExamSuccess,
  applyExamFailure,
  startExamStart,
  startExamSuccess,
  startExamFailure,
  loadSessionQuestion,
  endExamSession,
  fetchApplicationsStart,
  fetchApplicationsSuccess,
  fetchApplicationsFailure
} = examSlice.actions

export default examSlice.reducer