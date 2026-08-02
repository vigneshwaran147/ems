// ems_frontend/src/components/common/StatusChip.jsx
import { Chip } from '@mui/material'

// Maps common backend status strings to MUI chip colors.
const COLOR_MAP = {
  ACTIVE: 'success',
  PASSED: 'success',
  PASS: 'success',
  SUCCESS: 'success',
  COMPLETED: 'success',
  PUBLISHED: 'success',
  APPROVED: 'success',
  VALID: 'success',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  SCHEDULED: 'info',
  APPLIED: 'info',
  PAYMENT_PENDING: 'warning',
  FAILED: 'error',
  FAIL: 'error',
  EXPIRED: 'error',
  INVALIDATED: 'error',
  REJECTED: 'error',
  REFUNDED: 'default',
  INVALID: 'error',
  DRAFT: 'default',
}

const StatusChip = ({ status, size = 'small', ...rest }) => {
  if (!status) return null
  const key = String(status).toUpperCase()
  const color = COLOR_MAP[key] || 'default'
  const label = String(status).replace(/_/g, ' ')
  return <Chip label={label} color={color} size={size} variant="outlined" {...rest} />
}

export default StatusChip
