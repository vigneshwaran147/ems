import { Box, Stack, Typography } from '@mui/material'

const toTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

const getSeverityColor = (severity) => {
  if (severity === 'HIGH') return 'error.main'
  if (severity === 'MEDIUM') return 'warning.main'
  return 'info.main'
}

const ProctoringViolationTimeline = ({ events, emptyMessage = 'No violations detected.', maxHeight = 160 }) => {
  return (
    <Stack spacing={0.6} sx={{ maxHeight, overflowY: 'auto', pr: 0.3 }}>
      {events.map((event) => {
        const severityColor = getSeverityColor(event.severity)

        return (
          <Box key={event.id} sx={{ pb: 0.6, borderLeft: '2px solid', borderColor: severityColor, pl: 0.8 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: severityColor, display: 'block', fontSize: 10 }}>
              {toTime(event.timestamp)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', wordWrap: 'break-word', whiteSpace: 'normal', fontSize: 10, mt: 0.25 }}>
              {event.message}
            </Typography>
          </Box>
        )
      })}
      {events.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'success.main', fontStyle: 'italic' }}>
          {emptyMessage}
        </Typography>
      ) : null}
    </Stack>
  )
}

export default ProctoringViolationTimeline
