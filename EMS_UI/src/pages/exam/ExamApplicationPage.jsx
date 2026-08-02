// ems_frontend/src/pages/exam/ExamApplicationPage.jsx
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Accordion, AccordionDetails, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Radio, RadioGroup,
  Alert, Skeleton, Stack, Divider
} from '@mui/material'
import { userAPI } from '../../api/userAPI'
import { examAPI } from '../../api/examAPI'
import PageHeader from '../../components/common/PageHeader'
import StatusChip from '../../components/common/StatusChip'
import EmptyState from '../../components/common/EmptyState'
import AddIcon from '@mui/icons-material/AddRounded'
import AssignmentIcon from '@mui/icons-material/AssignmentRounded'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

const LEVELS = ['L1', 'L2', 'L3']

const nextRoute = (status, paymentStatus, applicationId) => {
  switch (status) {
    case 'APPLIED':
    case 'ELIGIBLE':
      return paymentStatus === 'SUCCESS'
        ? `/exam/schedule/${applicationId}`
        : `/exam/payment/${applicationId}`
    case 'IN_PROGRESS':
      return `/exam/schedule/${applicationId}`
    default:
      return null
  }
}

const ExamApplicationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [reApplying, setReApplying] = useState(null)
  const [reApplyError, setReApplyError] = useState('')

  // New application dialog state
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [level, setLevel] = useState(location.state?.level || 'L1')
  const [options, setOptions] = useState(null)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const restartNotice = location.state?.restartMessage || ''

  const loadApplications = async () => {
    try {
      const [dashboardRes, reApplyableRes] = await Promise.all([
        userAPI.getDashboard(),
        examAPI.getReApplyableApplications().catch(() => ({ data: { data: [] } }))
      ])

      const dashboardApps = dashboardRes.data.data?.examStatuses || []
      const reApplyableApps = reApplyableRes.data.data || []
      const reApplyMap = new Map(reApplyableApps.map((app) => [app.applicationId, app]))

      const mergedApplications = dashboardApps.map((app) => {
        const reApplyMeta = reApplyMap.get(app.applicationId)
        const failedLike = ['FAILED', 'EXPIRED', 'REJECTED'].includes(app.applicationStatus)
        return {
          ...app,
          ...(reApplyMeta || {}),
          canReApply: Boolean(reApplyMeta?.canReApply) || failedLike,
          restartRequired: Boolean(reApplyMeta?.restartRequired),
          restartMessage: reApplyMeta?.restartMessage || null
        }
      })

      const mergedById = new Map(mergedApplications.map((app) => [app.applicationId, app]))
      reApplyableApps.forEach((app) => {
        if (!mergedById.has(app.applicationId)) {
          mergedById.set(app.applicationId, {
            ...app,
            canReApply: Boolean(app.canReApply) || ['FAILED', 'EXPIRED', 'REJECTED'].includes(app.applicationStatus)
          })
        }
      })

      setApplications(Array.from(mergedById.values()))
    } catch (err) {
      console.error('Failed to load applications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const handleReApply = async (applicationId) => {
    setReApplying(applicationId)
    setReApplyError('')
    try {
      const res = await examAPI.reApply(applicationId)
      const newApplicationId = res.data.data?.applicationId
      if (!newApplicationId) {
        throw new Error('Re-application created, but no new application id was returned.')
      }
      navigate(`/exam/payment/${newApplicationId}`, { replace: true })
    } catch (err) {
      setReApplyError(err.response?.data?.message || 'Failed to re-apply. Please try again.')
    } finally {
      setReApplying(null)
    }
  }

  const openDialog = () => {
    setActiveStep(0)
    setSelectedExamId('')
    setError('')
    setOpen(true)
  }

  const loadOptions = async (lvl) => {
    setOptionsLoading(true)
    setError('')
    try {
      const res = await examAPI.getWorkflowOptions(lvl)
      setOptions(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam options')
      setOptions(null)
    } finally {
      setOptionsLoading(false)
    }
  }

  const handleNext = async () => {
    if (activeStep === 0) {
      await loadOptions(level)
      setActiveStep(1)
    } else if (activeStep === 1) {
      await handleApply()
    }
  }

  const handleApply = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await examAPI.applyForExam({
        certificationLevel: level,
        examId: Number(selectedExamId),
        remarks: ''
      })
      const applicationId = res.data.data?.applicationId
      setOpen(false)
      navigate(`/exam/payment/${applicationId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply for exam')
    } finally {
      setSubmitting(false)
    }
  }

  const eligible = options?.eligibility?.eligible !== false
  const availableExams = options?.availableExams || []

  const groupedApplications = applications.reduce((acc, app) => {
    const levelKey = app.certificationLevel || 'UNKNOWN'
    if (!acc[levelKey]) {
      acc[levelKey] = []
    }
    acc[levelKey].push(app)
    return acc
  }, {})

  const groupedEntries = Object.entries(groupedApplications).map(([level, apps]) => [
    level,
    apps.sort((a, b) => b.applicationId - a.applicationId)
  ])

  let stepTwoContent
  if (optionsLoading) {
    stepTwoContent = <Skeleton variant="rounded" height={120} />
  } else if (!eligible) {
    stepTwoContent = (
      <Alert severity="warning">
        {options?.eligibility?.message || `You are not currently eligible for ${level}.`}
      </Alert>
    )
  } else if (availableExams.length === 0) {
    stepTwoContent = <Alert severity="info">No exams are currently available for {level}.</Alert>
  } else {
    stepTwoContent = (
      <RadioGroup value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
        {availableExams.map((ex, i) => (
          <Box key={ex.examId}>
            {i > 0 && <Divider />}
            <FormControlLabel
              value={String(ex.examId)}
              control={<Radio />}
              sx={{ py: 1, alignItems: 'flex-start' }}
              label={
                <Box>
                  <Typography fontWeight={600}>{ex.examName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ex.examCode} · {ex.durationMinutes} min · Pass {String(ex.passingPercentage)}%
                  </Typography>
                </Box>
              }
            />
          </Box>
        ))}
      </RadioGroup>
    )
  }

  const errorBanner = reApplyError && (
    <Grid item xs={12}>
      <Alert severity="error" onClose={() => setReApplyError('')}>
        {reApplyError}
      </Alert>
    </Grid>
  )

  const restartBanner = restartNotice && (
    <Grid item xs={12}>
      <Alert severity="warning">
        {restartNotice}
      </Alert>
    </Grid>
  )

  let mainContent
  if (loading) {
    mainContent = (
      <Grid container spacing={2}>
        {errorBanner}
        {restartBanner}
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={4} key={i}>
            <Skeleton variant="rounded" height={160} />
          </Grid>
        ))}
      </Grid>
    )
  } else if (applications.length === 0) {
    mainContent = (
      <Card>
        <EmptyState
          icon={<AssignmentIcon fontSize="large" />}
          title="No applications yet"
          description="Start your certification journey by applying for an L1 exam."
          action={<Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>Apply now</Button>}
        />
      </Card>
    )
  } else {
    mainContent = (
      <Grid container spacing={2}>
        {errorBanner}
        {restartBanner}
        {groupedEntries.map(([levelKey, levelApps]) => {
          const anyPassed = levelApps.some((app) => app.applicationStatus === 'PASSED')
          const allFailed = levelApps.every((app) =>
            app.applicationStatus === 'FAILED' || app.applicationStatus === 'EXPIRED' || app.applicationStatus === 'REJECTED'
          )
          const hasRestartRequired = levelApps.some((app) => app.restartRequired)
          const levelHeadColor = anyPassed ? '#16a34a' : 'inherit'

          return (
            <Grid item xs={12} md={4} key={levelKey}>
              <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 2, border: '1px solid #f0f0f0' }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Accordion
                    defaultExpanded
                    disableGutters
                    sx={{
                      boxShadow: 'none', border: '1px solid #e5e7eb',
                      bgcolor: '#ffffff', borderRadius: 1.5,
                      '&:before': { display: 'none' }, mb: 0
                    }}
                  >
                    <Box
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ py: 1.5, px: 1.5, '&:hover': { bgcolor: '#f9fafb' } }}
                    >
                      <Stack direction="row" alignItems="center" gap={1.5} sx={{ width: '100%' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: anyPassed ? '#16a34a' : '#9ca3af' }} />
                        <Typography variant="h6" fontWeight={700} sx={{ color: levelHeadColor, fontSize: '1.1rem' }}>
                          {levelKey} Exam
                        </Typography>
                        {anyPassed && (
                          <Typography
                            variant="caption"
                            sx={{ px: 1.25, py: 0.625, bgcolor: '#16a34a', color: '#ffffff', borderRadius: 0.75, fontWeight: 700, fontSize: '0.7rem' }}
                          >
                            PASSED
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.9rem', fontWeight: 500 }}>
                          {levelApps.length} application{levelApps.length === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                    </Box>

                    <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                      <Stack spacing={0.75}>
                        {levelApps.map((app) => {
                          const canReApply = Boolean(app.canReApply || app.restartRequired)
                          const route = canReApply ? null : nextRoute(app.applicationStatus, app.paymentStatus, app.applicationId)
                          return (
                            <Box
                              key={app.applicationId}
                              sx={{
                                p: 1,
                                border: '1px solid #e5e7eb',
                                borderRadius: 1.25,
                                bgcolor: '#ffffff',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                  borderColor: '#d1d5db'
                                }
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.95rem' }}>
                                  Application #{app.applicationId}
                                </Typography>
                                <Stack direction="row" alignItems="center">
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                    {app.appliedOn ? new Date(app.appliedOn).toLocaleDateString() : '-'}
                                  </Typography>
                                  <StatusChip status={app.applicationStatus} />
                                </Stack>
                              </Stack>

                              {app.remarks && (
                                <Typography
                                  variant="body2" color="text.secondary"
                                  sx={{ mb: 1.25, fontSize: '0.85rem', fontStyle: 'italic' }}
                                >
                                  {app.remarks}
                                </Typography>
                              )}

                              {app.restartRequired && (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                  {app.restartMessage || 'This attempt was terminated due to policy violations. Re-apply and complete payment to restart from question 1.'}
                                </Alert>
                              )}

                              {route && (
                                <Button
                                  variant="contained" fullWidth size="small"
                                  onClick={() => navigate(route)} sx={{ mt: 0.5 }}
                                >
                                  Continue to Next Step
                                </Button>
                              )}

                              {canReApply && (
                                <Button
                                  variant="contained"
                                  color="warning"
                                  fullWidth
                                  size="small"
                                  disabled={reApplying === app.applicationId}
                                  onClick={() => handleReApply(app.applicationId)}
                                  sx={{ mt: 0.5 }}
                                >
                                  {reApplying === app.applicationId ? 'Re-applying…' : 'Re-apply & Pay Again'}
                                </Button>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    </AccordionDetails>

                    {allFailed && !hasRestartRequired && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="warning"
                          fullWidth
                          disabled={reApplying === levelApps[0].applicationId}
                          onClick={() => handleReApply(levelApps[0].applicationId)}
                          sx={{ py: 1.25, fontWeight: 600, fontSize: '0.95rem', textTransform: 'none' }}
                        >
                          {reApplying === levelApps[0].applicationId ? 'Re-applying…' : `Re-apply for ${levelKey}`}
                        </Button>
                      </Box>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Exam Applications"
        subtitle="Apply for certification exams and resume in-progress applications"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            New application
          </Button>
        }
      />

      {mainContent}

      {/* New application dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Exam Application</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            <Step><StepLabel>Choose level</StepLabel></Step>
            <Step><StepLabel>Select exam</StepLabel></Step>
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {activeStep === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select the certification level you want to apply for.
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={level}
                onChange={(_, v) => v && setLevel(v)}
                sx={{ mt: 2 }}
              >
                {LEVELS.map((l) => (
                  <ToggleButton key={l} value={l} sx={{ px: 3 }}>
                    {l}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              {stepTwoContent}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          {activeStep === 1 && (
            <Button onClick={() => setActiveStep(0)} disabled={submitting}>Back</Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={submitting || optionsLoading || (activeStep === 1 && !selectedExamId)}
          >
            {activeStep === 0 ? 'Next' : submitting ? 'Applying…' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ExamApplicationPage
