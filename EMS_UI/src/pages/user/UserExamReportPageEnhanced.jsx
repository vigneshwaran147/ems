// ems_frontend/src/pages/user/UserExamReportPageEnhanced.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  Box, Grid, Card, CardContent, TextField, Button, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TablePagination, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Breadcrumbs, InputAdornment, CircularProgress, Link as MuiLink,
  Divider, Alert
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import { certificateAPI } from '../../api/certificateAPI'
import SearchIcon from '@mui/icons-material/SearchRounded'
import HomeIcon from '@mui/icons-material/HomeRounded'
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded'

const normalizeStatus = (statusValue, resultValue, submittedAt) => {
  const raw = String(statusValue || '').trim().toUpperCase()
  if (raw === 'COMPLETED') return 'Completed'
  if (raw === 'IN_PROGRESS' || raw === 'IN PROGRESS' || raw === 'ONGOING') return 'In Progress'
  const resultRaw = String(resultValue || '').trim().toUpperCase()
  if (resultRaw === 'PASSED' || resultRaw === 'FAILED' || resultRaw === 'PASS' || resultRaw === 'FAIL') {
    return 'Completed'
  }
  if (submittedAt) return 'Completed'
  return 'In Progress'
}

const PRIMARY_COLOR = '#0F3D7A'
const SECONDARY_BG = '#F8FAFB'
const BORDER_COLOR = '#E5E7EB'

