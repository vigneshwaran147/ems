// ems_frontend/src/pages/exam/ExamSchedulePage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Paper, Grid, Typography, Button, Alert, Stack, CircularProgress,
  Chip, Skeleton, Divider, FormControlLabel, Checkbox
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import { userAPI } from '../../api/userAPI'
import PageHeader from '../../components/common/PageHeader'
import PcbDateField from '../../components/common/PcbDateField'
import SyllabusPanel from '../../components/syllabus/SyllabusPanel'
import DeviceCheckPanel from '../../components/exam/proctoring/DeviceCheckPanel'
import { useDeviceCheck } from '../../hooks/useDeviceCheck'
import { formatCountdown, formatExamClock } from '../../utils/examJourney'
import { tokens, fonts, gradients, shadows } from '../../styles/tokens'
import EventAvailableIcon from '@mui/icons-material/EventAvailableRounded'
import EventBusyIcon from '@mui/icons-material/EventBusyRounded'
import LockClockIcon from '@mui/icons-material/LockClockRounded'
import EditCalendarIcon from '@mui/icons-material/EditCalendarRounded'
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded'
import ScheduleIcon from '@mui/icons-material/ScheduleRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import WifiRoundedIcon from '@mui/icons-material/WifiRounded'
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded'
import ScreenShareRoundedIcon from '@mui/icons-material/ScreenShareRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'

const maxViolationsAllowed = 3

/** Card face shared by every panel on this screen. */
const panelSx = {
  borderRadius: '18px',
  background: gradients.card,
  border: `1px solid ${tokens.line}`,
  boxShadow: shadows.card,
}

/**
 * An Instant from the API rendered for a `datetime-local` input.
 *
 * That input has no timezone of its own — it reads and writes wall-clock text —
 * so the value has to be the local time, not the ISO string the server sent.
 * Feeding it a UTC string silently shifts the prefilled slot by the offset,
 * which on a reschedule is the difference between confirming the booking you
 * have and moving it by five and a half hours.
 */
