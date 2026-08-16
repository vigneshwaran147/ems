// ems_frontend/src/components/certificate/Guilloche.jsx
import { useEffect, useRef } from 'react'

/**
 * Four nested rosettes. Each is a hypotrochoid whose R:r ratio is deliberately
 * non-integer, so the curve precesses instead of closing after one turn and the
 * overlap reads as engine-turned engraving rather than a spirograph doodle.
 */
const RINGS = [
  { radius: 0.5, roll: 0.115, pen: 0.155, alpha: 0.085 },
  { radius: 0.42, roll: 0.083, pen: 0.125, alpha: 0.065 },
  { radius: 0.33, roll: 0.062, pen: 0.098, alpha: 0.055 },
  { radius: 0.23, roll: 0.041, pen: 0.07, alpha: 0.045 },
]

const TURNS = Math.PI * 2 * 12
const STEP = 0.012

/**
 * The guilloche pattern printed under a certificate, drawn to a canvas.
 *
 * Security printers use these because they are cheap to generate and expensive
 * to reproduce by hand; here it does the same job a watermark does, giving the
 * credential the texture of an issued document instead of a flat card. Canvas
 * rather than SVG because the curve is ~6k points per ring — as markup it would
 * dwarf the rest of the page.
 *
 * Fills its positioned parent, and redraws when that parent resizes.
 */
const Guilloche = ({ color, opacity = 0.5 }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!host) return undefined

    const ctx = canvas.getContext('2d')
    let frame = 0

    const draw = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return

      // Back the canvas at device resolution; hairlines alias badly otherwise.
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      // Sits high: the rosette centres on the medal and award title, not the
      // vertical middle, so the dense foot bar stays clean.
      const cy = height * 0.42
      const base = Math.min(width, height) * 0.62

      ctx.strokeStyle = color
      ctx.lineWidth = 0.5

      RINGS.forEach(({ radius, roll, pen, alpha }) => {
        const R = base * radius
        const r = base * roll
        const d = base * pen
        const k = (R - r) / r

        ctx.globalAlpha = alpha
        ctx.beginPath()
        for (let t = 0; t <= TURNS; t += STEP) {
          const x = cx + (R - r) * Math.cos(t) + d * Math.cos(k * t)
          const y = cy + (R - r) * Math.sin(t) - d * Math.sin(k * t)
          if (t === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      })

      ctx.globalAlpha = 1
    }

    draw()

    // Coalesce resize bursts into one paint per frame — the curve is expensive
    // enough that redrawing per observer callback stutters a window drag.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}

export default Guilloche