const UserExamReportPageEnhanced = () => {
  const [exams, setExams] = useState([])
  const [rawResults, setRawResults] = useState([])
  const [certificatesCount, setCertificatesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderBy, setOrderBy] = useState('examDate')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedExam, setSelectedExam] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    examName: '',
    startDate: '',
    endDate: '',
    result: ''
  })

  useEffect(() => {
    loadUserExamReports()
  }, [])

  const loadUserExamReports = async () => {
    setLoading(true)
    setError('')
    try {
      const [resultsRes, certificatesRes] = await Promise.allSettled([
        examAPI.getMyResults(),
        certificateAPI.getCertificates()
      ])

      const resultsData = resultsRes.status === 'fulfilled' ? (resultsRes.value.data?.data || []) : []
      const certificatesData = certificatesRes.status === 'fulfilled' ? (certificatesRes.value.data?.data || []) : []

      setRawResults(resultsData)
      setCertificatesCount(certificatesData.length)

      const mapped = resultsData.map((item, idx) => {
        const totalMarks = Number(item.totalMarks || 0)
        const obtainedMarks = Number(item.obtainedMarks ?? item.score ?? 0)
        const pctFromApi = Number(item.percentage)
        const pctFromMarks = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
        const pctFromScore = obtainedMarks > 0 && obtainedMarks <= 100 ? Math.round(obtainedMarks) : 0
        let pct = pctFromScore
        if (pctFromMarks > 0) { pct = pctFromMarks }
        if (Number.isFinite(pctFromApi) && pctFromApi > 0) { pct = pctFromApi }

        const resultText = (item.resultStatus || item.result || '').toString().toUpperCase()
        let mappedResult = 'UNKNOWN'
        if (resultText) { mappedResult = resultText }
        if (resultText === 'PASS') { mappedResult = 'PASSED' }
        else if (resultText === 'FAIL') { mappedResult = 'FAILED' }

        return {
          id: item.examSessionId || item.sessionId || item.id || idx + 1,
          examId: item.examCode || item.examId || `EX-${item.examSessionId || idx + 1}`,
          examSessionId: item.examSessionId || item.sessionId || idx + 1,
          examName: item.examName || 'Exam',
          examLevel: item.certificationLevel || item.examLevel || 'N/A',
          examDate: item.examDate || item.scheduledDate || item.submittedAt || item.lastUpdated || new Date().toISOString(),
          score: obtainedMarks,
          totalScore: totalMarks,
          percentage: pct,
          result: mappedResult,
          status: normalizeStatus(item.status || item.examStatus, mappedResult, item.submittedAt),
          correctAnswers: Number(item.correctAnswers ?? 0),
          totalQuestions: Number(item.totalQuestions ?? item.attemptedQuestions ?? 0),
          lastUpdated: item.submittedAt || item.lastUpdated || item.examDate || new Date().toISOString(),
          certificateId: item.certificateId || null
        }
      })
      setExams(mapped)

      if (resultsRes.status === 'rejected') {
        setError('Failed to load exam results')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam reports')
      setExams([])
      setRawResults([])
      setCertificatesCount(0)
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchExamName = exam.examName.toLowerCase().includes(searchFilters.examName.toLowerCase())
      const matchResult = searchFilters.result === '' || exam.result === searchFilters.result

      let matchDateRange = true
      if (searchFilters.startDate) {
        matchDateRange = new Date(exam.examDate) >= new Date(searchFilters.startDate)
      }
      if (searchFilters.endDate && matchDateRange) {
        matchDateRange = new Date(exam.examDate) <= new Date(searchFilters.endDate)
      }

      return matchExamName && matchResult && matchDateRange
    })
  }, [exams, searchFilters])

  const sortedExams = useMemo(() => {
    const sorted = [...filteredExams]
    sorted.sort((a, b) => {
      const aValue = a[orderBy]
      const bValue = b[orderBy]
      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredExams, orderBy, order])

  const paginatedExams = useMemo(() => {
    return sortedExams.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [sortedExams, page, rowsPerPage])

  const stats = useMemo(() => {
    const normalizedResults = rawResults.map((item) => {
      const resultText = (item.resultStatus || item.result || '').toString().toUpperCase()
      const totalMarks = Number(item.totalMarks || 0)
      const obtainedMarks = Number(item.obtainedMarks ?? item.score ?? 0)
      const pctFromApi = Number(item.percentage)
      const pctFromMarks = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
      const pctFromScore = obtainedMarks > 0 && obtainedMarks <= 100 ? Math.round(obtainedMarks) : 0
      let pct = pctFromScore
      if (pctFromMarks > 0) { pct = pctFromMarks }
      if (Number.isFinite(pctFromApi) && pctFromApi > 0) { pct = pctFromApi }

      let normalizedResult = resultText
      if (resultText === 'PASS') { normalizedResult = 'PASSED' }
      else if (resultText === 'FAIL') { normalizedResult = 'FAILED' }

      return { result: normalizedResult, percentage: pct }
    })

    const completedCount = normalizedResults.length
    const passedCount = normalizedResults.filter((r) => r.result === 'PASSED').length
    const avgScore = completedCount > 0
      ? Math.round(normalizedResults.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / completedCount)
      : 0

    return {
      total: completedCount,
      completed: completedCount,
      passed: passedCount,
      avgScore,
      certificates: certificatesCount
    }
  }, [rawResults, certificatesCount])

  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(columnId)
      setOrder('asc')
    }
  }

  const handlePageChange = (event, newPage) => setPage(newPage)
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleFilterChange = (field, value) => {
    setSearchFilters((prev) => ({ ...prev, [field]: value }))
    setPage(0)
  }

  const handleViewDetails = (exam) => {
    setSelectedExam(exam)
    setDetailsOpen(true)
  }

  const handleExport = (format) => {
    const headers = ['Exam ID', 'Exam Name', 'Level', 'Exam Date', 'Score', 'Percentage', 'Result', 'Status', 'Certificate', 'Questions', 'Last Updated']
    if (format === 'CSV') {
      const csv = [
        headers.join(','),
        ...sortedExams.map((exam) => [
          exam.examId,
          exam.examName,
          exam.examLevel,
          exam.examDate,
          `${exam.score}/${exam.totalScore}`,
          `${exam.percentage}%`,
          exam.result,
          exam.status,
          exam.certificateId || 'N/A',
          `${exam.correctAnswers}/${exam.totalQuestions}`,
          new Date(exam.lastUpdated).toLocaleString()
        ].join(','))
      ].join('\n')

      const url = globalThis.URL.createObjectURL(new Blob([csv]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `my-exam-reports-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(url)
    }
  }

  const getResultColor = (result) => result === 'PASSED' ? '#10b981' : '#ef4444'
  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return '#10b981'
    if (percentage >= 70) return '#f59e0b'
    return '#ef4444'
  }
  const getStatusColor = (status) => {
    if (status === 'Completed') return '#3b82f6'
    if (status === 'In Progress') return '#f59e0b'
    return '#6b7280'
  }

  const headerCellSx = {
    fontWeight: 700,
    color: '#1f2937',
    borderBottom: `1px solid ${BORDER_COLOR}`,
    bgcolor: '#f5f5f5'
  }

  return (
    <Box sx={{ p: 3, bgcolor: SECONDARY_BG }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon fontSize="small" /> Home
        </MuiLink>
        <MuiLink underline="hover" color="inherit">My Reports</MuiLink>
        <Typography color="textPrimary" fontWeight={600}>Exam Report</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: PRIMARY_COLOR, mb: 0.5 }}>
            My Exam Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View your exam performance and detailed results
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('CSV')}
            sx={{ background: PRIMARY_COLOR, fontWeight: 600, textTransform: 'none' }}
          >
            Export CSV
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Exams', value: stats.total, bg: '#EEF2FF', color: PRIMARY_COLOR },
          { label: 'Completed', value: stats.completed, bg: '#EFFGFF', color: '#3b82f6' },
          { label: 'Passed', value: stats.passed, bg: '#ECFDF5', color: '#10b981' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, bg: '#FEF3C7', color: '#f59e0b' },
          { label: 'Certificates', value: stats.certificates, bg: '#F3E8FF', color: '#8a55f7' }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={2.4} key={stat.label}>
            <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: stat.color, mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search & Filter Card */}
      <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: '1rem' }}>
            Search &amp; Filter
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth size="small" placeholder="Exam Name"
                value={searchFilters.examName}
                onChange={(e) => handleFilterChange('examName', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth size="small" type="date" label="Start Date"
                value={searchFilters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth size="small" type="date" label="End Date"
                value={searchFilters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth size="small" select label="Result"
                value={searchFilters.result}
                onChange={(e) => handleFilterChange('result', e.target.value)}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: '#fff' } }}
              >
                <option value="">All Results</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'examId'} direction={orderBy === 'examId' ? order : 'asc'} onClick={() => handleSort('examId')}>
                    Exam ID
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'examName'} direction={orderBy === 'examName' ? order : 'asc'} onClick={() => handleSort('examName')}>
                    Exam Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'examLevel'} direction={orderBy === 'examLevel' ? order : 'asc'} onClick={() => handleSort('examLevel')}>
                    Level
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'examDate'} direction={orderBy === 'examDate' ? order : 'asc'} onClick={() => handleSort('examDate')}>
                    Exam Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'score'} direction={orderBy === 'score' ? order : 'asc'} onClick={() => handleSort('score')}>
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel active={orderBy === 'percentage'} direction={orderBy === 'percentage' ? order : 'asc'} onClick={() => handleSort('percentage')}>
                    Percentage
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>Result</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
                <TableCell sx={headerCellSx}>Certificate</TableCell>
                <TableCell sx={headerCellSx}>Questions</TableCell>
                <TableCell sx={headerCellSx}>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                    No exam records found
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.length > 0 && paginatedExams.map((exam) => (
                <TableRow
                  key={exam.id}
                  onClick={() => handleViewDetails(exam)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f9fafb' }, borderBottom: `1px solid ${BORDER_COLOR}` }}
                >
                  <TableCell sx={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{exam.examId}</TableCell>
                  <TableCell sx={{ color: '#1f2937', fontWeight: 600 }}>{exam.examName}</TableCell>
                  <TableCell sx={{ color: '#1f2937', fontWeight: 600 }}>{exam.examLevel}</TableCell>
                  <TableCell sx={{ color: '#6b7280' }}>{new Date(exam.examDate).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ color: '#1f2937', fontWeight: 600 }}>{exam.score}/{exam.totalScore}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${exam.percentage}%`} size="small"
                      sx={{ bgcolor: getPercentageColor(exam.percentage), color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exam.result} size="small"
                      sx={{ bgcolor: getResultColor(exam.result), color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exam.status} size="small"
                      sx={{ bgcolor: getStatusColor(exam.status), color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    {exam.certificateId ? (
                      <Chip label={exam.certificateId} size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '0.75rem' }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Not Generated</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937', fontWeight: 600 }}>{exam.correctAnswers}/{exam.totalQuestions}</TableCell>
                  <TableCell sx={{ color: '#6b7280', fontSize: '0.875rem' }}>{new Date(exam.lastUpdated).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedExams.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          sx={{ borderTop: `1px solid ${BORDER_COLOR}`, '& .MuiTablePagination-toolbar': { py: 1.5 } }}
        />
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', py: 2, bgcolor: PRIMARY_COLOR, color: '#fff' }}>
          Exam Details &amp; Performance
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {selectedExam && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Exam Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Exam ID</Typography>
                    <Typography variant="body2" sx={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{selectedExam.examId}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Exam Name</Typography>
                    <Typography variant="body2">{selectedExam.examName}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Exam Date</Typography>
                    <Typography variant="body2">{new Date(selectedExam.examDate).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Status</Typography>
                    <Chip label={selectedExam.status} size="small" sx={{ bgcolor: '#3be2f5', color: '#fff', fontWeight: 600 }} />
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Performance Metrics</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Marks Obtained</Typography>
                    <Typography variant="h6" sx={{ color: getResultColor(selectedExam.result) }}>{selectedExam.score}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Marks</Typography>
                    <Typography variant="h6">{selectedExam.totalScore}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Correct Answers</Typography>
                    <Typography variant="body2">{selectedExam.correctAnswers}/{selectedExam.totalQuestions}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Percentage</Typography>
                    <Chip
                      label={`${selectedExam.percentage}%`}
                      sx={{ bgcolor: getPercentageColor(selectedExam.percentage), color: '#fff', fontWeight: 600 }}
                    />
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Result</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Chip label={selectedExam.result} sx={{ bgcolor: getResultColor(selectedExam.result), color: '#fff', fontWeight: 600 }} />
                  </Grid>
                  {selectedExam.certificateId && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Certificate ID: </Typography>
                      <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>{selectedExam.certificateId}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsOpen(false)} variant="contained" fullWidth sx={{ background: PRIMARY_COLOR }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UserExamReportPageEnhanced
