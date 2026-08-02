import { createTheme } from '@mui/material/styles'

// Centralized design system for the EMS application.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    light: '#e7f4fd',
    dark: '#1565c0',
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
  },
  components: {
    MuiButton: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { paddingInline: 18, paddingBlock: 10 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #48adec 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #e0e0e0',
          boxShadow: '0px 2px 8px rgba(15,23,42,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '0.85rem', borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#475569', backgroundColor: '#f1f5f9' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginInline: 8,
        },
      },
    },
  },
})

export default theme
