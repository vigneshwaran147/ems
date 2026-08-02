// ems_frontend/src/store/slices/certificationSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  certifications: [],
  eligibility: null,
  currentLevel: null,
  isLoading: false,
  error: null
}

const certificationSlice = createSlice({
  name: 'certification',
  initialState,
  reducers: {
    fetchCertificationsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchCertificationsSuccess: (state, action) => {
      state.isLoading = false
      state.certifications = action.payload
      state.error = null
    },
    fetchCertificationsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    fetchEligibilityStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchEligibilitySuccess: (state, action) => {
      state.isLoading = false
      state.eligibility = action.payload
      state.error = null
    },
    fetchEligibilityFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    setCurrentLevel: (state, action) => {
      state.currentLevel = action.payload
    }
  }
})

export const {
  fetchCertificationsStart,
  fetchCertificationsSuccess,
  fetchCertificationsFailure,
  fetchEligibilityStart,
  fetchEligibilitySuccess,
  fetchEligibilityFailure,
  setCurrentLevel
} = certificationSlice.actions

export default certificationSlice.reducer