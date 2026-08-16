import { Box, Typography } from '@mui/material'
import { useEffect, useRef } from 'react'

const toDuration = (totalSeconds) => {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const ProctoringCameraPreview = ({ previewStream, recordingDurationSec, sx }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    if (videoRef.current.srcObject !== previewStream) {
      videoRef.current.srcObject = previewStream || null
    }
  }, [previewStream])

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 1.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#03110C',
        ...sx
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', minHeight: 175, objectFit: 'cover', display: 'block' }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          px: 1,
          py: 0.2,
          borderRadius: 1,
          bgcolor: 'rgba(3, 17, 12, 0.78)'
        }}
      >
        <Typography sx={{ color: '#E9F3EE', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
          {toDuration(recordingDurationSec)}
        </Typography>
      </Box>
    </Box>
  )
}

export default ProctoringCameraPreview
