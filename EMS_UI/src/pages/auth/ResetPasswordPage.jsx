// ems_frontend/src/pages/auth/ResetPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TextField, Button, Box, Alert, CircularProgress } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { authAPI } from '../../api/authAPI'
import AuthLayout from '../../components/layout/AuthLayout'

const schema = yup.object().shape({
  password: yup.string()
    .min(12, 'Password must be at least 12 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[a-z]/, 'Must contain a lowercase letter')
    .matches(/[0-9]/, 'Must contain a digit')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required')
})

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const { token } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')
    try {
      await authAPI.resetPassword(token, data.password)
      setMessage('Password reset successfully. Redirecting to sign in...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a strong new password for your account"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth label="New Password" type="password"
          margin="normal" {...register('password')} error={!!errors.password}
          helperText={errors.password?.message}
        />
        <TextField
          fullWidth label="Confirm Password" type="password"
          margin="normal" {...register('confirmPassword')} error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Button
          fullWidth variant="contained" size="large"
          sx={{ mt: 3, py: 1.3 }} type="submit" disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Reset password'}
        </Button>
      </Box>
    </AuthLayout>
  )
}

export default ResetPasswordPage
