// ems_frontend/src/pages/user/DashboardPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, InputAdornment, OutlinedInput,
  ToggleButton, ToggleButtonGroup, Select, MenuItem, Skeleton, Tooltip, IconButton
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/SearchRounded'
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded'
import CheckIcon from '@mui/icons-material/CheckRounded'
import LockIcon from '@mui/icons-material/LockOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionRounded'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTechRounded'
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOffRounded'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import { userAPI } from '../../api/userAPI'
import DonutChart from '../../components/dashboard/DonutChart'
import PageHeader from '../../components/common/PageHeader'
import { tokens, fonts, gradients, shadows, tone, ctaButton } from '../../styles/tokens'
import { nextStep } from '../../utils/examJourney'

const LEVELS = ['L1', 'L2', 'L3']
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20]
const STATUS_FILTERS = ['All', 'Passed', 'Failed']

// Where a mid-flight application resumes. Shared with the exam application
// page rather than restated: this copy read only the status, which cannot tell
// a candidate who has just paid from one who has paid and booked, so it sent
// both to the scheduling screen. See utils/examJourney.js.

const STATE_TONE = {
  COMPLETED: tone.green,
  IN_PROGRESS: tone.copper,
  AVAILABLE: tone.copper,
  LOCKED: tone.neutral,
}

const ACTIVITY_ICON = {
  APPLICATION: { icon: <DescriptionIcon sx={{ fontSize: 15 }} />, tone: tone.copper },
  RESULT: { icon: <HistoryToggleOffIcon sx={{ fontSize: 15 }} />, tone: tone.info },
  CERTIFICATE: { icon: <MilitaryTechIcon sx={{ fontSize: 15 }} />, tone: tone.green },
}

const relativeTime = (iso) => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const formatPercent = (value) =>
  value === null || value === undefined ? null : `${Number(value)}%`

