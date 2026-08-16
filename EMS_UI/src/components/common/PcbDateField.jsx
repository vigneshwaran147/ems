// ems_frontend/src/components/common/PcbDateField.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Button, IconButton, InputAdornment, Popover, TextField } from '@mui/material'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { fonts, gradients, menuOption, popoverSurface, shadows, tokens } from '../../styles/tokens'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3))
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (value) => String(value).padStart(2, '0')

/**
 * `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` → a *local* Date.
 *
 * `new Date('2026-08-15')` is specified to parse as UTC, which lands on the
 * 14th for anyone west of Greenwich. Building the date part by part keeps the
 * calendar showing the day the string actually names.
 */
export const parseFieldValue = (raw) => {
  if (!raw) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(raw))
  if (!match) return null
  const date = new Date(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]),
    Number(match[4] || 0), Number(match[5] || 0), 0, 0
  )
  return Number.isNaN(date.getTime()) ? null : date
}

/** Emits exactly what the native `date` / `datetime-local` inputs emitted. */
const formatFieldValue = (date, withTime) => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return withTime ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day
}

const formatDisplay = (date, withTime) => {
  const day = `${pad(date.getDate())} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
  if (!withTime) return day
  const hour = date.getHours() % 12 || 12
  const meridiem = date.getHours() >= 12 ? 'PM' : 'AM'
  return `${day} · ${pad(hour)}:${pad(date.getMinutes())} ${meridiem}`
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1)
const isSameDay = (a, b) => Boolean(a && b) && startOfDay(a).getTime() === startOfDay(b).getTime()

/** Six weeks of cells, Sunday-first, padded with the neighbouring months. */
const buildMonthGrid = (view) => {
  const first = startOfMonth(view)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

const wheelOptionSx = {
  ...menuOption,
  mx: '4px',
  px: 0,
  py: '6px',
  width: 'calc(100% - 8px)',
  border: 'none',
  background: 'transparent',
  fontFamily: fonts.mono,
  fontSize: 12.5,
  textAlign: 'center',
  cursor: 'pointer',
  display: 'block',
  '&:disabled': { opacity: 0.26, cursor: 'default' },
  '&[aria-selected="true"]': {
    background: gradients.copper,
    color: '#062017',
    fontWeight: 800,
  },
}

/**
 * A scrollable column of the time wheel. Keeps the picked entry parked in the
 * middle of the column so the selection is visible the moment it opens.
 */
const TimeWheel = ({ label, items, value, onSelect }) => {
  const containerRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const selected = selectedRef.current
    if (!container || !selected) return
    container.scrollTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
  }, [value])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 58 }}>
      <Box
        sx={{
          fontFamily: fonts.mono, fontSize: 9, letterSpacing: '1.4px',
          textTransform: 'uppercase', color: tokens.muted, textAlign: 'center', mb: 0.75,
        }}
      >
        {label}
      </Box>
      <Box
        ref={containerRef}
        role="listbox"
        aria-label={label}
        sx={{
          height: 196,
          overflowY: 'auto',
          borderRadius: '10px',
          border: `1px solid ${tokens.line}`,
          background: 'rgba(3,16,11,.55)',
          py: '4px',
        }}
      >
        {items.map((item) => {
          const selected = item.value === value
          return (
            <Box
              key={String(item.value)}
              component="button"
              type="button"
              role="option"
              ref={selected ? selectedRef : null}
              aria-selected={selected}
              disabled={item.disabled}
              onClick={() => onSelect(item.value)}
              sx={wheelOptionSx}
            >
              {item.label}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

TimeWheel.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func.isRequired,
}

/**
 * The application's date and date-time picker.
 *
 * `<input type="date">` hands its calendar to the browser, which draws it from
 * the OS palette — a light popup floating over the board with none of the
 * copper language. This renders the calendar itself: same substrate, same
 * copper accent, same mono micro-labels as every other surface.
 *
 * Values go in and out in the native input formats (`YYYY-MM-DD`, or
 * `YYYY-MM-DDTHH:mm` when `type="datetime-local"`), so it drops into code that
 * previously held a native input. `onChange` receives the value string.
 *
 * `disablePast` blocks every day before today — and, in date-time mode, every
 * slot earlier than the current minute on today itself.
 */
const PcbDateField = ({
  value,
  onChange,
  type = 'date',
  disablePast = false,
  min,
  max,
  label,
  placeholder,
  size = 'medium',
  fullWidth = false,
  disabled = false,
  error = false,
  helperText,
  clearable = true,
  minuteStep = 5,
  name,
  id,
  sx,
  ...rest
}) => {
  const withTime = type === 'datetime-local'
  const [anchorEl, setAnchorEl] = useState(null)
  const [draft, setDraft] = useState(null)
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()))
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  // Frozen when the popover opens: "now" must not drift mid-interaction, or a
  // slot could disable itself under the pointer.
  const [now, setNow] = useState(() => new Date())

  const selected = useMemo(() => parseFieldValue(value), [value])

  const minBound = useMemo(() => {
    const bounds = []
    const explicit = parseFieldValue(min)
    if (explicit) bounds.push(explicit)
    if (disablePast) {
      bounds.push(
        withTime
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())
          : startOfDay(now)
      )
    }
    return bounds.length ? new Date(Math.max(...bounds.map((date) => date.getTime()))) : null
  }, [min, disablePast, withTime, now])

  const maxBound = useMemo(() => parseFieldValue(max), [max])

  const isDayDisabled = useCallback(
    (day) => {
      if (minBound && startOfDay(day) < startOfDay(minBound)) return true
      if (maxBound && startOfDay(day) > startOfDay(maxBound)) return true
      return false
    },
    [minBound, maxBound]
  )

  const isMomentDisabled = useCallback(
    (moment) => Boolean((minBound && moment < minBound) || (maxBound && moment > maxBound)),
    [minBound, maxBound]
  )

  const stepMinutes = useMemo(() => {
    const values = []
    for (let minute = 0; minute < 60; minute += minuteStep) values.push(minute)
    return values
  }, [minuteStep])

  /** Earliest selectable moment on `day`, or null if the whole day is out. */
  const firstSlotOn = useCallback(
    (day) => {
      for (let hour = 0; hour < 24; hour += 1) {
        for (const minute of stepMinutes) {
          const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute)
          if (!isMomentDisabled(candidate)) return candidate
        }
      }
      return null
    },
    [stepMinutes, isMomentDisabled]
  )

  const clampDay = useCallback(
    (day) => {
      if (minBound && startOfDay(day) < startOfDay(minBound)) return startOfDay(minBound)
      if (maxBound && startOfDay(day) > startOfDay(maxBound)) return startOfDay(maxBound)
      return startOfDay(day)
    },
    [minBound, maxBound]
  )

  const open = Boolean(anchorEl)

  const handleOpen = (event) => {
    if (disabled) return
    const current = new Date()
    setNow(current)
    const parsed = parseFieldValue(value)
    // Date-time mode seeds a draft so the wheels have something to show; a
    // date-only picker commits on the day click, so nothing is pre-selected.
    const seed = parsed || (withTime ? firstSlotOn(clampDay(current)) : null)
    setDraft(seed)
    setViewDate(startOfMonth(parsed || clampDay(current)))
    setMonthPickerOpen(false)
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => setAnchorEl(null)

  const commit = (date) => {
    onChange?.(date ? formatFieldValue(date, withTime) : '')
    handleClose()
  }

  const handleDayClick = (day) => {
    if (isDayDisabled(day)) return
    if (!withTime) {
      commit(day)
      return
    }
    const base = draft || now
    let next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes())
    if (isMomentDisabled(next)) next = firstSlotOn(day) || next
    setDraft(next)
  }

  const applyTimePart = (part, partValue) => {
    const base = draft || firstSlotOn(clampDay(now)) || now
    let hours = base.getHours()
    let minutes = base.getMinutes()

    if (part === 'hour') hours = (partValue % 12) + (hours >= 12 ? 12 : 0)
    if (part === 'minute') minutes = partValue
    if (part === 'meridiem') hours = (hours % 12) + (partValue === 'PM' ? 12 : 0)

    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes)
    if (isMomentDisabled(next)) return
    setDraft(next)
  }

  const grid = useMemo(() => buildMonthGrid(viewDate), [viewDate])
  const highlighted = withTime ? draft : selected
  const canGoBack = !minBound || startOfMonth(minBound) < startOfMonth(viewDate)
  const canGoForward = !maxBound || startOfMonth(maxBound) > startOfMonth(viewDate)

  const timeItems = useMemo(() => {
    if (!withTime) return null
    const base = draft || firstSlotOn(clampDay(now)) || now
    const dayPart = { year: base.getFullYear(), month: base.getMonth(), date: base.getDate() }
    const at = (hours, minutes) => new Date(dayPart.year, dayPart.month, dayPart.date, hours, minutes)
    const isPm = base.getHours() >= 12

    // An off-step minute can arrive from a saved value; keep it listed so the
    // wheel never shows a selection the user cannot see.
    const minuteValues = stepMinutes.includes(base.getMinutes())
      ? stepMinutes
      : [...stepMinutes, base.getMinutes()].sort((a, b) => a - b)

    return {
      hours: Array.from({ length: 12 }, (_, index) => {
        const hour12 = index + 1
        const hour24 = (hour12 % 12) + (isPm ? 12 : 0)
        return {
          value: hour12,
          label: pad(hour12),
          disabled: minuteValues.every((minute) => isMomentDisabled(at(hour24, minute))),
        }
      }),
      minutes: minuteValues.map((minute) => ({
        value: minute,
        label: pad(minute),
        disabled: isMomentDisabled(at(base.getHours(), minute)),
      })),
      meridiems: ['AM', 'PM'].map((meridiem) => ({
        value: meridiem,
        label: meridiem,
        disabled: Array.from({ length: 12 }, (_, index) => index).every((index) =>
          minuteValues.every((minute) =>
            isMomentDisabled(at((index % 12) + (meridiem === 'PM' ? 12 : 0), minute))
          )
        ),
      })),
      hour12: base.getHours() % 12 || 12,
      minute: base.getMinutes(),
      meridiem: isPm ? 'PM' : 'AM',
    }
  }, [withTime, draft, now, stepMinutes, isMomentDisabled, firstSlotOn, clampDay])

  const nowShortcutDisabled = isMomentDisabled(withTime ? now : startOfDay(now))

  return (
    <>
      <TextField
        id={id}
        name={name}
        label={label}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        error={Boolean(error)}
        helperText={helperText}
        value={selected ? formatDisplay(selected, withTime) : ''}
        placeholder={placeholder || (withTime ? 'Select date and time' : 'Select date')}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
            event.preventDefault()
            handleOpen({ currentTarget: event.currentTarget })
          }
        }}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end" sx={{ ml: 0 }}>
              {clearable && selected && !disabled && (
                <IconButton
                  size="small"
                  aria-label="Clear date"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange?.('')
                  }}
                  sx={{ mr: -0.25, p: 0.35 }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              )}
              <EventRoundedIcon
                sx={{ fontSize: 17, color: disabled ? tokens.muted : tokens.copper, ml: 0.5 }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': { cursor: disabled ? 'default' : 'pointer' },
          '& .MuiOutlinedInput-input': { cursor: disabled ? 'default' : 'pointer' },
          ...sx,
        }}
        {...rest}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { ...popoverSurface, mt: 1, p: 1.75 } }}
      >
        <Box sx={{ display: 'flex', gap: 1.75 }}>
          <Box sx={{ width: 252 }}>
            {/* month header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <IconButton
                size="small"
                aria-label="Previous month"
                disabled={!canGoBack}
                onClick={() => setViewDate((current) => addMonths(current, -1))}
                sx={{ border: `1px solid ${tokens.line}`, borderRadius: '8px', p: 0.4 }}
              >
                <ChevronLeftRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>

              <Box
                component="button"
                type="button"
                onClick={() => setMonthPickerOpen((current) => !current)}
                sx={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 700,
                  letterSpacing: '.2px', color: tokens.ink, px: 1, py: 0.5, borderRadius: '8px',
                  '&:hover': { background: 'rgba(192,138,46,.10)', color: tokens.copperLt },
                }}
              >
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </Box>

              <IconButton
                size="small"
                aria-label="Next month"
                disabled={!canGoForward}
                onClick={() => setViewDate((current) => addMonths(current, 1))}
                sx={{ border: `1px solid ${tokens.line}`, borderRadius: '8px', p: 0.4 }}
              >
                <ChevronRightRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>

            {monthPickerOpen ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                  <IconButton
                    size="small"
                    aria-label="Previous year"
                    onClick={() => setViewDate((current) => addMonths(current, -12))}
                    sx={{ p: 0.3 }}
                  >
                    <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Box sx={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 700, color: tokens.copperLt }}>
                    {viewDate.getFullYear()}
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Next year"
                    onClick={() => setViewDate((current) => addMonths(current, 12))}
                    sx={{ p: 0.3 }}
                  >
                    <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75, height: 218 }}>
                  {MONTHS_SHORT.map((month, index) => {
                    const monthStart = new Date(viewDate.getFullYear(), index, 1)
                    const monthEnd = new Date(viewDate.getFullYear(), index + 1, 0)
                    const outOfRange =
                      (minBound && monthEnd < startOfDay(minBound)) ||
                      (maxBound && monthStart > startOfDay(maxBound))
                    const active = index === viewDate.getMonth()
                    return (
                      <Box
                        key={month}
                        component="button"
                        type="button"
                        disabled={Boolean(outOfRange)}
                        onClick={() => {
                          setViewDate(monthStart)
                          setMonthPickerOpen(false)
                        }}
                        sx={{
                          border: `1px solid ${active ? 'rgba(192,138,46,.55)' : 'transparent'}`,
                          borderRadius: '9px',
                          background: active ? 'rgba(192,138,46,.14)' : 'transparent',
                          color: active ? tokens.copperLt : tokens.body,
                          fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          '&:hover': { background: 'rgba(192,138,46,.10)', color: tokens.ink },
                          '&:disabled': { opacity: 0.26, cursor: 'default' },
                        }}
                      >
                        {month}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
                  {WEEKDAYS.map((weekday, index) => (
                    <Box
                      key={`${weekday}-${index}`}
                      sx={{
                        fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '.6px',
                        textTransform: 'uppercase', color: tokens.muted, textAlign: 'center', py: 0.5,
                      }}
                    >
                      {weekday}
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {grid.map((day) => {
                    const outsideMonth = day.getMonth() !== viewDate.getMonth()
                    const dayDisabled = isDayDisabled(day)
                    const isSelected = isSameDay(day, highlighted)
                    const isToday = isSameDay(day, now)
                    return (
                      <Box
                        key={day.getTime()}
                        component="button"
                        type="button"
                        disabled={dayDisabled}
                        aria-current={isToday ? 'date' : undefined}
                        aria-pressed={isSelected}
                        onClick={() => handleDayClick(day)}
                        sx={{
                          height: 32,
                          borderRadius: '9px',
                          cursor: 'pointer',
                          fontFamily: fonts.sans,
                          fontSize: 12.5,
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#062017' : outsideMonth ? tokens.muted : tokens.ink,
                          opacity: outsideMonth && !isSelected ? 0.5 : 1,
                          background: isSelected ? gradients.copper : 'transparent',
                          boxShadow: isSelected ? shadows.copperGlow : 'none',
                          border: `1px solid ${
                            isToday && !isSelected ? 'rgba(192,138,46,.55)' : 'transparent'
                          }`,
                          transition: 'background .15s, color .15s',
                          '&:hover': isSelected
                            ? undefined
                            : { background: 'rgba(192,138,46,.12)', color: tokens.copperLt },
                          '&:disabled': {
                            opacity: 0.22,
                            cursor: 'default',
                            color: tokens.muted,
                            background: 'transparent',
                          },
                        }}
                      >
                        {day.getDate()}
                      </Box>
                    )
                  })}
                </Box>
              </>
            )}
          </Box>

          {withTime && timeItems && (
            <Box sx={{ display: 'flex', gap: 0.75, borderLeft: `1px solid ${tokens.line}`, pl: 1.75 }}>
              <TimeWheel
                label="Hr"
                items={timeItems.hours}
                value={timeItems.hour12}
                onSelect={(hour) => applyTimePart('hour', hour)}
              />
              <TimeWheel
                label="Min"
                items={timeItems.minutes}
                value={timeItems.minute}
                onSelect={(minute) => applyTimePart('minute', minute)}
              />
              <TimeWheel
                label="AM/PM"
                items={timeItems.meridiems}
                value={timeItems.meridiem}
                onSelect={(meridiem) => applyTimePart('meridiem', meridiem)}
              />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            mt: 1.5, pt: 1.25, borderTop: `1px solid ${tokens.line}`,
          }}
        >
          <Button
            size="small"
            variant="text"
            disabled={nowShortcutDisabled}
            onClick={() => {
              const target = withTime ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()) : now
              if (withTime) {
                setDraft(target)
                setViewDate(startOfMonth(target))
                setMonthPickerOpen(false)
              } else {
                commit(target)
              }
            }}
            sx={{ fontSize: 11.5, py: 0.4 }}
          >
            {withTime ? 'Now' : 'Today'}
          </Button>

          <Box sx={{ flex: 1 }} />

          {clearable && (
            <Button size="small" variant="text" onClick={() => commit(null)} sx={{ fontSize: 11.5, py: 0.4, color: tokens.muted }}>
              Clear
            </Button>
          )}

          {withTime && (
            <Button
              size="small"
              variant="contained"
              disabled={!draft || isMomentDisabled(draft)}
              onClick={() => commit(draft)}
              sx={{ fontSize: 11.5, py: 0.4, px: 2 }}
            >
              Done
            </Button>
          )}
        </Box>
      </Popover>
    </>
  )
}

PcbDateField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  type: PropTypes.oneOf(['date', 'datetime-local']),
  disablePast: PropTypes.bool,
  min: PropTypes.string,
  max: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.node,
  clearable: PropTypes.bool,
  minuteStep: PropTypes.number,
  name: PropTypes.string,
  id: PropTypes.string,
  sx: PropTypes.object,
}

export default PcbDateField
