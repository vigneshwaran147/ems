import apiClient from './apiClient'

// All report endpoints are admin-scoped under /api/admin/reports and return a
// downloadable file (PDF | EXCEL | CSV). Responses are always binary.
const download = (path, format) =>
	apiClient.get(path, { params: { format }, responseType: 'blob' })

export const reportAPI = {
	getUserReport: (format = 'PDF') => download('/admin/reports/users', format),
	getExamReport: (format = 'PDF') => download('/admin/reports/exams', format),
	getRevenueReport: (format = 'PDF') => download('/admin/reports/revenue', format),
	getCertificationReport: (format = 'PDF') => download('/admin/reports/certifications', format),
	getResultReport: (format = 'PDF') => download('/admin/reports/results', format),
	getViolationReport: (format = 'PDF') => download('/admin/reports/violations', format),
}
