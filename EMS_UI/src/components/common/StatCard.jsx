// ems_frontend/src/components/common/StatCard.jsx
import { Card, CardContent, Box, Typography } from '@mui/material'

/** Gradient-accented statistic card used across dashboards. */
const StatCard = ({ title, value, icon, gradient = 'linear-gradient(135deg, #4f46e5, #6366f1)', trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {trend && (
          <Typography variant="caption" color="text.secondary">
            {trend}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          background: gradient,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </CardContent>
  </Card>
)

export default StatCard
