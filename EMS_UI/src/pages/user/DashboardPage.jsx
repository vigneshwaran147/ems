// ems_frontend/src/pages/user/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Grid, Paper, Typography, Card, CardContent, Button, Box, Chip,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../api/userAPI'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import StatusChip from '../../components/common/StatusChip'
import EmptyState from '../../components/common/EmptyState'
import SchoolIcon from '@mui/icons-material/SchoolRounded'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumRounded'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import EventBusyIcon from '@mui/icons-material/EventBusyRounded'
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded'

const LEVELS = ['L1', 'L2', 'L3']

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await userAPI.getDashboard()
        if (mounted) setData(res.data.data)
      } catch (err) {
        console.error('Failed to load dashboard', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const summary = data?.reportSummary || {}
  const activeCerts = data?.activeCertifications || []
  const examStatuses = data?.examStatuses || []
  const sortedExamStatuses = [...examStatuses].sort((a, b) => {
    const left = Number(a?.applicationId ?? 0)
    const right = Number(b?.applicationId ?? 0)
    return right - left
  })

  const firstName = data?.user?.firstName || user?.firstName || 'there'

  const stats = [
    { title: 'Applications', value: summary.totalApplications ?? 0, icon: <AssignmentTurnedInIcon />, gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
    { title: 'Active Certifications', value: summary.activeCertifications ?? 0, icon: <SchoolIcon />, gradient: 'linear-gradient(135deg, #16a34a, #22c55e)' },
    { title: 'Passed', value: summary.passedApplications ?? 0, icon: <WorkspacePremiumIcon />, gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    { title: 'Expired', value: summary.expiredCertifications ?? 0, icon: <EventBusyIcon />, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }
  ]

  return (
    <Box>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle="Here's an overview of your certification journey"
        action={
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/certifications')}>
            Continue journey
          </Button>
        }
      />

      <Grid container spacing={3}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.title}>
            {loading ? <Skeleton variant="rounded" height={104} /> : <StatCard {...s} />}
          </Grid>
        ))}

        {/* Certification levels */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Certification Journey
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {LEVELS.map((level, idx) => {
                const cert = activeCerts.find((c) => c.certificationLevel === level || c.level === level)
                const prevPassed = idx === 0 || activeCerts.some((c) =>
                  c.certificationLevel === LEVELS[idx - 1] || c.level === LEVELS[idx - 1]
                )
                const locked = idx > 0 && !prevPassed
                return (
                  <Grid item xs={12} sm={4} key={level}>
                    <Card
                      variant="outlined"
                      sx={{ borderColor: cert ? 'success.light' : 'divider' }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>
                            Level {level.slice(1)}
                          </Typography>
                          <SchoolIcon color={cert ? 'success' : locked ? 'disabled' : 'primary'} />
                        </Stack>
                        <Box sx={{ mt: 1 }}>
                          {cert ? (
                            <StatusChip status={cert.status || 'ACTIVE'} />
                          ) : locked ? (
                            <Chip size="small" label="Locked" />
                          ) : (
                            <Chip size="small" color="primary" variant="outlined" label="Available" />
                          )}
                        </Box>
                        <Button
                          size="small"
                          fullWidth
                          sx={{ mt: 2 }}
                          variant={cert ? 'outlined' : 'contained'}
                          disabled={locked}
                          onClick={() => navigate('/certifications')}
                        >
                          {cert ? 'View' : 'Start'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Quick actions */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Quick Actions
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Button variant="contained" fullWidth onClick={() => navigate('/exams')}>
                Apply for an exam
              </Button>
              <Button variant="outlined" fullWidth onClick={() => navigate('/certificates')}>
                View my certificates
              </Button>
              <Button variant="outlined" fullWidth onClick={() => navigate('/profile')}>
                Update profile
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Exam applications */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent Exam Applications
            </Typography>
            {examStatuses.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Apply for your L1 certification exam to get started."
                action={<Button variant="contained" onClick={() => navigate('/exams')}>Apply now</Button>}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Application</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Applied On</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedExamStatuses.map((e) => (
                      <TableRow key={e.applicationId} hover>
                        <TableCell>#{e.applicationId}</TableCell>
                        <TableCell>{e.certificationLevel}</TableCell>
                        <TableCell><StatusChip status={e.applicationStatus} /></TableCell>
                        <TableCell>{e.appliedOn ? new Date(e.appliedOn).toLocaleDateString() : '–'}</TableCell>
                        <TableCell>{e.remarks || '–'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardPage
