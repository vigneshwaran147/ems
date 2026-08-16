// ems_frontend/src/components/exam/proctoring/DeviceCheckPanel.jsx
import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import { tokens, fonts } from '../../../styles/tokens'

/** Bars in the level meter. Odd count so the tallest sits dead centre. */
const BAR_COUNT = 15

/** How much of full scale each bar answers to, centre bars hardest. */
const BAR_WEIGHTS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const distance = Math.abs(index - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2)
  return 0.45 + 0.55 * (1 - distance ** 1.6)
})

const statusTone = {
  GRANTED: { fg: tokens.greenLt, label: 'GRANTED' },
  PENDING: { fg: tokens.copperLt, label: 'PENDING' },
  BLOCKED: { fg: '#E06565', label: 'BLOCKED' }
}

/** Header row above a preview: what the device is, and where it currently stands. */
const DeviceHeading = ({ icon: Icon, label, state }) => {
  const tone = statusTone[state] || statusTone.PENDING
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon sx={{ fontSize: 15, color: tone.fg }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.ink }}>{label}</Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: tone.fg }} />
        <Typography
          sx={{
            fontFamily: fonts.mono,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '.05em',
            color: tone.fg
          }}
        >
          {tone.label}
        </Typography>
      </Stack>
    </Stack>
  )
}

DeviceHeading.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  state: PropTypes.oneOf(['GRANTED', 'PENDING', 'BLOCKED'])
}

/**
 * The self-view.
 *
 * Mirrored, because every camera preview a person has ever used is: an unmirrored
 * face moves the wrong way when you lean, and a candidate framing themselves
 * fights the picture instead of using it. Only the preview is flipped — nothing
 * here touches what proctoring records.
 */
const CameraPreview = ({ stream }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream || null
    }
  }, [stream])

  return (
    <Box
      sx={{
        position: 'relative',
        height: 168,
        borderRadius: '9px',
        overflow: 'hidden',
        background: '#02100B',
        border: `1px solid ${tokens.line}`,
        display: 'grid',
        placeItems: 'center',
        '@keyframes recBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } }
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        muted
        playsInline
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: stream ? 'block' : 'none'
        }}
      />

      {!stream && (
        <Stack spacing={1} alignItems="center" sx={{ position: 'relative' }}>
          <VideocamRoundedIcon sx={{ fontSize: 26, color: '#3F8E74' }} />
          <Typography sx={{ fontSize: 11, color: tokens.muted }}>Preview appears here</Typography>
        </Stack>
      )}

      {stream && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 9,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 0.9,
              py: '3px',
              borderRadius: '6px',
              background: 'rgba(3,17,12,.72)'
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#E06565',
                animation: 'recBlink 1.4s ease-in-out infinite'
              }}
            />
            <Typography
              sx={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#F0C9C9' }}
            >
              LIVE
            </Typography>
          </Box>

          <Typography
            sx={{
              position: 'absolute',
              left: 9,
              bottom: 8,
              px: 0.9,
              py: '3px',
              borderRadius: '6px',
              background: 'rgba(3,17,12,.72)',
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: '.06em',
              color: '#CFE2D8'
            }}
          >
            SELF-VIEW · NOT RECORDING
          </Typography>
        </>
      )}
    </Box>
  )
}

CameraPreview.propTypes = { stream: PropTypes.object }

/**
 * Live microphone level.
 *
 * The bars are driven straight from the analyser through `levelRef` and written
 * to the DOM inside this component's own animation frame. A decorative loop
 * would have been half the code and a quarter of the honesty: bars that dance
 * whatever the microphone is doing tell a muted candidate they are fine.
 */
