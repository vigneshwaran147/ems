// ems_frontend/src/components/brand/PcbBackdrop.jsx
import { Box } from '@mui/material'
import PropTypes from 'prop-types'
import { gradients } from '../../styles/tokens'

/**
 * The printed-circuit substrate that sits behind every screen: copper traces
 * with signal pulses running along them, plated vias, a wafer grid and a slow
 * scan sweep.
 *
 * `intensity` trades presence for legibility — "full" on the marketing/auth
 * screens where the board is the hero, "subtle" behind dense application
 * content where it should only be felt, never read.
 */
const PcbBackdrop = ({ intensity = 'full', position = 'fixed' }) => {
  const subtle = intensity === 'subtle'

  return (
    <Box
      aria-hidden="true"
      sx={{
        position,
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: gradients.board,
        opacity: subtle ? 0.85 : 1,
        '@keyframes pcbFlow': { from: { strokeDashoffset: 486 }, to: { strokeDashoffset: 0 } },
        '@keyframes pcbDrift': { to: { backgroundPosition: '44px 44px, 44px 44px' } },
        '@keyframes pcbVia': { '0%,100%': { opacity: 0.25 }, '50%': { opacity: 1 } },
        '@keyframes pcbSweep': {
          '0%': { transform: 'translateY(-200px)' },
          '100%': { transform: 'translateY(105vh)' },
        },
        '& svg': { position: 'absolute', inset: 0, width: '100%', height: '100%' },
        '& .trace': {
          fill: 'none',
          stroke: `rgba(192,138,46,${subtle ? 0.12 : 0.22})`,
          strokeWidth: 1.2,
        },
        '& .pulse': {
          fill: 'none',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeDasharray: '26 460',
          opacity: subtle ? 0.5 : 1,
          filter: 'drop-shadow(0 0 6px currentColor)',
          animation: 'pcbFlow 5.4s linear infinite',
        },
        '& .via': { fill: '#061A13', stroke: 'rgba(192,138,46,.55)', strokeWidth: 1.4 },
        '& .via-hot': { fill: '#E8C071', animation: 'pcbVia 3.2s ease-in-out infinite' },
      }}
    >
      {/* wafer grid */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: subtle ? 0.22 : 0.42,
          backgroundImage:
            'linear-gradient(rgba(95,174,146,.16) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(95,174,146,.16) 1px,transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 28% 30%,#000,transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 28% 30%,#000,transparent 75%)',
          animation: 'pcbDrift 26s linear infinite',
        }}
      />

      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="trace">
          <path id="pcb-t1" d="M-40 190 H250 l52 52 H620 l46-46 H1000 l60 60 H1480" />
          <path id="pcb-t2" d="M-40 330 H180 l60 60 H540 l50-50 H980 l70 70 H1480" />
          <path id="pcb-t3" d="M-40 560 H300 l56-56 H700 l60 60 H1120 l50 50 H1480" />
          <path id="pcb-t4" d="M-40 720 H220 l70 70 H660 l54-54 H1080 l64 64 H1480" />
          <path d="M420 -40 V150 l50 50 V430" />
          <path d="M1180 -40 V210 l-60 60 V520" />
          <path d="M300 940 V760 l60-60 V470" />
          <path d="M980 940 V820 l70-70 V560" />
        </g>
        <g>
          <use href="#pcb-t1" className="pulse" style={{ color: '#E8C071', stroke: '#E8C071' }} />
          <use
            href="#pcb-t2"
            className="pulse"
            style={{ color: '#5FAE92', stroke: '#5FAE92', animationDelay: '1.4s' }}
          />
          <use
            href="#pcb-t3"
            className="pulse"
            style={{ color: '#C08A2E', stroke: '#C08A2E', animationDelay: '2.6s' }}
          />
          <use
            href="#pcb-t4"
            className="pulse"
            style={{ color: '#3FD3A0', stroke: '#3FD3A0', animationDelay: '3.8s' }}
          />
        </g>
        <g className="via">
          <circle cx="250" cy="190" r="4" />
          <circle cx="620" cy="242" r="4" />
          <circle cx="1000" cy="196" r="4" />
          <circle cx="540" cy="390" r="4" />
          <circle cx="980" cy="340" r="4" />
          <circle cx="300" cy="560" r="4" />
          <circle cx="1120" cy="564" r="4" />
          <circle cx="660" cy="790" r="4" />
        </g>
        <g>
          <circle className="via-hot" cx="620" cy="242" r="3" />
          <circle className="via-hot" cx="980" cy="340" r="3" style={{ animationDelay: '1.1s' }} />
          <circle className="via-hot" cx="300" cy="560" r="3" style={{ animationDelay: '2.2s' }} />
        </g>
      </svg>

      {!subtle && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 180,
            background:
              'linear-gradient(180deg,transparent,rgba(232,192,113,.055) 45%,transparent)',
            animation: 'pcbSweep 9s ease-in-out infinite',
            '@media (prefers-reduced-motion: reduce)': { display: 'none' },
          }}
        />
      )}
    </Box>
  )
}

PcbBackdrop.propTypes = {
  intensity: PropTypes.oneOf(['full', 'subtle']),
  position: PropTypes.oneOf(['fixed', 'absolute']),
}

export default PcbBackdrop