const SectionLabel = ({ children }) => (
  <Typography
    sx={{
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: '.6px',
      textTransform: 'uppercase',
      color: tokens.muted,
    }}
  >
    {children}
  </Typography>
)

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [orderBy, setOrderBy] = useState('applicationId')
  const [order, setOrder] = useState('desc')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0])

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
  const examStatuses = useMemo(() => data?.examStatuses || [], [data])
  const recentActivity = data?.recentActivity || []
  const firstName = data?.user?.firstName || user?.firstName || 'there'

  /*
   * The backend now ships levelProgress, which knows about prerequisite expiry
   * and open applications. Older deployments do not, so fall back to what can
   * be derived locally: a level is complete when a certification exists, and
   * open when the one below it is complete.
   */
  const levels = useMemo(() => {
    if (data?.levelProgress?.length) {
      return data.levelProgress
    }
    return LEVELS.map((level, index) => {
      const held = activeCerts.some((c) => (c.certificationLevel || c.level) === level)
      const previousHeld = index === 0 ||
        activeCerts.some((c) => (c.certificationLevel || c.level) === LEVELS[index - 1])
      return {
        certificationLevel: level,
        state: held ? 'COMPLETED' : previousHeld ? 'AVAILABLE' : 'LOCKED',
        bestPercentage: null,
        attempts: 0,
        blockedReason: previousHeld ? null : `Pass ${LEVELS[index - 1]} first`,
      }
    })
  }, [data, activeCerts])

  /** The one action the hero drives: resume what's open, else start what's next. */
  const journeyTarget = useMemo(() => {
    const openApplication = examStatuses.find((row) => nextStep(row))
    if (openApplication) {
      const step = nextStep(openApplication)
      // The button says what it does. "Resume application" on a link to the
      // payment screen is how a candidate ends up on a checkout they were not
      // expecting; on a link to a booked exam it undersells the thing entirely.
      return { label: step.label, to: step.route }
    }
    const available = levels.find((l) => l.state === 'AVAILABLE')
    return available
      ? { label: `Start ${available.certificationLevel}`, to: '/exams' }
      : { label: 'Continue journey', to: '/certifications' }
  }, [examStatuses, levels])

  const totalApplications = Number(summary.totalApplications ?? examStatuses.length ?? 0)
  const activeCount = Number(summary.activeCertifications ?? 0)
  const passedCount = Number(summary.passedApplications ?? 0)
  const expiredCount = Number(summary.expiredCertifications ?? 0)
  const donutSegments = [
    { label: 'Active certifications', value: activeCount, color: tokens.greenLt },
    { label: 'Passed', value: passedCount, color: tokens.copperLt },
    { label: 'Expired', value: expiredCount, color: tokens.danger },
    {
      label: 'Other applications',
      value: Math.max(0, totalApplications - activeCount - passedCount - expiredCount),
      color: 'rgba(150,195,172,.22)',
    },
  ]

  // ---- applications table ------------------------------------------------
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = examStatuses.filter((row) => {
      if (statusFilter !== 'All' && row.applicationStatus !== statusFilter.toUpperCase()) {
        return false
      }
      if (!query) return true
      return (
        String(row.applicationId).includes(query) ||
        String(row.certificationLevel || '').toLowerCase().includes(query) ||
        String(row.remarks || '').toLowerCase().includes(query)
      )
    })

    return [...rows].sort((a, b) => {
      const direction = order === 'asc' ? 1 : -1
      if (orderBy === 'appliedOn') {
        return direction * (new Date(a.appliedOn || 0) - new Date(b.appliedOn || 0))
      }
      return direction * (Number(a.applicationId ?? 0) - Number(b.applicationId ?? 0))
    })
  }, [examStatuses, statusFilter, search, order, orderBy])

  // Derived, not stored: filtering down to fewer rows than the current page
  // offset would otherwise leave an empty table under a "21-25 of 3" label.
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * rowsPerPage
  const visibleRows = filteredRows.slice(pageStart, pageStart + rowsPerPage)

  const handleSort = (field) => {
    setOrder(orderBy === field && order === 'desc' ? 'asc' : 'desc')
    setOrderBy(field)
    setPage(0)
  }

  const panelSx = {
    borderRadius: '18px',
    background: gradients.card,
    border: `1px solid ${tokens.line}`,
    boxShadow: shadows.card,
  }

  return (
    <Box>

      {/* ==================== HERO ==================== */}
      <PageHeader
        title={
          <>
            Welcome back,{' '}
            <Box
              component="span"
              sx={{
                background: gradients.brandText,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {firstName}
            </Box>
          </>
        }
        subtitle="Here’s an overview of your certification journey."
        action={
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(journeyTarget.to)}
            sx={{ ...ctaButton, width: 'auto', height: 44, px: 2.75, fontSize: 12.5, letterSpacing: '1.1px' }}
          >
            {journeyTarget.label}
          </Button>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>

      {/* ==================== OVERVIEW ==================== */}
      <Box
        sx={{
          ...panelSx,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(150px,1fr) minmax(215px,275px) minmax(140px,1fr) minmax(160px,1fr)',
          },
          overflow: 'hidden',
        }}
      >
        {/* --- chart --- */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderRight: { lg: `1px solid ${tokens.line}` },
            borderBottom: { xs: `1px solid ${tokens.line}`, lg: 'none' },
          }}
        >
          {loading ? (
            <Skeleton variant="circular" width={108} height={108} />
          ) : (
            <DonutChart
              segments={donutSegments}
              total={totalApplications}
              centerValue={totalApplications}
              centerLabel="Applications"
            />
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, width: '100%', maxWidth: 220 }}>
            {donutSegments.slice(0, 3).map((segment) => (
              <Box key={segment.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Box sx={{ flex: 'none', width: 8, height: 8, borderRadius: '2px', background: segment.color }} />
                <Typography noWrap sx={{ fontSize: 11.5, color: '#CFE2D8', flex: 1, minWidth: 0 }}>
                  {segment.label}
                </Typography>
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: tokens.ink, flex: 'none' }}>
                  {segment.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* --- certification journey --- */}
        <Box
          sx={{
            p: '18px 16px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderRight: { lg: `1px solid ${tokens.line}` },
            borderBottom: { xs: `1px solid ${tokens.line}`, lg: 'none' },
          }}
        >
          <SectionLabel>Certification journey</SectionLabel>
          <Box sx={{ mt: 1 }}>
            {levels.map((level, index) => {
              const state = level.state || 'LOCKED'
              const t = STATE_TONE[state] || tone.neutral
              const complete = state === 'COMPLETED'
              const locked = state === 'LOCKED'
              const score = formatPercent(level.bestPercentage)
              const attemptText = level.attempts
                ? `${level.attempts} attempt${level.attempts === 1 ? '' : 's'}`
                : 'No attempts'
              /*
               * The open application decides both, because "in progress" covers
               * three different outstanding steps. This used to hard-wire the
               * payment screen for every one of them, so an application that had
               * already been paid for offered to charge for it a second time —
               * and the label called it "Resume".
               */
              const openStep = level.openApplicationId
                ? nextStep(examStatuses.find((row) => row.applicationId === level.openApplicationId))
                : null
              const action = complete ? 'View' : openStep ? openStep.label : 'Start'
              const target = complete
                ? '/certificates'
                : openStep?.route || '/exams'

              return (
                <Box
                  key={level.certificationLevel}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0, pb: 1.25 }}
                >
                  <Box sx={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                    <Box
                      sx={{
                        flex: 'none',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: complete ? tokens.greenLt : 'transparent',
                        border: `1.5px solid ${complete ? tokens.greenLt : t.border}`,
                        color: complete ? '#062017' : t.fg,
                        fontFamily: fonts.mono,
                        fontWeight: 600,
                        fontSize: 10.5,
                      }}
                    >
                      {complete ? <CheckIcon sx={{ fontSize: 14 }} /> : locked ? <LockIcon sx={{ fontSize: 12 }} /> : index + 1}
                    </Box>
                    {index < levels.length - 1 && (
                      <Box
                        sx={{
                          width: '1.5px',
                          flex: 1,
                          minHeight: 10,
                          my: '2px',
                          background: complete ? tokens.greenLt : tokens.line2,
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>
                        Level {level.certificationLevel?.slice(1)}
                      </Typography>
                      {/* Wraps rather than truncates: "AVAILABLE" and "3 attempts"
                          both carry meaning, and an ellipsis here reads as a bug. */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}>
                        <Typography
                          sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '.4px', color: t.fg }}
                        >
                          {state.replace('_', ' ')}
                        </Typography>
                        <Typography sx={{ fontFamily: fonts.mono, fontSize: 9.5, color: tokens.muted }}>
                          {score || attemptText}
                        </Typography>
                      </Box>
                    </Box>

                    <Tooltip title={locked ? (level.blockedReason || 'Complete the previous level first') : ''}>
                      <span>
                        <Button
                          size="small"
                          disabled={locked}
                          variant={complete ? 'outlined' : 'contained'}
                          onClick={() => navigate(target)}
                          sx={{ flex: 'none', minWidth: 54, height: 26, px: 1, fontSize: 10.5, borderRadius: '8px' }}
                        >
                          {action}
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* --- quick actions --- */}
        <Box
          sx={{
            p: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            borderRight: { lg: `1px solid ${tokens.line}` },
            borderBottom: { xs: `1px solid ${tokens.line}`, lg: 'none' },
          }}
        >
          <SectionLabel>Quick actions</SectionLabel>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5, mt: 1 }}>
            <Button variant="contained" onClick={() => navigate('/exams')} sx={{ height: 40, fontSize: 11.5 }}>
              Apply for an exam
            </Button>
            <Button variant="outlined" onClick={() => navigate('/certificates')} sx={{ height: 40, fontSize: 11.5 }}>
              View my certificates
            </Button>
            <Button variant="outlined" onClick={() => navigate('/profile')} sx={{ height: 40, fontSize: 11.5 }}>
              Update profile
            </Button>
          </Box>
        </Box>

        {/* --- recent activity --- */}
        <Box sx={{ p: '18px 20px', minWidth: 0 }}>
          <SectionLabel>Recent activity</SectionLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, mt: 1.5 }}>
            {recentActivity.length === 0 && !loading && (
              <Typography sx={{ fontSize: 11.5, color: tokens.muted }}>
                Nothing recorded yet.
              </Typography>
            )}
            {recentActivity.slice(0, 4).map((entry, index) => {
              const meta = ACTIVITY_ICON[entry.type] || ACTIVITY_ICON.APPLICATION
              return (
                <Box key={`${entry.occurredAt}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
                  <Box
                    sx={{
                      flex: 'none',
                      width: 24,
                      height: 24,
                      borderRadius: '7px',
                      display: 'grid',
                      placeItems: 'center',
                      background: meta.tone.bg,
                      color: meta.tone.fg,
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 11.5, color: '#CFE2D8' }}>
                      {entry.message}
                    </Typography>
                    <Typography sx={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.muted, mt: '2px' }}>
                      {relativeTime(entry.occurredAt)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>

      {/* ==================== APPLICATIONS ==================== */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.2px' }}>
            Recent Exam Applications
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <OutlinedInput
              size="small"
              placeholder="Search applications…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: tokens.muted }} />
                </InputAdornment>
              }
              sx={{ width: { xs: '100%', sm: 220 }, height: 42, borderRadius: '11px' }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusFilter}
              onChange={(e, value) => { if (value) { setStatusFilter(value); setPage(0) } }}
              sx={{
                height: 42,
                '& .MuiToggleButton-root': {
                  px: 1.75,
                  border: `1px solid ${tokens.line2}`,
                  color: tokens.body,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    background: 'rgba(192,138,46,.18)',
                    color: tokens.copperLt,
                    '&:hover': { background: 'rgba(192,138,46,.24)' },
                  },
                },
              }}
            >
              {STATUS_FILTERS.map((option) => (
                <ToggleButton key={option} value={option}>{option}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box sx={{ ...panelSx, overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'applicationId' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'applicationId'}
                      direction={orderBy === 'applicationId' ? order : 'desc'}
                      onClick={() => handleSort('applicationId')}
                    >
                      Application
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sortDirection={orderBy === 'appliedOn' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'appliedOn'}
                      direction={orderBy === 'appliedOn' ? order : 'desc'}
                      onClick={() => handleSort('appliedOn')}
                    >
                      Applied on
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 3 }}>
                      <Skeleton variant="rounded" height={22} />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, color: tokens.muted, fontSize: 13 }}>
                      {examStatuses.length === 0
                        ? 'No applications yet — apply for your L1 certification exam to get started.'
                        : 'No applications match.'}
                    </TableCell>
                  </TableRow>
                )}

                {visibleRows.map((row) => {
                  const t = row.applicationStatus === 'PASSED'
                    ? tone.green
                    : (row.applicationStatus === 'FAILED' || row.applicationStatus === 'TERMINATED')
                      ? tone.danger
                      : tone.copper
                  return (
                    <TableRow key={row.applicationId} hover>
                      <TableCell sx={{ fontFamily: fonts.mono, fontSize: 13, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        #{row.applicationId}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13.5, color: '#CFE2D8', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {row.certificationLevel}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 999,
                            fontFamily: fonts.mono,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '.05em',
                            whiteSpace: 'nowrap',
                            color: t.fg,
                            background: t.bg,
                            border: `1px solid ${t.border}`,
                          }}
                        >
                          {String(row.applicationStatus || '').replace(/_/g, ' ')}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: tokens.body, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {row.appliedOn ? new Date(row.appliedOn).toLocaleDateString() : '–'}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top', maxWidth: 340 }}>
                        {/* The clamp lives on an inner block: `display:-webkit-box`
                            on the cell itself would drop it out of the table
                            layout, and the line limit never takes effect. */}
                        <Box
                          sx={{
                            fontSize: 12.5,
                            color: '#B7CFC3',
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {row.remarks || '–'}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* --- pagination --- */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
              flexWrap: 'wrap',
              p: '14px 20px',
              borderTop: `1px solid ${tokens.line}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.muted }}>
                {filteredRows.length === 0
                  ? 'No results'
                  : `Showing ${pageStart + 1}-${Math.min(pageStart + rowsPerPage, filteredRows.length)} of ${filteredRows.length}`}
              </Typography>
              <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 0.9, fontSize: 11.5, color: tokens.muted }}>
                Rows
                <Select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
                  sx={{ height: 28, fontSize: 11.5, fontWeight: 600, borderRadius: '7px' }}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconButton
                size="small"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Previous page"
                sx={{ border: `1.5px solid ${tokens.line2}`, borderRadius: '8px' }}
              >
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
              {Array.from({ length: pageCount }, (_, index) => index).map((index) => (
                <Button
                  key={index}
                  onClick={() => setPage(index)}
                  sx={{
                    minWidth: 30,
                    height: 30,
                    p: 0,
                    borderRadius: '8px',
                    fontFamily: fonts.mono,
                    fontSize: 11.5,
                    border: `1.5px solid ${index === currentPage ? 'rgba(192,138,46,.4)' : tokens.line2}`,
                    background: index === currentPage ? 'rgba(192,138,46,.18)' : 'transparent',
                    color: index === currentPage ? tokens.copperLt : tokens.body,
                  }}
                >
                  {index + 1}
                </Button>
              ))}
              <IconButton
                size="small"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Next page"
                sx={{ border: `1.5px solid ${tokens.line2}`, borderRadius: '8px' }}
              >
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
      </Box>
    </Box>
  )
}

export default DashboardPage
