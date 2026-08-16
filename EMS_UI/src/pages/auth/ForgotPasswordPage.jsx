// ems_frontend/src/pages/auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Box, Typography, Alert, CircularProgress } from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { authAPI } from '../../api/authAPI'
import { getApiErrorMessage } from '../../utils/apiError'
import AuthLayout from '../../components/layout/AuthLayout'
import PcbField from '../../components/common/PcbField'
import { tokens, ctaButton } from '../../styles/tokens'

const schema = yup.object().shape({
  email: yup.string().email('Enter a valid email address.').required('Email is required')
})

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      await authAPI.forgotPassword(data.email)
      setMessage('If an account exists, a password reset link has been sent to your email.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send reset link'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      stamp="EMS-RECOVER v2.4"
    >
      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2.5 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PcbField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<EmailOutlinedIcon />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button fullWidth variant="contained" type="submit" disabled={isLoading} sx={{ ...ctaButton, mt: 1 }}>
          {isLoading ? (
            <>
              <CircularProgress size={16} sx={{ color: '#062017', mr: 1.25 }} />
              Sending
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </Box>

      <Typography sx={{ textAlign: 'center', fontSize: 14, mt: 3 }}>
        <Link to="/login" style={{ fontWeight: 700, color: tokens.copperLt, textDecoration: 'none' }}>
          Back to sign in
        </Link>
      </Typography>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
