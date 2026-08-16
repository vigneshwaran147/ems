// ems_frontend/src/pages/auth/ResetPasswordPage.jsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Box, Alert, CircularProgress } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { authAPI } from '../../api/authAPI'
import { getApiErrorMessage } from '../../utils/apiError'
import AuthLayout from '../../components/layout/AuthLayout'
import PcbField from '../../components/common/PcbField'
import { ctaButton } from '../../styles/tokens'

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
      setError(getApiErrorMessage(err, 'Failed to reset password'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a strong new password for your account."
      stamp="EMS-RESET v2.4"
    >
      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2.5 }}>{message}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PcbField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          icon={<LockOutlinedIcon />}
          error={errors.password?.message}
          {...register('password')}
        />
        <PcbField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          icon={<LockOutlinedIcon />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button fullWidth variant="contained" type="submit" disabled={isLoading} sx={{ ...ctaButton, mt: 1 }}>
          {isLoading ? (
            <>
              <CircularProgress size={16} sx={{ color: '#062017', mr: 1.25 }} />
              Resetting
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </Box>
    </AuthLayout>
  )
}

export default ResetPasswordPage
