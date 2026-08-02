import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Alert,
  Snackbar,
  Typography
} from '@mui/material'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { adminAPI } from '../../api/adminAPI'

const statusColor = (status) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'REFUNDED') return 'warning'
  return 'default'
}

const formatCurrency = (amount, currency = 'INR') => {
  const value = Number(amount || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value)
}

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    user: '',
    transactionId: '',
    status: ''
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await adminAPI.getAdminPayments()
        if (mounted) setPayments(res.data.data || [])
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load payments')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const userSearch = `${p.userId || ''} ${p.candidateName || ''} ${p.candidateEmail || ''}`.toLowerCase()
      const matchUser = userSearch.includes(filters.user.toLowerCase())
      const matchTxn = String(p.transactionId || '').toLowerCase().includes(filters.transactionId.toLowerCase())
      const matchStatus = !filters.status || p.paymentStatus === filters.status
      return matchUser && matchTxn && matchStatus
    })
  }, [payments, filters])

  const summary = useMemo(() => {
    const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    return {
      total: filteredPayments.length,
      success: filteredPayments.filter((p) => p.paymentStatus === 'SUCCESS').length,
      failed: filteredPayments.filter((p) => p.paymentStatus === 'FAILED').length,
      refunded: filteredPayments.filter((p) => p.paymentStatus === 'REFUNDED').length,
      totalAmount
    }
  }, [filteredPayments])

  const renderTable = () => {
    if (loading) {
      return (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={52} />)}
        </Box>
      )
    }

    if (filteredPayments.length === 0) {
      return <EmptyState title="No payments found" description="Payment records will appear here." />
    }

    return (
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidate</TableCell>
              <TableCell>Transaction</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Application</TableCell>
              <TableCell>Application Status</TableCell>
              <TableCell>Applied On</TableCell>
              <TableCell>Exam</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.map((p) => (
              <TableRow key={p.paymentId} hover>
                <TableCell>
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>{p.candidateName || '–'}</Box>
                    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{p.userId || p.candidateEmail || '–'}</Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ fontWeight: 600 }}>{p.transactionId || '–'}</Box>
                </TableCell>
                <TableCell>{formatCurrency(p.amount, p.currency || 'INR')}</TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor(p.paymentStatus)} label={p.paymentStatus || 'UNKNOWN'} />
                </TableCell>
                <TableCell>{p.provider || '–'}</TableCell>
                <TableCell>{p.applicationId ? `#${p.applicationId}` : '–'}</TableCell>
                <TableCell>{p.applicationStatus || '–'}</TableCell>
                <TableCell>{p.appliedOn ? new Date(p.appliedOn).toLocaleDateString() : '–'}</TableCell>
                <TableCell>
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>{p.examCode || '–'}</Box>
                    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{p.examName || '–'}</Box>
                  </Box>
                </TableCell>
                <TableCell>{p.certificationLevel || '–'}</TableCell>
                <TableCell>{p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '–'}</TableCell>
                <TableCell>{p.providerReference || '–'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <Box>
      <PageHeader title="Payment Management" subtitle="Review all payment transactions and statuses" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card><CardContent><Typography variant="caption" color="text.secondary">Total Records</Typography><Typography variant="h5" fontWeight={700}>{summary.total}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card><CardContent><Typography variant="caption" color="text.secondary">Success</Typography><Typography variant="h5" fontWeight={700} color="success.main">{summary.success}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card><CardContent><Typography variant="caption" color="text.secondary">Failed</Typography><Typography variant="h5" fontWeight={700} color="error.main">{summary.failed}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card><CardContent><Typography variant="caption" color="text.secondary">Refunded</Typography><Typography variant="h5" fontWeight={700} color="warning.main">{summary.refunded}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card><CardContent><Typography variant="caption" color="text.secondary">Total Amount</Typography><Typography variant="h6" fontWeight={700}>{formatCurrency(summary.totalAmount)}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              label="Search Candidate"
              value={filters.user}
              onChange={(e) => setFilters((prev) => ({ ...prev, user: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Transaction ID"
              value={filters.transactionId}
              onChange={(e) => setFilters((prev) => ({ ...prev, transactionId: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              SelectProps={{ native: true }}
              size="small"
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="INITIATED">INITIATED</option>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        {renderTable()}
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

export default AdminPaymentsPage
