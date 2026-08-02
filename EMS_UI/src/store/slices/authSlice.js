// ems_frontend/src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  token: null,
  refreshToken: null,
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action) => {
      state.isLoading = false
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    loginFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
      state.isAuthenticated = false
    },
    logout: (state) => {
      state.token = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      state.error = null
    },
    registerStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    registerSuccess: (state) => {
      state.isLoading = false
      state.token = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
    },
    registerFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    setToken: (state, action) => {
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  registerStart,
  registerSuccess,
  registerFailure,
  setToken,
  clearError
} = authSlice.actions

export default authSlice.reducer