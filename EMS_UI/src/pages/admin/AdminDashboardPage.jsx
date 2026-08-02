// ems_frontend/src/pages/admin/AdminDashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Skeleton, Paper, Typography, Button, Stack } from '@mui/material'
import { adminAPI } from '../../api/adminAPI'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import PeopleIcon from '@mui/icons-material/PeopleAltRounded'
import QuizIcon from '@mui/icons-material/QuizRounded'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumRounded'
import ReportProblemIcon from '@mui/icons-material/ReportProblemRounded'
import PaidIcon from '@mui/icons-material/PaidRounded'
import HelpCenterIcon from '@mui/icons-material/HelpCenterRounded'

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [users, exams, questions, certificates, violations, payments] =
          await Promise.allSettled([
            adminAPI.getAllUsers(),
            adminAPI.getAllExams(),
            adminAPI.getAdminQuestions(),
            adminAPI.getAdminCertificates(),
            adminAPI.getAllViolations(),
            adminAPI.getAdminPayments()
          ])
        const len = (r) => (r.status === 'fulfilled' ? r.value.data?.data?.length || 0 : 0)
        const revenue = payments.status === 'fulfilled'
          ? (payments.value.data?.data || [])
              .filter((p) => p.paymentStatus === 'SUCCESS')
              .reduce((sum, p) => sum + Number(p.amount || 0), 0)
          : 0
        if (mounted) {
          setStats({
            users: len(users),
            exams: len(exams),
            questions: len(questions),
            certificates: len(certificates),
            violations: len(violations),
            revenue
          })
        }
      } catch (err) {
        console.error('Failed to load admin stats', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const cards = [
    { title: 'Total Users', value: stats?.users ?? 0, icon: <PeopleIcon />, gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
    { title: 'Exams', value: stats?.exams ?? 0, icon: <QuizIcon />, gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    { title: 'Questions', value: stats?.questions ?? 0, icon: <HelpCenterIcon />, gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    { title: 'Certificates', value: stats?.certificates ?? 0, icon: <WorkspacePremiumIcon />, gradient: 'linear-gradient(135deg, #16a34a, #22c55e)' },
    { title: 'Violations', value: stats?.violations ?? 0, icon: <ReportProblemIcon />, gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    { title: 'Revenue', value: `₹${(stats?.revenue ?? 0).toLocaleString()}`, icon: <PaidIcon />, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }
  ]

  return (
    <Box>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview and key metrics" />

      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.title}>
            {loading ? <Skeleton variant="rounded" height={104} /> : <StatCard {...c} />}
          </Grid>
        ))}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Management</Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/admin/users')}>Manage users</Button>
              <Button variant="outlined" onClick={() => navigate('/admin/exams')}>Manage exams</Button>
              <Button variant="outlined" onClick={() => navigate('/admin/questions')}>Manage questions</Button>
              <Button variant="outlined" onClick={() => navigate('/admin/payments')}>Review payments</Button>
              <Button variant="outlined" onClick={() => navigate('/admin/violations')}>Review violations</Button>
              <Button variant="outlined" onClick={() => navigate('/reports')}>Generate reports</Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AdminDashboardPage
