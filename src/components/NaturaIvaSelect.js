/* eslint-disable prettier/prettier */
import React from 'react'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react'
import './NaturaIvaSelect.css'

const NaturaIvaSelect = ({ value, options, onChange, disabled, size = 'sm', className }) => {
  const list = Array.isArray(options) ? options : []
  const selected = list.find((n) => Number(n.id_natura) === Number(value))
  const buttonLabel = selected ? String(selected.code || '') : '--'
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef(null)
  const measureRef = React.useRef(null)
  const [menuMinWidth, setMenuMinWidth] = React.useState(undefined)

  React.useLayoutEffect(() => {
    try {
      const texts = ['--', ...list.map((n) => `${n.code} - ${n.label}`)]
      const longest = texts.reduce((a, b) => (String(a).length >= String(b).length ? a : b), '--')
      if (measureRef.current) {
        measureRef.current.textContent = longest
        const w = measureRef.current.offsetWidth + 24 /* padding safety */
        const clamped = Math.max(180, Math.min(w, 640))
        setMenuMinWidth(clamped)
      }
    } catch (_e) {}
  }, [list])

  return (
    <div ref={containerRef} className={`ni-dropdown ${className || ''}`}>
      <span ref={measureRef} className="ni-measure dropdown-item" />
      {open && !disabled && (
        <div className="natura-iva-backdrop" onClick={() => setOpen(false)} />
      )}
      <CDropdown
        alignment="end"
        visible={open}
        onShow={() => setOpen(true)}
        onHide={() => setOpen(false)}
        className="w-100"
        disabled={disabled}
      >
        <CDropdownToggle
          color="secondary"
          size={size}
          className="w-100 d-flex justify-content-between align-items-center btn-outline-secondary"
          aria-label="Seleziona Natura IVA"
        >
          <span className="ni-selected-code">{buttonLabel}</span>
        </CDropdownToggle>
        <CDropdownMenu className="ni-menu bg-body text-body shadow-sm" style={{ minWidth: menuMinWidth }}>
          <CDropdownItem
            active={value == null || value === ''}
            onClick={() => { if (onChange) onChange(null); setOpen(false) }}
          >
            --
          </CDropdownItem>
          {list.map((n) => (
          <CDropdownItem
            key={n.id_natura}
            active={Number(n.id_natura) === Number(value)}
            onClick={() => { if (onChange) onChange(Number(n.id_natura)); setOpen(false) }}
          >
            {n.code} - {n.label}
          </CDropdownItem>
        ))}
        </CDropdownMenu>
      </CDropdown>
    </div>
  )
}

export default NaturaIvaSelect
