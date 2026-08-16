// ems_frontend/src/styles/tokens.js
//
// Single source of truth for the "PCB substrate" design language: a dark
// fibreglass-green board with copper traces. Every colour in the UI resolves
// back to one of these tokens (directly, or through the MUI theme built on
// top of them in src/theme.js) so the whole application reads as one system.

export const tokens = {
  // Substrate — darkest to lightest layer of the board itself.
  sub0: '#03110C',
  sub1: '#061A13',
  sub2: '#0A2419',
  sub3: '#0E3325',

  // Solder-mask greens.
  green: '#0E4D3C',
  greenLt: '#5FAE92',
  greenGlow: '#3FD3A0',

  // Copper — the accent metal. Primary action colour.
  copper: '#C08A2E',
  copperLt: '#E8C071',
  copperDk: '#8A5F1A',

  // Type.
  ink: '#E9F3EE',
  body: '#A3C2B3',
  muted: '#6D8D7F',

  // Hairlines.
  line: 'rgba(150,195,172,.16)',
  line2: 'rgba(150,195,172,.30)',

  // Semantic status colours, tuned for a dark substrate.
  danger: '#F87171',
  dangerDk: '#BE2828',
  warn: '#F0B440',
  info: '#68B7D8',

  radius: 14,
}

export const fonts = {
  sans: '"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  mono: '"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace',
}

export const gradients = {
  /** Copper CTA fill — pairs with dark-green type for contrast. */
  copper: 'linear-gradient(96deg,#B07C24 0%,#E8C071 48%,#C08A2E 100%)',
  /** Chip-package card face. */
  card: 'linear-gradient(168deg, rgba(11,44,34,.94), rgba(4,20,14,.96))',
  /** Slightly lifted surface for panels sitting on the board. */
  panel: 'linear-gradient(165deg, rgba(10,36,25,.92), rgba(5,22,15,.96))',
  /** Full-bleed board background. */
  board:
    'radial-gradient(900px 640px at 16% 12%, rgba(14,77,60,.75), transparent 62%),' +
    'radial-gradient(720px 540px at 86% 84%, rgba(192,138,46,.16), transparent 60%),' +
    'linear-gradient(158deg,#05170F 0%,#03110C 55%,#061A12 100%)',
  /** Copper-to-solder-mask sweep used on headline text. */
  brandText: 'linear-gradient(96deg,#E8C071 0%,#C08A2E 45%,#5FAE92 100%)',
  /** Sidebar / rail fill. */
  rail: 'linear-gradient(180deg, #08211A 0%, #04150E 100%)',
}

export const shadows = {
  card: '0 24px 60px -32px rgba(0,0,0,.85)',
  package: '0 40px 90px -30px rgba(0,0,0,.92), 0 0 0 1px rgba(255,255,255,.03) inset',
  copperGlow: '0 14px 32px -12px rgba(192,138,46,.8), 0 0 0 1px rgba(255,255,255,.12) inset',
  copperGlowHover: '0 18px 40px -12px rgba(232,192,113,.95)',
}

/**
 * Surface recipe shared by every "card on the board" in the app — dashboards,
 * tables, dialogs. Spread into an `sx` prop.
 */
export const surface = {
  background: gradients.panel,
  border: `1px solid ${tokens.line}`,
  borderRadius: `${tokens.radius + 4}px`,
  boxShadow: shadows.card,
}

/**
 * Floating surface for anything that leaves the page plane — select menus and
 * the date/time picker. Uses the chip-package fill rather than the panel one so
 * a popup always reads as sitting *above* the card it was opened from.
 */
export const popoverSurface = {
  background: gradients.card,
  border: `1px solid ${tokens.line2}`,
  borderRadius: `${tokens.radius}px`,
  boxShadow: shadows.package,
}

/**
 * One row in a themed listbox — select menus, the picker's hour/minute wheels.
 * Spread into `sx` so the MUI shorthands below resolve.
 */
