// ems_frontend/src/components/common/StatCard.jsx
import PropTypes from 'prop-types'
import { Card, CardContent, Box, Typography } from '@mui/material'
import { tokens, fonts, tone as toneMap } from '../../styles/tokens'

/**
 * Statistic tile. `tone` picks from the four-colour system palette rather than
 * letting each page invent its own gradient — that is what keeps a dashboard
 * reading as one board instead of a pile of stickers.
 */
const StatCard = ({ title, value, icon, tone = 'copper', trend }) => {
  const t = toneMap[tone] || toneMap.copper

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .2s, transform .2s',
        '&:hover': { borderColor: t.border, transform: 'translateY(-2px)' },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: t.fg,
          opacity: 0.55,
        },
      }}
    >
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: tokens.muted,
            }}
          >
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75, color: tokens.ink }}>
            {value}
          </Typography>
          {trend && (
            <Typography variant="caption" sx={{ color: tokens.body }}>
              {trend}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            display: 'grid',
            placeItems: 'center',
            color: t.fg,
            background: t.bg,
            border: `1px solid ${t.border}`,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </CardContent>
    </Card>
  )
}

StatCard.propTypes = {
  title: PropTypes.string,
  value: PropTypes.node,
  icon: PropTypes.node,
  tone: PropTypes.oneOf(['copper', 'green', 'danger', 'info', 'neutral']),
  trend: PropTypes.node,
}

export default StatCard
