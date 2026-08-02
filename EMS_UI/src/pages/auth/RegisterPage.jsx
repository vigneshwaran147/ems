// ems_frontend/src/pages/auth/RegisterPage.jsx
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { TextField, Button, Box, Typography, Alert, CircularProgress, Grid, MenuItem, Stack } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { registerStart, registerSuccess, registerFailure } from '../../store/slices/authSlice'
import { authAPI } from '../../api/authAPI'
import AuthLayout from '../../components/layout/AuthLayout'

const schema = yup.object().shape({
  userId: yup.string().required('User ID is required').min(4, 'Minimum 4 characters'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobileNumber: yup.string().matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits').required('Mobile number is required'),
  password: yup.string()
    .min(12, 'Password must be at least 12 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[a-z]/, 'Must contain a lowercase letter')
    .matches(/[0-9]/, 'Must contain a digit')
    .matches(/[^A-Za-z0-9]/, 'Must contain a special character')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  yearsOfExperience: yup.number().typeError('Enter a number').min(0, 'Invalid').required('Experience is required'),
  currentSkillLevel: yup.string().required('Skill level is required'),
  qualification: yup.string().required('Qualification is required'),
  currentOrganization: yup.string().required('Organization is required'),
  fatherName: yup.string().required("Father's name is required"),
  address: yup.string().required('Address is required')
})

const RegisterPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isLoading, error } = useSelector((state) => state.auth)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data) => {
    dispatch(registerStart())
    try {
      await authAPI.register({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        address: data.address,
        yearsOfExperience: Number(data.yearsOfExperience),
        currentSkillLevel: data.currentSkillLevel,
        currentOrganization: data.currentOrganization,
        qualification: data.qualification,
        fatherName: data.fatherName
      })
      dispatch(registerSuccess())
      navigate('/login')
    } catch (err) {
      dispatch(registerFailure(err.response?.data?.message || 'Registration failed. Please try again.'))
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register to begin your L1 certification journey"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="User ID" {...register('userId')}
              error={!!errors.userId} helperText={errors.userId?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="First Name" {...register('firstName')}
              error={!!errors.firstName} helperText={errors.firstName?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Last Name" {...register('lastName')}
              error={!!errors.lastName} helperText={errors.lastName?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Email" type="email" {...register('email')}
              error={!!errors.email} helperText={errors.email?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Mobile Number" {...register('mobileNumber')}
              error={!!errors.mobileNumber} helperText={errors.mobileNumber?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Password" type="password" {...register('password')}
              error={!!errors.password} helperText={errors.password?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Confirm Password" type="password" {...register('confirmPassword')}
              error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Years of Experience" type="number" {...register('yearsOfExperience')}
              error={!!errors.yearsOfExperience} helperText={errors.yearsOfExperience?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" select label="Skill Level" defaultValue=""
              {...register('currentSkillLevel')}
              error={!!errors.currentSkillLevel} helperText={errors.currentSkillLevel?.message}
            >
              <MenuItem value="L1">L1</MenuItem>
              <MenuItem value="L2">L2</MenuItem>
              <MenuItem value="L3">L3</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Qualification" {...register('qualification')}
              error={!!errors.qualification} helperText={errors.qualification?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Organization" {...register('currentOrganization')}
              error={!!errors.currentOrganization} helperText={errors.currentOrganization?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Father's Name" {...register('fatherName')}
              error={!!errors.fatherName} helperText={errors.fatherName?.message} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Address" multiline rows={2} {...register('address')}
              error={!!errors.address} helperText={errors.address?.message} />
          </Grid>
        </Grid>

        <Button
          fullWidth variant="contained" size="large"
          sx={{ mt: 3, py: 1.3 }} type="submit" disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
        </Button>
      </Box>

      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Already have an account?
        </Typography>
        <Link to="/login" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 700 }}>
          Sign in
        </Link>
      </Stack>
    </AuthLayout>
  )
}

export default RegisterPage
