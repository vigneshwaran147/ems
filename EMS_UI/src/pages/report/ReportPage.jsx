// ems_frontend/src/pages/report/ReportPage.jsx
import { useState } from 'react'
import { Box, Grid, Card, CardContent, Typography, Button, Stack, Snackbar, Alert, Divider, CircularProgress, Chip } from '@mui/material'
import { reportAPI } from '../../api/reportAPI'
import PageHeader from '../../components/common/PageHeader'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import QuizIcon from '@mui/icons-material/QuizRounded'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumRounded'
import AssessmentIcon from '@mui/icons-material/AssessmentRounded'
import ReportProblemIcon from '@mui/icons-material/ReportProblemRounded'
import DownloadIcon from '@mui/icons-material/DownloadRounded'
import HistoryIcon from '@mui/icons-material/HistoryRounded'
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded'

const FORMATS = [
  { value: 'PDF', ext: 'pdf' },
  { value: 'EXCEL', ext: 'xlsx' },
  { value: 'CSV', ext: 'csv' }
]

const REPORTS = [
  { key: 'users', title: 'User Report', desc: 'All registered users and profiles', icon: <PeopleIcon />, fn: reportAPI.getUserReport, gradient: 'linear-gradient(135deg, #667eea, #764ba2)', meta: 'Active Users & Demographics' },
  { key: 'exams', title: 'Exam Report', desc: 'Exam catalogue and schedules', icon: <QuizIcon />, fn: reportAPI.getExamReport, gradient: 'linear-gradient(135deg, #00d2fc, #3677ff)', meta: 'Schedule & Catalog' },
  { key: 'revenue', title: 'Revenue Report', desc: 'Payments and revenue analytics', icon: <TrendingUpIcon />, fn: reportAPI.getRevenueReport, gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', meta: 'Financial Insights' },
  { key: 'payment-history', title: 'Payment History', desc: 'Complete payment History and transaction records and invoices', icon: <HistoryIcon />, fn: reportAPI.getRevenueReport, gradient: 'linear-gradient(135deg, #eb3349, #f45c43)', meta: 'Transactions & Invoices' },
  { key: 'certifications', title: 'Certification Report', desc: 'Issued certifications and levels', icon: <WorkspacePremiumIcon />, fn: reportAPI.getCertificationReport, gradient: 'linear-gradient(135deg, #fa709a, #fee140)', meta: 'Credentials Issued' },
  { key: 'results', title: 'Exam Results', desc: 'Exam attempts and pass/fail analytics', icon: <AssessmentIcon />, fn: reportAPI.getResultReport, gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)', meta: 'Performance Metrics' },
  { key: 'violations', title: 'Violation Report', desc: 'Proctoring violations and incidents', icon: <ReportProblemIcon />, fn: reportAPI.getViolationReport, gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a61)', meta: 'Security & Compliance' }
]

const ReportPage = () => {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const handleDownload = async (report, format) => {
    setBusy(`${report.key}-${format.value}`)
    setError('')
    try {
      const res = await report.fn(format.value)
      const url = globalThis.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${report.key}-report.${format.ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report')
    } finally {
      setBusy('')
    }
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader title="Reports" subtitle="Generate and export comprehensive platform reports" />

      <Grid container spacing={3}>
        {REPORTS.map((report) => (
          <Grid item xs={12} sm={6} md={4} key={report.key}>
            <Card
              sx={{
                height: '100%',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
                  borderColor: '#d1d5db',
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: 2,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', background: report.gradient,
                    mb: 2.5, fontSize: '1.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {report.icon}
                </Box>

                <Chip
                  label={report.meta} size="small"
                  sx={{
                    mb: 1.25, fontWeight: 600, fontSize: '0.7rem', height: 24,
                    bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}
                />

                <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', mb: 0.75, color: '#1f2937' }}>
                  {report.title}
                </Typography>

                <Typography variant="body2" color="text.secondary"
                  sx={{ mb: 2, fontSize: '0.9rem', lineHeight: 1.5, flexGrow: 1 }}
                >
                  {report.desc}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption"
                  sx={{ fontWeight: 600, color: '#6b7280', mb: 1.25, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                  Export Formats
                </Typography>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {FORMATS.map((format) => {
                    const isLoading = busy === `${report.key}-${format.value}`
                    return (
                      <Button
                        key={format.value}
                        size="small" variant="contained"
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                        disabled={busy !== '' && busy !== `${report.key}-${format.value}`}
                        onClick={() => handleDownload(report, format)}
                        sx={{
                          fontWeight: 600, fontSize: '0.8rem',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          px: 1.5, py: 0.75, background: report.gradient, border: 'none',
                          transition: 'all 0.2s ease',
                          '&:hover:not(:disabled)': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transform: 'scale(1.02)' },
                          '&:disabled': { opacity: 0.6 }
                        }}
                      >
                        {format.value}
                      </Button>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={Boolean(error)} autoHideDuration={5000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError('')} variant="filled" sx={{ borderRadius: 1.5 }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ReportPage
