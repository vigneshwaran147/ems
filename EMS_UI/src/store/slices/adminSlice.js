// ems_frontend/src/store/slices/adminSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  users: [],
  exams: [],
  questions: [],
  violations: [],
  activeExams: [],
  dashboard: null,
  isLoading: false,
  error: null,
  success: false
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    fetchUsersStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchUsersSuccess: (state, action) => {
      state.isLoading = false
      state.users = action.payload
      state.error = null
    },
    fetchUsersFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    fetchExamsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchExamsSuccess: (state, action) => {
      state.isLoading = false
      state.exams = action.payload
      state.error = null
    },
    fetchExamsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    fetchQuestionsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchQuestionsSuccess: (state, action) => {
      state.isLoading = false
      state.questions = action.payload
      state.error = null
    },
    fetchQuestionsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    fetchViolationsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchViolationsSuccess: (state, action) => {
      state.isLoading = false
      state.violations = action.payload
      state.error = null
    },
    fetchViolationsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    fetchDashboardStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchDashboardSuccess: (state, action) => {
      state.isLoading = false
      state.dashboard = action.payload
      state.error = null
    },
    fetchDashboardFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    createExamStart: (state) => {
      state.isLoading = true
      state.error = null
      state.success = false
    },
    createExamSuccess: (state, action) => {
      state.isLoading = false
      state.exams.push(action.payload)
      state.success = true
      state.error = null
    },
    createExamFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
      state.success = false
    }
  }
})

export const {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailure,
  fetchExamsStart,
  fetchExamsSuccess,
  fetchExamsFailure,
  fetchQuestionsStart,
  fetchQuestionsSuccess,
  fetchQuestionsFailure,
  fetchViolationsStart,
  fetchViolationsSuccess,
  fetchViolationsFailure,
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
  createExamStart,
  createExamSuccess,
  createExamFailure
} = adminSlice.actions

export default adminSlice.reducer