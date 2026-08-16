import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography
} from '@mui/material'
import { useMemo } from 'react'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import ProctoringCameraPreview from './ProctoringCameraPreview'
import ProctoringViolationTimeline from './ProctoringViolationTimeline'
import { tokens, fonts } from '../../../styles/tokens'

const ProctoringPanel = ({
  status,
  events,
  session,
  previewStream,
  recordingDurationSec,
  runtimeError
}) => {
  const topEvents = useMemo(() => events.slice(0, 5), [events])

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        mt: 0
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontSize: 16, fontWeight: 700 }}>
          Proctoring Monitor
        </Typography>
        <Chip
          size="small"
          icon={<FiberManualRecordIcon sx={{ color: `${tokens.danger} !important`, fontSize: 11 }} />}
          label="REC"
          variant="outlined"
          sx={{
            fontFamily: fonts.mono,
            fontWeight: 500,
            letterSpacing: 1,
            height: 20,
            color: tokens.danger,
            borderColor: 'rgba(248,113,113,.34)',
            background: 'rgba(190,40,40,.12)',
          }}
        />
      </Stack>

      <ProctoringCameraPreview previewStream={previewStream} recordingDurationSec={recordingDurationSec} sx={{ mb: 1.2 }} />

      {session ? (
        <Stack spacing={0.35} sx={{ px: 0.4, mb: 1 }}>
          <Typography variant="body2" color="text.secondary"><strong>Session:</strong> {session.sessionId}</Typography>
          <Typography variant="body2" color="text.secondary"><strong>Tab Switches:</strong> {status.tabSwitchCount}</Typography>
          <Typography variant="body2" color="text.secondary"><strong>Chunks:</strong> ↑{session.uploadedChunks} ⏳{session.pendingChunks} ✗{session.failedChunks}</Typography>
          <Typography variant="body2" color="text.secondary"><strong>Violation Score:</strong> {session.violationScore}</Typography>
          <Typography variant="body2" color="warning.main"><strong>Warnings:</strong> {session.warningCount}/2</Typography>
          <Typography variant="body2" color="success.main"><strong>Status:</strong> {session.status === 'ACTIVE' ? 'Monitoring' : session.status}</Typography>
        </Stack>
      ) : null}

      {runtimeError ? <Alert severity="error" sx={{ mb: 1, py: 0.75 }}>{runtimeError}</Alert> : null}

      <Divider sx={{ mb: 0.8 }} />
      <ProctoringViolationTimeline events={topEvents} emptyMessage="No violations detected." maxHeight={160} />
    </Paper>
  )
}

export default ProctoringPanel
