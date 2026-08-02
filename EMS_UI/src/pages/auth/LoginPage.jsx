// ems_frontend/src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment, IconButton, Stack } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { loginStart, loginSuccess, loginFailure, clearError } from '../../store/slices/authSlice'
import { authAPI, normalizeAuth } from '../../api/authAPI'
import AuthLayout from '../../components/layout/AuthLayout'

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')
})

const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState(false)
  const { isLoading, error } = useSelector((state) => state.auth)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const onSubmit = async (data) => {
    dispatch(loginStart())
    try {
      const response = await authAPI.login(data.email, data.password)
      dispatch(loginSuccess(normalizeAuth(response.data.data)))
      navigate('/')
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Invalid credentials. Please try again.'))
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your certification journey"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="Email address"
          type="email"
          margin="normal"
          autoComplete="email"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon color="action" />
              </InputAdornment>
            )
          }}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          margin="normal"
          autoComplete="current-password"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        <Box sx={{ textAlign: 'right', mt: 1 }}>
          <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#4f46e5', fontSize: '0.875rem', fontWeight: 600 }}>
            Forgot password?
          </Link>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, py: 1.3 }}
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
        </Button>
      </Box>

      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Don't have an account?
        </Typography>
        <Link to="/register" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 700 }}>
          Create one
        </Link>
      </Stack>
    </AuthLayout>
  )
}

export default LoginPage
