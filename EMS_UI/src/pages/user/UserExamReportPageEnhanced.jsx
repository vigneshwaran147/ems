// ems_frontend/src/pages/user/UserExamReportPageEnhanced.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  Box, Grid, TextField, Button, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, InputAdornment, CircularProgress,
  Divider, Alert
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import { certificateAPI } from '../../api/certificateAPI'
import SearchIcon from '@mui/icons-material/SearchRounded'
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded'
import ArrowUpIcon from '@mui/icons-material/KeyboardArrowUpRounded'
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import UnfoldIcon from '@mui/icons-material/UnfoldMoreRounded'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import { tokens, fonts } from '../../styles/tokens'
import PageHeader from '../../components/common/PageHeader'
import PcbSelect from '../../components/common/PcbSelect'
import PcbDateField, { parseFieldValue } from '../../components/common/PcbDateField'

const RESULT_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
]

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

const PRIMARY_COLOR = tokens.copperLt

/** Every control on the filter bar sits on the same 38px rule. */
const filterFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '10px',
    backgroundColor: 'rgba(3,16,11,.8)',
    fontSize: 12.5,
  },
  '& .MuiOutlinedInput-input': { py: 0 },
}

const thSx = {
  p: '11px 18px',
  fontSize: 11,
  fontWeight: 600,
  color: '#93AC9E',
  whiteSpace: 'nowrap',
  borderBottom: `1px solid ${tokens.line}`,
}

const tdSx = {
  p: '13px 18px',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(150,195,172,.08)',
}

