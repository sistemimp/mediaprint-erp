import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormCheck,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash, cilReload, cilSave, cibAdobeAcrobatReader } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { useBreadcrumbActions } from '../../context/BreadcrumbActionsContext'
import PermissionButton from '../../components/PermissionButton'
import {
  fetchDdtDetail,
  fetchDdtCausali,
  fetchDdtDestinazioni,
  updateDdtDetail,
} from '../../services/ddt'

// Formatta una data nel formato locale italiano.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

// Formatta numeri con gestione fallback.
const formatNumber = (value, options = {}) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value === null || value === undefined || value === '' ? '-' : String(value)
  }
  if (options.decimals !== undefined) {
    return numeric.toFixed(options.decimals)
  }
  return numeric.toString()
}

// Costruisce URL Jasper per la stampa PDF del DDT.
const buildDdtPdfUrl = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  return `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/DDT.pdf?id_ddt=${numericId}&j_username=gestionaleMp&j_password=gestionaleMp`
}

// Normalizza una data in formato YYYY-MM-DD per input type="date".
const toDateInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) {
      return match[1]
    }
  }
  return ''
}

// Normalizza valori select testuali (trim + lowercase).
const normalizeOptionValue = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

const ASPETTO_OPTIONS = [
  { value: '', label: 'Seleziona aspetto' },
  { value: 'plichi', label: 'Plichi' },
  { value: 'pacchi', label: 'Pacchi' },
  { value: 'bancali', label: 'Bancali' },
]

const CURA_TRASPORTO_OPTIONS = [
  { value: '', label: 'Seleziona cura del trasporto' },
  { value: 'mittente', label: 'Mittente' },
  { value: 'destinatario', label: 'Destinatario' },
  { value: 'vettore', label: 'Vettore' },
]

