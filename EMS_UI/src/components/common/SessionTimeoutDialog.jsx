// ems_frontend/src/components/common/SessionTimeoutDialog.jsx
import PropTypes from 'prop-types'
import { Box, Button, Dialog, Typography } from '@mui/material'
import TimerIcon from '@mui/icons-material/TimerOutlined'
import { tokens, fonts, gradients, shadows, ctaButton } from '../../styles/tokens'

/**
 * Final warning before an idle session is ended.
 *
 * Deliberately not dismissable by backdrop click or Escape: both are easy to
 * trigger by accident, and silently cancelling the warning would leave the user
 * believing the session was extended when the clock is still running down.
 */
const SessionTimeoutDialog = ({ msLeft, onStay, onLogout }) => {
  const seconds = Math.max(0, Math.round((msLeft || 0) / 1000))

  return (
    <Dialog
      open={msLeft !== null}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 420,
          borderRadius: '22px',
          background: gradients.card,
          border: `1px solid ${tokens.line2}`,
          boxShadow: shadows.package,
          p: '28px',
          textAlign: 'center',
        },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          mx: 'auto',
          mb: 2,
          borderRadius: '13px',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(192,138,46,.14)',
          border: '1px solid rgba(192,138,46,.4)',
          color: tokens.copperLt,
        }}
      >
        <TimerIcon sx={{ fontSize: 22 }} />
      </Box>

      <Typography component="h2" sx={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.4px' }}>
        Still there?
      </Typography>

      <Typography sx={{ mt: 1, fontSize: 13.5, lineHeight: 1.6, color: '#B7CFC3' }}>
        Your session is about to end after 10 minutes without activity.
      </Typography>

      <Typography
        sx={{
          my: 2.25,
          fontFamily: fonts.mono,
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-1px',
          color: tokens.copperLt,
        }}
      >
        {seconds}s
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.25 }}>
        <Button variant="outlined" onClick={onLogout} sx={{ flex: 1, height: 42, fontSize: 12.5 }}>
          Log out now
        </Button>
        <Button
          variant="contained"
          onClick={onStay}
          sx={{ ...ctaButton, flex: 1, width: 'auto', height: 42, fontSize: 12.5, letterSpacing: '.4px' }}
        >
          Stay signed in
        </Button>
      </Box>
    </Dialog>
  )
}

SessionTimeoutDialog.propTypes = {
  /** Milliseconds remaining; null keeps the dialog closed. */
  msLeft: PropTypes.number,
  onStay: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
}

export default SessionTimeoutDialog
