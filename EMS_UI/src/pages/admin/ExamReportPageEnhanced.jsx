// ems_frontend/src/pages/admin/ExamReportPageEnhanced.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  Box, Grid, Card, CardContent, TextField, Button, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TablePagination, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, InputAdornment, CircularProgress,
  Divider, Alert
} from '@mui/material'
import { reportAPI } from '../../api/reportAPI'
import SearchIcon from '@mui/icons-material/SearchRounded'
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded'
import { tokens, shadows } from '../../styles/tokens'
import PageHeader from '../../components/common/PageHeader'
import PcbSelect from '../../components/common/PcbSelect'
import PcbDateField, { parseFieldValue } from '../../components/common/PcbDateField'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Progress' },
]

const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
]

const splitCsvLine = (line) => {
  const values = []
  let value = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(value.trim())
      value = ''
    } else {
      value += ch
    }
  }
  values.push(value.trim())
  return values
}

const parseCsvRecords = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line)
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? ''
    })
    return row
  })
}

const pick = (obj, aliases) => {
  for (const key of aliases) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key]
  }
  return ''
}

const normalizeStatus = (statusValue, resultValue) => {
  const raw = String(statusValue || '').trim().toUpperCase()
  if (raw === 'COMPLETED') return 'Completed'
  if (raw === 'IN_PROGRESS' || raw === 'IN PROGRESS' || raw === 'ONGOING') return 'In Progress'
  if (raw === 'FAILED' || raw === 'PASS' || raw === 'PASSED' || raw === 'FAIL') return 'Completed'
  const resultRaw = String(resultValue || '').trim().toUpperCase()
  if (resultRaw === 'PASSED' || resultRaw === 'FAILED' || resultRaw === 'PASS' || resultRaw === 'FAIL') {
    return 'Completed'
  }
  return 'In Progress'
}

const PRIMARY_COLOR = tokens.copperLt
const BORDER_COLOR = tokens.line

const headerCellSx = {
  fontWeight: 700,
  color: tokens.ink,
  borderBottom: `1px solid ${BORDER_COLOR}`,
  bgcolor: tokens.sub3
}
const filterTextFieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: 'rgba(3,16,11,.72)' } }
const searchInputProps = {
  startAdornment: (
    <InputAdornment position="start">
      <SearchIcon fontSize="small" />
    </InputAdornment>
  )
}

