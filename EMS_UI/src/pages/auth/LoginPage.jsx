// ems_frontend/src/pages/auth/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Button, Typography, Alert, CircularProgress, IconButton, Checkbox } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import { loginStart, loginSuccess, loginFailure, clearError } from '../../store/slices/authSlice'
import { authAPI, normalizeAuth } from '../../api/authAPI'
import { getApiErrorMessage } from '../../utils/apiError'
import AuthLayout from '../../components/layout/AuthLayout'
import PcbField from '../../components/common/PcbField'
import { tokens, fonts, ctaButton } from '../../styles/tokens'

const schema = yup.object().shape({
  email: yup.string().email('Enter a valid email address.').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')
})

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState(false)
  // Why the session ended, when it ended on its own. Read once into state: a
  // sign-out lands here via replace, so the notice has to survive the render
  // that clears it from history without reappearing on a later visit.
  const [authNotice, setAuthNotice] = useState(location.state?.authNotice || '')
  const { isLoading, error } = useSelector((state) => state.auth)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  // Drop the notice from history so a refresh, or a later Back to this screen,
  // does not re-announce a sign-out that already happened.
  useEffect(() => {
    if (location.state?.authNotice) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const onSubmit = async (data) => {
    dispatch(loginStart())
    try {
      const response = await authAPI.login(data.email, data.password)
      const auth = normalizeAuth(response.data.data)
      dispatch(loginSuccess(auth))
      const isAdmin = auth?.user?.role === 'ADMIN' || auth?.user?.roles?.includes('ADMIN')
      navigate(isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true })
    } catch (err) {
      // The fallback is reached only when the server answered a 4xx without a
      // message. A backend that is down, slow or erroring gets its own wording
      // from getApiErrorMessage — telling the user their credentials are wrong
      // when the API never answered sends them chasing a password problem that
      // does not exist. Either way the failure is dispatched, so isLoading goes
      // back to false and the form is usable again on the same screen.
      dispatch(loginFailure(getApiErrorMessage(err, 'Invalid credentials. Please try again.')))
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your certification journey."
    >
      {authNotice && !error && (
        <Alert severity="info" sx={{ mb: 2.5 }} onClose={() => setAuthNotice('')}>
          {authNotice}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

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

        <PcbField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          icon={<LockOutlinedIcon />}
          error={errors.password?.message}
          endAdornment={
            <IconButton
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              sx={{ width: 37, height: 37 }}
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          }
          {...register('password')}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            m: '2px 0 24px',
          }}
        >
          <Box
            component="label"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 13,
              fontWeight: 500,
              color: tokens.body,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Checkbox size="small" sx={{ p: 0.5 }} />
            Keep me signed in
          </Box>
          <Link
            to="/forgot-password"
            style={{ fontSize: 13, fontWeight: 700, color: tokens.copperLt, textDecoration: 'none' }}
          >
            Forgot password?
          </Link>
        </Box>

        <Button fullWidth variant="contained" type="submit" disabled={isLoading} sx={ctaButton}>
          {isLoading ? (
            <>
              <CircularProgress size={16} sx={{ color: '#062017', mr: 1.25 }} />
              Authenticating
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>

      <Box
        className="mono"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.6,
          m: '24px 0 18px',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '2px',
          color: tokens.muted,
          '&::before, &::after': { content: '""', flex: 1, height: '1px', background: tokens.line },
        }}
      >
        START YOUR CERTIFICATION
      </Box>

      <Typography sx={{ textAlign: 'center', fontSize: 14, color: tokens.body }}>
        Don&apos;t have an account?{' '}
        <Link to="/register" style={{ fontWeight: 700, color: tokens.copperLt, textDecoration: 'none' }}>
          Create one free
        </Link>
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.9,
          mt: 3,
          fontFamily: fonts.mono,
          fontSize: 10.5,
          letterSpacing: '1.4px',
          color: tokens.muted,
        }}
      >
        <ShieldRoundedIcon sx={{ fontSize: 13 }} />
        SECURED · 256-BIT TLS
      </Box>
    </AuthLayout>
  )
}

export default LoginPage
