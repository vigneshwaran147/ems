// ems_frontend/src/components/profile/ProfilePhotoDialog.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Slider, Tooltip, Typography,
} from '@mui/material'
import PropTypes from 'prop-types'
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternateRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import RotateIcon from '@mui/icons-material/Rotate90DegreesCwRounded'
import ZoomInIcon from '@mui/icons-material/ZoomInRounded'
import ZoomOutIcon from '@mui/icons-material/ZoomOutRounded'
import { tokens, fonts } from '../../styles/tokens'

/** The square the crop is previewed in, and the square that is uploaded. */
const VIEWPORT = 264
const OUTPUT = 512

const MAX_ZOOM = 4

/**
 * What the server's LocalProfilePhotoStorageService will accept.
 *
 * Listed to the user rather than only enforced, so a rejected file explains
 * itself before it is picked.
 */
const ACCEPTED = [
  { mime: 'image/jpeg', label: 'JPG' },
  { mime: 'image/png', label: 'PNG' },
  { mime: 'image/webp', label: 'WebP' },
]
const ACCEPT_ATTR = ACCEPTED.map((format) => format.mime).join(',')
const FORMAT_LINE = `${ACCEPTED.map((format) => format.label).join(' · ')} — up to 25 MB`

/**
 * Guards the decode, not the upload.
 *
 * Everything leaves here as a 512×512 crop of a few hundred KB, so the server's
 * 5 MB ceiling is never the binding limit; this only stops a file large enough
 * to stall the browser decoding it.
 */
const MAX_INPUT_BYTES = 25 * 1024 * 1024

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * The scale at which the image just covers the viewport.
 *
 * Rotation is quarter-turns only, so "the image's width" swaps with its height
 * at 90° and 270° and the cover calculation stays this simple.
 */
const coverScaleOf = (image, rotation) => {
  const quarterTurned = rotation % 180 !== 0
  const width = quarterTurned ? image.naturalHeight : image.naturalWidth
  const height = quarterTurned ? image.naturalWidth : image.naturalHeight
  return { base: Math.max(VIEWPORT / width, VIEWPORT / height), width, height }
}

/** Keeps the image covering the viewport — no empty corners to upload. */
const clampOffset = (offset, image, rotation, zoom) => {
  const { base, width, height } = coverScaleOf(image, rotation)
  const scale = base * zoom
  const maxX = Math.max(0, (width * scale - VIEWPORT) / 2)
  const maxY = Math.max(0, (height * scale - VIEWPORT) / 2)
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) }
}

/** PNG in, PNG out — anything else is re-encoded as JPEG to keep it small. */
const outputTypeFor = (file) => (file?.type === 'image/png' ? 'image/png' : 'image/jpeg')

const ProfilePhotoDialog = ({ open, onClose, currentPhotoUrl, onSave, saving, uploadError }) => {
  const [file, setFile] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [image, setImage] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')

  const inputRef = useRef(null)
  const dragStart = useRef(null)
  const sourceUrlRef = useRef(null)

  const releaseSource = useCallback(() => {
    if (sourceUrlRef.current) window.URL.revokeObjectURL(sourceUrlRef.current)
    sourceUrlRef.current = null
  }, [])

  const resetEditor = useCallback(() => {
    releaseSource()
    setFile(null)
    setSourceUrl(null)
    setImage(null)
    setZoom(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
    setLocalError('')
  }, [releaseSource])

  // The dialog is unmounted while closed (`keepMounted` is off), but a reopen
  // reuses the same instance, so the previous pick is cleared on the way in.
  useEffect(() => {
    if (!open) resetEditor()
  }, [open, resetEditor])

  useEffect(() => releaseSource, [releaseSource])

  const acceptFile = useCallback((picked) => {
    if (!picked) return

    if (!ACCEPTED.some((format) => format.mime === picked.type)) {
      setLocalError(`That file is not a supported image. Use ${ACCEPTED.map((f) => f.label).join(', ')}.`)
      return
    }
    if (picked.size > MAX_INPUT_BYTES) {
      setLocalError('That image is larger than 25 MB. Choose a smaller one.')
      return
    }

    const url = window.URL.createObjectURL(picked)
    const loaded = new Image()
    loaded.onload = () => {
      if (sourceUrlRef.current) window.URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = url
      setFile(picked)
      setSourceUrl(url)
      setImage(loaded)
      setZoom(1)
      setRotation(0)
      setOffset({ x: 0, y: 0 })
      setLocalError('')
    }
    loaded.onerror = () => {
      window.URL.revokeObjectURL(url)
      setLocalError('That image could not be opened. Try another file.')
    }
    loaded.src = url
  }, [])

  const handleInputChange = (event) => {
    const picked = event.target.files[0]
    // Cleared so picking the same file twice still raises a change event.
    event.target.value = ''
    acceptFile(picked)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const handlePointerDown = (event) => {
    if (!image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, ...offset }
  }

  const handlePointerMove = (event) => {
    if (!dragStart.current || !image) return
    const next = {
      x: dragStart.current.x + (event.clientX - dragStart.current.pointerX),
      y: dragStart.current.y + (event.clientY - dragStart.current.pointerY),
    }
    setOffset(clampOffset(next, image, rotation, zoom))
  }

  const endDrag = (event) => {
    if (dragStart.current && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStart.current = null
  }

  const applyZoom = (next) => {
    const bounded = clamp(next, 1, MAX_ZOOM)
    setZoom(bounded)
    if (image) setOffset((current) => clampOffset(current, image, rotation, bounded))
  }

  const handleRotate = () => {
    const next = (rotation + 90) % 360
    setRotation(next)
    if (image) setOffset((current) => clampOffset(current, image, next, zoom))
  }

  /**
   * Redraws the on-screen transform onto a fixed-size canvas.
   *
   * The transform chain mirrors the preview's CSS one step for step — centre,
   * scale viewport pixels up to output pixels, pan, rotate, zoom — so what the
   * circle showed is exactly what is written out.
   */
  const buildCroppedFile = () =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT
      canvas.height = OUTPUT
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas is unavailable'))
        return
      }

      const type = outputTypeFor(file)
      if (type === 'image/jpeg') {
        // JPEG has no alpha; without this a transparent source flattens to black.
        ctx.fillStyle = '#0B2C22'
        ctx.fillRect(0, 0, OUTPUT, OUTPUT)
      }

      const { base } = coverScaleOf(image, rotation)
      ctx.translate(OUTPUT / 2, OUTPUT / 2)
      ctx.scale(OUTPUT / VIEWPORT, OUTPUT / VIEWPORT)
      ctx.translate(offset.x, offset.y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(base * zoom, base * zoom)
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not render the crop'))
            return
          }
          const extension = type === 'image/png' ? 'png' : 'jpg'
          resolve(new File([blob], `profile-photo.${extension}`, { type }))
        },
        type,
        0.92
      )
    })

  const handleSave = async () => {
    if (!image) return
    setLocalError('')
    try {
      const cropped = await buildCroppedFile()
      await onSave(cropped)
    } catch (err) {
      console.error('Failed to prepare the cropped photo:', err)
      setLocalError('Could not prepare that crop. Please try again.')
    }
  }

  const { base } = image ? coverScaleOf(image, rotation) : { base: 1 }
  const displayScale = base * zoom
  const error = localError || uploadError

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '18px',
          background: 'linear-gradient(168deg, rgba(11,44,34,.97), rgba(4,20,14,.98))',
          border: `1px solid ${tokens.line}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pb: 1,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-.2px',
          color: tokens.ink,
        }}
      >
        {image ? 'Position your photo' : 'Profile photo'}
        <IconButton onClick={onClose} disabled={saving} size="small" aria-label="Close">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        <input
          ref={inputRef}
          accept={ACCEPT_ATTR}
          type="file"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError('')}>
            {error}
          </Alert>
        )}

        {!image ? (
          <Box
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            sx={{
              display: 'grid',
              placeItems: 'center',
              gap: 1,
              p: '30px 20px',
              cursor: 'pointer',
              borderRadius: '14px',
              border: `1.5px dashed ${dragging ? 'rgba(192,138,46,.7)' : tokens.line2}`,
              background: dragging ? 'rgba(192,138,46,.08)' : 'rgba(3,16,11,.5)',
            }}
          >
            {currentPhotoUrl ? (
              <Box
                component="img"
                src={currentPhotoUrl}
                alt="Current profile photo"
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(192,138,46,.4)',
                }}
              />
            ) : (
              <AddPhotoIcon sx={{ fontSize: 34, color: tokens.copperLt }} />
            )}

            <Typography sx={{ mt: 0.5, fontSize: 13, fontWeight: 600, color: tokens.ink }}>
              {currentPhotoUrl ? 'Drop a new photo, or browse' : 'Drop a photo here, or browse'}
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, color: tokens.muted }}>
              {FORMAT_LINE}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.75 }}>
            <Box
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              sx={{
                position: 'relative',
                width: VIEWPORT,
                maxWidth: '100%',
                height: VIEWPORT,
                overflow: 'hidden',
                borderRadius: '14px',
                background: tokens.sub0,
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
                touchAction: 'none',
              }}
            >
              <Box
                component="img"
                src={sourceUrl}
                alt=""
                draggable={false}
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                  maxWidth: 'none',
                  transformOrigin: 'center',
                  // Pan sits outside rotate/scale so dragging always tracks the
                  // pointer, whichever quarter-turn the image is on.
                  transform: `translate(-50%,-50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${displayScale})`,
                }}
              />

              {/* The keep/discard line: everything outside the circle is dimmed
                  rather than hidden, so the crop is judged against the whole. */}
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid rgba(232,192,113,.85)',
                  boxShadow: '0 0 0 9999px rgba(3,17,12,.62)',
                  pointerEvents: 'none',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: VIEWPORT, maxWidth: '100%' }}>
              <ZoomOutIcon sx={{ fontSize: 17, color: tokens.muted }} />
              <Slider
                value={zoom}
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                onChange={(e, value) => applyZoom(value)}
                aria-label="Zoom"
                sx={{ color: tokens.copper }}
              />
              <ZoomInIcon sx={{ fontSize: 17, color: tokens.muted }} />
              <Tooltip title="Rotate 90°">
                <IconButton
                  onClick={handleRotate}
                  size="small"
                  aria-label="Rotate 90 degrees"
                  sx={{ border: `1.5px solid ${tokens.line2}`, borderRadius: '8px', color: tokens.body }}
                >
                  <RotateIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, color: tokens.muted, textAlign: 'center' }}>
              Drag to reposition · saved as {OUTPUT}×{OUTPUT}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        {image && (
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={saving}
            sx={{ mr: 'auto', fontSize: 12, fontWeight: 600, textTransform: 'none', color: tokens.body }}
          >
            Choose another
          </Button>
        )}
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ fontSize: 12.5, fontWeight: 600, textTransform: 'none', color: tokens.body }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!image || saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            height: 40,
            px: 2.5,
            borderRadius: '10px',
            fontSize: 12.5,
            fontWeight: 700,
            textTransform: 'none',
            color: '#062017',
            background: 'linear-gradient(96deg,#B07C24 0%,#E8C071 48%,#C08A2E 100%)',
            '&:hover': { background: 'linear-gradient(96deg,#C08A2E 0%,#F3DCAE 48%,#B07C24 100%)' },
            '&.Mui-disabled': { color: 'rgba(6,32,23,.5)', background: 'rgba(192,138,46,.25)' },
          }}
        >
          {saving ? 'Saving…' : 'Save photo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

ProfilePhotoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** The photo in use, shown so a replacement can be compared against it. */
  currentPhotoUrl: PropTypes.string,
  /** Receives the cropped File; resolves once the upload has been attempted. */
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  uploadError: PropTypes.string,
}

export default ProfilePhotoDialog
