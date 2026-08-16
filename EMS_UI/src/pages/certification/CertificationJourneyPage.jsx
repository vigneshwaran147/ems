// ems_frontend/src/pages/certification/CertificationJourneyPage.jsx
import { useEffect, useState } from 'react'
import { Grid, Card, CardContent, CardActions, Button, Typography, Alert, Box, Skeleton, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../api/userAPI'
import PageHeader from '../../components/common/PageHeader'
import StatusChip from '../../components/common/StatusChip'
import SyllabusDialog from '../../components/syllabus/SyllabusDialog'
import SchoolIcon from '@mui/icons-material/SchoolRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'
import LockIcon from '@mui/icons-material/LockRounded'
import MenuBookIcon from '@mui/icons-material/MenuBookRounded'

const CERT_LEVELS = [
  {
    level: 'L1',
    title: 'Level 1 – Foundation',
    description: 'Entry-level certification covering core fundamentals. No prerequisites required.',
    requirements: 'Open to everyone'
  },
  {
    level: 'L2',
    title: 'Level 2 – Intermediate',
    description: 'Build on the fundamentals with intermediate concepts and applied skills.',
    requirements: 'Requires an active L1 certification'
  },
  {
    level: 'L3',
    title: 'Level 3 – Advanced',
    description: 'Expert-level certification demonstrating mastery of advanced topics.',
    requirements: 'Requires an active L2 certification'
  }
]

const parseLocalDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const addOneYear = (date) => {
  if (!date) return null
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + 1)
  return result
}

const CertificationJourneyPage = () => {
  const navigate = useNavigate()
  const [activeCerts, setActiveCerts] = useState([])
  const [allCerts, setAllCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [syllabusLevel, setSyllabusLevel] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await userAPI.getDashboard()
        if (mounted) {
          setActiveCerts(res.data.data?.activeCertifications || [])
          setAllCerts(res.data.data?.certificationHistory || [])
        }
      } catch (err) {
        console.error('Failed to load certifications', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const findCert = (level) =>
    activeCerts.find((c) => c.certificationLevel === level || c.level === level)

  const findLatestCert = (level) => {
    const levelCerts = allCerts.filter((c) => c.certificationLevel === level || c.level === level)
    if (levelCerts.length === 0) return null
    return levelCerts
      .slice()
      .sort((a, b) => {
        const aDate = parseLocalDate(a.issueDate || a.completedOn)
        const bDate = parseLocalDate(b.issueDate || b.completedOn)
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0)
      })[0]
  }

  return (
    <Box>
      <PageHeader
        title="Certification Journey"
        subtitle="Progress through L1 → L2 → L3. Each level unlocks the next."
      />

      <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
        Levels must be completed in sequence. You can apply for the next level only after passing the previous one.
      </Alert>

      <Grid container spacing={3}>
        {CERT_LEVELS.map((cert, index) => {
          const userCert = findCert(cert.level)
          const latestCert = findLatestCert(cert.level)
          const prevCert = index > 0 ? findCert(CERT_LEVELS[index - 1].level) : null
          const isLocked = index > 0 && !prevCert
          const isActive = Boolean(userCert)
          const completionDate = parseLocalDate(latestCert?.issueDate || latestCert?.completedOn)
          const renewAvailableDate = addOneYear(completionDate)
          const canRenew = Boolean(
            latestCert && renewAvailableDate && new Date().getTime() >= renewAvailableDate.getTime()
          )

          const ctaLabel = isLocked
            ? 'Locked'
            : canRenew
              ? 'Renew certification'
              : isActive
                ? 'Certified'
                : 'Apply now'

          const ctaDisabled = isLocked || (isActive && !canRenew)

          return (
            <Grid item xs={12} md={4} key={cert.level}>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <Card
                  sx={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isLocked ? 0.7 : 1,
                    border: isActive ? '2px solid' : '1px solid',
                    borderColor: isActive ? 'success.main' : 'divider'
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 14, right: 14 }}>
                    {isLocked ? (
                      <LockIcon color="disabled" />
                    ) : isActive ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <SchoolIcon color="primary" />
                    )}
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pr: 4 }}>
                      {cert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {cert.description}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {cert.requirements}
                      </Typography>
                      {userCert && (
                        <Box>
                          <StatusChip status={userCert.status || 'ACTIVE'} />
                          {userCert.expiryDate && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Valid until {new Date(userCert.expiryDate).toLocaleDateString()}
                            </Typography>
                          )}
                          {!canRenew && renewAvailableDate && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.75 }} color="text.secondary">
                              Renewal opens on {renewAvailableDate.toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <Button
                        variant={isActive || canRenew ? 'outlined' : 'contained'}
                        fullWidth disabled={ctaDisabled}
                        onClick={() => navigate('/exams', { state: { level: cert.level } })}
                      >
                        {ctaLabel}
                      </Button>
                      {/* Available even when the level is locked — knowing what
                          is ahead is part of planning the journey. */}
                      <Button
                        variant="text"
                        size="small"
                        fullWidth
                        startIcon={<MenuBookIcon />}
                        onClick={() => setSyllabusLevel(cert.level)}
                      >
                        View syllabus
                      </Button>
                    </Stack>
                  </CardActions>
                </Card>
              )}
            </Grid>
          )
        })}
      </Grid>

      <SyllabusDialog
        open={Boolean(syllabusLevel)}
        level={syllabusLevel}
        onClose={() => setSyllabusLevel(null)}
      />
    </Box>
  )
}

export default CertificationJourneyPage
