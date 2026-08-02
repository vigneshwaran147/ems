// ems_frontend/src/pages/admin/AdminViolationsPage.jsx
import { useEffect, useState } from 'react'
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Skeleton, Chip, Snackbar, Alert
} from '@mui/material'
import { adminAPI } from '../../api/adminAPI'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'

const AdminViolationsPage = () => {
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sessionStatusColor = (status) => {
    if (status === 'COMPLETED') return 'success'
    if (status === 'TERMINATED') return 'error'
    if (status === 'IN_PROGRESS') return 'warning'
    return 'default'
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await adminAPI.getAllViolations()
        if (mounted) setViolations(res.data.data || [])
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load violations')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const tableContent = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Candidate</TableCell>
            <TableCell>Session</TableCell>
            <TableCell>Application</TableCell>
            <TableCell>Exam</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Session Status</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Violation Level</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Policy</TableCell>
            <TableCell>Detected</TableCell>
            <TableCell>Terminated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {violations.map((v) => (
            <TableRow key={v.violationId} hover>
              <TableCell>
                <Box>
                  <Box sx={{ fontWeight: 600 }}>{v.candidateName || '–'}</Box>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{v.userId || '–'}</Box>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{v.candidateEmail || '–'}</Box>
                </Box>
              </TableCell>
              <TableCell>#{v.sessionId}</TableCell>
              <TableCell>{v.applicationId ? `#${v.applicationId}` : '–'}</TableCell>
              <TableCell>
                <Box>
                  <Box sx={{ fontWeight: 600 }}>{v.examCode || '–'}</Box>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{v.examName || '–'}</Box>
                </Box>
              </TableCell>
              <TableCell>{v.certificationLevel || '–'}</TableCell>
              <TableCell>
                <Chip size="small" color={sessionStatusColor(v.sessionStatus)} label={v.sessionStatus || 'UNKNOWN'} />
              </TableCell>
              <TableCell>
                <Chip size="small" color="warning" variant="outlined" label={String(v.violationType).replace(/_/g, ' ')} />
              </TableCell>
              <TableCell>{v.violationLevel}</TableCell>
              <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.description || '–'}
              </TableCell>
              <TableCell>{v.actionTaken || '–'}</TableCell>
              <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.policyMessage || '–'}
              </TableCell>
              <TableCell>{v.detectedAt ? new Date(v.detectedAt).toLocaleString() : '–'}</TableCell>
              <TableCell>
                {v.examTerminated
                  ? <Chip size="small" color="error" label="Yes" />
                  : <Chip size="small" label="No" variant="outlined" />}
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
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={52} />)}
      </Box>
    )
  } else if (violations.length === 0) {
    paperContent = <EmptyState title="No violations recorded" description="Proctoring violations will appear here." />
  } else {
    paperContent = tableContent
  }

  return (
    <Box>
      <PageHeader title="Violation Management" subtitle="Monitor proctoring violations across exam sessions" />

      <Paper>
        {paperContent}
      </Paper>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  )
}

export default AdminViolationsPage
