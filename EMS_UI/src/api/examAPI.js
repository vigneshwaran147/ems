import apiClient from './apiClient'

export const examAPI = {
	getWorkflowOptions: (level) => apiClient.get(`/exam-workflow/options/${level}`),

	applyForExam: (data) => apiClient.post('/exam-workflow/applications', data),

	initiatePayment: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/payments/initiate`, data),

	completePayment: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/payments/complete`, data),

	scheduleExam: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/schedule`, data),

	startExam: (applicationId, data) =>
		apiClient.post(`/exam-workflow/applications/${applicationId}/start`, data || {}),

	reApply: (applicationId) => apiClient.post(`/exam-workflow/applications/${applicationId}/re-apply`),

	getReApplyableApplications: () => apiClient.get('/exam-workflow/re-applyable'),

	getSessionQuestion: (sessionToken, questionNumber) =>
		apiClient.get(`/exam-workflow/sessions/${sessionToken}/questions/${questionNumber}`),

	// Submission & result use the numeric exam session id (examSessionId from startExam).
	// Use /submit for compatibility with backend deployments where /evaluate alias is unavailable.
	submitExam: (examSessionId, data) => apiClient.post(`/results/sessions/${examSessionId}/submit`, data),

	getExamResult: (examSessionId) => apiClient.get(`/results/sessions/${examSessionId}`),

	getMyResults: () => apiClient.get('/results/me'),

	// Question bank (admin)
	searchQuestions: (params) => apiClient.get('/questions', { params }),

	getQuestion: (id) => apiClient.get(`/questions/${id}`),
}
