// ems_frontend/src/components/common/PcbSelect.jsx
import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'
import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { tokens, menuOption, popoverSurface } from '../../styles/tokens'

/**
 * The application's dropdown.
 *
 * A native `<select>` hands its option list to the browser, which paints it
 * from the OS palette — a light popup on a dark board, with none of the copper
 * language around it. This renders the list itself so the open state belongs to
 * the design system just like the closed control does.
 *
 * Drop-in for `<TextField select SelectProps={{ native: true }}>`: pass
 * `options` instead of `<option>` children. `onChange` receives the value
 * directly (the raw event is still available as the second argument).
 */
const PcbSelect = forwardRef(function PcbSelect(
  {
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Select',
    size = 'medium',
    fullWidth = false,
    disabled = false,
    error = false,
    helperText,
    name,
    id,
    menuMaxHeight = 288,
    sx,
    ...rest
  },
  ref
) {
  const generatedId = useId()
  const labelId = `${id || name || generatedId}-label`

  // Accepts both `['L1', 'L2']` and `[{ value, label }]` so call sites can pass
  // whichever shape they already have.
  const items = options.map((option) =>
    option !== null && typeof option === 'object'
      ? option
      : { value: option, label: String(option) }
  )

  const isEmpty = value === '' || value === null || value === undefined

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      error={Boolean(error)}
      sx={{
        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 1 },
        '& .MuiSelect-icon': { color: tokens.copperLt, transition: 'transform .18s' },
        ...sx,
      }}
    >
      {label && (
        <InputLabel id={labelId} shrink>
          {label}
        </InputLabel>
      )}

      <Select
        labelId={label ? labelId : undefined}
        id={id}
        name={name}
        label={label}
        notched={label ? true : undefined}
        displayEmpty
        value={isEmpty ? '' : value}
        onChange={(event) => onChange?.(event.target.value, event)}
        inputRef={ref}
        IconComponent={KeyboardArrowDownRoundedIcon}
        renderValue={(selected) => {
          if (selected === '' || selected === null || selected === undefined) {
            return <Box component="span" sx={{ color: '#4F6E60', fontWeight: 500 }}>{placeholder}</Box>
          }
          const match = items.find((item) => String(item.value) === String(selected))
          return match ? match.label : selected
        }}
        MenuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          PaperProps: {
            sx: {
              ...popoverSurface,
              mt: 0.75,
              maxHeight: menuMaxHeight,
              '& .MuiList-root': { py: 0.75 },
            },
          },
        }}
        {...rest}
      >
        {items.map((item) => {
          const selected = String(item.value) === String(value ?? '')
          return (
            <MenuItem key={String(item.value)} value={item.value} sx={menuOption}>
              <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{item.label}</Box>
              <CheckRoundedIcon
                sx={{ fontSize: 15, ml: 1, color: tokens.copperLt, opacity: selected ? 1 : 0 }}
              />
            </MenuItem>
          )
        })}
      </Select>

      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  )
})

PcbSelect.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        label: PropTypes.node,
      }),
    ])
  ),
  placeholder: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.node,
  name: PropTypes.string,
  id: PropTypes.string,
  menuMaxHeight: PropTypes.number,
  sx: PropTypes.object,
}

export default PcbSelect
