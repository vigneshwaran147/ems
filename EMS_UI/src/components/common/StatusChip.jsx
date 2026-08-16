// ems_frontend/src/components/common/StatusChip.jsx
import { Chip } from '@mui/material'
import { fonts, tone as toneMap } from '../../styles/tokens'

// Maps common backend status strings onto the four system tones.
const TONE_MAP = {
  ACTIVE: 'green',
  PASSED: 'green',
  PASS: 'green',
  SUCCESS: 'green',
  COMPLETED: 'green',
  PUBLISHED: 'green',
  APPROVED: 'green',
  VALID: 'green',
  PENDING: 'copper',
  PAYMENT_PENDING: 'copper',
  IN_PROGRESS: 'info',
  SCHEDULED: 'info',
  APPLIED: 'info',
  FAILED: 'danger',
  FAIL: 'danger',
  EXPIRED: 'danger',
  INVALIDATED: 'danger',
  TERMINATED: 'danger',
  REJECTED: 'danger',
  INVALID: 'danger',
  REFUNDED: 'neutral',
  DRAFT: 'neutral',
}

const StatusChip = ({ status, size = 'small', sx, ...rest }) => {
  if (!status) return null
  const key = String(status).toUpperCase()
  const t = toneMap[TONE_MAP[key] || 'neutral']
  const label = String(status).replace(/_/g, ' ')

  return (
    <Chip
      label={label}
      size={size}
      variant="outlined"
      sx={{
        fontFamily: fonts.mono,
        fontSize: '0.68rem',
        fontWeight: 500,
        letterSpacing: '.6px',
        textTransform: 'uppercase',
        color: t.fg,
        background: t.bg,
        borderColor: t.border,
        ...sx,
      }}
      {...rest}
    />
  )
}

export default StatusChip
