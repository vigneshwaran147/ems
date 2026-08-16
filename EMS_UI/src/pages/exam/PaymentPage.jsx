// ems_frontend/src/pages/exam/PaymentPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Paper, Grid, Typography, Button, Alert, Stack, Checkbox, FormControlLabel,
  Link, ToggleButtonGroup, ToggleButton, Divider, CircularProgress
} from '@mui/material'
import { examAPI } from '../../api/examAPI'
import { userAPI } from '../../api/userAPI'
import PageHeader from '../../components/common/PageHeader'
import PaymentTermsDialog from '../../components/payment/PaymentTermsDialog'
import { tokens, fonts, ctaButton } from '../../styles/tokens'
import CreditCardIcon from '@mui/icons-material/CreditCardRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'

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
  /*
   * The fee is non-transferable and the attempt it buys can be lost to a
   * violation, so the terms are not fine print the candidate can pay past: the
   * CTA stays disabled until this is ticked.
   */
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  /*
   * Nothing is shown until the application has been checked. A paid application
   * that renders the payment form for even a moment is an invitation to pay
   * twice, and the click is quicker than the redirect.
   */
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await userAPI.getDashboard()
        const apps = res.data.data?.examStatuses || []
        const app = apps.find((item) => String(item.applicationId) === String(applicationId))
        if (!mounted || !app) {
          return
        }
        if (app.certificationLevel) {
          setApplicationLevel(app.certificationLevel)
        }
        /*
         * One payment buys one application, and it stays bought until that
         * application reaches a pass or a fail. Landing here again — from a
         * bookmark, the back button, or a stale tab — means the candidate has
         * been sent to a step they already completed, so send them on to the one
         * they have not: their booked exam, or the booking.
         */
        if (app.paymentStatus === 'SUCCESS') {
          navigate(
            app.scheduledExamTime ? `/exam/${applicationId}` : `/exam/schedule/${applicationId}`,
            { replace: true }
          )
          return
        }
      } catch {
        // Keep default amount fallback for payment UI if dashboard fetch fails.
      } finally {
        if (mounted) setChecking(false)
      }
    })()
    return () => { mounted = false }
  }, [applicationId, navigate])

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

  /*
   * The link sits inside the agreement's <label>, so an uncancelled click is
   * forwarded on to the checkbox by the browser: reaching for the terms would
   * tick the box that says they have been read. Cancelling the event leaves the
   * rest of the label doing its normal job of toggling the box.
   */
  const openTerms = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setTermsOpen(true)
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
            {checking ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">Checking payment status…</Typography>
              </Stack>
            ) : done ? (
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

                {/*
                  * Laid out as a grid rather than the usual joined bar: four
                  * providers welded together read as one segmented control with
                  * a default, and the choice here is the candidate's to make.
                  * The doubled class outranks the group's own corner-stripping
                  * rules, which would otherwise square off the inner tiles.
                  */}
                <ToggleButtonGroup
                  exclusive
                  value={provider}
                  onChange={(_, v) => v && setProvider(v)}
                  sx={{
                    my: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                    gap: 1,
                    '& .MuiToggleButtonGroup-grouped.MuiToggleButton-root': {
                      m: 0,
                      height: 40,
                      px: 1,
                      border: `1.5px solid ${tokens.line2}`,
                      borderRadius: '9px',
                      fontFamily: fonts.mono,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '.5px',
                      textTransform: 'none',
                      color: tokens.body,
                      '&.Mui-selected': {
                        background: 'rgba(192,138,46,.18)',
                        borderColor: 'rgba(192,138,46,.4)',
                        color: tokens.copperLt,
                        '&:hover': { background: 'rgba(192,138,46,.24)' },
                      },
                    },
                  }}
                >
                  {PROVIDERS.map((p) => (
                    <ToggleButton key={p.value} value={p.value}>
                      {p.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Certification level</Typography>
                  <Typography fontWeight={600}>{applicationLevel}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Amount</Typography>
                  {/* The figure being agreed to — set in the board's mono face so
                      it reads as a number, not a sentence. */}
                  <Typography sx={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 16 }}>
                    ₹{amount.toLocaleString('en-IN')}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">Currency</Typography>
                  <Typography fontWeight={600}>{currency}</Typography>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  sx={{ alignItems: 'flex-start', mr: 0, mb: 2 }}
                  control={
                    <Checkbox
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      sx={{ pt: 0.25 }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: 'text.secondary' }}>
                      I agree to the{' '}
                      {/* A span, not a button: a <label> may not contain another
                          labelable control, so the trigger carries the button
                          role instead of the element. */}
                      <Link
                        component="span"
                        role="button"
                        tabIndex={0}
                        underline="hover"
                        onClick={openTerms}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openTerms(e)
                        }}
                        sx={{ color: tokens.copperLt, fontWeight: 700, cursor: 'pointer' }}
                      >
                        terms &amp; conditions
                      </Link>
                      {' '}and understand that exam fees are non-transferable.
                    </Typography>
                  }
                />

                <Button
                  variant="contained" size="large" fullWidth
                  startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <CreditCardIcon />}
                  disabled={processing || !termsAgreed}
                  onClick={handlePay}
                  sx={{ ...ctaButton, height: 48, fontSize: 13, letterSpacing: '.3px', textTransform: 'none' }}
                >
                  {processing ? 'Processing…' : 'Pay now'}
                </Button>

                <Stack
                  direction="row"
                  spacing={0.9}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ mt: 1.75, color: tokens.muted }}
                >
                  <ShieldRoundedIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: 11 }}>
                    Payments are encrypted and processed securely.
                  </Typography>
                </Stack>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <PaymentTermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </Box>
  )
}

export default PaymentPage
