import apiClient from './apiClient'

export const paymentAPI = {
	initiatePayment: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/payments/initiate`, data),

	completePayment: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/payments/complete`, data),

	verifyPayment: (transactionId, data) => apiClient.post(`/payments/${transactionId}/verify`, data),

	getPaymentHistory: () => apiClient.get('/payments/history'),

	initiateRefund: (transactionId, reason) =>
		apiClient.post(`/payments/${transactionId}/refund`, { reason }),
}