const pagerButtonSx = {
  width: 26,
  height: 26,
  borderRadius: '6px',
  color: '#CFE2D8',
  border: '1px solid rgba(150,195,172,.24)',
  '&.Mui-disabled': { color: '#CFE2D8', opacity: 0.4 },
}

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
      // The box is labelled "Search exam ID" but still matches the name, so a
      // half-remembered exam title finds its row too.
      const query = searchFilters.examName.toLowerCase()
      const matchExamName =
        exam.examId.toLowerCase().includes(query) || exam.examName.toLowerCase().includes(query)
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

  const getResultColor = (result) => result === 'PASSED' ? tokens.greenGlow : tokens.danger
  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return tokens.greenGlow
    if (percentage >= 70) return tokens.warn
    return tokens.danger
  }

  /** Header cell that carries a sort control — only the two columns the design sorts on. */
  const SortHeader = ({ label, columnId, align = 'left' }) => {
    const active = orderBy === columnId
    const Arrow = active && order === 'asc' ? ArrowUpIcon : ArrowDownIcon
    return (
      <Box
        component="button"
        type="button"
        onClick={() => handleSort(columnId)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.625,
          ml: align === 'right' ? 'auto' : 0,
          p: 0,
          font: 'inherit',
          color: active ? tokens.copperLt : 'inherit',
          background: 'none',
          border: 0,
          cursor: 'pointer',
          '&:hover': { color: tokens.copperLt },
        }}
      >
        {label}
        {active
          ? <Arrow sx={{ fontSize: 13 }} />
          : <UnfoldIcon sx={{ fontSize: 13, opacity: 0.35 }} />}
      </Box>
    )
  }

  const totalRows = sortedExams.length
  const firstRow = page * rowsPerPage
  const lastRow = Math.min(firstRow + rowsPerPage, totalRows)
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
  const isFirstPage = page === 0
  const isLastPage = page >= totalPages - 1

  return (
    <Box>
      <PageHeader
        title="My Exam Reports"
        subtitle="View your exam performance and detailed results."
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'My Reports' },
          { label: 'Exam Report' }
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Metrics strip — one instrument panel rather than five floating cards. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2,minmax(0,1fr))',
            sm: 'repeat(3,minmax(0,1fr))',
            lg: 'repeat(5,minmax(0,1fr))',
          },
          mb: 2.5,
          borderRadius: '12px',
          background: 'rgba(11,44,34,.55)',
          border: `1px solid ${tokens.line}`,
        }}
      >
        {[
          { label: 'Total Exams', value: stats.total, color: tokens.ink },
          { label: 'Completed', value: stats.completed, color: tokens.ink },
          { label: 'Passed', value: stats.passed, color: tokens.greenLt },
          { label: 'Avg Score', value: `${stats.avgScore}%`, color: tokens.copperLt },
          { label: 'Certificates', value: stats.certificates, color: tokens.ink }
        ].map((stat, index) => (
          <Box
            key={stat.label}
            sx={{
              p: '16px 20px',
              borderLeft: index === 0 ? 0 : '1px solid rgba(150,195,172,.12)',
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 9.5,
                letterSpacing: '.5px',
                textTransform: 'uppercase',
                color: '#93AC9E',
                mb: 0.875,
              }}
            >
              {stat.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-.3px',
                color: stat.color,
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.25,
          mb: 2.5,
          p: '14px 16px',
          borderRadius: '12px',
          background: 'rgba(11,44,34,.4)',
          border: '1px solid rgba(150,195,172,.14)',
        }}
      >
        <TextField
          size="small"
          placeholder="Search exam ID"
          value={searchFilters.examName}
          onChange={(e) => handleFilterChange('examName', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 15 }} />
              </InputAdornment>
            ),
          }}
          sx={{ ...filterFieldSx, flex: 1, minWidth: 180 }}
        />

        <PcbSelect
          size="small"
          value={searchFilters.result}
          onChange={(value) => handleFilterChange('result', value)}
          placeholder="All results"
          options={RESULT_OPTIONS}
          sx={{ ...filterFieldSx, width: 140 }}
        />

        <PcbDateField
          size="small"
          placeholder="From"
          value={searchFilters.startDate}
          onChange={(value) => handleFilterChange('startDate', value)}
          max={searchFilters.endDate || undefined}
          sx={{ ...filterFieldSx, width: 168 }}
        />
        <Typography sx={{ color: tokens.muted, fontSize: 12 }}>–</Typography>
        <PcbDateField
          size="small"
          placeholder="To"
          value={searchFilters.endDate}
          onChange={(value) => handleFilterChange('endDate', value)}
          min={searchFilters.startDate || undefined}
          sx={{ ...filterFieldSx, width: 168 }}
        />

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon sx={{ fontSize: 13 }} />}
          onClick={() => handleExport('CSV')}
          sx={{
            flex: 'none',
            height: 38,
            px: 2,
            borderRadius: '9px',
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            color: '#CFE2D8',
            background: 'transparent',
            borderColor: 'rgba(150,195,172,.26)',
            borderWidth: 1,
          }}
        >
          Export CSV
        </Button>
      </Box>

      {/* Report table */}
      <Box
        sx={{
          borderRadius: '12px',
          background: 'rgba(11,44,34,.4)',
          border: `1px solid ${tokens.line}`,
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Exam ID</TableCell>
                <TableCell sx={thSx}>Level</TableCell>
                <TableCell sx={thSx}>
                  <SortHeader label="Exam date" columnId="examDate" />
                </TableCell>
                <TableCell sx={{ ...thSx, textAlign: 'right' }}>Score</TableCell>
                <TableCell sx={{ ...thSx, textAlign: 'right' }}>
                  <SortHeader label="Percentage" columnId="percentage" align="right" />
                </TableCell>
                <TableCell sx={thSx}>Result</TableCell>
                <TableCell sx={thSx}>Status</TableCell>
                <TableCell sx={thSx}>Certificate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, border: 0 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: '36px', border: 0, color: tokens.muted, fontSize: 13 }}>
                    No exam reports match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedExams.map((exam) => {
                const passed = exam.result === 'PASSED'
                return (
                  <TableRow
                    key={exam.id}
                    onClick={() => handleViewDetails(exam)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(192,138,46,.06)' } }}
                  >
                    <TableCell sx={{ ...tdSx, fontSize: 13, fontWeight: 600, color: tokens.ink }}>
                      {exam.examId}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontSize: 12.5, color: '#CFE2D8' }}>
                      {exam.examLevel}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontSize: 12.5, color: '#CFE2D8' }}>
                      {new Date(exam.examDate).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, textAlign: 'right', fontFamily: fonts.mono, fontSize: 12.5, color: '#CFE2D8' }}>
                      {exam.score}/{exam.totalScore}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tdSx,
                        textAlign: 'right',
                        fontFamily: fonts.mono,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: passed ? tokens.greenLt : '#E06565',
                      }}
                    >
                      {exam.percentage}%
                    </TableCell>
                    <TableCell sx={tdSx}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          px: 1.125,
                          py: 0.375,
                          borderRadius: '4px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '.03em',
                          background: passed ? 'rgba(95,174,146,.14)' : 'rgba(224,101,101,.14)',
                          border: `1px solid ${passed ? 'rgba(95,174,146,.4)' : 'rgba(224,101,101,.4)'}`,
                          color: passed ? tokens.greenLt : '#FFB0B0',
                        }}
                      >
                        {exam.result}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontSize: 12, color: '#93AC9E' }}>
                      {exam.status}
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontSize: 12, color: exam.certificateId ? tokens.greenLt : tokens.muted }}>
                      {exam.certificateId || 'Not Generated'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer: range on the left, page controls on the right. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.25,
            p: '12px 18px',
            borderTop: '1px solid rgba(150,195,172,.14)',
          }}
        >
          <Typography sx={{ fontSize: 11.5, color: '#93AC9E' }}>
            {totalRows === 0 ? 'No results' : `Showing ${firstRow + 1}-${lastRow} of ${totalRows}`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 0.875, fontSize: 11.5, color: '#93AC9E' }}>
              Rows per page
              <Box
                component="select"
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                sx={{
                  height: 26,
                  width: 60,
                  px: 0.75,
                  borderRadius: '6px',
                  fontFamily: fonts.sans,
                  fontSize: 11.5,
                  color: tokens.ink,
                  background: 'rgba(3,16,11,.8)',
                  border: '1px solid rgba(150,195,172,.24)',
                  cursor: 'pointer',
                  outline: 'none',
                  '&:focus': { borderColor: tokens.copper },
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Box>
            </Box>

            <IconButton
              size="small"
              aria-label="Previous page"
              disabled={isFirstPage}
              onClick={() => handlePageChange(null, page - 1)}
              sx={pagerButtonSx}
            >
              <ChevronLeftIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Next page"
              disabled={isLastPage}
              onClick={() => handlePageChange(null, page + 1)}
              sx={pagerButtonSx}
            >
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', py: 2, bgcolor: tokens.sub3, color: tokens.copperLt }}>
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
                    <Chip label={selectedExam.status} size="small" sx={{ bgcolor: 'rgba(104,183,216,.2)', color: tokens.info, fontWeight: 600 }} />
                  </Grid>
                  {/* The table no longer carries this column, so the record lives here. */}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Last Updated</Typography>
                    <Typography variant="body2">{new Date(selectedExam.lastUpdated).toLocaleString()}</Typography>
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
                      sx={{ bgcolor: getPercentageColor(selectedExam.percentage), color: '#03110C', fontWeight: 600 }}
                    />
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: PRIMARY_COLOR }}>Result</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Chip label={selectedExam.result} sx={{ bgcolor: getResultColor(selectedExam.result), color: '#03110C', fontWeight: 600 }} />
                  </Grid>
                  {selectedExam.certificateId && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Certificate ID: </Typography>
                      <Typography variant="body2" sx={{ color: tokens.greenGlow, fontWeight: 600 }}>{selectedExam.certificateId}</Typography>
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
