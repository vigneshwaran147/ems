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
    // Clears the credentials as well as flipping the flag. A failed attempt
    // otherwise leaves any token from a previous session sitting in state — and
    // therefore in localStorage — next to isAuthenticated: false. That half
    // state is what makes people reach for "clear site data": the request
    // interceptor keeps attaching the dead token, and a 401 on the next call
    // triggers a refresh with a refreshToken that is just as dead. Failing to
    // log in must leave exactly the same state as never having logged in.
    loginFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
      state.isAuthenticated = false
      state.token = null
      state.refreshToken = null
      state.user = null
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