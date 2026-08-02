import axios from 'axios'
import store from '../store/store'
import { setToken, logout } from '../store/slices/authSlice'

// In local dev, keep requests relative so Vite proxy forwards to :8080 and
// prevents browser-side CORS errors.
const isLocalDev = import.meta.env.DEV && !import.meta.env.PROD
// const API_BASE_URL = isLocalDev
//   ? ''
//   : (import.meta.env?.VITE_API_URL || 'http://localhost:8080')
// ==> Available at your primary URL https://ems-1ze5.onrender.com
const API_BASE_URL = 'https://ems-1ze5.onrender.com'
const apiClient = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	headers: {
		'Content-Type': 'application/json',
	},
})

// Request interceptor to add token
apiClient.interceptors.request.use(
	(config) => {
		const state = store.getState()
		const token = state.auth.token
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => {
		return Promise.reject(error)
	}
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config
		const state = store.getState()

		if (error.response?.status === 401 && !originalRequest._retry && state.auth.refreshToken) {
			try {
				const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
					refreshToken: state.auth.refreshToken,
				})
				const data = refreshResponse.data.data
				const token = data.accessToken || data.token
				const refreshToken = data.refreshToken
				store.dispatch(setToken({ token, refreshToken }))
				originalRequest.headers.Authorization = `Bearer ${token}`
				return apiClient(originalRequest)
			} catch (refreshError) {
				store.dispatch(logout())
				return Promise.reject(refreshError)
			}
		}

		return Promise.reject(error)
	}
)

export default apiClient
