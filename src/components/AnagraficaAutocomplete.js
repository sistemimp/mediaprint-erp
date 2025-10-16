/* eslint-disable prettier/prettier */
import React, { useMemo, useRef } from 'react'
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
  const lastQueryRef = useRef('')
  const options = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    return list
      .map((c) => {
        const rawId = c?.id_anagrafica ?? c?.id
        if (rawId == null || rawId === '') return null
        const numericId = Number(rawId)
        if (!Number.isFinite(numericId)) return null
        return {
          value: numericId,
          label: String(c?.ragione_sociale || ''),
          piva: c?.piva ? String(c.piva) : null,
          cf: c?.codice_fiscale ? String(c.codice_fiscale) : null,
          raw: c,
        }
      })
      .filter(Boolean)
  }, [items])

  const selectedValue = useMemo(() => {
    if (value == null || value === '') return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }, [value])

  // Etichetta dell'opzione correntemente selezionata (se presente)
  const selectedLabel = useMemo(() => {
    if (selectedValue == null) return ''
    const match = options.find((o) => Number(o.value) === Number(selectedValue))
    return match ? String(match.label || '') : ''
  }, [options, selectedValue])

  return (
    <CAutocomplete
      placeholder={placeholder}
      options={options}
      value={selectedValue}
      search="external"
      loading={loading}
      allowOnlyDefinedOptions
      highlightOptionsOnSearch
      indicator
      onInput={(q) => {
        const s = String(q || '')
        // Ignora gli aggiornamenti di input che riflettono l'opzione selezionata
        if (s === selectedLabel) return
        // Se c'è già una selezione e arriva input vuoto, ignora (sincronizzazioni interne)
        if (selectedValue != null && s.trim() === '') return
        if (lastQueryRef.current === s) return
        lastQueryRef.current = s
        if (onSearch) onSearch(s)
      }}
      onChange={(opt) => {
        // Non azzerare l'ID su digitazione (CAutocomplete passa stringhe durante la ricerca)
        if (typeof opt === 'string') {
          return
        }
        // Clear esplicito
        if (!opt) {
          if (onChange) onChange('')
          if (onChangeCliente) onChangeCliente(null)
          return
        }
        const id = opt?.value
        const idStr = id != null ? String(id) : ''
        // Evita set identici (riduce render e loop)
        if (String(value ?? '') === idStr) {
          // Se la selezione non cambia, non propagare nulla per evitare loop
          return
        }
        if (onChange) onChange(idStr)
        if (onChangeCliente) onChangeCliente(opt?.raw ?? null)
      }}
      disabled={disabled}
      searchNoResultsLabel="Nessun cliente trovato"
      optionsTemplate={(opt) => {
        if (!opt || typeof opt === 'string') return opt || ''
        const top = (opt && opt.label) || ''
        const details = [
          opt?.piva ? `P.IVA ${opt.piva}` : null,
          opt?.cf ? `CF ${opt.cf}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
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
