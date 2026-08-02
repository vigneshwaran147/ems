// ems_frontend/src/store/slices/certificateSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  certificates: [],
  certificateDetails: null,
  verificationResult: null,
  isLoading: false,
  error: null,
  success: false
}

const certificateSlice = createSlice({
  name: 'certificate',
  initialState,
  reducers: {
    fetchCertificatesStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchCertificatesSuccess: (state, action) => {
      state.isLoading = false
      state.certificates = action.payload
      state.error = null
    },
    fetchCertificatesFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    downloadCertificateStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    downloadCertificateSuccess: (state) => {
      state.isLoading = false
      state.success = true
      state.error = null
    },
    downloadCertificateFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    verifyCertificateStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    verifyCertificateSuccess: (state, action) => {
      state.isLoading = false
      state.verificationResult = action.payload
      state.error = null
    },
    verifyCertificateFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    }
  }
})

export const {
  fetchCertificatesStart,
  fetchCertificatesSuccess,
  fetchCertificatesFailure,
  downloadCertificateStart,
  downloadCertificateSuccess,
  downloadCertificateFailure,
  verifyCertificateStart,
  verifyCertificateSuccess,
  verifyCertificateFailure
} = certificateSlice.actions

export default certificateSlice.reducer