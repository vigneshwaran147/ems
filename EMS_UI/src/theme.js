import { createTheme } from '@mui/material/styles'
import { tokens, fonts, gradients, shadows } from './styles/tokens'

// Centralized design system for the EMS application — the "PCB substrate"
// language from the certification brand: dark solder-mask green board, copper
// traces and accents, mono micro-labels. Every surface in the app is themed
// here so individual pages rarely need their own colours.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.copper,
      light: tokens.copperLt,
      dark: tokens.copperDk,
      contrastText: '#062017',
    },
    secondary: {
      main: tokens.greenLt,
      light: tokens.greenGlow,
      dark: tokens.green,
      contrastText: '#03110C',
    },
    success: { main: tokens.greenGlow, light: '#7FE7C4', dark: '#0E4D3C', contrastText: '#03110C' },
    error: { main: tokens.danger, light: '#FCA5A5', dark: tokens.dangerDk, contrastText: '#1A0606' },
    warning: { main: tokens.warn, light: '#F7CE7A', dark: '#8A5F1A', contrastText: '#1A1206' },
    info: { main: tokens.info, light: '#9ED3E8', dark: '#2C6E88', contrastText: '#04161C' },
    background: {
      default: tokens.sub0,
      paper: tokens.sub2,
    },
    text: {
      primary: tokens.ink,
      secondary: tokens.body,
      disabled: tokens.muted,
    },
    divider: tokens.line,
    action: {
      hover: 'rgba(192,138,46,.10)',
      selected: 'rgba(192,138,46,.16)',
      disabled: 'rgba(163,194,179,.34)',
      disabledBackground: 'rgba(150,195,172,.10)',
    },
  },
  shape: { borderRadius: tokens.radius },
  typography: {
    fontFamily: fonts.sans,
    h1: { fontWeight: 800, letterSpacing: '-1.2px' },
    h2: { fontWeight: 800, letterSpacing: '-1px' },
    h3: { fontWeight: 800, letterSpacing: '-0.8px' },
    h4: { fontWeight: 800, letterSpacing: '-0.6px' },
    h5: { fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 700 },
    overline: { fontFamily: fonts.mono, letterSpacing: '1.8px', fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.sub0,
          color: tokens.ink,
          WebkitFontSmoothing: 'antialiased',
        },
        '::selection': { background: 'rgba(192,138,46,.35)', color: tokens.ink },
        // Chrome paints autofilled inputs near-white, which detonates a dark
        // form. Force the substrate back in with an inset shadow.
        'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus': {
          WebkitBoxShadow: '0 0 0 1000px #061A13 inset',
          WebkitTextFillColor: tokens.ink,
          caretColor: tokens.ink,
          transition: 'background-color 9999s ease-in-out 0s',
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'transparent',
          background: gradients.panel,
          borderRadius: tokens.radius + 4,
          color: tokens.ink,
        },
        outlined: { border: `1px solid ${tokens.line}` },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius + 4,
          border: `1px solid ${tokens.line}`,
          boxShadow: shadows.card,
          // `background` last on purpose: it is a shorthand, so any
          // `backgroundImage` declared after it would erase the gradient and
          // leave a transparent surface.
          background: gradients.panel,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          background: 'rgba(6,26,19,.78)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${tokens.line}`,
          boxShadow: 'none',
          color: tokens.ink,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${tokens.line}`,
          borderRadius: 0,
          background: gradients.rail,
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius - 2,
          textTransform: 'none',
          fontWeight: 700,
          letterSpacing: '.2px',
          paddingInline: 18,
          paddingBlock: 9,
        },
        containedPrimary: {
          background: gradients.copper,
          color: '#062017',
          boxShadow: shadows.copperGlow,
          '&:hover': { filter: 'brightness(1.07)', boxShadow: shadows.copperGlowHover },
          // A dimmed copper fill keeps dark CTA type unreadable; drop to a
          // neutral chip with muted text instead.
          '&.Mui-disabled': {
            background: 'rgba(150,195,172,.10)',
            color: 'rgba(163,194,179,.45)',
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          background: `linear-gradient(96deg, ${tokens.green}, ${tokens.greenLt})`,
          color: '#03110C',
        },
        outlined: {
          borderColor: tokens.line2,
          borderWidth: 1.5,
          color: tokens.copperLt,
          '&:hover': {
            borderWidth: 1.5,
            borderColor: tokens.copper,
            background: 'rgba(192,138,46,.10)',
          },
        },
        text: {
          color: tokens.copperLt,
          '&:hover': { background: 'rgba(192,138,46,.10)' },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          color: tokens.body,
          borderRadius: 10,
          '&:hover': { color: tokens.copperLt, background: 'rgba(192,138,46,.12)' },
        },
      },
    },

    MuiTextField: { defaultProps: { variant: 'outlined' } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius,
          backgroundColor: 'rgba(3,16,11,.72)',
          transition: 'border-color .18s, box-shadow .18s, background .18s',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.line2,
            borderWidth: 1.5,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(150,195,172,.5)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(5,24,17,.95)',
            boxShadow: '0 0 0 4px rgba(192,138,46,.16), 0 0 22px -8px rgba(232,192,113,.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.copper,
            borderWidth: 1.5,
          },
          '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 4px rgba(220,38,38,.16)' },
          '&.Mui-disabled': { backgroundColor: 'rgba(3,16,11,.4)' },
        },
        input: {
          color: tokens.ink,
          fontWeight: 500,
          '&::placeholder': { color: '#4F6E60', opacity: 1 },
        },
      },
    },

    // Dropdowns: copper chevron that flips when the list is open. The list
    // itself is themed through MuiMenu / MuiMenuItem below — anything using
    // `native: true` opts out of both and gets the browser's own popup, so
    // prefer `PcbSelect` for new fields.
    MuiSelect: {
      styleOverrides: {
        icon: { color: tokens.copperLt, transition: 'transform .18s' },
        select: { display: 'flex', alignItems: 'center' },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: tokens.muted,
          fontWeight: 600,
          '&.Mui-focused': { color: tokens.copperLt },
        },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: { color: tokens.muted, fontWeight: 500, marginLeft: 4 },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontSize: '0.78rem', borderRadius: 8, fontWeight: 600 },
        outlined: { borderColor: tokens.line2, color: tokens.body },
        colorDefault: { background: 'rgba(150,195,172,.10)', color: tokens.body },
        filledPrimary: { background: 'rgba(192,138,46,.18)', color: tokens.copperLt },
        filledSuccess: { background: 'rgba(63,211,160,.16)', color: tokens.greenGlow },
        filledError: { background: 'rgba(190,40,40,.22)', color: '#FCA5A5' },
        filledWarning: { background: 'rgba(240,180,64,.16)', color: tokens.warn },
        filledInfo: { background: 'rgba(104,183,216,.16)', color: '#9ED3E8' },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${tokens.line}`, color: tokens.ink },
        head: {
          fontWeight: 700,
          fontSize: '0.76rem',
          letterSpacing: '.8px',
          textTransform: 'uppercase',
          color: tokens.body,
          backgroundColor: tokens.sub3,
          borderBottom: `1px solid ${tokens.line2}`,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: 'rgba(192,138,46,.06)' } },
        head: { '&:hover': { backgroundColor: tokens.sub3 } },
      },
    },

    MuiTableContainer: {
      styleOverrides: { root: { background: 'transparent' } },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 8,
          color: tokens.body,
          '&:hover': { background: 'rgba(192,138,46,.10)', color: tokens.ink },
          '&.Mui-selected': {
            background: 'rgba(192,138,46,.16)',
            color: tokens.copperLt,
            '&:hover': { background: 'rgba(192,138,46,.22)' },
            '& .MuiListItemIcon-root': { color: tokens.copperLt },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: { root: { color: tokens.muted, minWidth: 40 } },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: tokens.line } },
    },

    /*
     * Alerts, including every toast in the app — a Snackbar renders one of
     * these as its content.
     *
     * The message colour is pinned on `.MuiAlert-message` rather than left to
     * cascade from the root. Alert renders a Paper, and the MuiPaper override
     * above sets `color: tokens.ink` on that same element with the same
     * specificity, so which one wins came down to stylesheet injection order —
     * i.e. which component happened to render first. The result was toast text
     * that ignored its severity and came out near-white on whatever background
     * the variant had chosen. A two-class selector settles it outright.
     */
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
          border: '1px solid transparent',
          // Applies to the close button and any action, which otherwise render
          // in the root colour and disappear into a filled background.
          '& .MuiAlert-action': { color: 'inherit', opacity: 0.85 },
          '& .MuiAlertTitle-root': { color: 'inherit', fontWeight: 700 },
        },
        message: { color: 'inherit' },
        standardError: {
          background: 'rgba(190,40,40,.16)',
          borderColor: 'rgba(248,113,113,.34)',
          color: '#FFCFCF',
          '& .MuiAlert-message': { color: '#FFCFCF' },
          '& .MuiAlert-icon': { color: '#FCA5A5' },
        },
        standardSuccess: {
          background: 'rgba(63,211,160,.12)',
          borderColor: 'rgba(63,211,160,.34)',
          color: '#C6F5E4',
          '& .MuiAlert-message': { color: '#C6F5E4' },
          '& .MuiAlert-icon': { color: tokens.greenGlow },
        },
        standardWarning: {
          background: 'rgba(240,180,64,.12)',
          borderColor: 'rgba(240,180,64,.34)',
          color: '#F6DFB2',
          '& .MuiAlert-message': { color: '#F6DFB2' },
          '& .MuiAlert-icon': { color: tokens.warn },
        },
        standardInfo: {
          background: 'rgba(104,183,216,.12)',
          borderColor: 'rgba(104,183,216,.32)',
          color: '#CDE7F2',
          '& .MuiAlert-message': { color: '#CDE7F2' },
          '& .MuiAlert-icon': { color: tokens.info },
        },

        /*
         * Filled is what the in-exam toasts use, and MUI's dark-mode default
         * paints them in the palette's *dark* shade — a muddy #8A5F1A for a
         * warning — then relies on the root colour for the text, which the
         * Paper override was overwriting. Both halves are fixed here: the
         * bright accent as the fill, and the palette's own dark contrast ink on
         * top of it, the same pairing the copper CTA buttons use.
         */
        filledError: {
          background: tokens.danger,
          borderColor: tokens.danger,
          color: '#1A0606',
          '& .MuiAlert-message': { color: '#1A0606' },
          '& .MuiAlert-icon': { color: '#1A0606' },
        },
        filledSuccess: {
          background: tokens.greenGlow,
          borderColor: tokens.greenGlow,
          color: '#03110C',
          '& .MuiAlert-message': { color: '#03110C' },
          '& .MuiAlert-icon': { color: '#03110C' },
        },
        filledWarning: {
          background: tokens.warn,
          borderColor: tokens.warn,
          color: '#1A1206',
          '& .MuiAlert-message': { color: '#1A1206' },
          '& .MuiAlert-icon': { color: '#1A1206' },
        },
        filledInfo: {
          background: tokens.info,
          borderColor: tokens.info,
          color: '#04161C',
          '& .MuiAlert-message': { color: '#04161C' },
          '& .MuiAlert-icon': { color: '#04161C' },
        },

        outlinedError: { color: '#FFCFCF', borderColor: 'rgba(248,113,113,.5)', '& .MuiAlert-message': { color: '#FFCFCF' } },
        outlinedSuccess: { color: '#C6F5E4', borderColor: 'rgba(63,211,160,.5)', '& .MuiAlert-message': { color: '#C6F5E4' } },
        outlinedWarning: { color: '#F6DFB2', borderColor: 'rgba(240,180,64,.5)', '& .MuiAlert-message': { color: '#F6DFB2' } },
        outlinedInfo: { color: '#CDE7F2', borderColor: 'rgba(104,183,216,.5)', '& .MuiAlert-message': { color: '#CDE7F2' } },
      },
    },

    /*
     * A Snackbar's own surface, used when one is given a plain message string
     * instead of an Alert child. It is a Paper too, so it inherited the panel
     * gradient and the same ambiguous text colour as the alerts above.
     */
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          background: gradients.card,
          border: `1px solid ${tokens.line2}`,
          borderRadius: 12,
          color: tokens.ink,
          boxShadow: shadows.card,
        },
        message: { color: tokens.ink, fontWeight: 500 },
        action: { color: tokens.copperLt },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          background: gradients.card,
          border: `1px solid ${tokens.line2}`,
          borderRadius: 22,
          boxShadow: shadows.package,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 800, letterSpacing: '-.4px' } },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          background: gradients.card,
          border: `1px solid ${tokens.line2}`,
          boxShadow: shadows.card,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: tokens.body,
          '&:hover': { background: 'rgba(192,138,46,.10)', color: tokens.ink },
          '&.Mui-selected': { background: 'rgba(192,138,46,.16)', color: tokens.copperLt },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: tokens.sub3,
          border: `1px solid ${tokens.line2}`,
          color: tokens.ink,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
        arrow: { color: tokens.sub3 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(150,195,172,.12)', borderRadius: 999, height: 8 },
        bar: { background: gradients.copper, borderRadius: 999 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { background: tokens.copper, height: 3, borderRadius: 3 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          color: tokens.muted,
          '&.Mui-selected': { color: tokens.copperLt },
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(140deg, ${tokens.green}, ${tokens.copperDk})`,
          color: tokens.ink,
          fontWeight: 700,
        },
      },
    },

    MuiCheckbox: { styleOverrides: { root: { color: tokens.muted } } },
    MuiRadio: { styleOverrides: { root: { color: tokens.muted } } },
    MuiSwitch: {
      styleOverrides: {
        track: { backgroundColor: 'rgba(150,195,172,.28)' },
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.line}`,
          borderRadius: 14,
          background: gradients.panel,
          '&::before': { display: 'none' },
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(3,17,12,.78)' } },
    },

    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: 'rgba(150,195,172,.10)' } },
    },
  },
})

export default theme
