// ems_frontend/src/components/syllabus/SyllabusDialog.jsx
import { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Dialog, DialogContent, DialogActions, Button,
  Box, Typography, IconButton, Alert
} from '@mui/material'
import CloseIcon from '@mui/icons-material/CloseRounded'
import DownloadIcon from '@mui/icons-material/DownloadRounded'
import { getSyllabus } from '../../data/syllabus'
import { downloadSyllabusPdf } from '../../utils/syllabusPdf'
import SyllabusPanel from './SyllabusPanel'
import { tokens, gradients, shadows, ctaButton } from '../../styles/tokens'

/** Modal view of a level's syllabus, with the PDF download in the action bar. */
const SyllabusDialog = ({ open, level, onClose }) => {
  const [downloadError, setDownloadError] = useState('')
  const syllabus = getSyllabus(level)

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 700,
          maxHeight: '84vh',
          borderRadius: '22px',
          background: gradients.card,
          border: `1px solid ${tokens.line2}`,
          boxShadow: shadows.package,
        },
      }}
    >
      <Box sx={{ p: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>
            {syllabus ? syllabus.documentTitle : 'Syllabus'}
          </Typography>
          {syllabus && (
            <Typography sx={{ mt: 0.5, fontSize: 12.5, color: '#93AC9E' }}>
              {syllabus.levelTitle} · {syllabus.modules.length} modules
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Close syllabus"
          sx={{ flex: 'none', width: 32, height: 32, borderRadius: '9px', background: 'rgba(95,174,146,.1)' }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {syllabus && (
        <Typography sx={{ px: '26px', pb: 2, fontSize: 12.5, color: '#B7CFC3' }}>
          {syllabus.note}
        </Typography>
      )}

      <DialogContent sx={{ px: '26px', pt: 0, pb: 2, borderTop: 'none' }}>
        {downloadError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setDownloadError('')}>
            {downloadError}
          </Alert>
        )}
        <SyllabusPanel level={level} elevated={false} showHeader={false} />
      </DialogContent>

      <DialogActions sx={{ p: '18px 26px', borderTop: `1px solid ${tokens.line}`, gap: 1.5 }}>
        <Button onClick={onClose} sx={{ height: 40, px: 2 }}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={!syllabus}
          sx={{ ...ctaButton, width: 'auto', height: 40, px: 2.25, fontSize: 12, letterSpacing: '.3px', textTransform: 'none' }}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  )
}

SyllabusDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  level: PropTypes.string,
  onClose: PropTypes.func.isRequired
}

export default SyllabusDialog
