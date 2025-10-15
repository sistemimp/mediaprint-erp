/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react'
import { CAutocomplete } from '@coreui/react-pro'

/**
 * AnagraficaAutocomplete
 * - Visualizza solo la ragione sociale nel campo
 * - Nel menu opzioni mostra anche (in piccolo) CF e P.IVA
 * - Ricerca gestita a monte (ragione sociale / P.IVA / CF / codice cliente)
 *
 * Props:
 * - items: array di anagrafiche (raw dal backend)
 * - value: id_anagrafica selezionato (string|number)
 * - onChange: (id: string) => void
 * - onChangeCliente?: (cliente: any|null) => void
 * - onSearch: (query: string) => void
 * - loading?: boolean
 * - disabled?: boolean
 * - placeholder?: string
 */
const AnagraficaAutocomplete = ({
  items,
  value,
  onChange,
  onChangeCliente,
  onSearch,
  loading = false,
  disabled = false,
  placeholder = 'Seleziona o cerca cliente',
}) => {
  const options = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    return list.map((c) => ({
      value: c?.id_anagrafica ?? c?.id,
      label: String(c?.ragione_sociale || ''),
      piva: c?.piva ? String(c.piva) : null,
      cf: c?.codice_fiscale ? String(c.codice_fiscale) : null,
      raw: c,
    }))
  }, [items])

  const selected = useMemo(() => {
    const val = String(value ?? '')
    if (!val) return null
    return options.find((o) => String(o.value) === val) || null
  }, [options, value])

  return (
    <CAutocomplete
      placeholder={placeholder}
      options={options}
      value={selected}
      loading={loading}
      allowOnlyDefinedOptions
      highlightOptionsOnSearch
      indicator
      getOptionLabel={(o) => (o && o.label) || ''}
      onInputChange={(q) => {
        if (onSearch) onSearch(String(q || ''))
      }}
      onChange={(opt) => {
        const id = opt?.value ? String(opt.value) : ''
        if (onChange) onChange(id)
        if (onChangeCliente) onChangeCliente(opt?.raw ?? null)
      }}
      disabled={disabled}
      searchNoResultsLabel="Nessun cliente trovato"
      optionsTemplate={(opt) => {
        const top = (opt && opt.label) || ''
        const details = [
          opt?.piva ? `P.IVA ${opt.piva}` : null,
          opt?.cf ? `CF ${opt.cf}` : null,
        ].filter(Boolean).join(' • ')
        return (
          <div className="d-flex flex-column">
            <div className="fw-semibold text-body">{top}</div>
            {details && (
              <div className="small text-body-secondary">{details}</div>
            )}
          </div>
        )
      }}
    />
  )
}

export default AnagraficaAutocomplete
