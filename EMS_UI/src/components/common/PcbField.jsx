// ems_frontend/src/components/common/PcbField.jsx
import { forwardRef, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Menu, MenuItem } from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { tokens, fonts, menuOption, popoverSurface } from '../../styles/tokens'

/**
 * The signature input of the design language: an uppercase micro-label with a
 * solder-pad LED that lights when the field is engaged, a lead icon on the
 * left, and a copper "signal wire" that runs along the bottom edge on focus.
 *
 * Uncontrolled by design so it drops straight into react-hook-form:
 * `<PcbField label="Email" {...register('email')} />`.
 */
const PcbField = forwardRef(function PcbField(
  {
    label,
    icon,
    error,
    endAdornment,
    dense = false,
    options,
    multiline = false,
    rows = 2,
    onFocus,
    onBlur,
    onChange,
    sx,
    ...inputProps
  },
  ref
) {
  const [focused, setFocused] = useState(false)
  const [filled, setFilled] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)

  const height = dense ? 46 : 53
  const lit = focused || filled

  // A <select> has no placeholder gap, and a textarea grows — both need the
  // fixed-height rule relaxed.
  const asSelect = Array.isArray(options)
  const element = multiline ? 'textarea' : 'input'

  // Dropdown state. The native <select> stays mounted but invisible: it is what
  // react-hook-form registered, so the value has to live there. Only its
  // browser-painted option list — the one thing we cannot style — is replaced.
  const nativeRef = useRef(null)
  const [selectValue, setSelectValue] = useState(
    () => inputProps.defaultValue ?? inputProps.value ?? options?.[0]?.value ?? ''
  )
  const selectedOption = asSelect
    ? options.find((option) => String(option.value) === String(selectValue))
    : null

  const setNativeRef = (node) => {
    nativeRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const commitSelection = (nextValue) => {
    setSelectValue(nextValue)
    setMenuAnchor(null)
    const node = nativeRef.current
    if (!node) return
    // React — and through it react-hook-form — only learns about the change
    // from a real event fired on the element it registered.
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    if (setter) setter.call(node, nextValue)
    else node.value = nextValue
    node.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const controlSx = {
    width: '100%',
    height: multiline ? 'auto' : height,
    minHeight: multiline ? height : undefined,
    padding: multiline ? '15px' : `0 ${endAdornment ? 50 : 15}px 0 ${icon ? 45 : 15}px`,
    font: `500 ${dense ? 14 : 15}px/${multiline ? 1.5 : 1} ${fonts.sans}`,
    color: tokens.ink,
    background: 'rgba(3,16,11,.8)',
    border: `1.5px solid ${error ? 'rgba(248,113,113,.7)' : tokens.line2}`,
    borderRadius: `${tokens.radius}px`,
    outline: 'none',
    resize: multiline ? 'vertical' : undefined,
    transition: 'border-color .18s, box-shadow .18s, background .18s',
    '&::placeholder': { color: '#4F6E60', fontWeight: 400 },
    '&:hover': { borderColor: error ? 'rgba(248,113,113,.7)' : 'rgba(150,195,172,.5)' },
    '&:focus': {
      background: 'rgba(5,24,17,.95)',
      borderColor: error ? tokens.danger : tokens.copper,
      boxShadow: error
        ? '0 0 0 4px rgba(220,38,38,.16)'
        : '0 0 0 4px rgba(192,138,46,.16), 0 0 22px -6px rgba(232,192,113,.5)',
    },
  }

  const triggerSx = {
    ...controlSx,
    appearance: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    textAlign: 'left',
    cursor: 'pointer',
    color: selectedOption && selectValue !== '' ? tokens.ink : '#4F6E60',
    ...(menuAnchor
      ? {
          background: 'rgba(5,24,17,.95)',
          borderColor: error ? tokens.danger : tokens.copper,
          boxShadow: error
            ? '0 0 0 4px rgba(220,38,38,.16)'
            : '0 0 0 4px rgba(192,138,46,.16), 0 0 22px -6px rgba(232,192,113,.5)',
        }
      : null),
  }

  return (
    <Box sx={{ mb: dense ? 1.5 : 2.25, ...sx }}>
      {label && (
        <Box
          component="label"
          htmlFor={inputProps.id || inputProps.name}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: lit ? '#C9DBD1' : tokens.muted,
            mb: 1,
            '&::before': {
              content: '""',
              width: 5,
              height: 5,
              borderRadius: '1px',
              background: lit ? tokens.copperLt : tokens.muted,
              boxShadow: lit ? `0 0 8px ${tokens.copper}` : 'none',
              transition: 'background .18s, box-shadow .18s',
            },
          }}
        >
          {label}
        </Box>
      )}

      <Box sx={{ position: 'relative', display: 'flex', alignItems: multiline ? 'flex-start' : 'center' }}>
        {icon && (
          <Box
            sx={{
              position: 'absolute',
              left: 15,
              top: multiline ? 16 : 'auto',
              lineHeight: 0,
              pointerEvents: 'none',
              color: focused ? tokens.copperLt : tokens.muted,
              transition: 'color .18s',
              '& svg': { fontSize: 19 },
            }}
          >
            {icon}
          </Box>
        )}

        {asSelect ? (
          <>
            {/*
              * The registered control. Kept in the DOM but out of sight — the
              * same trick MUI's own Select uses — so the form still reads its
              * value from a real <select> while the list below is ours.
              */}
            <Box
              component="select"
              {...inputProps}
              id={undefined}
              ref={setNativeRef}
              tabIndex={-1}
              aria-hidden="true"
              onFocus={(e) => {
                setFocused(true)
                onFocus?.(e)
              }}
              onBlur={(e) => {
                setFocused(false)
                setFilled(Boolean(e.target.value))
                onBlur?.(e)
              }}
              onChange={(e) => {
                setSelectValue(e.target.value)
                setFilled(Boolean(e.target.value))
                onChange?.(e)
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                border: 0,
                pointerEvents: 'none',
              }}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Box>

            <Box
              component="button"
              type="button"
              id={inputProps.id || inputProps.name}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={Boolean(menuAnchor)}
              disabled={inputProps.disabled}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                if (!menuAnchor) setFocused(false)
              }}
              sx={triggerSx}
            >
              <Box
                component="span"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {selectedOption?.label ?? ''}
              </Box>
              <KeyboardArrowDownRoundedIcon
                sx={{
                  fontSize: 19,
                  flexShrink: 0,
                  color: menuAnchor ? tokens.copperLt : tokens.muted,
                  transform: menuAnchor ? 'rotate(180deg)' : 'none',
                  transition: 'transform .18s, color .18s',
                }}
              />
            </Box>

            <Menu
              open={Boolean(menuAnchor)}
              anchorEl={menuAnchor}
              onClose={() => {
                setMenuAnchor(null)
                setFocused(false)
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  ...popoverSurface,
                  mt: 0.75,
                  width: menuAnchor?.offsetWidth,
                  maxHeight: 260,
                  '& .MuiList-root': { py: 0.75 },
                },
              }}
            >
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(selectValue)
                return (
                  <MenuItem
                    key={opt.value}
                    selected={isSelected}
                    onClick={() => commitSelection(opt.value)}
                    sx={menuOption}
                  >
                    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{opt.label}</Box>
                    <CheckRoundedIcon
                      sx={{ fontSize: 15, ml: 1, color: tokens.copperLt, opacity: isSelected ? 1 : 0 }}
                    />
                  </MenuItem>
                )
              })}
            </Menu>
          </>
        ) : (
          <Box
            component={element}
            id={inputProps.id || inputProps.name}
            ref={ref}
            rows={multiline ? rows : undefined}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              setFilled(Boolean(e.target.value))
              onBlur?.(e)
            }}
            onChange={(e) => {
              setFilled(Boolean(e.target.value))
              onChange?.(e)
            }}
            sx={controlSx}
            {...inputProps}
          />
        )}

        {endAdornment && (
          <Box sx={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center' }}>
            {endAdornment}
          </Box>
        )}

        {/* the running signal wire */}
        {focused && (
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: -1,
              height: 1.5,
              overflow: 'hidden',
              borderRadius: '2px',
              '@keyframes pcbWire': { to: { left: '100%' } },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-40%',
                width: '40%',
                height: '100%',
                background: `linear-gradient(90deg,transparent,${tokens.copperLt},transparent)`,
                animation: 'pcbWire 1.15s linear infinite',
              },
            }}
          />
        )}
      </Box>

      {error && (
        <Box sx={{ mt: '7px', fontSize: 12, fontWeight: 500, color: '#FCA5A5' }}>{error}</Box>
      )}
    </Box>
  )
})

PcbField.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.node,
  error: PropTypes.string,
  endAdornment: PropTypes.node,
  dense: PropTypes.bool,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ),
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  sx: PropTypes.object,
}

export default PcbField
