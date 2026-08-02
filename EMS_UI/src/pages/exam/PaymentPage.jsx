// ems_frontend/src/pages/exam/PaymentPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Paper, Grid, Typography, Button, Alert, Stack,
  ToggleButtonGroup, ToggleButton, Divider, CircularProgress
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import { userAPI } from '../../api/userAPI'
import PageHeader from '../../components/common/PageHeader'
import CreditCardIcon from '@mui/icons-material/CreditCardRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'

const PROVIDERS = [
  { value: 'RAZORPAY', label: 'RazorPay' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'UPI_QR', label: 'UPI (QR)' }
]

const LEVEL_AMOUNT = {
  L1: 999,
  L2: 1999,
  L3: 2499
}

const PaymentPage = () => {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const [provider, setProvider] = useState('RAZORPAY')
  const [currency] = useState('INR')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [applicationLevel, setApplicationLevel] = useState('L1')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await userAPI.getDashboard()
        const apps = res.data.data?.examStatuses || []
        const app = apps.find((item) => String(item.applicationId) === String(applicationId))
        if (mounted && app?.certificationLevel) {
          setApplicationLevel(app.certificationLevel)
        }
      } catch {
        // Keep default amount fallback for payment UI if dashboard fetch fails.
      }
    })()
    return () => { mounted = false }
  }, [applicationId])

  const amount = LEVEL_AMOUNT[applicationLevel] || LEVEL_AMOUNT.L1

  const handlePay = async () => {
    setProcessing(true)
    setError('')
    try {
      // 1. Initiate the payment to obtain a transaction reference.
      const initRes = await examAPI.initiatePayment(applicationId, { provider, currency })
      const providerReference = initRes.data.data?.transactionId || `TXN-${Date.now()}`

      // 2. Complete the payment (mock gateway success).
      await examAPI.completePayment(applicationId, { success: true, providerReference })
      setDone(true)
      setTimeout(() => navigate(`/exam/schedule/${applicationId}`), 1200)
    } catch (err) {
      const message = err.response?.data?.message || 'Payment failed. Please try again.'
      if (err.response?.status === 409 && message.includes('already completed')) {
        navigate(`/exam/schedule/${applicationId}`, { replace: true })
        return
      }
      setError(message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Complete Payment"
        subtitle={`Exam application #${applicationId}`}
        breadcrumbs={[
          { label: 'Exams', to: '/exams' },
          { label: 'Payment' }
        ]}
      />

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4 }}>
            {done ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
                <Typography variant="h6" fontWeight={700}>Payment successful</Typography>
                <Typography color="text.secondary">Redirecting to exam scheduling…</Typography>
              </Stack>
            ) : (
              <>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Choose a payment provider
                </Typography>
                {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                <ToggleButtonGroup
                  exclusive
                  value={provider}
                  onChange={(_, v) => v && setProvider(v)}
                  sx={{ my: 2, flexWrap: 'wrap' }}
                >
                  {PROVIDERS.map((p) => (
                    <ToggleButton key={p.value} value={p.value} sx={{ px: 3 }}>
                      {p.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Certification level</Typography>
                  <Typography fontWeight={600}>{applicationLevel}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Amount</Typography>
                  <Typography fontWeight={700}>₹{amount.toLocaleString('en-IN')}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Currency</Typography>
                  <Typography fontWeight={600}>{currency}</Typography>
                </Stack>

                <Button
                  variant="contained" size="large" fullWidth
                  startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <CreditCardIcon />}
                  disabled={processing}
                  onClick={handlePay}
                  sx={{ mt: 2 }}
                >
                  {processing ? 'Processing…' : 'Pay now'}
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default PaymentPage