const MicMeter = ({ levelRef, live }) => {
  const barsRef = useRef([])

  useEffect(() => {
    if (!live) {
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '6px'
      })
      return undefined
    }
    let frame = 0
    const paint = () => {
      const level = levelRef.current || 0
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          bar.style.height = `${6 + level * BAR_WEIGHTS[index] * 40}px`
        }
      })
      frame = requestAnimationFrame(paint)
    }
    frame = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(frame)
  }, [levelRef, live])

  return (
    <Box
      sx={{
        height: 168,
        borderRadius: '9px',
        background: '#02100B',
        border: `1px solid ${tokens.line}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: 48 }}>
        {BAR_WEIGHTS.map((weight, index) => (
          <Box
            key={`bar-${index}`}
            ref={(node) => { barsRef.current[index] = node }}
            sx={{
              width: 3,
              height: 6,
              borderRadius: '2px',
              background: live ? tokens.greenLt : 'rgba(150,195,172,.28)',
              // No height transition: the hook already smooths the level, and a
              // CSS ease on top of a per-frame write only makes the meter lag
              // behind the voice it is supposed to be showing.
              transition: 'background .2s'
            }}
          />
        ))}
      </Stack>
      <Typography sx={{ fontSize: 11, color: live ? '#93AC9E' : tokens.muted }}>
        {live ? 'Say something to test your microphone' : 'Level meter appears here'}
      </Typography>
    </Box>
  )
}

MicMeter.propTypes = {
  levelRef: PropTypes.shape({ current: PropTypes.number }).isRequired,
  live: PropTypes.bool
}

/**
 * Camera and microphone check with a live preview.
 *
 * Nothing here grants anything to the exam: the exam screen asks again at start.
 * What it buys the candidate is finding out now — while rescheduling is still
 * free — that the camera is covered, the microphone is the wrong one, or the
 * browser has the site blocked outright.
 */
const DeviceCheckPanel = ({ stream, levelRef, requesting, error, granted, blocked, onStart, onStop, sx }) => {
  const live = Boolean(stream)
  const deviceState = blocked ? 'BLOCKED' : (live || granted) ? 'GRANTED' : 'PENDING'

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: '18px',
        background: 'linear-gradient(168deg, rgba(11,44,34,.85), rgba(4,20,14,.92))',
        border: `1px solid ${tokens.line}`,
        boxShadow: '0 16px 34px -20px rgba(0,0,0,.85)',
        ...sx
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
        <Box
          sx={{
            flex: 'none',
            width: 30,
            height: 30,
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(192,138,46,.12)',
            border: '1px solid rgba(192,138,46,.34)',
            color: tokens.copperLt
          }}
        >
          <LockRoundedIcon sx={{ fontSize: 15 }} />
        </Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.3px' }}>
          Permission Required
        </Typography>
      </Stack>

      <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: '#B7CFC3', mb: 2.5 }}>
        Camera and microphone access are mandatory. Run the check now so a covered lens or a
        blocked browser setting turns up here, not at your slot.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} sx={{ mb: 2.25 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: 1.75,
            borderRadius: '12px',
            background: 'rgba(95,174,146,.06)',
            border: `1px solid ${tokens.line2}`
          }}
        >
          <DeviceHeading icon={VideocamRoundedIcon} label="Camera" state={deviceState} />
          <CameraPreview stream={stream} />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: 1.75,
            borderRadius: '12px',
            background: 'rgba(95,174,146,.06)',
            border: `1px solid ${tokens.line2}`
          }}
        >
          <DeviceHeading icon={MicRoundedIcon} label="Microphone" state={deviceState} />
          <MicMeter levelRef={levelRef} live={live} />
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant={live ? 'outlined' : 'contained'}
        size="large"
        fullWidth
        disabled={requesting}
        onClick={live ? onStop : onStart}
        sx={{
          position: 'relative',
          height: 46,
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: 12.5,
          letterSpacing: '.4px',
          textTransform: 'uppercase',
          overflow: 'hidden',
          ...(live
            ? { borderColor: 'rgba(95,174,146,.4)', color: tokens.greenLt, background: 'rgba(95,174,146,.14)' }
            : {
              '@keyframes deviceSweep': { '0%': { left: '-45%' }, '55%,100%': { left: '115%' } },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-45%',
                width: '45%',
                height: '100%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent)',
                transform: 'skewX(-18deg)',
                animation: 'deviceSweep 3.2s ease-in-out infinite'
              },
              '&.Mui-disabled::after': { animation: 'none' }
            })
        }}
      >
        {requesting
          ? 'Requesting permission…'
          : live
            ? 'Devices working — stop preview'
            : 'Test camera & microphone'}
      </Button>
    </Box>
  )
}

DeviceCheckPanel.propTypes = {
  stream: PropTypes.object,
  levelRef: PropTypes.shape({ current: PropTypes.number }).isRequired,
  requesting: PropTypes.bool,
  error: PropTypes.string,
  /** The browser already reports the permission as granted. */
  granted: PropTypes.bool,
  /** The browser reports the site as blocked. */
  blocked: PropTypes.bool,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  sx: PropTypes.object
}

export default DeviceCheckPanel
