// ems_frontend/src/store/slices/paymentSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  paymentDetails: null,
  paymentHistory: [],
  isLoading: false,
  error: null,
  success: false
}

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    initiatePaymentStart: (state) => {
      state.isLoading = true
      state.error = null
      state.success = false
    },
    initiatePaymentSuccess: (state, action) => {
      state.isLoading = false
      state.paymentDetails = action.payload
      state.error = null
    },
    initiatePaymentFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    completePaymentStart: (state) => {
      state.isLoading = true
      state.error = null
      state.success = false
    },
    completePaymentSuccess: (state, action) => {
      state.isLoading = false
      state.paymentDetails = action.payload
      state.success = true
      state.error = null
    },
    completePaymentFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
      state.success = false
    },
    fetchPaymentHistoryStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchPaymentHistorySuccess: (state, action) => {
      state.isLoading = false
      state.paymentHistory = action.payload
      state.error = null
    },
    fetchPaymentHistoryFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    clearPaymentSuccess: (state) => {
      state.success = false
    }
  }
})

export const {
  initiatePaymentStart,
  initiatePaymentSuccess,
  initiatePaymentFailure,
  completePaymentStart,
  completePaymentSuccess,
  completePaymentFailure,
  fetchPaymentHistoryStart,
  fetchPaymentHistorySuccess,
  fetchPaymentHistoryFailure,
  clearPaymentSuccess
} = paymentSlice.actions

export default paymentSlice.reducer