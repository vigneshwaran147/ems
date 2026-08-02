// ems_frontend/src/store/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import authReducer from './slices/authSlice'
import userReducer from './slices/userSlice'
import certificationReducer from './slices/certificationSlice'
import examReducer from './slices/examSlice'
import paymentReducer from './slices/paymentSlice'
import certificateReducer from './slices/certificateSlice'
import proctoringReducer from './slices/proctoringSlice'
import reportReducer from './slices/reportSlice'
import adminReducer from './slices/adminSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  certification: certificationReducer,
  exam: examReducer,
  payment: paymentReducer,
  certificate: certificateReducer,
  proctoring: proctoringReducer,
  report: reportReducer,
  admin: adminReducer
})

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'user']
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
})

export const persistor = persistStore(store)
export default store
