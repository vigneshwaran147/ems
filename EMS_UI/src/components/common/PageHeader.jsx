// ems_frontend/src/components/common/PageHeader.jsx
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { tokens, fonts } from '../../styles/tokens'

/**
 * The banner every screen opens with.
 *
 * One design, no per-page variants: the title bar is how a screen announces
 * itself, so a page that sizes or tints its own would read as a different
 * product. Pages vary only in what they put in `action`.
 */
const PageHeader = ({ title, subtitle, breadcrumbs = [], action }) => (
  <Box
    sx={{
      position: 'relative',
      mb: 2.25,
      display: 'flex',
      alignItems: { xs: 'flex-start', md: 'center' },
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 3,
      p: { xs: '22px', md: '24px 30px' },
      borderRadius: '18px',
      // Fades out to the right rather than filling: the banner should sit on the
      // board, not stack another solid slab on top of it.
      background:
        'linear-gradient(100deg, rgba(11,44,34,.55) 0%, rgba(10,36,25,.30) 48%, rgba(6,26,19,.06) 100%)',
      border: `1px solid ${tokens.line}`,
      boxShadow: 'none',
      overflow: 'hidden',
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          sx={{
            mb: 0.75,
            fontFamily: fonts.mono,
            fontSize: 10.5,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            '& .MuiBreadcrumbs-separator': { color: tokens.muted },
          }}
        >
          {breadcrumbs.map((b) =>
            b.to ? (
              <MuiLink
                key={`${b.label}-${b.to}`}
                component={Link}
                to={b.to}
                underline="hover"
                sx={{ color: tokens.muted, fontSize: 10.5, '&:hover': { color: tokens.copperLt } }}
              >
                {b.label}
              </MuiLink>
            ) : (
              <Typography key={b.label} sx={{ color: tokens.copper, fontSize: 10.5, fontFamily: fonts.mono }}>
                {b.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: 24, md: 26 },
          lineHeight: 1.05,
          letterSpacing: '-.8px',
          color: tokens.ink,
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography sx={{ mt: 0.75, fontSize: 14, fontWeight: 500, color: '#C9DBD1' }}>
          {subtitle}
        </Typography>
      )}
    </Box>

    {action && (
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>{action}</Box>
    )}
  </Box>
)

PageHeader.propTypes = {
  // A node rather than a string: some titles carry an inline highlight.
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    })
  ),
  action: PropTypes.node,
}

export default PageHeader
