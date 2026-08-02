// ems_frontend/src/components/layout/LayoutWrapper.jsx
import { useEffect, useState } from 'react'
import {
  Box, AppBar, Toolbar, IconButton, Menu, MenuItem, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Divider, Typography,
  Avatar, Tooltip, Chip, ListSubheader, Snackbar, Alert
} from '@mui/material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded'
import SchoolIcon from '@mui/icons-material/SchoolRounded'
import AssignmentIcon from '@mui/icons-material/AssignmentRounded'
import CardGiftcardIcon from '@mui/icons-material/WorkspacePremiumRounded'
import AnalyticsIcon from '@mui/icons-material/InsightsRounded'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import GroupIcon from '@mui/icons-material/GroupRounded'
import QuizIcon from '@mui/icons-material/QuizRounded'
import GavelIcon from '@mui/icons-material/GavelRounded'
import EventNoteIcon from '@mui/icons-material/EventNoteRounded'
import TableChartIcon from '@mui/icons-material/TableChartRounded'
import PaidIcon from '@mui/icons-material/PaidRounded'
import { logout } from '../../store/slices/authSlice'

const DRAWER_WIDTH = 236
const HEADER_TOOLBAR_HEIGHT = 44

const LayoutWrapper = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { profile } = useSelector((state) => state.user)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const [globalAlert, setGlobalAlert] = useState({ open: false, severity: 'info', message: '' })

  const isAdmin = user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')

  const userMenu = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Certifications', icon: <SchoolIcon />, path: '/certifications' },
    { label: 'Exams', icon: <AssignmentIcon />, path: '/exams' },
    { label: 'Certificates', icon: <CardGiftcardIcon />, path: '/certificates' },
    { label: 'Exam Reports', icon: <TableChartIcon />, path: '/exam-reports' },
    // { label: 'Reports', icon: <AnalyticsIcon />, path: '/reports' }
  ]

  const adminMenu = [
    { label: 'Overview', icon: <AnalyticsIcon />, path: '/admin/dashboard' },
    { label: 'Users', icon: <GroupIcon />, path: '/admin/users' },
    { label: 'Exams', icon: <EventNoteIcon />, path: '/admin/exams' },
    { label: 'Questions', icon: <QuizIcon />, path: '/admin/questions' },
    { label: 'Payments', icon: <PaidIcon />, path: '/admin/payments' },
    { label: 'Exam Reports', icon: <TableChartIcon />, path: '/admin/exam-reports' },
    { label: 'Violations', icon: <GavelIcon />, path: '/admin/violations' },
    { label: 'Reports', icon: <AnalyticsIcon />, path: '/admin/reports' }
  ]

  const primaryMenu = isAdmin ? adminMenu : userMenu

  const handleNavigate = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path))

  const displayFirstName = profile?.firstName || user?.firstName || ''
  const displayLastName = profile?.lastName || user?.lastName || ''
  const displayEmail = profile?.email || user?.email || ''
  const displayProfilePhoto = profile?.profilePhotoUrl || null
  const initials = (`${displayFirstName?.[0] || ''}${displayLastName?.[0] || ''}` || 'U').toUpperCase()

  useEffect(() => {
    const nextAlert = location.state?.globalAlert
    if (!nextAlert?.message) {
      return
    }

    setGlobalAlert({
      open: true,
      severity: nextAlert.severity || 'info',
      message: nextAlert.message
    })

    // Clear one-time navigation state so the alert does not repeat on refresh.
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash
      },
      { replace: true, state: {} }
    )
  }, [location, navigate])

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff'
          }}
        >
          <SchoolIcon fontSize="small" />
        </Box>
        <Typography variant="body2" fontWeight={800} lineHeight={1}>
          EMS
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Platform
        </Typography>
      </Box>
      <Divider />

      <List sx={{ px: 0, py: 1 }}>
        {primaryMenu.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => handleNavigate(item.path)}
            sx={{ my: 0.3 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>

      {isAdmin && (
        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 700, color: 'text.secondary', lineHeight: '32px', px: 2 }}>
          Administration
        </ListSubheader>
      )}

      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar src={displayProfilePhoto || undefined} sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          {initials}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" fontWeight={700} noWrap>
            {displayFirstName} {displayLastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
            {displayEmail}
          </Typography>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          minHeight: `${HEADER_TOOLBAR_HEIGHT}px`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: { xs: `${HEADER_TOOLBAR_HEIGHT}px`, sm: `${HEADER_TOOLBAR_HEIGHT}px` },
            height: `${HEADER_TOOLBAR_HEIGHT}px`,
            py: 0,
            px: 1.25
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {isAdmin && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              icon={<AdminPanelSettingsIcon />}
              label="Admin"
              sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
            />
          )}

          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              sx={{ p: 0.25 }}
            >
              <Avatar
                src={displayProfilePhoto || undefined}
                sx={{ bgcolor: 'primary.main', width: 30, height: 30, fontSize: '0.75rem' }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {displayFirstName} {displayLastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {displayEmail}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null) }}>
              <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }
        }}
      >
        <Toolbar
          variant="dense"
          sx={{ minHeight: { xs: `${HEADER_TOOLBAR_HEIGHT}px`, sm: `${HEADER_TOOLBAR_HEIGHT}px` } }}
        />
        <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>{children || <Outlet />}</Box>
        <Snackbar
          open={globalAlert.open}
          autoHideDuration={6000}
          onClose={() => setGlobalAlert((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={globalAlert.severity}
            variant="filled"
            onClose={() => setGlobalAlert((prev) => ({ ...prev, open: false }))}
            sx={{ width: '100%' }}
          >
            {globalAlert.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}

LayoutWrapper.propTypes = {
  children: PropTypes.node
}

export default LayoutWrapper
