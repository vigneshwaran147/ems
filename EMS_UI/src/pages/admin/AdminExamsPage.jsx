// ems_frontend/src/pages/admin/AdminExamsPage.jsx
import { useEffect, useState, useCallback } from 'react'
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Skeleton, Snackbar, Alert
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { adminAPI } from '../../api/adminAPI'
import PageHeader from '../../components/common/PageHeader'
import StatusChip from '../../components/common/StatusChip'
import EmptyState from '../../components/common/EmptyState'
import AddIcon from '@mui/icons-material/AddRounded'
import PublishIcon from '@mui/icons-material/PublishRounded'

const LEVELS = ['L1', 'L2', 'L3']

const AdminExamsPage = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getAllExams()
      setExams(res.data.data || [])
    } catch (err) {
      setFeedback({ severity: 'error', msg: err.response?.data?.message || 'Failed to load exams' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onCreate = async (data) => {
    setSaving(true)
    try {
      await adminAPI.createExam({
        examCode: data.examCode,
        examName: data.examName,
        certificationLevel: data.certificationLevel,
        durationMinutes: Number(data.durationMinutes),
        totalMarks: Number(data.totalMarks),
        passingPercentage: Number(data.passingPercentage)
      })
      setFeedback({ severity: 'success', msg: 'Exam created' })
      setOpen(false)
      reset()
      load()
    } catch (err) {
      setFeedback({ severity: 'error', msg: err.response?.data?.message || 'Failed to create exam' })
    } finally {
      setSaving(false)
    }
  }

  const publish = async (examId) => {
    try {
      await adminAPI.publishExam(examId)
      setFeedback({ severity: 'success', msg: 'Exam published' })
      load()
    } catch (err) {
      setFeedback({ severity: 'error', msg: err.response?.data?.message || 'Failed to publish' })
    }
  }

  const tableContent = (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Pass %</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {exams.map((ex) => (
            <TableRow key={ex.id} hover>
              <TableCell>{ex.examCode}</TableCell>
              <TableCell>{ex.examName}</TableCell>
              <TableCell>{ex.certificationLevel}</TableCell>
              <TableCell>{ex.durationMinutes} min</TableCell>
              <TableCell>{String(ex.passingPercentage)}%</TableCell>
              <TableCell><StatusChip status={ex.published ? 'PUBLISHED' : ex.examStatus} /></TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PublishIcon />}
                  disabled={ex.published}
                  onClick={() => publish(ex.id)}
                >
                  {ex.published ? 'Published' : 'Publish'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  let paperContent
  if (loading) {
    paperContent = (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} />)}
      </Box>
    )
  } else if (exams.length === 0) {
    paperContent = <EmptyState title="No exams yet" description="Create your first exam to get started." />
  } else {
    paperContent = tableContent
  }

  return (
    <Box>
      <PageHeader
        title="Exam Management"
        subtitle="Create, publish and manage examinations"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { reset(); setOpen(true) }}>
            New exam
          </Button>
        }
      />

      <Paper>
        {paperContent}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Exam</DialogTitle>
        <form onSubmit={handleSubmit(onCreate)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Exam Code"
                  {...register('examCode', { required: 'Required' })}
                  error={!!errors.examCode} helperText={errors.examCode?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth select label="Level" defaultValue="L1"
                  {...register('certificationLevel', { required: true })}
                >
                  {LEVELS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Exam Name"
                  {...register('examName', { required: 'Required' })}
                  error={!!errors.examName} helperText={errors.examName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth type="number" label="Duration (min)"
                  {...register('durationMinutes', { required: 'Required' })}
                  error={!!errors.durationMinutes} helperText={errors.durationMinutes?.message}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth type="number" label="Total Marks"
                  {...register('totalMarks', { required: 'Required' })}
                  error={!!errors.totalMarks} helperText={errors.totalMarks?.message}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth type="number" label="Passing %"
                  {...register('passingPercentage', { required: 'Required' })}
                  error={!!errors.passingPercentage} helperText={errors.passingPercentage?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {feedback && (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
            {feedback.msg}
          </Alert>
        )}
      </Snackbar>
    </Box>
  )
}

export default AdminExamsPage
