// ems_frontend/src/pages/user/ProfilePage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Paper, TextField, Button, Box, Typography, Grid, Avatar, Alert, MenuItem, Stack, CircularProgress } from '@mui/material'
import { useForm } from 'react-hook-form'
import { userAPI } from '../../api/userAPI'
import { fetchProfileSuccess, updateProfileSuccess, clearSuccess } from '../../store/slices/userSlice'
import PageHeader from '../../components/common/PageHeader'
import PhotoCameraIcon from '@mui/icons-material/PhotoCameraRounded'

const SKILL_LEVELS = ['L1', 'L2', 'L3']

const ProfilePage = () => {
  const dispatch = useDispatch()
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { profile, success, error } = useSelector((state) => state.user)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userAPI.getProfile()
        dispatch(fetchProfileSuccess(response.data.data))
        reset(response.data.data)
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [dispatch, reset])

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreviewUrl(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        yearsOfExperience: data.yearsOfExperience ? Number(data.yearsOfExperience) : null,
        currentSkillLevel: data.currentSkillLevel,
        currentOrganization: data.currentOrganization,
        qualification: data.qualification,
        fatherName: data.fatherName
      }
      const response = await userAPI.updateProfile(payload)
      dispatch(updateProfileSuccess(response.data.data))

      if (selectedFile) {
        const photoResponse = await userAPI.uploadProfilePhoto(selectedFile)
        dispatch(updateProfileSuccess(photoResponse.data.data))
      }

      setTimeout(() => dispatch(clearSuccess()), 3000)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="Manage your personal information" />

      {success && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            {(previewUrl || profile?.profilePhotoUrl) ? (
              <Avatar
                src={previewUrl || profile?.profilePhotoUrl}
                sx={{ width: 128, height: 128, mx: 'auto', mb: 2 }}
              />
            ) : (
              <Avatar sx={{ width: 128, height: 128, mx: 'auto', mb: 2, fontSize: 40 }}>
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </Avatar>
            )}
            <Typography variant="h6" fontWeight={700}>
              {profile?.firstName} {profile?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {profile?.email}
            </Typography>
            <input
              accept="image/*"
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="profile-photo-input"
            />
            <Button
              variant="outlined"
              component="label"
              htmlFor="profile-photo-input"
              startIcon={<PhotoCameraIcon />}
              sx={{ mt: 1 }}
            >
              Change photo
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="First Name" {...register('firstName')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Last Name" {...register('lastName')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="email" type="email" value={profile?.email || ''} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Mobile Number" {...register('mobileNumber')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Years of Experience" type="number" {...register('yearsOfExperience')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Current Skill Level"
                    defaultValue={profile?.currentSkillLevel || 'L1'}
                    {...register('currentSkillLevel')}
                  >
                    {SKILL_LEVELS.map((l) => (
                      <MenuItem key={l} value={l}>{l}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Qualification" {...register('qualification')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Organization" {...register('currentOrganization')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Father's Name" {...register('fatherName')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address" multiline rows={3} {...register('address')} />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProfilePage
