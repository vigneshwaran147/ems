import apiClient from './apiClient'

/**
 * Normalizes the backend AuthResponse into the shape the Redux store expects.
 * Backend returns { accessToken, refreshToken, user: { ..., roles: [] } }.
 * The UI works with { token, refreshToken, user: { ..., role } }.
 */
export const normalizeAuth = (data) => {
	const roles = data?.user?.roles || []
	const roleList = Array.isArray(roles) ? roles : Array.from(roles)
	const primaryRole = roleList.map((r) => String(r).replace('ROLE_', '')).includes('ADMIN')
		? 'ADMIN'
		: 'USER'

	return {
		token: data.accessToken || data.token,
		refreshToken: data.refreshToken,
		user: {
			...data.user,
			roles: roleList,
			role: primaryRole,
		},
	}
}

export const authAPI = {
	register: (data) => apiClient.post('/auth/register', data),

	login: (email, password) => apiClient.post('/auth/login', { email, password }),

	logout: () => apiClient.post('/auth/logout', {}),

	refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),

	forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),

	resetPassword: (token, newPassword) =>
		apiClient.post('/auth/reset-password', { token, newPassword }),

	changePassword: (currentPassword, newPassword) =>
		apiClient.post('/auth/change-password', { currentPassword, newPassword }),

	me: () => apiClient.get('/auth/me'),
}