// Dettaglio DDT con editing testata, righe, destinazione e cambio stato.
const DdtDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = Number(query.get('id') || 0)
  const { token, logout } = useAuth()
  const { setBreadcrumbActions, clearBreadcrumbActions } = useBreadcrumbActions()

  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formValues, setFormValues] = useState({
    data_ddt: '',
    id_causale: '',
    note: '',
    destinazione_merce: '',
    aspetto: '',
    numero_colli: '',
    cura_trasporto: '',
    data_trasporto: '',
    vettore: '',
  })
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [causali, setCausali] = useState([])
  const [causaliLoading, setCausaliLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [sediOptions, setSediOptions] = useState([])
  const [destinazioneMode, setDestinazioneMode] = useState('sede')
  const [selectedSedeId, setSelectedSedeId] = useState('')
  const [selectedDestinazioneId, setSelectedDestinazioneId] = useState('')
  const [destinazioniPredefinite, setDestinazioniPredefinite] = useState([])
  const [destinazioniLoading, setDestinazioniLoading] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const formRef = useRef(null)
  const rowIdCounterRef = useRef(0)
  // Factory riga editabile locale con id temporaneo stabile.
  const createEditableRow = useCallback((initial = {}) => {
    rowIdCounterRef.current += 1
    return {
      localId: `row-${rowIdCounterRef.current}`,
      descrizione: initial.descrizione ?? '',
      quantita:
        initial.quantita !== undefined && initial.quantita !== null && initial.quantita !== ''
          ? String(initial.quantita)
          : '',
      peso_unitario_kg:
        initial.peso_unitario_kg !== undefined &&
          initial.peso_unitario_kg !== null &&
          initial.peso_unitario_kg !== ''
          ? String(initial.peso_unitario_kg)
          : '',
      unita_misura: initial.unita_misura ?? '',
    }
  }, [])

  // Converte le righe backend in righe editabili per il form.
  const hydrateRowsFromRecord = useCallback(
    (currentRecord) => {
      rowIdCounterRef.current = 0
      const source = Array.isArray(currentRecord?.righe) ? currentRecord.righe : []
      if (source.length === 0) {
        return [createEditableRow()]
      }
      return source.map((row) =>
        createEditableRow({
          descrizione: row?.descrizione ?? '',
          quantita: row?.quantita ?? '',
          peso_unitario_kg: row?.peso_unitario_kg ?? '',
          unita_misura: row?.unita_misura ?? '',
        }),
      )
    },
    [createEditableRow],
  )

  // Se manca ID valido ritorna alla lista.
  useEffect(() => {
    if (!id) {
      navigate('/ddt/lista', { replace: true })
    }
  }, [id, navigate])

  // Carica dettaglio DDT dal backend.
  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await fetchDdtDetail({
          token,
          id,
          signal: controller.signal,
        })
        setRecord(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setError(err)
        setRecord(null)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout, reloadVersion])

  // Carica lookup causali DDT.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setCausaliLoading(true)
      try {
        const list = await fetchDdtCausali({
          token,
          signal: controller.signal,
        })
        setCausali(Array.isArray(list) ? list : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setCausali([])
      } finally {
        setCausaliLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout, reloadVersion])

  // Carica lookup destinazioni predefinite.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setDestinazioniLoading(true)
      try {
        const list = await fetchDdtDestinazioni({
          token,
          signal: controller.signal,
        })
        setDestinazioniPredefinite(Array.isArray(list) ? list : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setDestinazioniPredefinite([])
      } finally {
        setDestinazioniLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout, reloadVersion])

  // Sincronizza form locale quando cambia il record caricato.
  useEffect(() => {
    if (!record) {
      setFormValues({
        data_ddt: '',
        id_causale: '',
        note: '',
        destinazione_merce: '',
        aspetto: '',
        numero_colli: '',
        cura_trasporto: '',
        data_trasporto: '',
        vettore: '',
      })
      setRows([])
      setSediOptions([])
      setSelectedSedeId('')
      setSelectedDestinazioneId('')
      setDestinazioneMode('sede')
      setSaveError(null)
      setSaveSuccess(null)
      return
    }
    setFormValues({
      data_ddt: toDateInputValue(record.data_ddt),
      id_causale: record.id_causale ? String(record.id_causale) : '',
      note: record.note ?? '',
      destinazione_merce: record.destinazione_merce ?? '',
      aspetto: normalizeOptionValue(record.aspetto ?? ''),
      numero_colli:
        record.numero_colli !== null && record.numero_colli !== undefined
          ? String(record.numero_colli)
          : '',
      cura_trasporto: normalizeOptionValue(record.cura_trasporto ?? ''),
      data_trasporto: toDateInputValue(record.data_trasporto),
      vettore: record.vettore ?? '',
    })
    setRows(hydrateRowsFromRecord(record))
    const availableSedi = Array.isArray(record.cliente_sedi) ? [...record.cliente_sedi] : []
    availableSedi.sort((a, b) => {
      const legaleDiff = Number(b?.is_legale ?? 0) - Number(a?.is_legale ?? 0)
      if (legaleDiff !== 0) return legaleDiff
      return String(a?.denominazione ?? '').localeCompare(String(b?.denominazione ?? ''))
    })
    setSediOptions(availableSedi)
    const initialSedeId =
      record.id_sede_destinazione ?? (availableSedi.length > 0 ? availableSedi[0]?.id_sede : null)
    setSelectedSedeId(initialSedeId ? String(initialSedeId) : '')
    const initialDestId = record.id_destinazione_predefinita ?? null
    setSelectedDestinazioneId(initialDestId ? String(initialDestId) : '')
    const initialMode =
      initialDestId && initialDestId > 0
        ? 'predefinita'
        : record.destinazione_merce && record.destinazione_merce.trim() !== ''
          ? 'manuale'
          : 'sede'
    setDestinazioneMode(initialMode)
    setSaveError(null)
    setSaveSuccess(null)
  }, [record, hydrateRowsFromRecord])

  const isEditable = record?.stato_documento !== 2
  const isBusy = saving || statusSaving
  const formDisabled = !isEditable || isBusy
  const currentStatus = record?.stato_documento === 2 ? 2 : 1
  const statusLabel = currentStatus === 2 ? 'Emesso' : 'Bozza'
  const statusColor = currentStatus === 2 ? 'success' : 'warning'
  const statusSteps = useMemo(() => ['Bozza', 'Emesso'], [])
  const activeStatusStep = currentStatus === 2 ? 2 : 1
  const ddtId = record?.id_ddt ?? null

  // Etichetta numero documento (anno/numero) da mostrare in testata.
  const numeroDisplay = useMemo(() => {
    if (!record) return '-'
    const { anno, numero_documento: numero } = record
    if (anno && numero) return `${anno}/${numero}`
    if (numero) return String(numero)
    return '-'
  }, [record])

  // Aggiorna campo form della testata DDT.
  const handleFormChange = (field) => (event) => {
    if (!isEditable) return
    const value = event?.target?.value ?? ''
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Ripristina i valori del form allo stato del record caricato.
  const handleReset = () => {
    if (!record || !isEditable) return
    setFormValues({
      data_ddt: toDateInputValue(record.data_ddt),
      id_causale: record.id_causale ? String(record.id_causale) : '',
      note: record.note ?? '',
      destinazione_merce: record.destinazione_merce ?? '',
      aspetto: normalizeOptionValue(record.aspetto ?? ''),
      numero_colli:
        record.numero_colli !== null && record.numero_colli !== undefined
          ? String(record.numero_colli)
          : '',
      cura_trasporto: normalizeOptionValue(record.cura_trasporto ?? ''),
      data_trasporto: toDateInputValue(record.data_trasporto),
      vettore: record.vettore ?? '',
    })
    setRows(hydrateRowsFromRecord(record))
    const availableSedi = Array.isArray(record.cliente_sedi) ? [...record.cliente_sedi] : []
    availableSedi.sort((a, b) => {
      const legaleDiff = Number(b?.is_legale ?? 0) - Number(a?.is_legale ?? 0)
      if (legaleDiff !== 0) return legaleDiff
      return String(a?.denominazione ?? '').localeCompare(String(b?.denominazione ?? ''))
    })
    setSediOptions(availableSedi)
    const initialSedeId =
      record.id_sede_destinazione ?? (availableSedi.length > 0 ? availableSedi[0]?.id_sede : null)
    setSelectedSedeId(initialSedeId ? String(initialSedeId) : '')
    const initialDestId = record.id_destinazione_predefinita ?? null
    setSelectedDestinazioneId(initialDestId ? String(initialDestId) : '')
    const initialMode =
      initialDestId && initialDestId > 0
        ? 'predefinita'
        : record.destinazione_merce && record.destinazione_merce.trim() !== ''
          ? 'manuale'
          : 'sede'
    setDestinazioneMode(initialMode)
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Aggiorna campo di una specifica riga DDT.
  const handleRowFieldChange = (rowId, field) => (event) => {
    if (!isEditable) return
    const value = event?.target?.value ?? ''
    setRows((prev) => prev.map((row) => (row.localId === rowId ? { ...row, [field]: value } : row)))
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Cambia modalità destinazione (sede/manuale/predefinita).
  const handleDestinazioneModeChange = (mode) => {
    if (!isEditable) return
    setDestinazioneMode(mode)
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Applica una destinazione predefinita selezionata.
  const handleDestinazionePredefinitaChange = (event) => {
    if (!isEditable) return
    setSelectedDestinazioneId(event?.target?.value ?? '')
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Aggiunge una nuova riga vuota al documento.
  const handleAddRow = () => {
    if (!isEditable) return
    setRows((prev) => [...prev, createEditableRow()])
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Rimuove una riga del documento.
  const handleRemoveRow = (rowId) => {
    if (!isEditable) return
    setRows((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) {
        return prev
      }
      return prev.filter((row) => row.localId !== rowId)
    })
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Normalizza e valida righe prima del submit.
  const normalizeRowsForSubmit = useCallback((list) => {
    const normalized = []
    list.forEach((row, index) => {
      const descr = String(row?.descrizione || '').trim()
      if (descr === '') {
        throw new Error(`La riga ${index + 1} deve avere una descrizione.`)
      }
      const qtyValue =
        row?.quantita === '' || row?.quantita === null || row?.quantita === undefined
          ? NaN
          : Number(row.quantita)
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        throw new Error(`La quantità della riga ${index + 1} deve essere maggiore di zero.`)
      }
      let weightValue = null
      if (
        row?.peso_unitario_kg !== '' &&
        row?.peso_unitario_kg !== null &&
        row?.peso_unitario_kg !== undefined
      ) {
        const parsed = Number(row.peso_unitario_kg)
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`Il peso unitario della riga ${index + 1} non è valido.`)
        }
        weightValue = parsed
      }
      const unit = String(row?.unita_misura || '')
        .trim()
        .toUpperCase()
      normalized.push({
        descrizione: descr,
        quantita: qtyValue,
        peso_unitario_kg: weightValue,
        unita_misura: unit || null,
      })
    })
    if (normalized.length === 0) {
      throw new Error('Inserire almeno una riga al DDT.')
    }
    return normalized
  }, [])

  // Sede cliente correntemente selezionata.
  const selectedSede = useMemo(() => {
    if (Array.isArray(sediOptions) && sediOptions.length > 0) {
      if (selectedSedeId) {
        const numeric = Number(selectedSedeId)
        const match = sediOptions.find((sede) => Number(sede?.id_sede ?? 0) === numeric)
        if (match) {
          return match
        }
      }
      return sediOptions[0]
    }
    return record?.cliente_sede ?? null
  }, [sediOptions, selectedSedeId, record])

  const sedeDisplay = selectedSede || record?.cliente_sede || null

  // Destinazione predefinita correntemente selezionata.
  const selectedDestinazione = useMemo(() => {
    if (selectedDestinazioneId) {
      const numeric = Number(selectedDestinazioneId)
      const match = (Array.isArray(destinazioniPredefinite) ? destinazioniPredefinite : []).find(
        (dest) => Number(dest?.id_destinazione ?? 0) === numeric,
      )
      if (match) {
        return match
      }
    }
    if (record?.destinazione_predefinita) {
      return record.destinazione_predefinita
    }
    return null
  }, [selectedDestinazioneId, destinazioniPredefinite, record])

  // Totali derivati dalle righe (pezzi e peso).
  const rowsTotals = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        pezzi: record?.totale_pezzi ?? null,
        peso: record?.totale_peso_kg ?? null,
      }
    }
    let pezzi = 0
    let peso = 0
    let hasPeso = false
    let hasQuantita = false
    rows.forEach((row) => {
      const qty =
        row?.quantita === '' || row?.quantita === null || row?.quantita === undefined
          ? null
          : Number(row.quantita)
      if (Number.isFinite(qty)) {
        pezzi += qty
        hasQuantita = true
        const unitWeight =
          row?.peso_unitario_kg === '' ||
            row?.peso_unitario_kg === null ||
            row?.peso_unitario_kg === undefined
            ? null
            : Number(row.peso_unitario_kg)
        if (Number.isFinite(unitWeight)) {
          peso += qty * unitWeight
          hasPeso = true
        }
      }
    })
    return {
      pezzi: hasQuantita ? pezzi : null,
      peso: hasPeso ? peso : null,
    }
  }, [rows, record])

  // Indirizzo cliente formattato per riepilogo.
  const clienteAddress = useMemo(() => {
    const sede = sedeDisplay
    if (!sede) {
      return record
        ? [
          record.cliente_indirizzo,
          record.cliente_cap,
          record.cliente_comune,
          record.cliente_provincia,
          record.cliente_nazione,
        ]
          .filter((chunk) => chunk && String(chunk).trim() !== '')
          .join(', ')
        : '-'
    }
    const segments = []
    const indirizzo = sede.indirizzo ? String(sede.indirizzo).trim() : ''
    if (indirizzo) {
      const civico = sede.civico ? String(sede.civico).trim() : ''
      segments.push([indirizzo, civico].filter((part) => part !== '').join(' '))
    }
    const cityParts = [sede.cap, sede.comune, sede.provincia]
      .map((part) => (part ? String(part).trim() : ''))
      .filter((part) => part !== '')
    if (cityParts.length > 0) {
      segments.push(cityParts.join(' '))
    }
    if (sede?.nazione_iso2) {
      segments.push(String(sede.nazione_iso2).trim())
    }
    return segments.length > 0 ? segments.join(', ') : '-'
  }, [sedeDisplay, record])

  // Destinazione merce risolta in base alla modalità scelta.
  const destinazioneDisplay = useMemo(() => {
    if (destinazioneMode === 'sede') {
      return clienteAddress
    }
    if (destinazioneMode === 'predefinita') {
      if (selectedDestinazione) {
        const parts = [
          selectedDestinazione.label,
          selectedDestinazione.indirizzo,
          [selectedDestinazione.cap, selectedDestinazione.comune, selectedDestinazione.provincia]
            .filter((part) => part && String(part).trim() !== '')
            .join(' '),
          selectedDestinazione.nazione_iso2,
        ]
          .filter((part) => part && String(part).trim() !== '')
          .join(', ')
        return parts || '-'
      }
      if (record?.destinazione_predefinita?.label) {
        return record.destinazione_predefinita.label
      }
      return '-'
    }
    const manual = formValues.destinazione_merce?.trim()
    return manual !== '' ? manual : '-'
  }, [
    destinazioneMode,
    clienteAddress,
    selectedDestinazione,
    formValues.destinazione_merce,
    record,
  ])

  const showVettoreField = formValues.cura_trasporto === 'vettore'

  // Salvataggio invocato dalla action breadcrumb.
  const handleBreadcrumbSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }, [])

  // Forza il ricaricamento del record da backend.
  const handleRefreshRecord = useCallback(() => {
    setReloadVersion((prev) => prev + 1)
  }, [])

  // Apre il PDF del documento in una nuova tab.
  const handleOpenPdf = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!ddtId) return
    const url = buildDdtPdfUrl(ddtId)
    if (!url) return
    window.open(url, '_blank', 'noopener')
  }, [ddtId])

  // Configura azioni contestuali della breadcrumb bar.
  useEffect(() => {
    if (!id) {
      clearBreadcrumbActions()
      return
    }
    const actions = [
      {
        id: 'ddt-refresh',
        icon: cilReload,
        label: loading ? 'Aggiornamento dati...' : 'Aggiorna dati',
        onClick: handleRefreshRecord,
        disabled: loading,
      },
    ]
    if (record) {
      actions.push({
        id: 'ddt-save',
        icon: cilSave,
        label: saving ? 'Salvataggio DDT...' : 'Salva DDT',
        onClick: handleBreadcrumbSave,
        disabled: formDisabled,
      })
    }
    setBreadcrumbActions(actions)
    return () => clearBreadcrumbActions()
  }, [
    clearBreadcrumbActions,
    formDisabled,
    handleBreadcrumbSave,
    handleRefreshRecord,
    id,
    loading,
    record,
    saving,
    setBreadcrumbActions,
  ])

  // Salva testata e righe DDT.
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!record?.id_ddt || !token || saving) return
    if (!isEditable) {
      setSaveError(new Error("Il DDT e' stato emesso e non e' modificabile."))
      return
    }
    if (!formValues.data_ddt || formValues.data_ddt.trim() === '') {
      setSaveError(new Error("La data del DDT e' obbligatoria."))
      return
    }
    let righePayload = []
    try {
      righePayload = normalizeRowsForSubmit(rows)
    } catch (validationError) {
      setSaveError(validationError)
      return
    }
    let numeroColliValue = null
    if (formValues.numero_colli !== null && formValues.numero_colli !== undefined) {
      const rawColli = String(formValues.numero_colli).trim()
      if (rawColli !== '') {
        const parsedColli = Number(rawColli)
        if (!Number.isFinite(parsedColli) || parsedColli < 0) {
          setSaveError(new Error('Il numero di colli deve essere maggiore o uguale a zero.'))
          return
        }
        numeroColliValue = Math.trunc(parsedColli)
      }
    }
    const aspettoValue = normalizeOptionValue(formValues.aspetto)
    const curaTrasportoValue = normalizeOptionValue(formValues.cura_trasporto)
    const vettoreValue = showVettoreField ? formValues.vettore?.trim() ?? '' : ''
    const dataTrasportoValue = formValues.data_trasporto || ''
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      let payloadSede = null
      let payloadDest = null
      let payloadDestinazioneTestuale = ''
      if (destinazioneMode === 'sede') {
        const numeric = Number(selectedSedeId)
        payloadSede = Number.isFinite(numeric) && numeric > 0 ? numeric : null
      } else if (destinazioneMode === 'predefinita') {
        const numeric = Number(selectedDestinazioneId)
        payloadDest = Number.isFinite(numeric) && numeric > 0 ? numeric : null
      } else {
        payloadDestinazioneTestuale =
          formValues.destinazione_merce && formValues.destinazione_merce.trim() !== ''
            ? formValues.destinazione_merce.trim()
            : ''
      }

      const updated = await updateDdtDetail({
        token,
        id: record.id_ddt,
        data_ddt: formValues.data_ddt,
        id_causale: formValues.id_causale ? Number(formValues.id_causale) : null,
        note: formValues.note ?? '',
        id_sede_destinazione: payloadSede,
        id_destinazione_predefinita: payloadDest,
        destinazione_merce: payloadDestinazioneTestuale,
        aspetto: aspettoValue,
        numero_colli: numeroColliValue,
        cura_trasporto: curaTrasportoValue,
        data_trasporto: dataTrasportoValue,
        vettore: vettoreValue,
        righe: righePayload,
      })
      if (updated) {
        setRecord(updated)
        setSaveSuccess('DDT aggiornato correttamente.')
      } else {
        setSaveSuccess('Modifiche salvate.')
      }
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  // Cambia stato documento (bozza/emesso).
  const handleStatusChange = async (nextStatus) => {
    if (!record?.id_ddt || !token) {
      return
    }
    const target = nextStatus === 2 ? 2 : 1
    if (record.stato_documento === target || statusSaving || saving) {
      return
    }
    let confirmMessage = ''
    if (target === 2) {
      confirmMessage =
        "Confermi l'emissione del DDT? Dopo questa operazione il documento non sara' piu' modificabile."
    } else {
      confirmMessage =
        "Vuoi riportare il DDT allo stato Bozza? Potrai modificare nuovamente il documento."
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage)
      if (!confirmed) {
        return
      }
    }
    setStatusSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const updated = await updateDdtDetail({
        token,
        id: record.id_ddt,
        stato_documento: target,
      })
      if (updated) {
        setRecord(updated)
        setSaveSuccess(target === 2 ? 'DDT emesso correttamente.' : "DDT riportato in stato bozza.")
      } else {
        setSaveSuccess('Stato aggiornato.')
      }
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h5 className="mb-0">DDT {numeroDisplay}</h5>
            <small className="text-body-secondary">
              Dettaglio documento di trasporto {record?.id_ddt ? `#${record.id_ddt}` : ''}
            </small>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <CBadge color={statusColor} className="text-uppercase px-3 py-2">
              {statusLabel}
            </CBadge>
            {statusSaving && <CSpinner size="sm" color="success" />}
            {record?.id_ddt && (
              <PermissionButton
                color="danger"
                variant="outline"
                size="sm"
                type="button"
                onClick={handleOpenPdf}
                permission="ddt.read"
              >
                <CIcon icon={cibAdobeAcrobatReader} className="me-2" />
                Stampa PDF
              </PermissionButton>
            )}
            <CButton color="secondary" variant="outline" onClick={() => navigate(-1)}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Indietro
            </CButton>
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare il DDT.'}</CAlert>
        )}

        {!loading && !error && !record && <CAlert color="warning">DDT non trovato.</CAlert>}

        {!loading && !error && record && (
          <>
            {saveError && (
              <CAlert color="danger" className="mb-3">
                {saveError.message || 'Impossibile salvare le modifiche al DDT.'}
              </CAlert>
            )}
            {saveSuccess && (
              <CAlert color="success" className="mb-3">
                {saveSuccess}
              </CAlert>
            )}
            {!isEditable && (
              <CAlert color="info" className="mb-3">
                Questo DDT e' stato emesso e non puo' piu' essere modificato.
              </CAlert>
            )}

            <section className="mb-4">
              <h6 className="text-body-secondary mb-3">Timeline stato documento</h6>
              <div className="border rounded p-3 bg-body-tertiary">
                <CStepper
                  steps={statusSteps}
                  activeStepNumber={activeStatusStep}
                  linear={false}
                  onStepChange={(step) => {
                    const numeric = Number(step)
                    if (Number.isNaN(numeric) || numeric === activeStatusStep || statusSaving) {
                      return
                    }
                    handleStatusChange(numeric === 2 ? 2 : 1)
                  }}
                />
                <div className="mt-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">
                  <div>
                    <small className="text-body-secondary">
                      Stato attuale: <span className="fw-semibold text-uppercase">{statusLabel}</span>
                    </small>
                  </div>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    {statusSaving && <CSpinner size="sm" />}
                    <small className="text-body-secondary">
                      Seleziona uno step per aggiornare rapidamente lo stato del documento.
                    </small>
                    {currentStatus === 2 && (
                      <PermissionButton
                        size="sm"
                        color="warning"
                        variant="outline"
                        disabled={statusSaving || saving}
                        onClick={() => handleStatusChange(1)}
                        permission="ddt.write"
                      >
                        Torna a bozza
                      </PermissionButton>
                    )}
                    {currentStatus === 1 && (
                      <PermissionButton
                        size="sm"
                        color="success"
                        variant="outline"
                        disabled={statusSaving || saving}
                        onClick={() => handleStatusChange(2)}
                        permission="ddt.write"
                      >
                        Segna come emesso
                      </PermissionButton>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <CRow className="mb-4">
              <CCol>
                <div className="border rounded p-3 bg-body-tertiary">
                  <div className="mb-3">
                    <div className="text-body-secondary small">Ragione sociale</div>
                    <div className="fw-semibold fs-5">
                      {record.cliente_ragione_sociale || 'Cliente non disponibile'}
                    </div>
                  </div>
                  <CRow className="g-3">
                    <CCol md={3}>
                      <div className="text-body-secondary small">P.IVA</div>
                      <div className="fw-semibold">{record.cliente_piva || '-'}</div>
                    </CCol>
                    <CCol md={3}>
                      <div className="text-body-secondary small">Codice fiscale</div>
                      <div className="fw-semibold">{record.cliente_codice_fiscale || '-'}</div>
                    </CCol>

                    <CCol md={6}>
                      <div className="text-body-secondary small">Sede legale</div>
                      <div className="fw-semibold">{clienteAddress}</div>
                    </CCol>
                    <CCol md={6}>
                      <div className="text-body-secondary small">Destinazione merce corrente</div>
                      <div className="fw-semibold">{destinazioneDisplay}</div>
                    </CCol>
                  </CRow>
                </div>
              </CCol>
            </CRow>

            <CRow className="mb-4 gy-4">
              <CCol lg={12}>
                <h6 className="mb-3 text-body-secondary">Dati documento</h6>
                <CForm id="ddt-detail-form" onSubmit={handleSubmit} ref={formRef}>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel>Data documento</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formValues.data_ddt || ''}
                        onChange={handleFormChange('data_ddt')}
                        required
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Causale</CFormLabel>
                      <CFormSelect
                        value={formValues.id_causale}
                        onChange={handleFormChange('id_causale')}
                        disabled={formDisabled || causaliLoading}
                      >
                        <option value="">Nessuna causale</option>
                        {causali.map((causale) => (
                          <option key={causale.id_causale} value={causale.id_causale}>
                            {causale.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={12}>
                      <CFormLabel>Note</CFormLabel>
                      <CFormTextarea
                        rows={4}
                        value={formValues.note ?? ''}
                        onChange={handleFormChange('note')}
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Aspetto</CFormLabel>
                      <CFormSelect
                        value={formValues.aspetto || ''}
                        onChange={handleFormChange('aspetto')}
                        disabled={formDisabled}
                      >
                        {ASPETTO_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Numero di colli</CFormLabel>
                      <CFormInput
                        type="number"
                        min="0"
                        step="1"
                        value={formValues.numero_colli ?? ''}
                        onChange={handleFormChange('numero_colli')}
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Cura del trasporto</CFormLabel>
                      <CFormSelect
                        value={formValues.cura_trasporto || ''}
                        onChange={handleFormChange('cura_trasporto')}
                        disabled={formDisabled}
                      >
                        {CURA_TRASPORTO_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Data trasporto</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formValues.data_trasporto || ''}
                        onChange={handleFormChange('data_trasporto')}
                        disabled={formDisabled}
                      />
                    </CCol>
                    {showVettoreField && (
                      <CCol md={6}>
                        <CFormLabel>Vettore</CFormLabel>
                        <CFormInput
                          value={formValues.vettore || ''}
                          onChange={handleFormChange('vettore')}
                          disabled={formDisabled}
                        />
                      </CCol>
                    )}
                    <CCol xs={12}>
                      <CFormLabel>Destinazione merce</CFormLabel>
                      <div className="d-flex flex-wrap gap-4 mb-3">
                        <CFormCheck
                          type="radio"
                          name="dest-mode"
                          id="dest-mode-sede"
                          label="Sede anagrafica"
                          checked={destinazioneMode === 'sede'}
                          onChange={() => handleDestinazioneModeChange('sede')}
                          disabled={formDisabled}
                        />
                        <CFormCheck
                          type="radio"
                          name="dest-mode"
                          id="dest-mode-predefinita"
                          label="Destinazione predefinita"
                          checked={destinazioneMode === 'predefinita'}
                          onChange={() => handleDestinazioneModeChange('predefinita')}
                          disabled={formDisabled}
                        />
                        <CFormCheck
                          type="radio"
                          name="dest-mode"
                          id="dest-mode-manuale"
                          label="Inserimento manuale"
                          checked={destinazioneMode === 'manuale'}
                          onChange={() => handleDestinazioneModeChange('manuale')}
                          disabled={formDisabled}
                        />
                      </div>
                      {destinazioneMode === 'sede' && (
                        <div className="mt-2 p-3 border rounded bg-body-tertiary">
                          <div className="text-body-secondary small">
                            La destinazione corrisponde automaticamente alla sede legale del
                            cliente.
                          </div>
                          <div className="fw-semibold">{clienteAddress}</div>
                          <div className="text-body-tertiary small mb-0">
                            Per indirizzi alternativi usa una destinazione predefinita o inserisci
                            il testo manualmente.
                          </div>
                        </div>
                      )}
                      {destinazioneMode === 'predefinita' &&
                        (destinazioniPredefinite.length > 0 ? (
                          <CFormSelect
                            className="mt-2"
                            value={selectedDestinazioneId}
                            onChange={handleDestinazionePredefinitaChange}
                            disabled={formDisabled || destinazioniLoading}
                          >
                            <option value="">Seleziona destinazione</option>
                            {destinazioniPredefinite.map((dest) => (
                              <option key={dest.id_destinazione} value={dest.id_destinazione}>
                                {dest.label}
                              </option>
                            ))}
                          </CFormSelect>
                        ) : (
                          <CAlert color="info" className="mt-2 mb-0">
                            Nessuna destinazione predefinita configurata.
                          </CAlert>
                        ))}
                      {destinazioneMode === 'manuale' && (
                        <CFormInput
                          className="mt-2"
                          value={formValues.destinazione_merce || ''}
                          onChange={handleFormChange('destinazione_merce')}
                          placeholder="Es. Via Roma 123, Milano"
                          disabled={formDisabled}
                        />
                      )}
                    </CCol>
                  </CRow>
                </CForm>
              </CCol>
            </CRow>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-body-secondary">Righe documento</h6>
              <PermissionButton
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={handleAddRow}
                disabled={formDisabled}
                permission="ddt.write"
              >
                <CIcon icon={cilPlus} className="me-2" />
                Aggiungi riga
              </PermissionButton>
            </div>
            {rows.length === 0 ? (
              <CAlert color="info">Nessuna riga presente nel DDT.</CAlert>
            ) : (
              <CTable data-testid="table" hover responsive>
                <CTableHead className="mp-table-head">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell style={{ minWidth: '220px' }}>Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '140px' }}>
                      Quantità
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '160px' }}>
                      Peso unitario kg
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '160px' }}>
                      Peso totale kg
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '140px' }}>Unità</CTableHeaderCell>
                    <CTableHeaderCell className="text-center" style={{ width: '90px' }}>
                      Azioni
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {rows.map((row) => {
                    const qtyValue =
                      row.quantita === '' || row.quantita === null || row.quantita === undefined
                        ? null
                        : Number(row.quantita)
                    const pesoValue =
                      row.peso_unitario_kg === '' ||
                        row.peso_unitario_kg === null ||
                        row.peso_unitario_kg === undefined
                        ? null
                        : Number(row.peso_unitario_kg)
                    const pesoTotale =
                      Number.isFinite(qtyValue) && Number.isFinite(pesoValue)
                        ? qtyValue * pesoValue
                        : null
                    return (
                      <CTableRow key={row.localId} className="align-middle">
                        <CTableDataCell>
                          <CFormInput
                            value={row.descrizione}
                            onChange={handleRowFieldChange(row.localId, 'descrizione')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantita}
                            onChange={handleRowFieldChange(row.localId, 'quantita')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="any"
                            value={row.peso_unitario_kg}
                            onChange={handleRowFieldChange(row.localId, 'peso_unitario_kg')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {pesoTotale !== null && pesoTotale !== undefined
                            ? formatNumber(pesoTotale, { decimals: 3 })
                            : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={row.unita_misura}
                            onChange={handleRowFieldChange(row.localId, 'unita_misura')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <PermissionButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(row.localId)}
                            disabled={formDisabled || rows.length <= 1}
                            permission="ddt.write"
                          >
                            <CIcon icon={cilTrash} />
                          </PermissionButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
            <section className="mt-4">
              <h6 className="mb-3 text-body-secondary">Riepilogo DDT</h6>
              <div className="border rounded p-3 bg-body-tertiary">
                <div className="mb-3">
                  <div className="text-body-secondary small">Totale pezzi</div>
                  <div className="fw-semibold">
                    {rowsTotals.pezzi !== null && rowsTotals.pezzi !== undefined
                      ? formatNumber(rowsTotals.pezzi)
                      : '-'}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-body-secondary small">Totale peso (kg)</div>
                  <div className="fw-semibold">
                    {rowsTotals.peso !== null && rowsTotals.peso !== undefined
                      ? formatNumber(rowsTotals.peso, { decimals: 3 })
                      : '-'}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-body-secondary small">Ultimo aggiornamento</div>
                  <div className="fw-semibold">
                    {record.updated_at ? formatDate(record.updated_at) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-body-secondary small">Causale</div>
                  {record.causale_label ? (
                    <CBadge color="secondary">{record.causale_label}</CBadge>
                  ) : (
                    <span className="text-body-secondary">-</span>
                  )}
                </div>
              </div>
            </section>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <CButton
                color="secondary"
                variant="ghost"
                type="button"
                onClick={handleReset}
                disabled={formDisabled}
              >
                Annulla
              </CButton>
              <PermissionButton
                color="primary"
                type="submit"
                form="ddt-detail-form"
                disabled={formDisabled}
                permission="ddt.write"
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </PermissionButton>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default DdtDetail



