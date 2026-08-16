// ems_frontend/src/store/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  profile: null,
  isLoading: false,
  error: null,
  success: false
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchProfileStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    fetchProfileSuccess: (state, action) => {
      state.isLoading = false
      state.profile = action.payload
      state.error = null
    },
    fetchProfileFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
    },
    updateProfileStart: (state) => {
      state.isLoading = true
      state.error = null
      state.success = false
    },
    updateProfileSuccess: (state, action) => {
      state.isLoading = false
      state.profile = action.payload
      state.success = true
      state.error = null
    },
    updateProfileFailure: (state, action) => {
      state.isLoading = false
      state.error = action.payload
      state.success = false
    },
    // The photo saves on its own rather than with the form, so it refreshes the
    // cached profile without raising the form's success banner.
    profilePhotoUpdated: (state, action) => {
      state.profile = action.payload
      state.error = null
    },
    clearUserError: (state) => {
      state.error = null
    },
    clearSuccess: (state) => {
      state.success = false
    }
  }
})

export const {
  fetchProfileStart,
  fetchProfileSuccess,
  fetchProfileFailure,
  updateProfileStart,
  updateProfileSuccess,
  updateProfileFailure,
  profilePhotoUpdated,
  clearUserError,
  clearSuccess
} = userSlice.actions

export default userSlice.reducer