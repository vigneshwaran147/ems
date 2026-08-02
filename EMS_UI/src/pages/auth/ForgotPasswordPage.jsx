// ems_frontend/src/pages/auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TextField, Button, Box, Alert, CircularProgress, InputAdornment, Stack } from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { authAPI } from '../../api/authAPI'
import AuthLayout from '../../components/layout/AuthLayout'

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required')
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
      setError(err.response?.data?.message || 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth label="Email address" type="email"
          margin="normal" {...register('email')} error={!!errors.email}
          helperText={errors.email?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon color="action" />
              </InputAdornment>
            )
          }}
        />

        <Button
          fullWidth variant="contained" size="large"
          sx={{ mt: 3, py: 1.3 }} type="submit" disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send reset link'}
        </Button>
      </Box>

      <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
        <Link to="/login" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 700 }}>
          Back to sign in
        </Link>
      </Stack>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
