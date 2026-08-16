// ems_frontend/src/components/common/EmptyState.jsx
import { Box, Typography } from '@mui/material'
import InboxRoundedIcon from '@mui/icons-material/InboxRounded'
import { tokens } from '../../styles/tokens'

const EmptyState = ({ icon, title = 'Nothing here yet', description, action }) => (
  <Box
    sx={{
      textAlign: 'center', py: 8, px: 2, display: 'flex',
      flexDirection: 'column', alignItems: 'center', gap: 1,
    }}
  >
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: '18px',
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(192,138,46,.08)',
        border: `1px solid ${tokens.line}`,
        color: tokens.muted,
        mb: 1,
      }}
    >
      {icon || <InboxRoundedIcon fontSize="large" />}
    </Box>
    <Typography variant="h6" fontWeight={700} sx={{ color: tokens.ink }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" sx={{ maxWidth: 420, color: tokens.body }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
)

export default EmptyState