const toLocalInputValue = (isoString) => {
  if (!isoString) {
    return ''
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const formatSlot = (isoString) => {
  if (!isoString) {
    return ''
  }
  const date = new Date(isoString)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
}

/** The date half of a `datetime-local` value, for the local day of `date`. */
const toLocalDateKey = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

/**
 * The hours candidates pick most often, offered as one click each.
 *
 * A shortcut over the picker, never a replacement for it: the server takes any
 * instant, so a grid of six fixed times as the only way in would turn a booking
 * rule the product does not have into one it appears to. The field above stays
 * free to take 07:15 or 21:40.
 *
 * `time` is the 24-hour half of a `datetime-local` value; `label` is what the
 * button says. Both are written out rather than derived so the wording on the
 * button never drifts from the value it sets.
 */
const preferredSlots = [
  { label: '9:00 AM', time: '09:00' },
  { label: '10:00 AM', time: '10:00' },
  { label: '11:30 AM', time: '11:30' },
  { label: '1:00 PM', time: '13:00' },
  { label: '3:00 PM', time: '15:00' },
  { label: '4:30 PM', time: '16:30' }
]

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

/**
 * What the candidate has to have in place before the slot arrives.
 *
 * Every entry is something the exam screen actually enforces at start —
 * a list that promised checks the product does not run would send people
 * away to prepare for the wrong things.
 */
const sessionRequirements = [
  {
    icon: VideocamRoundedIcon,
    title: 'Working webcam',
    desc: 'Required for continuous face monitoring for the whole sitting.'
  },
  {
    icon: MicRoundedIcon,
    title: 'Microphone enabled',
    desc: 'Audio stays on throughout; a second voice in the room is a violation.'
  },
  {
    icon: ScreenShareRoundedIcon,
    title: 'Screen sharing',
    desc: 'You will be asked to share your entire screen before the exam opens.'
  },
  {
    icon: FullscreenRoundedIcon,
    title: 'Fullscreen browser',
    desc: 'The exam runs in a locked fullscreen tab; other apps must stay closed.'
  },
  {
    icon: WifiRoundedIcon,
    title: 'Stable internet',
    desc: 'Answers are saved as you go, so a drop mid-question costs you time.'
  },
  {
    icon: VolumeOffRoundedIcon,
    title: 'Quiet, private space',
    desc: 'Reserve the full exam window in a room free of other people or noise.'
  }
]

const wizardSteps = [
  { label: 'Policy' },
  { label: 'Readiness' },
  { label: 'Start exam' }
]

/**
 * How a permission answer reads on screen.
 *
 * Camera, microphone and screen share are requested by the exam screen itself,
 * not here: prompting for them on a page that may be opened days early would
 * train candidates to dismiss the prompt that matters. So this reports what the
 * browser already knows and says plainly when something will be asked later —
 * a row claiming "READY" for a permission nobody has granted yet would be a lie
 * the candidate only discovers at start.
 */
const readinessTone = {
  READY: { fg: tokens.greenLt, bg: 'rgba(95,174,146,.06)', border: 'rgba(95,174,146,.22)' },
  PENDING: { fg: tokens.copperLt, bg: 'rgba(192,138,46,.06)', border: 'rgba(192,138,46,.22)' },
  BLOCKED: { fg: '#E06565', bg: 'rgba(224,101,101,.06)', border: 'rgba(224,101,101,.24)' }
}

/** A `navigator.permissions` answer, or null when the browser will not say. */
const queryPermission = async (name) => {
  if (!navigator.permissions?.query) {
    return null
  }
  try {
    const status = await navigator.permissions.query({ name })
    return status.state
  } catch {
    // Firefox rejects permission names it does not implement rather than
    // resolving, so each probe stands alone: a browser that refuses
    // 'microphone' should not also wipe out the camera answer.
    return null
  }
}

const probeReadiness = async () => {
  const [camera, microphone] = await Promise.all([
    queryPermission('camera'),
    queryPermission('microphone')
  ])
  const fromPermission = (state) => {
    if (state === 'granted') {
      return { state: 'READY', status: 'GRANTED' }
    }
    if (state === 'denied') {
      return { state: 'BLOCKED', status: 'BLOCKED' }
    }
    return { state: 'PENDING', status: 'ASKED AT START' }
  }

  return {
    camera: fromPermission(camera),
    microphone: fromPermission(microphone),
    network: navigator.onLine === false
      ? { state: 'BLOCKED', status: 'OFFLINE' }
      : { state: 'READY', status: 'ONLINE' },
    screenShare: navigator.mediaDevices?.getDisplayMedia
      ? { state: 'PENDING', status: 'ASKED AT START' }
      : { state: 'BLOCKED', status: 'UNSUPPORTED' },
    fullscreen: document.fullscreenEnabled
      ? { state: 'PENDING', status: 'ENTERS AT START' }
      : { state: 'BLOCKED', status: 'BLOCKED' }
  }
}

const readinessRows = [
  { key: 'camera', label: 'Camera access', icon: VideocamRoundedIcon },
  { key: 'microphone', label: 'Microphone access', icon: MicRoundedIcon },
  { key: 'network', label: 'Network connection', icon: WifiRoundedIcon },
  { key: 'screenShare', label: 'Screen sharing', icon: ScreenShareRoundedIcon },
  { key: 'fullscreen', label: 'Fullscreen & tab lock', icon: FullscreenRoundedIcon }
]

/**
 * The three markers across the top of the pre-flight.
 *
 * The connecting rail is one element behind the markers rather than a segment
 * per step, so the fill is a single width animation and can never disagree with
 * itself at a join.
 */
const StepRail = ({ current }) => (
  <Paper sx={{ ...panelSx, p: { xs: '20px 16px', md: '20px 30px' } }}>
    <Box sx={{ position: 'relative', maxWidth: 480, mx: 'auto' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 22,
          // Inset by half a column so the rail starts and ends under a marker
          // rather than running off past the outer two.
          left: `${100 / (wizardSteps.length * 2)}%`,
          right: `${100 / (wizardSteps.length * 2)}%`,
          height: 3,
          borderRadius: '2px',
          background: tokens.line2,
          zIndex: 0
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: '2px',
            background: `linear-gradient(90deg, ${tokens.greenLt}, ${tokens.copperLt})`,
            width: `${((current - 1) / (wizardSteps.length - 1)) * 100}%`,
            transition: 'width .3s'
          }}
        />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex' }}>
        {wizardSteps.map((step, index) => {
          const number = index + 1
          const done = current > number
          const active = current === number
          return (
            <Box
              key={step.label}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.15 }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: fonts.mono,
                  fontWeight: 800,
                  fontSize: 16,
                  transition: 'background .2s, box-shadow .2s',
                  ...(done
                    ? {
                      background: `linear-gradient(160deg, ${tokens.greenLt}, #3F8E74)`,
                      color: '#062017',
                      boxShadow: '0 0 0 4px rgba(95,174,146,.18)'
                    }
                    : active
                      ? {
                        background: `linear-gradient(160deg, ${tokens.copperLt}, ${tokens.copper})`,
                        color: '#062017',
                        boxShadow: '0 0 0 4px rgba(192,138,46,.2)'
                      }
                      : {
                        background: tokens.sub2,
                        border: `1.5px solid ${tokens.line2}`,
                        color: tokens.muted
                      })
                }}
              >
                {done ? <CheckRoundedIcon sx={{ fontSize: 22 }} /> : number}
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: active || done ? tokens.ink : tokens.muted }}>
                  {step.label}
                </Typography>
                <Typography
                  sx={{
                    mt: '2px',
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    letterSpacing: '.5px',
                    textTransform: 'uppercase',
                    color: done ? tokens.greenLt : active ? tokens.copperLt : tokens.muted
                  }}
                >
                  {done ? 'Done' : active ? 'In progress' : 'Pending'}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  </Paper>
)

/** One "do" or "don't" line. */
const RuleLine = ({ text, allowed }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.1 }}>
    <Box component="span" sx={{ flex: 'none', mt: '1px', color: allowed ? tokens.greenLt : '#E06565' }}>
      {allowed
        ? <CheckRoundedIcon sx={{ fontSize: 16 }} />
        : <CloseRoundedIcon sx={{ fontSize: 16 }} />}
    </Box>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: '#CFE2D8' }}>{text}</Typography>
  </Stack>
)

/**
 * Pre-flight progress as a single arc.
 *
 * Fed by checks that have actually happened — policy ticked, devices proved,
 * window open — never by a timer. A ring that fills on its own is a progress
 * bar for nothing, and the candidate reads it as the product working while it
 * waits for them.
 */
