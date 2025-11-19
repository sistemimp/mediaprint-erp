import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CFormLabel } from '@coreui/react'
import { CMultiSelect } from '@coreui/react-pro'
import { useAuth } from '../context/AuthContext'
import { fetchPreventivoOggettiOptions, createPreventivoOggettoOption } from '../services/preventivi'

const normalizeOggettoOption = (option) => {
  if (!option) return null
  const rawId =
    option.id ??
    option.id_oggetto ??
    option.value ??
    option.valueId ??
    option.key ??
    null
  const numericId = Number(rawId)
  const hasNumericId = Number.isFinite(numericId) && numericId > 0
  const value = hasNumericId ? String(numericId) : rawId != null ? String(rawId) : null
  const label = String(option.label ?? option.nome ?? option.text ?? '').trim()
  if (!value || label === '') {
    return null
  }
  const attivo = Number(option.attivo ?? option.active ?? option.is_active ?? 1) === 1 ? 1 : 0
  const orderingRaw = option.ordering ?? option.ordine ?? option.sort ?? option.position ?? null
  const ordering = Number.isFinite(Number(orderingRaw)) ? Number(orderingRaw) : null
  return {
    id: hasNumericId ? numericId : null,
    id_oggetto: hasNumericId ? numericId : null,
    value,
    label,
    attivo,
    ordering,
  }
}

const mergeOggettoOptionLists = (base = [], extra = []) => {
  const out = []
  const indexByValue = new Map()
  const push = (list) => {
    for (const opt of list) {
      const normalized = normalizeOggettoOption(opt)
      if (!normalized) continue
      const key = normalized.value
      if (indexByValue.has(key)) {
        const idx = indexByValue.get(key)
        out[idx] = {
          ...out[idx],
          ...normalized,
          value: key,
        }
      } else {
        out.push({ ...normalized, value: key })
        indexByValue.set(key, out.length - 1)
      }
    }
  }
  push(Array.isArray(base) ? base : [])
  push(Array.isArray(extra) ? extra : [])
  return out
}

const DEFAULT_OGGETTO_OPTIONS = mergeOggettoOptionLists([
  { id: 1, value: '1', label: 'Stampa', attivo: 1 },
  { id: 2, value: '2', label: 'Imbustamento', attivo: 1 },
  { id: 3, value: '3', label: 'Cellophanatura', attivo: 1 },
  { id: 4, value: '4', label: 'Posta Digitale', attivo: 1 },
])

