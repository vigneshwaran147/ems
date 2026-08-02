// ems_frontend/src/components/common/PageHeader.jsx
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

/** Consistent page header with title, subtitle, optional breadcrumbs and actions. */
const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  action,
  titleVariant = 'h4',
  subtitleVariant = 'body1',
  titleSx,
  subtitleSx,
  inlineSubtitle = true,
}) => (
  <Box
    sx={{
      mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch',
      justifyContent: 'space-between', border: '1px solid', borderColor: 'divider',
      borderRadius: 3, px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 },
      background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 0.5 }}>
          {breadcrumbs.map((b) =>
            b.to ? (
              <MuiLink
                key={`${b.label}-${b.to}`}
                component={Link}
                to={b.to}
                underline="hover"
                color="inherit"
                variant="body2"
              >
                {b.label}
              </MuiLink>
            ) : (
              <Typography key={b.label} variant="body2" color="text.secondary">
                {b.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Typography
        variant={titleVariant}
        fontWeight={800}
        sx={{
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          fontSize: { xs: '1.4rem', md: '1.8rem' },
          ...titleSx,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        inlineSubtitle ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.7 }} />
            <Typography variant={subtitleVariant} color="text.secondary" sx={{ fontWeight: 600, ...subtitleSx }}>
              {subtitle}
            </Typography>
          </Box>
        ) : (
          <Typography variant={subtitleVariant} color="text.secondary" sx={{ mt: 0.5, ...subtitleSx }}>
            {subtitle}
          </Typography>
        )
      )}
    </Box>
    {action && <Box sx={{ display: 'flex', alignItems: 'center' }}>{action}</Box>}
  </Box>
)

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    })
  ),
  action: PropTypes.node,
  titleVariant: PropTypes.string,
  subtitleVariant: PropTypes.string,
  titleSx: PropTypes.object,
  subtitleSx: PropTypes.object,
  inlineSubtitle: PropTypes.bool,
}

export default PageHeader
