import apiClient from './apiClient'

/** Reads a File object as a base64 data-less string (raw base64 payload). */
const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.onerror = reject
		reader.readAsDataURL(file)
	})

export const userAPI = {
	getProfile: () => apiClient.get('/users/profile'),

	updateProfile: (data) => apiClient.put('/users/profile', data),

	uploadProfilePhoto: async (file) => {
		const profilePhoto = await fileToBase64(file)
		return apiClient.post('/users/profile/photo', { profilePhoto })
	},

	getDashboard: () => apiClient.get('/dashboard/me'),

	getCertificationHistory: () => apiClient.get('/certifications/history'),

	checkCertificationEligibility: (level) => apiClient.get(`/certifications/eligibility/${level}`),

	applyForCertification: (data) => apiClient.post('/certifications/applications', data),
}
