// ems_frontend/src/store/slices/reportSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  reports: [],
  selectedReport: null,
  isLoading: false,
  error: null,
  exportFormat: null
}

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    fetchReportsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchReportsSuccess: (state, action) => {
      state.isLoading = false
      state.reports = action.payload
      state.error = null
    },
    fetchReportsFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    selectReport: (state, action) => {
      state.selectedReport = action.payload
    },
    generateReportStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    generateReportSuccess: (state, action) => {
      state.isLoading = false
      state.selectedReport = action.payload
      state.error = null
    },
    generateReportFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    exportReportStart: (state, action) => {
      state.isLoading = true
      state.exportFormat = action.payload.format
      state.error = null
    },
    exportReportSuccess: (state) => {
      state.isLoading = false
      state.error = null
    },
    exportReportFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    }
  }
})

export const {
  fetchReportsStart,
  fetchReportsSuccess,
  fetchReportsFailure,
  selectReport,
  generateReportStart,
  generateReportSuccess,
  generateReportFailure,
  exportReportStart,
  exportReportSuccess,
  exportReportFailure
} = reportSlice.actions

export default reportSlice.reducer