const OggettoPreventivo = ({
  value = [],
  onChange,
  onLabelsChange,
  disabled = false,
  allowCreate = true,
  extraOptions = [],
  label = 'Oggetto preventivo',
  showPreview = false,
  previewLabel = 'Oggetto',
  previewSeparator = ' - ',
  className,
  multiSelectProps = {},
  onOptionsChange,
  newOptionActive = true,
}) => {
  const { token } = useAuth()
  const [baseOptions, setBaseOptions] = useState(DEFAULT_OGGETTO_OPTIONS)
  const [loading, setLoading] = useState(false)
  const [pendingCreate, setPendingCreate] = useState(false)

  const normalizedExtra = useMemo(() => {
    return mergeOggettoOptionLists([], Array.isArray(extraOptions) ? extraOptions : [])
  }, [extraOptions])

  useEffect(() => {
    if (!token) {
      setBaseOptions(DEFAULT_OGGETTO_OPTIONS)
      return
    }
    const controller = new AbortController()
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchPreventivoOggettiOptions({ token, signal: controller.signal })
        const list = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : []
        const normalized = mergeOggettoOptionLists(list)
        if (!cancelled) {
          setBaseOptions(normalized.length > 0 ? normalized : DEFAULT_OGGETTO_OPTIONS)
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }
        console.error('Impossibile caricare le opzioni oggetto preventivo', error)
        if (!cancelled) {
          setBaseOptions(DEFAULT_OGGETTO_OPTIONS)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [token])

  const combinedOptions = useMemo(() => {
    return mergeOggettoOptionLists(baseOptions, normalizedExtra)
  }, [baseOptions, normalizedExtra])

  const labelMap = useMemo(() => {
    const map = new Map()
    for (const opt of combinedOptions) {
      const key = String(opt.value)
      if (!map.has(key)) {
        map.set(key, String(opt.label ?? '').trim())
      }
    }
    return map
  }, [combinedOptions])

  const valueAsStrings = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(value) ? value : [])
          .map((v) => (v != null ? String(v) : null))
          .filter((v) => v != null && v !== ''),
      ),
    )
  }, [value])

  const combinedOptionsWithSelection = useMemo(() => {
    if (valueAsStrings.length === 0) {
      return combinedOptions
    }
    const known = new Set(combinedOptions.map((opt) => String(opt.value)))
    const missing = valueAsStrings
      .filter((val) => !known.has(val))
      .map((val) => ({
        value: val,
        label: val,
        id: null,
        id_oggetto: null,
        attivo: 1,
      }))
    return missing.length > 0 ? combinedOptions.concat(missing) : combinedOptions
  }, [combinedOptions, valueAsStrings])

  const computedLabels = useMemo(() => {
    return valueAsStrings.map((id) => labelMap.get(id) || id).filter((labelText) => labelText !== '')
  }, [valueAsStrings, labelMap])

  useEffect(() => {
    if (typeof onLabelsChange === 'function') {
      onLabelsChange(computedLabels)
    }
  }, [computedLabels, onLabelsChange])

  const handleSelectionChange = useCallback(
    (vals) => {
      const rawValues = Array.isArray(vals)
        ? vals
            .map((item) => {
              if (item && typeof item === 'object') {
                return item.value != null ? String(item.value) : ''
              }
              return String(item ?? '')
            })
            .filter((entry) => entry !== '')
        : []
      const uniqueValues = Array.from(new Set(rawValues))
      if (typeof onChange === 'function') {
        onChange(uniqueValues)
      }
      if (typeof onLabelsChange === 'function') {
        const labels = uniqueValues.map((id) => labelMap.get(id) || id).filter((text) => text !== '')
        onLabelsChange(labels)
      }
    },
    [labelMap, onChange, onLabelsChange],
  )

  const handleCreateOption = useCallback(
    async (rawLabel) => {
      if (!allowCreate) {
        return null
      }
      const cleanLabel = String(rawLabel ?? '').trim()
      if (cleanLabel === '') {
        return null
      }

      const existing = combinedOptionsWithSelection.find(
        (opt) => String(opt.label ?? '').toLowerCase() === cleanLabel.toLowerCase(),
      )
      if (existing) {
        const nextValues = Array.from(new Set([...valueAsStrings, String(existing.value)]))
        if (typeof onChange === 'function') {
          onChange(nextValues)
        }
        if (typeof onLabelsChange === 'function') {
          const labels = nextValues.map((id) => {
            if (id === String(existing.value)) {
              return existing.label ?? cleanLabel
            }
            return labelMap.get(id) || id
          })
          onLabelsChange(labels.filter((text) => text !== ''))
        }
        return {
          value: String(existing.value),
          label: existing.label ?? cleanLabel,
        }
      }

      if (!token) {
        return null
      }

      setPendingCreate(true)
      try {
        const created = await createPreventivoOggettoOption({
          token,
          label: cleanLabel,
          active: newOptionActive,
        })
        const normalized = normalizeOggettoOption(created)
        if (!normalized) {
          return null
        }
        setBaseOptions((prev) => mergeOggettoOptionLists(prev, [normalized]))
        const nextValues = Array.from(new Set([...valueAsStrings, normalized.value]))
        if (typeof onChange === 'function') {
          onChange(nextValues)
        }
        if (typeof onLabelsChange === 'function') {
          const labels = nextValues.map((id) => {
            if (id === normalized.value) {
              return normalized.label
            }
            return labelMap.get(id) || id
          })
          onLabelsChange(labels.filter((text) => text !== ''))
        }
        return {
          value: normalized.value,
          label: normalized.label,
        }
      } catch (error) {
        console.error('Creazione opzione oggetto fallita', error)
        return null
      } finally {
        setPendingCreate(false)
      }
    },
    [
      allowCreate,
      combinedOptionsWithSelection,
      labelMap,
      onChange,
      onLabelsChange,
      newOptionActive,
      token,
      valueAsStrings,
    ],
  )

  const previewText = useMemo(() => {
    return computedLabels.join(previewSeparator)
  }, [computedLabels, previewSeparator])

  useEffect(() => {
    if (typeof onOptionsChange === 'function') {
      onOptionsChange(combinedOptionsWithSelection)
    }
  }, [combinedOptionsWithSelection, onOptionsChange])

  return (
    <div className={className}>
      {label ? <CFormLabel>{label}</CFormLabel> : null}
      <CMultiSelect
        {...multiSelectProps}
        options={combinedOptionsWithSelection}
        selectionType="tags"
        placeholder={multiSelectProps.placeholder ?? 'Seleziona o crea opzioni'}
        value={valueAsStrings}
        allowCreateOptions={allowCreate}
        disabled={disabled || pendingCreate}
        loading={loading || pendingCreate}
        onChange={handleSelectionChange}
        onCreateOption={handleCreateOption}
      />
      {showPreview ? (
        <div className="mt-2">
          <CFormLabel className="fw-normal text-body-secondary">
            {previewLabel}: {previewText || '--'}
          </CFormLabel>
        </div>
      ) : null}
    </div>
  )
}

OggettoPreventivo.propTypes = {
  value: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  onChange: PropTypes.func,
  onLabelsChange: PropTypes.func,
  disabled: PropTypes.bool,
  allowCreate: PropTypes.bool,
  extraOptions: PropTypes.arrayOf(PropTypes.shape({})),
  label: PropTypes.string,
  showPreview: PropTypes.bool,
  previewLabel: PropTypes.string,
  previewSeparator: PropTypes.string,
  className: PropTypes.string,
  multiSelectProps: PropTypes.shape({}),
  onOptionsChange: PropTypes.func,
  newOptionActive: PropTypes.bool,
}

export default OggettoPreventivo