export const menuOption = {
  mx: 0.75,
  my: '2px',
  px: 1.25,
  py: 0.85,
  fontSize: 13,
  fontWeight: 600,
  borderRadius: '9px',
  color: tokens.body,
  transition: 'background .15s, color .15s',
  '&:hover': { background: 'rgba(192,138,46,.10)', color: tokens.ink },
  '&.Mui-selected, &[aria-selected="true"]': {
    background: 'rgba(192,138,46,.16)',
    color: tokens.copperLt,
    '&:hover': { background: 'rgba(192,138,46,.22)' },
  },
  '&.Mui-disabled': { opacity: 0.32 },
}

/**
 * Primary call-to-action: the copper bar with a light sweeping across it.
 * Used for the one decisive action on a screen (sign in, start exam, pay).
 */
export const ctaButton = {
  position: 'relative',
  width: '100%',
  height: 54,
  borderRadius: `${tokens.radius}px`,
  fontSize: 14.5,
  fontWeight: 800,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  overflow: 'hidden',
  '@keyframes ctaSweep': { '0%': { left: '-45%' }, '55%,100%': { left: '115%' } },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-45%',
    width: '45%',
    height: '100%',
    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent)',
    transform: 'skewX(-18deg)',
    animation: 'ctaSweep 2.8s ease-in-out infinite',
  },
  '&.Mui-disabled::after': { animation: 'none' },
}

/** Uppercase, letter-spaced monospace micro-label ("EMS-AUTH v2.4"). */
export const microLabel = {
  fontFamily: fonts.mono,
  fontSize: '10px',
  letterSpacing: '1.8px',
  textTransform: 'uppercase',
  color: tokens.muted,
}

/**
 * Tier metals for the certification ladder.
 *
 * The palette above can name a level but has no way to *show* one — bronze,
 * silver and gold certificates all resolved to the same copper. These are the
 * only colours in the system that exist to encode rank: each entry is a struck
 * metal (`a` shadow → `b` body → `c` highlight) used for medals, seals, the
 * holder's name and card edges. Silver is deliberately a cool desaturated green
 * rather than a true grey so it stays legible against the solder-mask board and
 * never reads as copper.
 */
export const tiers = {
  bronze: {
    name: 'Bronze',
    a: '#A8672E',
    b: '#D89355',
    c: '#F0C08A',
    edge: 'rgba(216,147,85,.34)',
    rule: 'rgba(216,147,85,.16)',
  },
  silver: {
    name: 'Silver',
    a: '#7E968E',
    b: '#C3D6CE',
    c: '#E8F2ED',
    edge: 'rgba(195,214,206,.32)',
    rule: 'rgba(195,214,206,.15)',
  },
  gold: {
    name: 'Gold',
    a: '#B07C24',
    b: '#E8C071',
    c: '#F7E3B4',
    edge: 'rgba(232,192,113,.34)',
    rule: 'rgba(232,192,113,.16)',
  },
}

/** The ladder, lowest rank first. */
export const tierOrder = ['bronze', 'silver', 'gold']

/**
 * Resolves a certificate's metal from its 1-based level index.
 *
 * `levelIndex` is issued by the server alongside the certificate, so the metal
 * on screen tracks the level the backend actually awarded rather than anything
 * parsed out of display text. Levels beyond the known metals stay on the
 * highest one instead of falling off the end.
 */
export const tierForLevel = (levelIndex) =>
  tiers[tierOrder[Math.min(Math.max(Number(levelIndex) || 1, 1), tierOrder.length) - 1]]

/**
 * Tone lookup for status pills and accents. Keeps every "passed / pending /
 * failed" affordance across the app drawing from the same four colours.
 */
export const tone = {
  copper: { fg: tokens.copperLt, bg: 'rgba(192,138,46,.12)', border: 'rgba(192,138,46,.36)' },
  green: { fg: tokens.greenGlow, bg: 'rgba(63,211,160,.12)', border: 'rgba(63,211,160,.34)' },
  danger: { fg: '#FCA5A5', bg: 'rgba(190,40,40,.16)', border: 'rgba(248,113,113,.34)' },
  info: { fg: '#9ED3E8', bg: 'rgba(104,183,216,.12)', border: 'rgba(104,183,216,.32)' },
  neutral: { fg: tokens.body, bg: 'rgba(150,195,172,.08)', border: tokens.line2 },
}

export default tokens
