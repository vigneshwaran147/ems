import apiClient from './apiClient'

export const proctoringAPI = {
  reportViolation: (sessionId, data) =>
    apiClient.post(`/proctoring/sessions/${sessionId}/violations`, data),

  getSessionViolations: (sessionId) =>
    apiClient.get(`/proctoring/sessions/${sessionId}/violations`),

  getViolationSummary: (sessionId) =>
    apiClient.get(`/proctoring/sessions/${sessionId}/violations/summary`),

  /**
   * Logs an AI/browser-security violation and returns the authoritative strike state.
   *
   * Payload: { examId, studentId, violationType, evidenceImage, description, confidence }
   * Response data: { strikeCount, isTerminated, strikesRemaining, ... }
   *
   * The evidence frame can push this body past 100KB, so it gets a longer
   * timeout than the default read APIs.
   */
  logViolation: (payload) =>
    apiClient.post('/proctor/log-violation', payload, { timeout: 20000 }),

  /**
   * Lightweight session-continuity probe. Uses an existing cheap authenticated
   * read rather than a bespoke endpoint, so it doubles as a token-validity check.
   */
  heartbeat: (sessionId) =>
    apiClient.get(`/proctoring/sessions/${sessionId}/violations/summary`, { timeout: 8000 })
}
