// ems_frontend/src/components/common/EmptyState.jsx
import { Box, Typography } from '@mui/material'
import InboxRoundedIcon from '@mui/icons-material/InboxRounded'

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
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'action.hover',
        color: 'text.secondary',
        mb: 1,
      }}
    >
      {icon || <InboxRoundedIcon fontSize="large" />}
    </Box>
    <Typography variant="h6" fontWeight={700}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
)

export default EmptyState