const ReadinessRing = ({ pct, done, size = 132 }) => {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const bounded = Math.max(0, Math.min(100, pct))
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <Box
        component="svg"
        viewBox="0 0 132 132"
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, width: size, height: size }}
      >
        <circle cx="66" cy="66" r={radius} fill="none" stroke="rgba(150,195,172,.14)" strokeWidth={8} />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={done ? tokens.greenLt : tokens.copperLt}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - bounded / 100)}
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset .6s ease, stroke .3s' }}
        />
      </Box>
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        {done
          ? <CheckRoundedIcon sx={{ fontSize: 34, color: tokens.greenLt }} />
          : (
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: 800, color: tokens.copperLt }}>
              {Math.round(bounded)}%
            </Typography>
          )}
      </Box>
    </Box>
  )
}

/** One rung of the readiness timeline. `state` is 'done', 'active' or 'pending'. */
const TimelineStep = ({ number, title, desc, state, last }) => {
  const done = state === 'done'
  const active = state === 'active'
  return (
    <Stack direction="row" spacing={1.75}>
      <Stack alignItems="center" sx={{ flex: 'none' }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontFamily: fonts.mono,
            fontSize: 11,
            fontWeight: 700,
            ...(done
              ? { background: tokens.greenLt, border: `1.5px solid ${tokens.greenLt}`, color: '#062017' }
              : active
                ? { background: 'rgba(192,138,46,.16)', border: `1.5px solid ${tokens.copperLt}`, color: tokens.copperLt }
                : { background: tokens.sub2, border: `1.5px solid ${tokens.line2}`, color: tokens.muted })
          }}
        >
          {done ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : number}
        </Box>
        {!last && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              minHeight: 26,
              my: '2px',
              background: done ? tokens.greenLt : tokens.line2
            }}
          />
        )}
      </Stack>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 2.75 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: tokens.ink }}>{title}</Typography>
        <Typography sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.5, color: active ? '#DCC79A' : '#93AC9E' }}>
          {desc}
        </Typography>
      </Box>
    </Stack>
  )
}

/** A checked-off line in the security checklist, with what the browser says. */
const ChecklistRow = ({ icon: Icon, label, status, tone: rowTone }) => (
  <Stack direction="row" spacing={1.4} alignItems="center">
    <Box
      sx={{
        flex: 'none',
        width: 22,
        height: 22,
        borderRadius: '6px',
        display: 'grid',
        placeItems: 'center',
        background: rowTone.bg,
        border: `1.5px solid ${rowTone.border}`,
        color: rowTone.fg
      }}
    >
      <Icon sx={{ fontSize: 12 }} />
    </Box>
    <Typography
      sx={{
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        lineHeight: 1.45,
        color: '#CFE2D8'
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        flex: 'none',
        fontFamily: fonts.mono,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '.04em',
        color: rowTone.fg
      }}
    >
      {status}
    </Typography>
  </Stack>
)

/** The red strip that closes the device check. */
const ViolationNotice = () => (
  <Stack
    direction="row"
    spacing={1.25}
    alignItems="center"
    sx={{
      p: '12px 16px',
      borderRadius: '12px',
      background: 'rgba(224,101,101,.06)',
      border: '1px solid rgba(224,101,101,.22)'
    }}
  >
    <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#E88', flex: 'none' }} />
    <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: '#F0C9C9' }}>
      Denying camera or microphone access, or revoking it mid-session, will terminate the exam and
      record it as a proctoring violation.
    </Typography>
  </Stack>
)

