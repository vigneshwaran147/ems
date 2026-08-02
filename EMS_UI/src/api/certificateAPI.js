import apiClient from './apiClient'

export const certificateAPI = {
	getCertificates: () => apiClient.get('/certificates/me'),

	getCertificate: (certificateNumber) => apiClient.get(`/certificates/${certificateNumber}`),

	downloadCertificate: (certificateNumber) =>
		apiClient.get(`/certificates/${certificateNumber}/download`, { responseType: 'blob' }),

	verifyCertificate: (certificateNumber) => apiClient.get(`/certificates/verify/${certificateNumber}`),

	generateCertificate: (examSessionId) =>
		apiClient.post(`/certificates/sessions/${examSessionId}/generate`, {}),
}
