import apiClient from './apiClient'

export const proctoringAPI = {
  reportViolation: (sessionId, data) =>
    apiClient.post(`/proctoring/sessions/${sessionId}/violations`, data),

  getSessionViolations: (sessionId) =>
    apiClient.get(`/proctoring/sessions/${sessionId}/violations`),

  getViolationSummary: (sessionId) =>
    apiClient.get(`/proctoring/sessions/${sessionId}/violations/summary`)
}
