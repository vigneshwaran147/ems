// ems_frontend/src/components/common/LoadingSpinner.jsx
import { Backdrop, CircularProgress } from '@mui/material'

const LoadingSpinner = ({ open = false }) => {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default LoadingSpinner
