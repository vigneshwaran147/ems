// ems_frontend/src/pages/certificate/CertificatePage.jsx
import { useEffect, useState } from 'react'
import {
  Box, Grid, Card, CardContent, CardActions, Button, Typography,
  Skeleton, Stack, Divider, Paper, TextField, Alert, InputAdornment
} from '@mui/material'
import { certificateAPI } from '../../api/certificateAPI'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import StatusChip from '../../components/common/StatusChip'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumRounded'
import DownloadIcon from '@mui/icons-material/DownloadRounded'
import VerifiedIcon from '@mui/icons-material/VerifiedRounded'
import SearchIcon from '@mui/icons-material/SearchRounded'

const isExpired = (expiryDate) => expiryDate && new Date(expiryDate) < new Date()

const CertificatePage = () => {
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')

  // Verification panel
  const [verifyNumber, setVerifyNumber] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await certificateAPI.getCertificates()
        if (mounted) setCertificates(res.data.data || [])
      } catch (err) {
        console.error('Failed to load certificates', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleDownload = async (certNumber) => {
    setDownloading(certNumber)
    try {
      const res = await certificateAPI.downloadCertificate(certNumber)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${certNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
    } finally {
      setDownloading('')
    }
  }

  const handleVerify = async () => {
    if (!verifyNumber.trim()) return
    setVerifying(true)
    setVerifyError('')
    setVerifyResult(null)
    try {
      const res = await certificateAPI.verifyCertificate(verifyNumber.trim())
      setVerifyResult(res.data.data)
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Certificate not found')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="My Certificates"
        subtitle="Download your certificates and verify authenticity"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {loading ? (
            <Grid container spacing={2}>
              {[1, 2].map((i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="rounded" height={200} />
                </Grid>
              ))}
            </Grid>
          ) : certificates.length === 0 ? (
            <Card>
              <EmptyState
                icon={<WorkspacePremiumIcon fontSize="large" />}
                title="No certificates yet"
                description="Pass a certification exam to earn your first certificate."
              />
            </Card>
          ) : (
            <Grid container spacing={2}>
              {certificates.map((cert) => {
                const expired = isExpired(cert.expiryDate)
                return (
                  <Grid item xs={12} sm={6} key={cert.certificateNumber}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <WorkspacePremiumIcon color={expired ? 'disabled' : 'primary'} />
                          <StatusChip status={expired ? 'EXPIRED' : 'VALID'} />
                        </Stack>
                        <Typography variant="h6" fontWeight={700}>
                          {cert.certificationLevel} Certificate
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cert.candidateName}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" display="block" color="text.secondary">
                          No: {cert.certificateNumber}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Issued: {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '–'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Expires: {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : '–'}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ p: 2, pt: 0 }}>
                        <Button
                          variant="contained" fullWidth startIcon={<DownloadIcon />}
                          disabled={downloading === cert.certificateNumber}
                          onClick={() => handleDownload(cert.certificateNumber)}
                        >
                          {downloading === cert.certificateNumber ? 'Downloading…' : 'Download'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Grid>

        {/* Verification panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <VerifiedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Verify a certificate</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enter a certificate number to check its validity.
            </Typography>
            <TextField
              fullWidth size="small" placeholder="Certificate number"
              value={verifyNumber} onChange={(e) => setVerifyNumber(e.target.value)}
              sx={{ mt: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained" fullWidth sx={{ mt: 2 }}
              disabled={verifying || !verifyNumber.trim()} onClick={handleVerify}
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </Button>

            {verifyError && <Alert severity="error" sx={{ mt: 2 }}>{verifyError}</Alert>}

            {verifyResult && (
              <Box sx={{ mt: 2 }}>
                <StatusChip status={verifyResult.verificationStatus} />
                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                  <Typography variant="body2"><b>{verifyResult.candidateName}</b></Typography>
                  <Typography variant="caption" color="text.secondary">
                    {verifyResult.certificationLevel} · {verifyResult.certificateNumber}
                  </Typography>
                  {verifyResult.message && (
                    <Typography variant="caption" color="text.secondary">
                      {verifyResult.message}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CertificatePage