const ExamSchedulePage = () => {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const [scheduledTime, setScheduledTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  /** The slot currently booked on the server; empty until one is confirmed. */
  const [bookedSlot, setBookedSlot] = useState('')
  /**
   * When that booking can actually be sat, as sent by the server.
   *
   * Held rather than derived from `bookedSlot` so the grace either side of a
   * slot is defined in exactly one place. A copy of the rule kept here would
   * eventually disagree with the server's, and the candidate would find out by
   * clicking a live Start button and being refused.
   */
  // Not named `window`: that shadows the global inside this component, and the
  // next edit reaching for `window.scrollTo` would break in a way that reads
  // like a React problem.
  const [startWindow, setStartWindow] = useState({ start: null, end: null })
  /** True while the picker is open to change a slot that is already booked. */
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduled, setRescheduled] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  /** Which pre-flight step a candidate with a booking is on: 1, 2 or 3. */
  const [wizardStep, setWizardStep] = useState(1)
  const [readiness, setReadiness] = useState(null)
  /** True once the candidate has seen their own camera and mic working here. */
  const [deviceProved, setDeviceProved] = useState(false)
  const deviceCheck = useDeviceCheck()
  const { live: deviceLive, stop: stopDeviceCheck } = deviceCheck
  // The route only carries the application id, so the certification level —
  // and with it the syllabus to show — has to be resolved from the dashboard.
  const [level, setLevel] = useState(null)
  const [levelLoading, setLevelLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await userAPI.getDashboard()
        const apps = res.data.data?.examStatuses || []
        const app = apps.find((item) => String(item.applicationId) === String(applicationId))
        if (mounted && app?.certificationLevel) {
          setLevel(app.certificationLevel)
        }
        /*
         * A booking already made has to survive leaving the page. Without this
         * the screen reopened on an empty picker, so a candidate returning to
         * check their slot was shown no slot at all and the only way forward
         * was to book a second one over the top of the first.
         */
        if (mounted && app?.scheduledExamTime) {
          setBookedSlot(app.scheduledExamTime)
          setStartWindow({ start: app.examWindowStart, end: app.examWindowEnd })
        }
      } catch (err) {
        // Scheduling must stay usable even when the syllabus cannot be resolved.
        console.error('Failed to resolve certification level for syllabus', err)
      } finally {
        if (mounted) setLevelLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [applicationId])

  /*
   * The window opens and closes while this screen is sitting open — a candidate
   * who arrives ten minutes early and waits is the ordinary case, not the edge
   * one. Without a tick, the Start button they are waiting for never unlocks
   * and they reload the page to find out whether it is time yet.
   */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  /*
   * Probed on arrival at the readiness step rather than on mount: a candidate
   * who opens this page a week early would otherwise be shown a verdict that is
   * stale by the time it matters. Re-probed on connectivity changes so the
   * network row cannot sit on "ONLINE" while the candidate is offline.
   */
  useEffect(() => {
    if (wizardStep !== 2) {
      return undefined
    }
    let mounted = true
    const run = () => {
      probeReadiness().then((result) => {
        if (mounted) setReadiness(result)
      })
    }
    run()
    window.addEventListener('online', run)
    window.addEventListener('offline', run)
    return () => {
      mounted = false
      window.removeEventListener('online', run)
      window.removeEventListener('offline', run)
    }
    // Re-probed once the preview succeeds: granting through that prompt is what
    // flips the browser's own answer, and rows still reading "ASKED AT START"
    // beside a live picture of the candidate's face would be the screen
    // disagreeing with itself.
  }, [wizardStep, deviceProved])

  /*
   * A camera light left on after someone has moved to another step — or gone to
   * make coffee on step 3 — is indefensible on a page that is not the exam.
   */
  useEffect(() => {
    if (wizardStep !== 2) {
      stopDeviceCheck()
    }
  }, [wizardStep, stopDeviceCheck])

  useEffect(() => {
    if (deviceLive) {
      setDeviceProved(true)
    }
  }, [deviceLive])

  const opensAt = startWindow.start ? new Date(startWindow.start).getTime() : null
  const closesAt = startWindow.end ? new Date(startWindow.end).getTime() : null
  // An older response without bounds is treated as startable: the server has
  // the final say, and locking the button on a guess would strand a candidate
  // whose slot is live.
  const tooEarly = opensAt !== null && now < opensAt
  const missed = closesAt !== null && now > closesAt
  const windowOpen = Boolean(bookedSlot) && !tooEarly && !missed

  /** The day the picker is currently on, or null while it is empty. */
  const pickedDateKey = scheduledTime ? scheduledTime.slice(0, 10) : null
  /** The time the picker is currently on, so a matching quick pick lights up. */
  const pickedTime = scheduledTime ? scheduledTime.slice(11, 16) : null

  /*
   * A quick pick that would land in the past is offered but refused, rather
   * than hidden: a morning grid that empties out as the day goes on reads as
   * the slot being taken by someone else, which is not what has happened.
   * `now` ticks every second, so an hour lapses out on its own.
   */
  const isSlotPast = (time) =>
    Boolean(pickedDateKey) && new Date(`${pickedDateKey}T${time}`).getTime() < now

  /**
   * Moves the picker onto a preferred hour, keeping the day already chosen.
   *
   * With no day chosen yet the click has to invent one, and it takes today only
   * while that hour is still ahead — offering "9:00 AM" at four in the
   * afternoon and filling in a time the Confirm button then rejects is worse
   * than simply meaning tomorrow.
   */
  const applyPreferredSlot = (time) => {
    setError('')
    if (pickedDateKey) {
      setScheduledTime(`${pickedDateKey}T${time}`)
      return
    }
    const today = toLocalDateKey(new Date())
    const stillAhead = new Date(`${today}T${time}`).getTime() > Date.now()
    const day = stillAhead
      ? today
      : toLocalDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000))
    setScheduledTime(`${day}T${time}`)
  }

  const handleSchedule = async () => {
    if (!scheduledTime) {
      setError('Please pick a date and time.')
      return
    }
    // The picker cannot offer a past slot, but a page left open long enough
    // will see its chosen slot slip into the past before it is confirmed.
    if (new Date(scheduledTime).getTime() < Date.now()) {
      setError('That time has already passed. Please pick a later date and time.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const isoTime = new Date(scheduledTime).toISOString()
      const res = await examAPI.scheduleExam(applicationId, { scheduledExamTime: isoTime })
      const booking = res.data.data
      setRescheduled(rescheduling)
      setBookedSlot(booking?.scheduledExamTime || isoTime)
      setStartWindow({ start: booking?.examWindowStart, end: booking?.examWindowEnd })
      setRescheduling(false)
      // A confirmed booking always lands on the policy step. Dropping someone
      // straight onto a Start button they last saw three screens ago is how a
      // pre-flight stops being read.
      setWizardStep(1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule exam.')
    } finally {
      setSaving(false)
    }
  }

  const openReschedule = () => {
    setError('')
    setRescheduled(false)
    setScheduledTime(toLocalInputValue(bookedSlot))
    setRescheduling(true)
  }

  const cancelReschedule = () => {
    setError('')
    setRescheduling(false)
  }

  // The picker shows for a first booking and for a change to an existing one;
  // everything else is the confirmation panel.
  const showPicker = !bookedSlot || rescheduling
  /*
   * A missed slot skips the pre-flight entirely. There is no exam left to
   * prepare for, and making someone tick through a policy and a device check to
   * reach the one button that helps them — rebook — reads as the product not
   * having noticed their slot is gone.
   */
  const showWizard = !showPicker && !missed
  const blockedChecks = readiness
    ? readinessRows.filter((row) => readiness[row.key]?.state === 'BLOCKED')
    : []
  const readyChecks = readiness
    ? readinessRows.filter((row) => readiness[row.key]?.state === 'READY').length
    : 0
  const systemCheckPct = Math.round((readyChecks / readinessRows.length) * 100)
  /** The browser's own verdict on the two devices the exam cannot run without. */
  const mediaGranted = readiness?.camera?.state === 'READY' && readiness?.microphone?.state === 'READY'
  const mediaBlocked = readiness?.camera?.state === 'BLOCKED' || readiness?.microphone?.state === 'BLOCKED'

  /*
   * What the ring on the last step is actually measuring. Three things the
   * candidate can point at, not a percentage of elapsed time: the policy they
   * ticked, a camera and microphone they have seen working, and a window the
   * server says is open.
   */
  const devicesReady = deviceProved || mediaGranted
  const preflightDone = [policyAccepted, devicesReady, windowOpen].filter(Boolean).length
  const preflightPct = (preflightDone / 3) * 100
  const readyToStart = policyAccepted && windowOpen

  return (
    <Box>
      <PageHeader
        title="Schedule Your Exam"
        subtitle={level ? `${level} exam · application #${applicationId}` : `Exam application #${applicationId}`}
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
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/*
            * Nothing is offered until the existing booking is known. Rendering
            * the picker first and correcting it a moment later flashes "pick a
            * date" at a candidate who already has one, which is precisely the
            * prompt that makes them book a second.
            */}
          {levelLoading && <Skeleton variant="rounded" height={320} />}

          {/* ---------- pick / reschedule a slot ---------- */}
          {!levelLoading && showPicker && (
            <Grid container spacing={2.5} alignItems="stretch">
              <Grid item xs={12} md={7}>
                <Paper sx={{ ...panelSx, p: { xs: 2.5, md: 3.5 }, height: '100%' }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        flex: 'none',
                        width: 34,
                        height: 34,
                        borderRadius: '10px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(192,138,46,.14)',
                        border: '1px solid rgba(192,138,46,.4)',
                        color: tokens.copperLt
                      }}
                    >
                      <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em' }}>
                      {rescheduling ? 'Pick a new date and time' : 'Pick a date and time'}
                    </Typography>
                  </Stack>

                  <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: '#93AC9E' }}>
                    Choose when you would like to take your proctored exam. You can start it from
                    10 minutes before the time you pick until 10 minutes after — outside that window
                    you will need to rebook. Rescheduling is free and unlimited, right up until you start.
                  </Typography>

                  {rescheduling && bookedSlot && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Currently booked for <strong>{formatSlot(bookedSlot)}</strong>. Confirming
                      replaces that slot — your payment and application stay as they are.
                    </Alert>
                  )}

                  <PcbDateField
                    type="datetime-local"
                    fullWidth
                    disablePast
                    label="Exam date and time"
                    value={scheduledTime}
                    onChange={setScheduledTime}
                    sx={{ mt: 2.5 }}
                  />

                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      mt: 2.5,
                      mb: 1,
                      fontFamily: fonts.mono,
                      fontSize: 9.5,
                      letterSpacing: '.5px',
                      textTransform: 'uppercase',
                      color: '#93AC9E'
                    }}
                  >
                    Preferred timing
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))' },
                      gap: 1
                    }}
                  >
                    {preferredSlots.map((slot) => {
                      const selected = pickedTime === slot.time
                      const past = isSlotPast(slot.time)
                      return (
                        <Box
                          key={slot.time}
                          component="button"
                          type="button"
                          disabled={past}
                          onClick={() => applyPreferredSlot(slot.time)}
                          sx={{
                            height: 40,
                            borderRadius: '9px',
                            fontFamily: fonts.mono,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: past ? 'not-allowed' : 'pointer',
                            transition: 'background .15s, border-color .15s, color .15s',
                            ...(selected
                              ? {
                                background: 'rgba(192,138,46,.16)',
                                border: '1.5px solid rgba(192,138,46,.4)',
                                color: tokens.copperLt
                              }
                              : {
                                background: 'transparent',
                                border: `1.5px solid ${tokens.line2}`,
                                color: '#93AC9E'
                              }),
                            ...(past && {
                              // Struck through rather than merely dimmed: a faded
                              // button beside five identical ones reads as the
                              // one that is selected, not the one that has gone.
                              opacity: 0.4,
                              textDecoration: 'line-through'
                            }),
                            '&:hover:not(:disabled)': {
                              borderColor: tokens.copper,
                              background: 'rgba(192,138,46,.1)',
                              color: tokens.copperLt
                            }
                          }}
                        >
                          {slot.label}
                        </Box>
                      )
                    })}
                  </Box>

                  <Typography sx={{ mt: 1, fontSize: 11.5, color: '#93AC9E' }}>
                    Quick picks for the day above — the field takes any time you like.
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      mt: 2.5,
                      p: '11px 14px',
                      borderRadius: '9px',
                      background: 'rgba(95,174,146,.06)',
                      border: `1px solid ${tokens.line}`
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 16, color: tokens.greenLt, flex: 'none' }} />
                    <Typography sx={{ fontSize: 12, color: '#CFE2D8' }}>
                      Times are shown in your device timezone. Your start window opens 10 minutes
                      before the slot and closes 10 minutes after it.
                    </Typography>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button
                      variant="contained" size="large" fullWidth
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <EventAvailableIcon />}
                      disabled={saving}
                      onClick={handleSchedule}
                    >
                      {saving
                        ? (rescheduling ? 'Rescheduling…' : 'Scheduling…')
                        : (rescheduling ? 'Confirm new time' : 'Confirm schedule')}
                    </Button>
                    {rescheduling && (
                      <Button
                        variant="outlined" size="large"
                        disabled={saving}
                        onClick={cancelReschedule}
                        sx={{ minWidth: { sm: 170 } }}
                      >
                        Keep current slot
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: '100%' }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1 }}>
                    Session requirements
                  </Typography>
                  {sessionRequirements.map((req, index) => {
                    const Icon = req.icon
                    return (
                      <Box key={req.title}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.5 }}>
                          <Box
                            sx={{
                              flex: 'none',
                              width: 32,
                              height: 32,
                              borderRadius: '9px',
                              display: 'grid',
                              placeItems: 'center',
                              background: 'rgba(95,174,146,.1)',
                              border: `1px solid ${tokens.line2}`,
                              color: tokens.greenLt
                            }}
                          >
                            <Icon sx={{ fontSize: 17 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: '2px' }}>{req.title}</Typography>
                            <Typography sx={{ fontSize: 11.5, lineHeight: 1.5, color: '#93AC9E' }}>
                              {req.desc}
                            </Typography>
                          </Box>
                        </Stack>
                        {index < sessionRequirements.length - 1 && (
                          <Divider sx={{ borderColor: 'rgba(150,195,172,.1)' }} />
                        )}
                      </Box>
                    )
                  })}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ---------- slot gone ---------- */}
          {!levelLoading && !showPicker && missed && (
            <Paper
              sx={{
                ...panelSx,
                p: { xs: 3, md: 4 },
                maxWidth: 760,
                mx: 'auto',
                textAlign: 'center',
                background: 'linear-gradient(140deg, rgba(220,38,38,.12), rgba(26,6,6,.9))',
                borderColor: 'rgba(224,101,101,.35)'
              }}
            >
              <Box
                sx={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  mb: 2,
                  background: 'rgba(224,101,101,.14)',
                  border: '1.5px solid rgba(224,101,101,.5)',
                  color: '#E06565'
                }}
              >
                <EventBusyIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>Slot missed</Typography>
              <Typography sx={{ fontSize: 13, color: '#93AC9E', mb: 3 }}>
                Application #{applicationId} was booked for <strong style={{ color: '#CFE2D8' }}>{formatSlot(bookedSlot)}</strong>
                {closesAt !== null && <> and that window closed at {formatExamClock(startWindow.end)}</>}.
                Pick a new time — your payment still stands.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                <Button
                  variant="contained" color="warning" size="large"
                  startIcon={<EditCalendarIcon />}
                  onClick={openReschedule}
                >
                  Pick a new time
                </Button>
                <Button variant="text" onClick={() => navigate('/exams')}>
                  Back to applications
                </Button>
              </Stack>
            </Paper>
          )}

          {/* ---------- pre-flight ---------- */}
          {!levelLoading && showWizard && (
            <Stack spacing={2.5} sx={{ maxWidth: 900, mx: 'auto' }}>
              <StepRail current={wizardStep} />

              {/* --- step 1: policy --- */}
              {wizardStep === 1 && (
                <Paper sx={{ ...panelSx, p: { xs: 2.5, md: 3.5 }, borderColor: 'rgba(192,138,46,.3)' }}>
                  <Typography
                    sx={{
                      fontFamily: fonts.mono,
                      fontSize: 10,
                      letterSpacing: '.6px',
                      textTransform: 'uppercase',
                      color: '#93AC9E',
                      mb: 1.5
                    }}
                  >
                    Exam proctoring setup
                  </Typography>

                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
                    <Box
                      sx={{
                        flex: 'none',
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(192,138,46,.14)',
                        border: '1px solid rgba(192,138,46,.4)',
                        color: tokens.copperLt
                      }}
                    >
                      <ShieldRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em' }}>
                      Step 1 · Read the proctoring policy
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: '#93AC9E', mb: 2 }}>
                    You must acknowledge this before moving on. Nothing else on this page matters more.
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="flex-start"
                    sx={{
                      p: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(192,138,46,.1)',
                      border: '1px solid rgba(192,138,46,.32)',
                      mb: 2.25
                    }}
                  >
                    <WarningAmberRoundedIcon sx={{ fontSize: 18, color: tokens.copperLt, flex: 'none', mt: '1px' }} />
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.55, color: '#DCC79A' }}>
                      <strong style={{ color: tokens.copperLt }}>{maxViolationsAllowed} violations</strong> auto-terminates
                      and invalidates this attempt. Camera, microphone and screen sharing must stay on with this tab in
                      fullscreen focus.
                    </Typography>
                  </Stack>

                  <Grid container spacing={2} sx={{ mb: 2.5 }}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          height: '100%',
                          p: 2,
                          borderRadius: '11px',
                          background: 'rgba(95,174,146,.06)',
                          border: '1px solid rgba(95,174,146,.22)'
                        }}
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
                          <CheckRoundedIcon sx={{ fontSize: 14, color: tokens.greenLt }} />
                          <Typography
                            sx={{
                              fontFamily: fonts.mono,
                              fontSize: 10,
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: tokens.greenLt
                            }}
                          >
                            Do&apos;s
                          </Typography>
                        </Stack>
                        {doList.map((item) => <RuleLine key={item} text={item} allowed />)}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          height: '100%',
                          p: 2,
                          borderRadius: '11px',
                          background: 'rgba(224,101,101,.06)',
                          border: '1px solid rgba(224,101,101,.22)'
                        }}
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
                          <CloseRoundedIcon sx={{ fontSize: 14, color: '#E06565' }} />
                          <Typography
                            sx={{
                              fontFamily: fonts.mono,
                              fontSize: 10,
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#E06565'
                            }}
                          >
                            Don&apos;ts
                          </Typography>
                        </Stack>
                        {dontList.map((item) => <RuleLine key={item} text={item} allowed={false} />)}
                      </Box>
                    </Grid>
                  </Grid>

                  {/*
                    * The themed MUI control rather than a styled box with a click
                    * handler: the acknowledgement has to be reachable by keyboard
                    * and announced as a checkbox, and it is the one thing on this
                    * page a candidate could later dispute having ticked.
                    */}
                  <FormControlLabel
                    sx={{
                      display: 'flex',
                      m: 0,
                      mb: 2.5,
                      p: '8px 14px',
                      borderRadius: '11px',
                      background: 'rgba(11,44,34,.6)',
                      border: `1px solid ${tokens.line2}`,
                      '& .MuiFormControlLabel-label': { fontSize: 12.5, color: '#CFE2D8' }
                    }}
                    control={
                      <Checkbox
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                      />
                    }
                    label="I have read and understood the exam rules and violation policy."
                  />

                  <Button
                    variant="contained" size="large" fullWidth
                    endIcon={<ArrowForwardRoundedIcon />}
                    disabled={!policyAccepted}
                    onClick={() => setWizardStep(2)}
                  >
                    Continue to system check
                  </Button>
                </Paper>
              )}

              {/* --- step 2: readiness --- */}
              {wizardStep === 2 && (
                <Stack spacing={2.5}>
                  <Paper sx={{ ...panelSx, p: { xs: 2.5, md: '22px 30px' } }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 0.75, letterSpacing: '-.01em' }}>
                      Step 2 · System readiness check
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#93AC9E' }}>
                      What your browser reports right now. Anything marked as asked at start is requested
                      by the exam screen itself — have it ready to allow.
                    </Typography>
                  </Paper>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
                      gap: 2.5,
                      alignItems: 'start'
                    }}
                  >
                    <DeviceCheckPanel
                      stream={deviceCheck.stream}
                      levelRef={deviceCheck.levelRef}
                      requesting={deviceCheck.requesting}
                      error={deviceCheck.error}
                      granted={mediaGranted}
                      blocked={mediaBlocked}
                      onStart={deviceCheck.start}
                      onStop={deviceCheck.stop}
                    />

                    <Paper sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
                      <Typography
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 10,
                          letterSpacing: '.6px',
                          textTransform: 'uppercase',
                          color: '#93AC9E',
                          mb: 1.75
                        }}
                      >
                        Security checklist
                      </Typography>

                      <Stack spacing={1.75}>
                        {readinessRows.map((row) => (
                          <ChecklistRow
                            key={row.key}
                            icon={row.icon}
                            label={row.label}
                            status={readiness?.[row.key]?.status || 'CHECKING…'}
                            tone={readinessTone[readiness?.[row.key]?.state] || readinessTone.PENDING}
                          />
                        ))}
                      </Stack>

                      <Divider sx={{ borderColor: 'rgba(150,195,172,.14)', my: 2.5 }} />

                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography sx={{ fontSize: 11.5, color: '#93AC9E' }}>System check</Typography>
                        <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: tokens.copperLt }}>
                          {systemCheckPct}%
                        </Typography>
                      </Stack>
                      {/*
                        * Counts what the browser already reports as ready, so it
                        * stops short of 100% whenever screen share and fullscreen
                        * are still to be asked for at start. A bar that filled
                        * anyway would be telling the candidate they are done with
                        * two prompts left to answer.
                        */}
                      <Box sx={{ height: 6, borderRadius: '999px', background: 'rgba(150,195,172,.14)', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${systemCheckPct}%`,
                            borderRadius: '999px',
                            background: `linear-gradient(90deg, ${tokens.greenLt}, ${tokens.copperLt})`,
                            transition: 'width .4s'
                          }}
                        />
                      </Box>
                    </Paper>
                  </Box>

                  {/*
                    * A blocked permission is reported, not enforced. The browser's
                    * answer can be stale or unavailable, and refusing to let anyone
                    * past a wrong "BLOCKED" would lock a candidate out of a slot
                    * they paid for — the exam screen asks again either way.
                    */}
                  {blockedChecks.length > 0 && (
                    <Alert severity="warning">
                      Your browser reports a problem with {blockedChecks.map((row) => row.label.toLowerCase()).join(', ')}.
                      Fix this in your browser&apos;s site settings before your slot — the exam cannot start without it.
                    </Alert>
                  )}

                  <ViolationNotice />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="outlined" size="large"
                      onClick={() => setWizardStep(1)}
                      sx={{ minWidth: { sm: 120 } }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained" size="large" fullWidth
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => setWizardStep(3)}
                    >
                      Continue
                    </Button>
                  </Stack>
                </Stack>
              )}

              {/* --- step 3: start --- */}
              {wizardStep === 3 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' },
                    gap: 2.5,
                    alignItems: 'stretch'
                  }}
                >
                  <Paper
                    sx={{
                      ...panelSx,
                      p: { xs: 2.5, md: 3 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      borderColor: readyToStart ? 'rgba(95,174,146,.35)' : tokens.line
                    }}
                  >
                    <ReadinessRing pct={preflightPct} done={preflightDone === 3} />

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-.2px' }}>
                        {rescheduled ? 'Exam rescheduled' : windowOpen ? "You're all set" : 'Pre-flight complete'}
                      </Typography>
                      <Typography sx={{ mt: 0.75, fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 1.5, color: '#93AC9E' }}>
                        {windowOpen
                          ? 'Your start window is open now'
                          : tooEarly
                            ? `Opens in ${formatCountdown(opensAt - now)}`
                            : 'Be ready at your booked time'}
                      </Typography>
                    </Box>

                    <Stack spacing={1.15} sx={{ width: '100%' }}>
                      {[
                        { label: 'Policy acknowledged', done: policyAccepted },
                        { label: 'Camera & microphone', done: devicesReady },
                        { label: 'Start window open', done: windowOpen }
                      ].map((item) => (
                        <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              flex: 'none',
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              background: item.done ? tokens.greenLt : 'rgba(150,195,172,.14)',
                              color: item.done ? '#062017' : tokens.muted
                            }}
                          >
                            <CheckRoundedIcon sx={{ fontSize: 11 }} />
                          </Box>
                          <Typography sx={{ fontSize: 11.5, color: item.done ? '#CFE2D8' : '#93AC9E' }}>
                            {item.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>

                    <Stack
                      spacing={1.15}
                      sx={{ width: '100%', mt: 'auto', pt: 2, borderTop: '1px solid rgba(150,195,172,.14)' }}
                    >
                      {[
                        { label: 'Application', value: `#${applicationId}` },
                        { label: 'Level', value: level || '—' },
                        { label: 'Slot', value: formatExamClock(bookedSlot) || '—' },
                        {
                          label: 'Window',
                          value: opensAt !== null && closesAt !== null
                            ? `${formatExamClock(startWindow.start)} – ${formatExamClock(startWindow.end)}`
                            : '—'
                        }
                      ].map((item) => (
                        <Stack key={item.label} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography sx={{ fontSize: 11, color: '#93AC9E' }}>{item.label}</Typography>
                          <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, color: '#CFE2D8' }}>
                            {item.value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>

                  <Paper sx={{ ...panelSx, p: { xs: 2.5, md: '24px 28px' }, display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.3px', mb: 0.5 }}>
                      Exam readiness
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.5, color: '#B7CFC3', mb: 2.5 }}>
                      Application #{applicationId} · <strong style={{ color: '#CFE2D8' }}>{formatSlot(bookedSlot)}</strong>.
                      The timer starts the instant you begin — do not switch tabs, minimize the window, or use
                      restricted shortcuts once the exam is open.
                    </Typography>

                    <Box sx={{ mb: 2.5 }}>
                      <TimelineStep
                        number={1}
                        title="Proctoring policy"
                        desc={`Acknowledged — ${maxViolationsAllowed} violations end the attempt.`}
                        state="done"
                      />
                      <TimelineStep
                        number={2}
                        title="Camera & microphone"
                        desc={devicesReady
                          ? 'Checked and working on this device.'
                          : 'Not verified here — the exam screen will ask before it opens.'}
                        state={devicesReady ? 'done' : 'pending'}
                      />
                      <TimelineStep
                        number={3}
                        title="Start window"
                        desc={windowOpen
                          ? `Open now until ${formatExamClock(startWindow.end)}.`
                          : tooEarly
                            ? `Opens in ${formatCountdown(opensAt - now)}, at ${formatExamClock(startWindow.start)}.`
                            : 'Be ready to start at your booked time.'}
                        state={windowOpen ? 'done' : 'active'}
                      />
                      <TimelineStep
                        number={4}
                        title="Start exam"
                        desc="Screen sharing and fullscreen are requested the moment you begin."
                        state={readyToStart ? 'active' : 'pending'}
                        last
                      />
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 'auto' }}>
                      {/*
                        * Rescheduling stays open until the attempt itself begins.
                        * The payment covers one sitting, not one date, and the server
                        * refuses the change the moment a session exists — so nothing
                        * here can be used to buy a second attempt.
                        */}
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<EditCalendarIcon />}
                        onClick={openReschedule}
                        sx={{ flex: 'none' }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="contained" size="large" fullWidth
                        // A play triangle means "go". Beside "Not open yet" it invites
                        // the click the button is there to refuse, so the blocked
                        // state says so with the icon too.
                        startIcon={windowOpen ? <PlayArrowIcon /> : <LockClockIcon />}
                        onClick={() => navigate(`/exam/${applicationId}`)}
                        disabled={!readyToStart}
                        sx={{ fontWeight: 800 }}
                      >
                        {tooEarly ? 'Not open yet' : 'Start exam now'}
                      </Button>
                    </Stack>

                    <Button variant="text" onClick={() => setWizardStep(2)} sx={{ mt: 1.25, alignSelf: 'flex-start' }}>
                      Back to system check
                    </Button>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </Grid>

        {/*
          * The syllabus sits on the last screen before launch, so a candidate
          * can see exactly what they will be examined on — and take the PDF
          * away — while the exam environment is still unlocked.
          */}
        <Grid item xs={12} lg={10} xl={9}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, letterSpacing: '-0.01em' }}>
              What this exam covers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Review the syllabus before you begin. Questions are drawn only from the modules listed below.
            </Typography>

            {levelLoading && <Skeleton variant="rounded" height={320} />}

            {!levelLoading && !level && (
              <Alert severity="info">
                The syllabus for this application could not be loaded. You can view every level&apos;s
                syllabus from the Exams page.
              </Alert>
            )}

            {!levelLoading && level && <SyllabusPanel level={level} />}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExamSchedulePage
