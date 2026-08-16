import { useMemo } from 'react'

import { Box } from '@mui/material'

/**
 * Invisible-ish capture-deterrent layer drawn above the exam content.
 *
 * WHAT THIS ACTUALLY ACHIEVES
 * ---------------------------
 * No CSS can stop a screen recorder. What it can do is make any captured frame
 * self-incriminating: a faint, tiled watermark carrying the candidate id, the
 * session id and a timestamp rides along in every screenshot, photograph or
 * recording. Leaked exam content is then traceable to the individual who leaked
 * it, which is the deterrent that survives contact with reality.
 *
 * The second layer is a fine moiré grid. It is imperceptible on screen but
 * beats against the sensor grid of a phone camera pointed at the monitor,
 * degrading the readability of photographed questions.
 *
 * `pointer-events: none` throughout, so nothing here can intercept a click on
 * an answer option.
 */
const ProctorSecurityOverlay = ({ studentId, sessionId, visible = true, opacity = 0.06 }) => {
  const watermarkText = useMemo(() => {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    return `${studentId || 'CANDIDATE'} · ${sessionId || 'SESSION'} · ${stamp}`
  }, [studentId, sessionId])

  /**
   * Rendered as an inline SVG data URI rather than a DOM tree: one repeating
   * background paints far cheaper than hundreds of tiled text nodes, and it
   * cannot be removed by deleting an element from the inspector without also
   * removing the overlay itself.
   */
  const watermarkUrl = useMemo(() => {
    const escaped = watermarkText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220">
      <text x="0" y="110"
            transform="rotate(-24 0 110)"
            font-family="monospace" font-size="15" fill="#E9F3EE">${escaped}</text>
    </svg>`

    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
  }, [watermarkText])

  if (!visible) {
    return null
  }

  return (
    <>
      {/* Traceability watermark */}
      <Box
        aria-hidden="true"
        data-proctor-overlay="watermark"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1350,
          pointerEvents: 'none',
          userSelect: 'none',
          backgroundImage: watermarkUrl,
          backgroundRepeat: 'repeat',
          opacity,
          // Light ink screened onto a dark substrate. Multiplying black — the
          // light-theme recipe — leaves nothing visible in a captured frame on
          // this board, which would quietly void the traceability guarantee.
          mixBlendMode: 'screen'
        }}
      />

      {/* Anti-photography moiré grid */}
      <Box
        aria-hidden="true"
        data-proctor-overlay="moire"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1349,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.025,
          backgroundImage:
            'repeating-linear-gradient(0deg, #E9F3EE 0px, #E9F3EE 1px, transparent 1px, transparent 3px),' +
            'repeating-linear-gradient(90deg, #E9F3EE 0px, #E9F3EE 1px, transparent 1px, transparent 3px)'
        }}
      />
    </>
  )
}

export default ProctorSecurityOverlay
