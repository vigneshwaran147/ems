// ems_frontend/src/components/certificate/CertificateDocument.jsx
import { Box, Button, Stack, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/DownloadRounded'
import MedalIcon from '@mui/icons-material/WorkspacePremiumRounded'
import StatusChip from '../common/StatusChip'
import { fonts, gradients, shadows, tokens } from '../../styles/tokens'
import { formatCertificateDate, validityOf } from '../../utils/certificateValidity'

const microLabel = {
  fontFamily: fonts.mono,
  fontSize: '9.5px',
  letterSpacing: '.6px',
  textTransform: 'uppercase',
  color: tokens.muted,
}

/**
 * Registration marks at the card's four corners.
 *
 * The crop marks of a printed document, kept because they read the card as an
 * issued artefact rather than another panel on the dashboard.
 */
const CORNERS = [
  { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2 },
  { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2 },
  { bottom: 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2 },
  { bottom: 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2 },
]

const Field = ({ label, children }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ ...microLabel, mb: 0.5 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13.5, color: '#CFE2D8' }}>{children}</Typography>
  </Box>
)

/**
 * A certificate rendered as the document it is.
 *
 * Every descriptive string — award title, level label, tier line and
 * competencies — is issued by the server with the certificate, so what is shown
 * here always matches the wording on the downloaded PDF. This component decides
 * only how that content is presented, never what it says.
 */
const CertificateDocument = ({ certificate, tier, downloading, onDownload }) => {
  const { expired } = validityOf(certificate)

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        p: { xs: 2.5, sm: 3, md: '36px' },
        background: gradients.card,
        border: `1.5px solid ${tier.edge}`,
        boxShadow: shadows.card,
        minWidth: 0,
      }}
    >
      {CORNERS.map((corner, index) => (
        <Box
          key={index}
          aria-hidden="true"
          sx={{
            position: 'absolute',
            width: 14,
            height: 14,
            border: '0 solid',
            borderColor: tier.b,
            opacity: 0.5,
            pointerEvents: 'none',
            ...corner,
          }}
        />
      ))}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
        sx={{ mb: 2.75 }}
      >
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
          {/* Struck in the tier's metal, so rank is visible before it is read. */}
          <Box
            sx={{
              flex: 'none',
              width: 56,
              height: 56,
              borderRadius: '14px',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(192,138,46,.14)',
              border: `1.5px solid ${tier.edge}`,
              color: tier.b,
            }}
          >
            <MedalIcon sx={{ fontSize: 26 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            {certificate.levelLabel && (
              <Typography
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: '11px',
                  letterSpacing: '.7px',
                  textTransform: 'uppercase',
                  color: tokens.copper,
                  mb: 0.65,
                }}
              >
                {certificate.levelLabel}
              </Typography>
            )}
            <Typography
              component="h2"
              sx={{
                m: 0,
                fontSize: { xs: 21, md: 26 },
                fontWeight: 800,
                letterSpacing: '-.5px',
                lineHeight: 1.15,
                color: tokens.ink,
                textWrap: 'balance',
              }}
            >
              {certificate.awardTitle || `${certificate.certificationLevel} Certificate`}
            </Typography>
          </Box>
        </Stack>

        <StatusChip status={expired ? 'EXPIRED' : 'VALID'} sx={{ flex: 'none' }} />
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2.75 }}>
        {certificate.tierLine && <Field label="Tier">{certificate.tierLine}</Field>}
        <Field label="Issued to">{certificate.candidateName}</Field>
        <Field label="Issued">{formatCertificateDate(certificate.issueDate)}</Field>
        <Field label="Expires">
          <Box component="span" sx={{ color: expired ? tokens.danger : 'inherit' }}>
            {formatCertificateDate(certificate.expiryDate)}
          </Box>
        </Field>
      </Box>

      {certificate.competencies?.length > 0 && (
        <>
          <Typography sx={{ ...microLabel, mb: 1.25 }}>Competencies</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1.125} sx={{ mb: 3 }}>
            {certificate.competencies.map((competency) => (
              <Box
                key={competency}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '9px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#CFE2D8',
                  background: 'rgba(95,174,146,.08)',
                  border: '1px solid rgba(150,195,172,.24)',
                  whiteSpace: 'nowrap',
                }}
              >
                {competency}
              </Box>
            ))}
          </Stack>
        </>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        sx={{ pt: 2.5, borderTop: `1px solid ${tokens.line}` }}
      >
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: tokens.muted }}>
          Cert No. {certificate.certificateNumber}
        </Typography>

        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={downloading}
          onClick={() => onDownload(certificate.certificateNumber)}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            height: 46,
            px: 3,
            borderRadius: '12px',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '.2px',
            color: '#062017',
            background: gradients.copper,
            boxShadow: shadows.copperGlow,
            width: { xs: '100%', sm: 'auto' },
            '&:hover': { background: gradients.copper, boxShadow: shadows.copperGlowHover },
            '@keyframes certCtaSweep': { '0%': { left: '-45%' }, '55%,100%': { left: '115%' } },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-45%',
              width: '45%',
              height: '100%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent)',
              transform: 'skewX(-18deg)',
              animation: 'certCtaSweep 3.2s ease-in-out infinite',
            },
            '&.Mui-disabled::after': { animation: 'none' },
          }}
        >
          {downloading ? 'Preparing…' : 'Download PDF'}
        </Button>
      </Stack>
    </Box>
  )
}

export default CertificateDocument
