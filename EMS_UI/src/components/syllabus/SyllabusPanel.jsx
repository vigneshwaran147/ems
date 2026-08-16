// ems_frontend/src/components/syllabus/SyllabusPanel.jsx
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Paper, Stack, Typography, Button, Chip, Alert } from '@mui/material'
import DownloadIcon from '@mui/icons-material/DownloadRounded'
import MenuBookIcon from '@mui/icons-material/MenuBookRounded'
import { getSyllabus } from '../../data/syllabus'
import { downloadSyllabusPdf } from '../../utils/syllabusPdf'
import { tokens, fonts } from '../../styles/tokens'

/**
 * Renders the full syllabus for a certification level, with a PDF download.
 *
 * `dense` trims the padding for use inside a dialog or a narrow column;
 * `elevated` wraps the content in a Paper for standalone placement on a page.
 */
const SyllabusPanel = ({ level, dense = false, elevated = true, showHeader = true }) => {
  const [downloadError, setDownloadError] = useState('')
  const syllabus = getSyllabus(level)

  if (!syllabus) {
    return <Alert severity="info">No syllabus is published for this level yet.</Alert>
  }

  const handleDownload = () => {
    setDownloadError('')
    try {
      if (!downloadSyllabusPdf(level)) {
        setDownloadError('No syllabus is available to download for this level.')
      }
    } catch (err) {
      console.error('Syllabus PDF download failed', err)
      setDownloadError('Could not generate the syllabus PDF. Please try again.')
    }
  }

  const body = (
    <Box>
      {showHeader && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
              <Box
                sx={{
                  flex: 'none',
                  width: 30,
                  height: 30,
                  borderRadius: '9px',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(192,138,46,.14)',
                  border: '1px solid rgba(192,138,46,.4)',
                  color: tokens.copperLt,
                }}
              >
                <MenuBookIcon sx={{ fontSize: 15 }} />
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                {syllabus.documentTitle}
              </Typography>
              <Chip
                size="small"
                label={syllabus.levelTitle}
                sx={{
                  height: 20,
                  fontFamily: fonts.mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  background: 'rgba(95,174,146,.14)',
                  border: '1px solid rgba(95,174,146,.4)',
                  color: tokens.greenLt,
                }}
              />
            </Stack>
            <Typography sx={{ mt: 0.75, fontSize: 12.5, color: tokens.body }}>
              {syllabus.note}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ flexShrink: 0 }}
          >
            Download PDF
          </Button>
        </Stack>
      )}

      {downloadError && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setDownloadError('')}>
          {downloadError}
        </Alert>
      )}

      {/* Sticky column header — the list scrolls under it inside a dialog. */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          px: 2,
          py: 1.25,
          borderRadius: '9px',
          background: `linear-gradient(96deg, ${tokens.green}, #0A3527)`,
        }}
      >
        <Box
          component="span"
          sx={{
            flex: 'none',
            width: dense ? 56 : 70,
            fontFamily: fonts.mono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.08em',
            color: tokens.greenLt,
          }}
        >
          REF
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: fonts.mono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.08em',
            color: tokens.greenLt,
          }}
        >
          MODULE AND INDICATIVE CONTENT
        </Box>
      </Box>

      <Box>
        {syllabus.modules.map((module) => (
          <Box
            key={module.ref}
            sx={{
              display: 'flex',
              gap: 1.5,
              px: 2,
              py: dense ? 1.5 : 1.75,
              borderBottom: '1px solid rgba(150,195,172,.1)',
              '&:last-of-type': { borderBottom: 'none' },
            }}
          >
            <Box
              component="span"
              sx={{
                flex: 'none',
                width: dense ? 56 : 70,
                pt: '1px',
                fontFamily: fonts.mono,
                fontSize: dense ? 11 : 11.5,
                fontWeight: 700,
                color: tokens.copperLt,
              }}
            >
              {module.ref}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: dense ? 13 : 13.5, fontWeight: 700, color: tokens.ink }}>
                {module.title}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: dense ? 12 : 12.5, lineHeight: 1.55, color: '#93AC9E' }}>
                {module.content}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )

  if (!elevated) return body

  return <Paper variant="outlined" sx={{ p: dense ? 1.5 : 2.5 }}>{body}</Paper>
}

SyllabusPanel.propTypes = {
  level: PropTypes.string,
  dense: PropTypes.bool,
  elevated: PropTypes.bool,
  showHeader: PropTypes.bool
}

export default SyllabusPanel
