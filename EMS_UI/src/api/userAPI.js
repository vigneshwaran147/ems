import apiClient from './apiClient'

/** Reads a File object as a data URL, which is the form the server stores. */
const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.onerror = reject
		reader.readAsDataURL(file)
	})

export const userAPI = {
	// UserProfileController serves the current user under /users/me — not
	// /users/profile, which never existed and 404'd every call below.
	getProfile: () => apiClient.get('/users/me'),

	updateProfile: (data) => apiClient.put('/users/me', data),

	uploadProfilePhoto: async (file) => {
		const profilePhoto = await fileToBase64(file)
		return apiClient.post('/users/me/photo', { profilePhoto })
	},

	// The photo endpoint is Bearer-authenticated, so it cannot be used as a bare
	// <img src>. Callers fetch the bytes here and hand the blob to an object URL.
	getProfilePhoto: () => apiClient.get('/users/me/photo', { responseType: 'blob' }),

	getDashboard: () => apiClient.get('/dashboard/me'),

	getCertificationHistory: () => apiClient.get('/certifications/history'),

	checkCertificationEligibility: (level) => apiClient.get(`/certifications/eligibility/${level}`),

	applyForCertification: (data) => apiClient.post('/certifications/applications', data),
}