const ExamReportPageEnhanced = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderBy, setOrderBy] = useState('examDate')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedExam, setSelectedExam] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    examName: '',
    examId: '',
    candidateName: '',
    candidateId: '',
    startDate: '',
    endDate: '',
    status: '',
    result: ''
  })

  useEffect(() => {
    loadExamReports()
  }, [])

  const loadExamReports = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await reportAPI.getResultReport('CSV')
      const csvText = await res.data.text()
      const rows = parseCsvRecords(csvText)
      const mapped = rows.map((row, idx) => {
        const scoreCell = String(pick(row, ['score', 'marks obtained', 'obtained marks'])).trim()
        const scoreFromSlash = scoreCell.includes('/') ? Number(scoreCell.split('/')[0]) : Number(scoreCell)
        const totalFromSlash = scoreCell.includes('/') ? Number(scoreCell.split('/')[1]) : Number(pick(row, ['total marks', 'total score']))
        const percentageRaw = String(pick(row, ['percentage', 'score %', 'score percent', 'score percentage'])).replace('%', '')
        const percentage = Number(percentageRaw || 0)
        const resultRaw = String(pick(row, ['result', 'result status'])).toUpperCase()
        let result = resultRaw || 'UNKNOWN'
        if (resultRaw === 'PASS') {
          result = 'PASSED'
        } else if (resultRaw === 'FAIL') {
          result = 'FAILED'
        }
        return {
          id: idx + 1,
          examId: pick(row, ['exam id', 'exam code']) || `EX-${idx + 1}`,
          examName: pick(row, ['exam name']) || 'Exam',
          examLevel: pick(row, ['exam level', 'certification level', 'level']) || 'N/A',
          candidateId: pick(row, ['candidate id', 'user id']) || 'N/A',
          candidateName: pick(row, ['candidate name', 'user name']) || 'N/A',
          examDate: pick(row, ['exam date', 'submitted at', 'last updated']) || new Date().toISOString(),
          score: Number.isFinite(scoreFromSlash) ? scoreFromSlash : 0,
          totalScore: Number.isFinite(totalFromSlash) && totalFromSlash > 0 ? totalFromSlash : 100,
          percentage: Number.isFinite(percentage) ? percentage : 0,
          result,
          status: normalizeStatus(pick(row, ['status', 'exam status']), result),
          certificateId: pick(row, ['certificate id', 'certificate']) || null,
          questionsAttempted: Number(pick(row, ['questions attempted', 'attempted'])) || 0,
          questionsCorrect: Number(pick(row, ['questions correct', 'correct answers'])) || 0,
          lastUpdated: pick(row, ['last updated', 'submitted at', 'exam date']) || new Date().toISOString()
        }
      })
      setExams(mapped)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam reports')
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchExamName = exam.examName.toLowerCase().includes(searchFilters.examName.toLowerCase())
      const matchExamId = exam.examId.toLowerCase().includes(searchFilters.examId.toLowerCase())
      const matchCandidateName = exam.candidateName.toLowerCase().includes(searchFilters.candidateName.toLowerCase())
      const matchCandidateId = exam.candidateId.toLowerCase().includes(searchFilters.candidateId.toLowerCase())
      const matchStatus = searchFilters.status === '' || exam.status === searchFilters.status
      const matchResult = searchFilters.result === '' || exam.result === searchFilters.result

      // Both bounds are whole *local* days, so an end date of the 15th keeps
      // the exams sat on the 15th rather than cutting them off at midnight.
      let matchDateRange = true
      const examDate = new Date(exam.examDate)
      const from = parseFieldValue(searchFilters.startDate)
      const to = parseFieldValue(searchFilters.endDate)
      if (from) {
        matchDateRange = examDate >= from
      }
      if (to && matchDateRange) {
        matchDateRange = examDate < new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)
      }

      return matchExamName && matchExamId && matchCandidateName && matchCandidateId && matchStatus && matchResult && matchDateRange
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

  // Calculate statistics
  const stats = useMemo(() => ({
    total: exams.length,
    completed: exams.filter((e) => e.status === 'Completed').length,
    inProgress: exams.filter((e) => e.status === 'In Progress').length,
    failed: exams.filter((e) => e.result === 'FAILED').length,
    passed: exams.filter((e) => e.result === 'PASSED').length
  }), [exams])

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
    const headers = [
      'Exam ID', 'Exam Name', 'Exam Level', 'Candidate ID', 'Candidate Name',
      'Exam Date', 'Score', 'Percentage', 'Result', 'Status', 'Certificate ID',
      'Questions Attempted', 'Questions Correct', 'Last Updated'
    ]
    if (format === 'CSV') {
      const csv = [
        headers.join(','),
        ...sortedExams.map((exam) => [
          exam.examId,
          exam.examName,
          exam.examLevel,
          exam.candidateId,
          exam.candidateName,
          exam.examDate,
          `${exam.score}/${exam.totalScore}`,
          `${exam.percentage}%`,
          exam.result,
          exam.status,
          exam.certificateId || 'N/A',
          exam.questionsAttempted,
          exam.questionsCorrect,
          new Date(exam.lastUpdated).toLocaleString()
        ].join(','))
      ].join('\n')

      const url = globalThis.URL.createObjectURL(new Blob([csv]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `exam-report-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(url)
    }
  }

  const getResultColor = (result) => result === 'PASSED' ? tokens.greenGlow : tokens.danger
  const getStatusColor = (status) => {
    if (status === 'Completed') return tokens.info
    if (status === 'In Progress') return tokens.warn
    return tokens.muted
  }

  return (
    <Box>
      <PageHeader
        title="Exam Report"
        subtitle="Comprehensive exam performance and results analysis"
        breadcrumbs={[
          { label: 'Home', to: '/admin/dashboard' },
          { label: 'Reports' },
          { label: 'Exam Report' }
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('CSV')}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Export CSV
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Exams', value: stats.total, color: PRIMARY_COLOR },
          { label: 'Completed', value: stats.completed, color: tokens.info },
          { label: 'In Progress', value: stats.inProgress, color: tokens.warn },
          { label: 'Failed', value: stats.failed, color: tokens.danger },
          { label: 'Passed', value: stats.passed, color: tokens.greenGlow }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={2.4} key={stat.label}>
            <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: shadows.card }}>
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
      <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: shadows.card, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: '1rem' }}>
            Search & Filter
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" placeholder="Exam Name"
                value={searchFilters.examName}
                onChange={(e) => handleFilterChange('examName', e.target.value)}
                InputProps={searchInputProps}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" placeholder="Exam ID"
                value={searchFilters.examId}
                onChange={(e) => handleFilterChange('examId', e.target.value)}
                InputProps={searchInputProps}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" placeholder="Candidate Name"
                value={searchFilters.candidateName}
                onChange={(e) => handleFilterChange('candidateName', e.target.value)}
                InputProps={searchInputProps}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" placeholder="Candidate ID"
                value={searchFilters.candidateId}
                onChange={(e) => handleFilterChange('candidateId', e.target.value)}
                InputProps={searchInputProps}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PcbDateField
                fullWidth size="small" label="Start Date"
                value={searchFilters.startDate}
                onChange={(value) => handleFilterChange('startDate', value)}
                max={searchFilters.endDate || undefined}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PcbDateField
                fullWidth size="small" label="End Date"
                value={searchFilters.endDate}
                onChange={(value) => handleFilterChange('endDate', value)}
                min={searchFilters.startDate || undefined}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PcbSelect
                fullWidth size="small" label="Status"
                value={searchFilters.status}
                onChange={(value) => handleFilterChange('status', value)}
                placeholder="All Statuses"
                options={STATUS_OPTIONS}
                sx={filterTextFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PcbSelect
                fullWidth size="small" label="Result"
                value={searchFilters.result}
                onChange={(value) => handleFilterChange('result', value)}
                placeholder="All Results"
                options={RESULT_OPTIONS}
                sx={filterTextFieldSx}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card sx={{ border: `1px solid ${BORDER_COLOR}`, boxShadow: shadows.card }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: tokens.sub3 }}>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'examId'}
                    direction={orderBy === 'examId' ? order : 'asc'}
                    onClick={() => handleSort('examId')}
                  >
                    Exam ID
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'examName'}
                    direction={orderBy === 'examName' ? order : 'asc'}
                    onClick={() => handleSort('examName')}
                  >
                    Exam Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'examLevel'}
                    direction={orderBy === 'examLevel' ? order : 'asc'}
                    onClick={() => handleSort('examLevel')}
                  >
                    Level
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>Candidate ID</TableCell>
                <TableCell sx={headerCellSx}>Candidate Name</TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'examDate'}
                    direction={orderBy === 'examDate' ? order : 'asc'}
                    onClick={() => handleSort('examDate')}
                  >
                    Exam Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'score'}
                    direction={orderBy === 'score' ? order : 'asc'}
                    onClick={() => handleSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerCellSx}>
                  <TableSortLabel
                    active={orderBy === 'percentage'}
                    direction={orderBy === 'percentage' ? order : 'asc'}
                    onClick={() => handleSort('percentage')}
                  >
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
                  <TableCell colSpan={13} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} sx={{ textAlign: 'center', py: 4, color: tokens.muted }}>
                    No records found
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.length > 0 && (
                paginatedExams.map((exam) => (
                  <TableRow
                    key={exam.id}
                    onClick={() => handleViewDetails(exam)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(192,138,46,.06)' }, borderBottom: `1px solid ${BORDER_COLOR}` }}
                  >
                    <TableCell sx={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{exam.examId}</TableCell>
                    <TableCell sx={{ color: tokens.ink }}>{exam.examName}</TableCell>
                    <TableCell sx={{ color: tokens.ink, fontWeight: 600 }}>{exam.examLevel}</TableCell>
                    <TableCell sx={{ color: tokens.body }}>{exam.candidateId}</TableCell>
                    <TableCell sx={{ color: tokens.ink }}>{exam.candidateName}</TableCell>
                    <TableCell sx={{ color: tokens.body }}>{new Date(exam.examDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ color: tokens.ink, fontWeight: 600 }}>{Math.round(exam.score)}/{exam.totalScore}</TableCell>
                    <TableCell sx={{ color: tokens.ink, fontWeight: 600 }}>{exam.percentage}%</TableCell>
                    <TableCell>
                      <Chip
                        label={exam.result}
                        size="small"
                        sx={{ bgcolor: getResultColor(exam.result), color: '#03110C', fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exam.status}
                        size="small"
                        sx={{ bgcolor: getStatusColor(exam.status), color: '#03110C', fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: exam.certificateId ? tokens.greenGlow : tokens.muted, fontWeight: exam.certificateId ? 600 : 500 }}>
                      {exam.certificateId || 'Not Generated'}
                    </TableCell>
                    <TableCell sx={{ color: tokens.ink, fontWeight: 600 }}>{exam.questionsCorrect}/{exam.questionsAttempted}</TableCell>
                    <TableCell sx={{ color: tokens.body, fontSize: '0.875rem' }}>{new Date(exam.lastUpdated).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', py: 2, bgcolor: tokens.sub3, color: tokens.copperLt }}>
          Exam Details
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {selectedExam && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Candidate Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Candidate ID</Typography>
                    <Typography variant="body2">{selectedExam.candidateId}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Candidate Name</Typography>
                    <Typography variant="body2">{selectedExam.candidateName}</Typography>
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Performance Summary</Typography>
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
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Percentage</Typography>
                    <Typography variant="h6">{selectedExam.percentage}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Result</Typography>
                    <Chip label={selectedExam.result} sx={{ bgcolor: getResultColor(selectedExam.result), color: '#03110C', fontWeight: 600 }} />
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Exam Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Exam ID</Typography>
                    <Typography variant="body2" sx={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{selectedExam.examId}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Exam Date</Typography>
                    <Typography variant="body2">{new Date(selectedExam.examDate).toLocaleDateString()}</Typography>
                  </Grid>
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

export default ExamReportPageEnhanced
