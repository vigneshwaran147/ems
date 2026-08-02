// ems_frontend/src/components/layout/AuthLayout.jsx
import { Box, Paper, Typography, Stack } from '@mui/material'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'

const features = [
  { icon: <VerifiedRoundedIcon />, text: 'Industry-recognized L1 / L2 / L3 certifications' },
  { icon: <ShieldRoundedIcon />, text: 'AI-assisted proctoring with live monitoring' },
  { icon: <WorkspacePremiumRoundedIcon />, text: 'Instant verifiable digital certificates' }
]

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', bgcolor: 'background.default'
      }}
    >
      {/* Brand / marketing panel */}
      <Box
        sx={{
          flex: 1.1, display: { xs: 'none', md: 'flex' },
          flexDirection: 'column', justifyContent: 'space-between', p: 8,
          color: '#fff',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #2563eb 100%)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute', width: 420, height: 420,
            borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
            top: -120, right: -120
          }}
        />
        <Box
          sx={{
            position: 'absolute', width: 300, height: 300,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
            bottom: -100, left: -80
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ zIndex: 1 }}>
          <SchoolRoundedIcon sx={{ fontSize: 40 }} />
          <Typography variant="h5" fontWeight={800} letterSpacing={1}>
            EMS
          </Typography>
        </Stack>

        <Box sx={{ zIndex: 1 }}>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, lineHeight: 1.15 }}>
            Advance your career with verified certifications
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, mb: 4 }}>
            The complete Examination Management System for online certification, secure proctored exams and instant results.
          </Typography>

          <Stack spacing={2.5}>
            {features.map((f, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: 2, display: 'grid',
                    placeItems: 'center', bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(6px)'
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="body1" sx={{ opacity: 0.95 }}>
                  {f.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.7, zIndex: 1 }}>
          © {new Date().getFullYear()} Examination Management System
        </Typography>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', p: { xs: 2, sm: 4 }
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%', maxWidth: 440, p: { xs: 3, sm: 5 },
            borderRadius: 4, border: '1px solid', borderColor: 'divider'
          }}
        >
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, alignItems: 'center', gap: 1 }}>
            <SchoolRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={800} color="primary">
              EMS
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}

          {children}
        </Paper>
      </Box>
    </Box>
  )
}

export default AuthLayout
