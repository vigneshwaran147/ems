// ems_frontend/src/pages/exam/ExamSchedulePage.jsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Paper, Grid, Typography, Button, Alert, TextField, Stack,
  CircularProgress, FormControlLabel, Checkbox, Chip
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import PageHeader from '../../components/common/PageHeader'
import EventAvailableIcon from '@mui/icons-material/EventAvailableRounded'
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded'

const maxViolationsAllowed = 3

const doList = [
  'Keep your face visible and stay in frame.',
  'Maintain a stable internet connection.',
  'Read each question carefully before submitting.',
  'Use only the permitted exam interface.'
]

const dontList = [
  'Do not switch tabs or minimize the browser.',
  'Do not disable camera, microphone, or screen sharing.',
  'Do not use mobile phone, notes, or external help.',
  'Do not attempt to open developer tools.'
]

const ExamSchedulePage = () => {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const [scheduledTime, setScheduledTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scheduled, setScheduled] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)

  const handleSchedule = async () => {
    if (!scheduledTime) {
      setError('Please pick a date and time.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await examAPI.scheduleExam(applicationId, {
        scheduledExamTime: new Date(scheduledTime).toISOString()
      })
      setScheduled(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule exam.')
    } finally {
      setSaving(false)
    }
  }

  // Minimum selectable time = now (local, formatted for datetime-local input).
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <Box>
      <PageHeader
        title="Schedule Your Exam"
        subtitle={`Exam application #${applicationId}`}
        titleVariant="h5"
        subtitleVariant="body2"
        titleSx={{ fontSize: { xs: '1.2rem', md: '1.4rem' } }}
        subtitleSx={{ fontSize: { xs: '0.85rem', md: '0.9rem' } }}
        inlineSubtitle
        breadcrumbs={[
          { label: 'Exams', to: '/exams' },
          { label: 'Schedule' }
        ]}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Chip color="primary" variant="outlined" icon={<ShieldRoundedIcon />} label="AI Proctored Session" />
            <Chip color="warning" variant="outlined" label={`Max violations: ${maxViolationsAllowed}`} />
            <Chip color="info" variant="outlined" label="Camera + Microphone Mandatory" />
          </Stack>
        }
      />

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} lg={10} xl={9}>
          <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {scheduled ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3, height: '100%',
                      borderColor: 'success.light',
                      background: 'linear-gradient(140deg, rgba(34,197,94,0.08), rgba(255,255,255,0.9))'
                    }}
                  >
                    <Stack spacing={1.2}>
                      <EventAvailableIcon color="success" sx={{ fontSize: 44 }} />
                      <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                        Exam scheduled
                      </Typography>
                      <Typography color="text.secondary">
                        You can start now or return when ready. Ensure your environment is quiet and permissions stay active.
                      </Typography>
                      <Alert severity="success" sx={{ mt: 1 }}>
                        Application #{applicationId} is ready for exam launch.
                      </Alert>
                      <Button
                        variant="contained" size="large"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => navigate(`/exam/${applicationId}`)}
                        disabled={!policyAccepted}
                        sx={{ mt: 1, py: 1.2, fontWeight: 700 }}
                      >
                        Start exam now
                      </Button>
                      <Button variant="text" onClick={() => navigate('/exams')}>
                        Back to applications
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5, height: '100%',
                      bgcolor: 'warning.50',
                      borderColor: 'warning.main'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                      Exam Policy and Violation Instructions
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      Violation count allowed: {maxViolationsAllowed}. On the {maxViolationsAllowed}rd violation, the exam is automatically terminated and invalidated.
                    </Alert>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Keep camera and microphone enabled. Stay in fullscreen with this exam tab in focus.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Copy/paste, right-click, tab-switching, screen-share interruption, and developer tools are prohibited.
                    </Typography>

                    <Grid container spacing={2} sx={{ mt: 0.25 }}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={800} sx={{ mb: 0.75 }}>Do's</Typography>
                        <Stack spacing={0.7}>
                          {doList.map((item) => (
                            <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: 'success.main', mt: '2px' }} />
                              <Typography variant="body2">{item}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={800} sx={{ mb: 0.75 }}>Don'ts</Typography>
                        <Stack spacing={0.7}>
                          {dontList.map((item) => (
                            <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                              <HighlightOffRoundedIcon sx={{ fontSize: 18, color: 'error.main', mt: '2px' }} />
                              <Typography variant="body2">{item}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Grid>
                    </Grid>

                    <FormControlLabel
                      sx={{ mt: 1.5, mb: 0 }}
                      control={
                        <Checkbox
                          checked={policyAccepted}
                          onChange={(e) => setPolicyAccepted(e.target.checked)}
                        />
                      }
                      label="I have read and understood the exam rules and violation policy."
                    />
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderStyle: 'dashed',
                  borderColor: 'primary.light',
                  bgcolor: 'rgba(79,70,229,0.03)'
                }}
              >
                <Typography variant="h6" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.01em' }}>
                  Pick a date and time
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Choose when you would like to take your proctored exam. You can reschedule before starting.
                </Typography>
                <TextField
                  type="datetime-local"
                  fullWidth
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: minDateTime }}
                  sx={{ mt: 2 }}
                />
                <Button
                  variant="contained" size="large" fullWidth
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <EventAvailableIcon />}
                  disabled={saving}
                  onClick={handleSchedule}
                  sx={{ mt: 3 }}
                >
                  {saving ? 'Scheduling…' : 'Confirm schedule'}
                </Button>
              </Paper>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExamSchedulePage
