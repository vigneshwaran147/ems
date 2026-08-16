// ems_frontend/src/components/common/LoadingSpinner.jsx
import { Backdrop, CircularProgress, Box } from '@mui/material'
import { tokens, fonts } from '../../styles/tokens'

const LoadingSpinner = ({ open = false, label = 'PROCESSING' }) => {
  return (
    <Backdrop
      sx={{
        color: tokens.copperLt,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        flexDirection: 'column',
        gap: 2,
        backdropFilter: 'blur(3px)',
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={38} thickness={3} />
      <Box sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '2.4px', color: tokens.muted }}>
        {label}
      </Box>
    </Backdrop>
  )
}

export default LoadingSpinner
