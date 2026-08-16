// ems_frontend/src/components/dashboard/DonutChart.jsx
import PropTypes from 'prop-types'
import { Box, Typography } from '@mui/material'
import { tokens, fonts } from '../../styles/tokens'

const RADIUS = 26
const CENTER = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Gap between segments, in path units — keeps adjacent arcs visually separate. */
const GAP = 2

/**
 * Proportional ring with a value in the middle.
 *
 * Drawn as stroked arcs on one circle rather than as pie wedges: an arc that
 * rounds to zero length simply disappears, where a wedge would leave a hairline
 * artifact at the centre.
 */
const DonutChart = ({ segments, total, centerValue, centerLabel, size = 108 }) => {
  let consumed = 0
  const arcs = segments.map((segment, index) => {
    const fraction = total > 0 ? segment.value / total : 0
    const length = Math.max(0, fraction * CIRCUMFERENCE - GAP)
    const arc = (
      <circle
        key={segment.label || index}
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={segment.color}
        strokeWidth={9}
        strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
        strokeDashoffset={-consumed * CIRCUMFERENCE}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
    )
    consumed += fraction
    return arc
  })

  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <Box
        component="svg"
        viewBox="0 0 64 64"
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, width: size, height: size }}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="rgba(150,195,172,.1)" strokeWidth={9} />
        {total > 0 && arcs}
      </Box>
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1, color: tokens.ink }}>
          {centerValue}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.mono,
            fontSize: 8,
            letterSpacing: '.4px',
            textTransform: 'uppercase',
            color: tokens.muted,
            mt: 0.5,
          }}
        >
          {centerLabel}
        </Typography>
      </Box>
    </Box>
  )
}

DonutChart.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    })
  ).isRequired,
  total: PropTypes.number.isRequired,
  centerValue: PropTypes.node,
  centerLabel: PropTypes.string,
  size: PropTypes.number,
}

export default DonutChart
