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
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilPlus,
  cilTrash,
  cilReload,
  cilSave,
  cilCloudDownload,
  cilPencil,
  cilPrint,
} from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { useBreadcrumbActions } from '../../context/BreadcrumbActionsContext'
import {
  buildFatturaPdfUrl,
  deleteFatturaPagamento,
  exportFatturaXml,
  fetchFatturaDetail,
  fetchFatturaPagamenti,
  fetchFatturaStatusLog,
  fetchFattureConfig,
  saveFatturaPagamento,
  updateFatturaDetail,
} from '../../services/fatture'
import {
  fetchCategorieProdotti,
  fetchNatureIva,
  fetchProdotti,
  fetchProdottoPrezziCombinati,
  fetchProdottoVariazioni,
} from '../../services/prodotti'
import { fetchPacchetti, fetchPacchettoDetail } from '../../services/pacchetti'
import { fetchPaymentTerms } from '../../services/paymentTerms'
import { fetchAnagraficaDetail } from '../../services/anagrafiche'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// Formatter condivisi e utility numeriche/date per il dettaglio fattura.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

const formatDateTime = (value) => {
  if (!value) return '-'
  let raw = value
  if (typeof raw === 'string' && raw.includes(' ') && !raw.includes('T')) {
    raw = raw.replace(' ', 'T')
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleString('it-IT')
}

const formatCurrency = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? currencyFormatter.format(numeric)
    : value === null || value === undefined || value === ''
      ? '-'
      : String(value)
}

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

const sanitizePaymentAnchor = (anchor) => {
  const value = typeof anchor === 'string' ? anchor.toLowerCase().trim() : ''
  return ['end_of_month', 'invoice_date'].includes(value) ? value : 'invoice_date'
}

const endOfMonthDate = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const formatIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const roundToTwo = (value) => {
  return Math.round(value * 100) / 100
}

const buildRateLabel = (index, anchor, offset) => {
  const anchorLabel = anchor === 'end_of_month' ? 'fine mese' : 'data fattura'
  if (offset <= 0) {
    return `Rata ${index} (${anchorLabel})`
  }
  return `Rata ${index} (${offset} gg ${anchorLabel})`
}

const buildScheduleFromTerm = (term, invoiceDate, total) => {
  if (!term || !Array.isArray(term.schedule) || term.schedule.length === 0) {
    return []
  }
  const totalAmount = Number.isFinite(Number(total)) ? Number(total) : 0
  const installments = term.schedule.length
  const baseQuota = installments > 0 ? roundToTwo(totalAmount / installments) : 0
  let remaining = totalAmount
  const baseDate = (() => {
    if (invoiceDate) {
      const parsed = new Date(invoiceDate)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
      if (typeof invoiceDate === 'string') {
        const isoMatch = invoiceDate.match(/^(\d{4}-\d{2}-\d{2})/)
        if (isoMatch) {
          return new Date(isoMatch[1])
        }
      }
    }
    return new Date()
  })()

  return term.schedule.map((item, index) => {
    const anchor = sanitizePaymentAnchor(item.anchor)
    const offsetRaw = item.offset_days ?? item.offset ?? 0
    const offsetDays = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 0
    let dueDate = anchor === 'end_of_month' ? endOfMonthDate(baseDate) : new Date(baseDate)
    if (offsetDays !== 0) {
      dueDate = addDays(dueDate, offsetDays)
    }
    if (anchor === 'end_of_month') {
      dueDate = endOfMonthDate(dueDate)
    }

    const label = item.label && String(item.label).trim() !== ''
      ? String(item.label)
      : buildRateLabel(index + 1, anchor, offsetDays)
    const amount = index < installments - 1 ? baseQuota : roundToTwo(remaining)
    remaining = roundToTwo(remaining - amount)

    return {
      index: index + 1,
      label,
      due_date: formatIsoDate(dueDate),
      amount,
      anchor,
      offset_days: offsetDays,
    }
  })
}

// Calcola imponibile/iva/totale di una riga dettaglio.
const computeRowAmounts = (row) => {
  const qty = Number(row.quantita)
  const price = Number(row.prezzo_unitario)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) {
    return { imponibile: null, iva: null, discount: null, totale: null }
  }
  const gross = qty * price
  const discountPercent =
    row.sconto === '' || row.sconto === null || row.sconto === undefined ? 0 : Number(row.sconto)
  const discountAmount =
    Number.isFinite(discountPercent) && discountPercent > 0 ? gross * (discountPercent / 100) : 0
  const net = gross - discountAmount
  const ivaPercent =
    row.aliquota_iva === '' || row.aliquota_iva === null || row.aliquota_iva === undefined
      ? null
      : Number(row.aliquota_iva)
  const ivaAmount =
    Number.isFinite(ivaPercent) && ivaPercent >= 0 ? net * (ivaPercent / 100) : 0
  return {
    imponibile: net,
    iva: ivaAmount,
    discount: discountAmount,
    totale: net + ivaAmount,
  }
}

// Stato iniziale del form dettaglio fattura.
const createEmptyFormValues = () => ({
  data_fattura: '',
  id_stato_fatt: '',
  id_sezionale: '',
  note: '',
  saldo: '',
  cliente_pec: '',
  cliente_codice_sdi: '',
  cliente_iban: '',
  cliente_banca: '',
  cliente_modalita_pagamento: '',
  cliente_id_cond_pagamento: '',
  cliente_giorni_pagamento: '',
})

const TIMELINE_BASE_STEPS = [
  { code: 'bozza', fallbackLabel: 'Bozza' },
  { code: 'emessa', fallbackLabel: 'Emessa' },
  { code: 'inviata', fallbackLabel: 'Inviata' },
]

const ICON_SYMBOLS = {
  cilWarning: '⚠',
  cilBan: '⛔',
  cilCheck: '✔',
  cilThumbsDown: '✖',
  cilThumbsUp: '👍',
}

const resolveIconSymbol = (raw) => {
  if (!raw) return ''
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (ICON_SYMBOLS[trimmed]) {
    return ICON_SYMBOLS[trimmed]
  }
  if (trimmed.length === 1) {
    return trimmed
  }
  if (/^[^\s]{1,2}$/.test(trimmed)) {
    return trimmed
  }
  return ''
}

const CONCLUSIVE_STATUS_IDS = [4, 5, 6, 7]
const FINAL_STEP_FALLBACK_LABEL = 'Stato conclusivo'

const FattureDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = Number(query.get('id') || 0)
  const isAcquisto = location.pathname.includes('/acquisti/')
  const basePath = isAcquisto ? '/acquisti/fatture' : '/fatture'
  const counterpartyLabel = isAcquisto ? 'Fornitore' : 'Cliente'
  const showStatus = !isAcquisto
  const showPayments = !isAcquisto
  const { token, logout, user } = useAuth()
  const accountType = String(user?.accountType || user?.account_type || '').toLowerCase().trim()
  const isCustomerAccount = accountType === 'cliente'
  const showSezionale = !isAcquisto && !isCustomerAccount
  const showStatusTimeline = showStatus && !isCustomerAccount
  const { setBreadcrumbActions, clearBreadcrumbActions } = useBreadcrumbActions()

  const [record, setRecord] = useState(null)
  const [clienteSezionaleId, setClienteSezionaleId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formValues, setFormValues] = useState(createEmptyFormValues)
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [config, setConfig] = useState({
    stati: [],
    sezionali: [],
    metodi_pagamento: [],
    modalita_pagamento: [],
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState(null)
  const [paymentTerms, setPaymentTerms] = useState([])
  const [paymentTermsLoading, setPaymentTermsLoading] = useState(false)
  const [paymentTermsError, setPaymentTermsError] = useState(null)
  const [naturaOptions, setNaturaOptions] = useState([])
  const [naturaLoading, setNaturaLoading] = useState(false)
  const [naturaError, setNaturaError] = useState(null)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [prodSearch, setProdSearch] = useState('')
  const [selCat, setSelCat] = useState('')
  const [selProd, setSelProd] = useState('')
  const [prodStep, setProdStep] = useState(1)
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [prodComboList, setProdComboList] = useState([])
  const [prodComboMap, setProdComboMap] = useState({})
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)
  const [selIva, setSelIva] = useState('22')
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgOptions, setPkgOptions] = useState([])
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [reloadVersion, setReloadVersion] = useState(0)
  const [exportingXml, setExportingXml] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState(null)
  const [paymentsStats, setPaymentsStats] = useState({
    totale_documento: 0,
    totale_pagato: 0,
    saldo_residuo: 0,
  })
  const [paymentBanner, setPaymentBanner] = useState(null)
  const [paymentsReload, setPaymentsReload] = useState(0)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    id_pagamento: null,
    data_pagamento: toDateInputValue(new Date()),
    importo: '',
    id_metodo: '',
    id_mp: '',
    note: '',
  })
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentSaveError, setPaymentSaveError] = useState(null)
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState(null)
  const [paymentDeleting, setPaymentDeleting] = useState(false)
  const [paymentDeleteError, setPaymentDeleteError] = useState(null)
  const [statusLog, setStatusLog] = useState([])
  const [statusLogLoading, setStatusLogLoading] = useState(false)
  const [statusLogError, setStatusLogError] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusUpdateError, setStatusUpdateError] = useState(null)
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(null)
  const [statusTab, setStatusTab] = useState('timeline')
  const formRef = useRef(null)
  const rowCounterRef = useRef(0)

  // Redirect alla lista se manca un ID valido.
  useEffect(() => {
    if (!id) {
      navigate(`${basePath}/lista`, { replace: true })
    }
  }, [id, navigate, basePath])

  // Carica il dettaglio fattura.
  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await fetchFatturaDetail({
          token,
          id,
          signal: controller.signal,
          is_acquisto: isAcquisto ? 1 : 0,
        })
        setRecord(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setRecord(null)
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout, reloadVersion, isAcquisto])

  // Carica configurazioni fatture (stati, sezionali, metodi).
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setConfigLoading(true)
      setConfigError(null)
      try {
        const data = await fetchFattureConfig({
          token,
          signal: controller.signal,
          is_acquisto: isAcquisto ? 1 : 0,
        })
        setConfig(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setConfig({ stati: [], sezionali: [], metodi_pagamento: [], modalita_pagamento: [] })
        setConfigError(err)
      } finally {
        setConfigLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout, reloadVersion, isAcquisto])

  // Carica i termini di pagamento disponibili.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setPaymentTermsLoading(true)
      setPaymentTermsError(null)
      try {
        const { items } = await fetchPaymentTerms({
          token,
          signal: controller.signal,
        })
        setPaymentTerms(Array.isArray(items) ? items : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setPaymentTerms([])
        setPaymentTermsError(err)
      } finally {
        setPaymentTermsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout])

  // Carica pagamenti associati quando la sezione è attiva.
  useEffect(() => {
    if (!token || !id || !showPayments) return
    const controller = new AbortController()
    const load = async () => {
      setPaymentsLoading(true)
      setPaymentsError(null)
      try {
        const data = await fetchFatturaPagamenti({
          token,
          id,
          signal: controller.signal,
        })
        setPayments(Array.isArray(data?.items) ? data.items : [])
        setPaymentsStats({
          totale_documento: Number(data?.totale_documento) || 0,
          totale_pagato: Number(data?.totale_pagato) || 0,
          saldo_residuo: Number(data?.saldo_residuo) || 0,
        })
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setPayments([])
        setPaymentsStats({ totale_documento: 0, totale_pagato: 0, saldo_residuo: 0 })
        setPaymentsError(err)
      } finally {
        setPaymentsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout, paymentsReload, showPayments])

  // Carica storico cambi stato fattura.
  useEffect(() => {
    if (!token || !id || !showStatus) return
    const controller = new AbortController()
    const load = async () => {
      setStatusLogLoading(true)
      setStatusLogError(null)
      try {
        const { items } = await fetchFatturaStatusLog({
          token,
          id,
          signal: controller.signal,
        })
        setStatusLog(Array.isArray(items) ? items : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setStatusLogError(err)
        setStatusLog([])
      } finally {
        setStatusLogLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout, reloadVersion, showStatus])

  // Auto-hide banner pagamenti.
  useEffect(() => {
    if (!paymentBanner) return
    const timer = setTimeout(() => setPaymentBanner(null), 5000)
    return () => clearTimeout(timer)
  }, [paymentBanner])

  // Carica elenco nature IVA per righe documento.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setNaturaLoading(true)
      setNaturaError(null)
      try {
        const { items } = await fetchNatureIva({
          token,
          signal: controller.signal,
        })
        setNaturaOptions(Array.isArray(items) ? items : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setNaturaOptions([])
        setNaturaError(err)
      } finally {
        setNaturaLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchCategorieProdotti({
          token,
          signal: controller.signal,
        })
        setCatOptions(Array.isArray(items) ? items : [])
      } catch (_error) {
        setCatOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({
          token,
          id_categoria: idcat,
          q: prodSearch,
          signal: controller.signal,
        })
        setProdOptions(Array.isArray(items) ? items : [])
      } catch (_error) {
        setProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    if (!token || !selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items)
          ? [...items].sort(
            (a, b) =>
              String(a?.codice || '').localeCompare(String(b?.codice || '')) ||
              String(a?.nome || '').localeCompare(String(b?.nome || '')),
          )
          : []
        setProdVarOptions(sorted)
        const map = {}
        const list = Array.isArray(combo?.items) ? combo.items : []
        list.forEach((row) => {
          if (row?.combo_key) {
            map[String(row.combo_key)] = Number(row.prezzo) || 0
          }
        })
        setProdComboList(list)
        setProdComboMap(map)
      } catch (_error) {
        setProdVarOptions([])
        setProdComboList([])
        setProdComboMap({})
      }
    }
    load()
    return () => controller.abort()
  }, [token, selProd])

  useEffect(() => {
    const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey =
      selectedComboKey && String(selectedComboKey).trim() !== ''
        ? selectedComboKey
        : selectedVarIds
          .map((id) => Number(id) || 0)
          .filter((n) => n > 0)
          .sort((a, b) => a - b)
          .join('+')
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const suggested = comboPrice != null ? comboPrice : base
    setModalPrice(suggested)
  }, [selProd, prodOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  useEffect(() => {
    if (!token || !pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({
          token,
          q: pkgSearch,
          onlyActive: pkgOnlyActive,
          signal: controller.signal,
        })
        setPkgOptions(Array.isArray(items) ? items : [])
      } catch (_error) {
        setPkgOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  useEffect(() => {
    if (!token || !pkgOpen) return
    if (!selPacchetto) {
      setPkgPreview([])
      return
    }
    const controller = new AbortController()
    const load = async () => {
      try {
        const { righe } = await fetchPacchettoDetail({
          token,
          id: Number(selPacchetto),
          signal: controller.signal,
        })
        setPkgPreview(Array.isArray(righe) ? righe : [])
      } catch (_error) {
        setPkgPreview([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  const naturaMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(naturaOptions)) {
      naturaOptions.forEach((option) => {
        const id = Number(option?.id_natura)
        if (Number.isFinite(id) && id > 0) {
          map.set(id, option)
        }
      })
    }
    return map
  }, [naturaOptions])

  const sezionaleById = useMemo(() => {
    const map = new Map()
    if (Array.isArray(config?.sezionali)) {
      config.sezionali.forEach((opt) => {
        if (opt && opt.id_sezionale !== undefined && opt.id_sezionale !== null) {
          map.set(String(opt.id_sezionale), opt)
        }
      })
    }
    return map
  }, [config?.sezionali])

  const resolvedSezionaleLabel = useMemo(() => {
    const id = clienteSezionaleId || formValues.id_sezionale || ''
    if (!id) return 'Non configurato'
    const opt = sezionaleById.get(String(id))
    if (!opt) return `ID ${id}`
    if (opt.code) return `${opt.code} - ${opt.label || opt.id_sezionale}`
    return opt.label || opt.id_sezionale || `ID ${id}`
  }, [clienteSezionaleId, formValues.id_sezionale, sezionaleById])

  const createEditableRow = useCallback((initial = {}) => {
    rowCounterRef.current += 1
    return {
      localId: `row-${rowCounterRef.current}`,
      id_riga: initial.id_riga ?? null,
      id_prodotto: initial.id_prodotto ?? null,
      id_categoria: initial.id_categoria ?? null,
      categoria_nome: initial.categoria_nome ?? null,
      descrizione: initial.descrizione ?? '',
      quantita:
        initial.quantita !== undefined && initial.quantita !== null
          ? String(initial.quantita)
          : '1',
      prezzo_unitario:
        initial.prezzo_unitario !== undefined && initial.prezzo_unitario !== null
          ? String(initial.prezzo_unitario)
          : '',
      sconto:
        initial.sconto !== undefined && initial.sconto !== null ? String(initial.sconto) : '',
      aliquota_iva:
        initial.aliquota_iva !== undefined && initial.aliquota_iva !== null
          ? String(initial.aliquota_iva)
          : '22',
      id_sdi_natura_iva: initial.id_sdi_natura_iva ?? null,
      combo_key: initial.combo_key ?? null,
    }
  }, [])

  const hydrateRowsFromRecord = useCallback(
    (current) => {
      rowCounterRef.current = 0
      const source = Array.isArray(current?.righe) ? current.righe : []
      if (source.length === 0) {
        return [createEditableRow()]
      }
      return source.map((row) =>
        createEditableRow({
          id_riga: row.id_riga,
          id_prodotto: row.id_prodotto,
          descrizione: row.descrizione,
          quantita: row.quantita,
          prezzo_unitario: row.prezzo_unitario,
          sconto: row.sconto,
          aliquota_iva: row.aliquota_iva,
          id_sdi_natura_iva: row.id_sdi_natura_iva,
        }),
      )
    },
    [createEditableRow],
  )

  useEffect(() => {
    if (!record) {
      setFormValues(createEmptyFormValues())
      setRows([])
      setSaveError(null)
      setSaveSuccess(null)
      setClienteSezionaleId('')
      return
    }
    setFormValues({
      ...createEmptyFormValues(),
      data_fattura: toDateInputValue(record.data_fattura),
      id_stato_fatt: record.id_stato_fatt ? String(record.id_stato_fatt) : '',
      id_sezionale: record.id_sezionale ? String(record.id_sezionale) : '',
      note: record.note ?? '',
      saldo:
        record.saldo !== null && record.saldo !== undefined ? String(record.saldo) : '',
      cliente_pec: record.cliente_pec ?? '',
      cliente_codice_sdi: record.cliente_codice_sdi ?? '',
      cliente_iban: record.cliente_iban ?? '',
      cliente_banca: record.cliente_banca ?? '',
      cliente_modalita_pagamento: record.cliente_modalita_pagamento ?? '',
      cliente_id_cond_pagamento: record.cliente_id_cond_pagamento
        ? String(record.cliente_id_cond_pagamento)
        : '',
      cliente_giorni_pagamento:
        record.cliente_giorni_pagamento !== null &&
          record.cliente_giorni_pagamento !== undefined
          ? String(record.cliente_giorni_pagamento)
          : '',
    })
    setRows(hydrateRowsFromRecord(record))
    setSaveError(null)
  }, [record, hydrateRowsFromRecord])

  useEffect(() => {
    if (!clienteSezionaleId) return
    setFormValues((prev) => {
      if (String(prev.id_sezionale || '') === String(clienteSezionaleId)) {
        return prev
      }
      return { ...prev, id_sezionale: String(clienteSezionaleId) }
    })
  }, [clienteSezionaleId])

  useEffect(() => {
    const run = async () => {
      if (!token || !record?.id_anagrafica) {
        setClienteSezionaleId('')
        return
      }
      try {
        const det = await fetchAnagraficaDetail({ token, id: record.id_anagrafica })
        const sez = det?.fiscale?.id_sezionale ?? ''
        setClienteSezionaleId(sez ? String(sez) : '')
      } catch {
        setClienteSezionaleId('')
      }
    }
    run()
  }, [token, record?.id_anagrafica])

  const statiOptions = useMemo(
    () => (Array.isArray(config?.stati) ? config.stati : []),
    [config],
  )
  const statiById = useMemo(() => {
    const map = {}
    statiOptions.forEach((option) => {
      const numericId = Number(option?.id_stato)
      if (Number.isFinite(numericId)) {
        map[numericId] = option
      }
    })
    return map
  }, [statiOptions])
  const statiByCode = useMemo(() => {
    const map = {}
    statiOptions.forEach((option) => {
      if (option?.code) {
        map[option.code] = option
      }
    })
    return map
  }, [statiOptions])
  const rifiutataStatusId = useMemo(() => {
    const match = statiByCode.rifiutata
    if (!match?.id_stato) return null
    const numericId = Number(match.id_stato)
    return Number.isFinite(numericId) ? numericId : null
  }, [statiByCode])
  const currentStatusId = useMemo(() => {
    if (!record?.id_stato_fatt) return null
    const numeric = Number(record.id_stato_fatt)
    return Number.isFinite(numeric) ? numeric : null
  }, [record])
  const currentStatusCode = useMemo(() => {
    if (currentStatusId == null) return null
    return statiById[currentStatusId]?.code ?? null
  }, [currentStatusId, statiById])
  const currentStatusLabel = useMemo(() => {
    if (record?.stato_label) {
      return record.stato_label
    }
    if (currentStatusId != null && statiById[currentStatusId]?.label) {
      return statiById[currentStatusId].label
    }
    if (currentStatusId != null && CONCLUSIVE_STATUS_IDS.includes(currentStatusId)) {
      return FINAL_STEP_FALLBACK_LABEL
    }
    return null
  }, [record, currentStatusId, statiById])
  const finalStepLabel = useMemo(() => {
    if (currentStatusId != null && CONCLUSIVE_STATUS_IDS.includes(currentStatusId)) {
      return currentStatusLabel || FINAL_STEP_FALLBACK_LABEL
    }
    const fallback = CONCLUSIVE_STATUS_IDS.map((id) => statiById[id]?.label).find(Boolean)
    return fallback || FINAL_STEP_FALLBACK_LABEL
  }, [currentStatusId, currentStatusLabel, statiById])
  const timelineSteps = useMemo(() => {
    const getIdByCode = (code) => {
      const match = statiByCode[code]
      if (match?.id_stato == null) return null
      const numericId = Number(match.id_stato)
      return Number.isFinite(numericId) ? numericId : null
    }
    const baseSteps = TIMELINE_BASE_STEPS.map((step) => {
      const matchId = getIdByCode(step.code)
      const state = statiByCode[step.code]
      return {
        key: step.code,
        label: state?.label || step.fallbackLabel,
        matchIds: matchId ? [matchId] : [],
        timeline_icon: state?.timeline_icon ?? null,
        timeline_color: state?.timeline_color ?? null,
        timeline_icon_symbol: resolveIconSymbol(state?.timeline_icon ?? ''),
      }
    })
    const finalState = currentStatusId != null ? statiById[currentStatusId] : null
    baseSteps.push({
      key: 'conclusione',
      label: finalStepLabel,
      matchIds: CONCLUSIVE_STATUS_IDS,
      timeline_icon: finalState?.timeline_icon ?? null,
      timeline_color: finalState?.timeline_color ?? null,
      timeline_icon_symbol: resolveIconSymbol(finalState?.timeline_icon ?? ''),
    })
    return baseSteps
  }, [statiByCode, finalStepLabel, statiById, currentStatusId])
  const activeStatusStep = useMemo(() => {
    if (!timelineSteps.length) return 0
    if (currentStatusId == null) return 1
    const idx = timelineSteps.findIndex(
      (step) => Array.isArray(step.matchIds) && step.matchIds.includes(currentStatusId),
    )
    return idx >= 0 ? idx + 1 : 1
  }, [timelineSteps, currentStatusId])

  const finalStatusVariant = useMemo(() => {
    if (currentStatusId == null || !CONCLUSIVE_STATUS_IDS.includes(currentStatusId)) {
      return null
    }
    if (currentStatusCode === 'scaduta') {
      return 'scaduta'
    }
    if (currentStatusCode === 'pagataparziale') {
      return 'partial'
    }
    return 'paid'
  }, [currentStatusId, currentStatusCode])

  const documentTypeLabel = useMemo(() => {
    if (!record) return null
    return record.tipo_label || record.tipo_code || null
  }, [record])

  const documentTypeCode = useMemo(() => {
    if (!record?.tipo_code) return null
    return String(record.tipo_code).toLowerCase()
  }, [record?.tipo_code])

  const isCreditNoteDocument = documentTypeCode === 'nota_credito'

  const documentTypeBadgeVariant = useMemo(() => {
    if (!documentTypeLabel) return 'secondary'
    return isCreditNoteDocument ? 'danger' : 'primary'
  }, [documentTypeLabel, isCreditNoteDocument])

  const timelineStepperClass = useMemo(
    () =>
      ['invoice-timeline-stepper', finalStatusVariant ? `invoice-timeline-stepper--${finalStatusVariant}` : null]
        .filter(Boolean)
        .join(' '),
    [finalStatusVariant],
  )

  // Applica colori/icone custom alla timeline stepper in base ai metadata stato.
  useEffect(() => {
    const stepperRoot = document.querySelector('.invoice-timeline-stepper')
    if (!stepperRoot) return
    const stepElements = Array.from(stepperRoot.querySelectorAll('.stepper-step'))
    stepElements.forEach((step, index) => {
      const meta = timelineSteps[index]
      const indicator = step.querySelector('.stepper-step-indicator')
      const indicatorText = step.querySelector('.stepper-step-indicator-text')
      if (indicator) {
        const color = meta?.timeline_color ? String(meta.timeline_color).trim() : ''
        indicator.style.backgroundColor = color
        indicator.style.borderColor = color
      }
      if (indicatorText) {
        const symbol = meta?.timeline_icon_symbol ?? ''
        if (symbol) {
          indicatorText.setAttribute('data-icon', symbol)
        } else {
          indicatorText.removeAttribute('data-icon')
        }
      }
    })
  }, [timelineSteps])

  // Aggiorna lo stato timeline della fattura con persistenza backend.
  const handleTimelineStatusChange = useCallback(async (nextStatusId) => {
    if (!record || !token) return
    const numericId = Number(nextStatusId)
    if (!Number.isFinite(numericId) || numericId <= 0) return
    const previousStatusId = record?.id_stato_fatt ? Number(record.id_stato_fatt) : null
    if (previousStatusId === numericId) return

    const wantsRejectTransition =
      rifiutataStatusId !== null &&
      numericId === rifiutataStatusId &&
      previousStatusId !== rifiutataStatusId
    if (wantsRejectTransition) {
      const confirmMessage =
        'Confermi di generare automaticamente una nota di credito e impostare lo stato su "Rifiutata"?'
      const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : true
      if (!confirmed) {
        return
      }
    }

    setStatusUpdating(true)
    setStatusUpdateError(null)
    setStatusUpdateSuccess(null)
    try {
      const updated = await updateFatturaDetail({
        token,
        id: record.id_fattura,
        id_stato_fatt: numericId,
      })
      if (updated) {
        setRecord(updated)
        setFormValues((prev) => ({
          ...prev,
          id_stato_fatt: updated.id_stato_fatt ? String(updated.id_stato_fatt) : '',
        }))
        const updatedStatusId = updated.id_stato_fatt ? Number(updated.id_stato_fatt) : null
        if (updatedStatusId !== null && updatedStatusId !== previousStatusId) {
          const now = new Date().toISOString()
          const fromLabel =
            previousStatusId !== null
              ? statiById[previousStatusId]?.label || record?.stato_label || `#${previousStatusId}`
              : 'N.D.'
          const toLabel =
            statiById[updatedStatusId]?.label ||
            updated?.stato_label ||
            `#${updatedStatusId}`
          const operatorName = user?.username || user?.name || user?.email || 'Operatore'
          setStatusLog((prev) => [
            {
              at: now,
              from_status_id: previousStatusId,
              from_status: fromLabel,
              to_status_id: updatedStatusId,
              to_status: toLabel,
              user_name: operatorName,
            },
            ...prev,
          ])
        }
      }
      setStatusUpdateSuccess('Stato fattura aggiornato correttamente.')
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setStatusUpdateError(err)
    } finally {
      setStatusUpdating(false)
    }
  }, [logout, record, rifiutataStatusId, statiById, token, user])

  const metodiPagamentoOptions = useMemo(
    () => (Array.isArray(config?.metodi_pagamento) ? config.metodi_pagamento : []),
    [config],
  )

  const modalitaPagamentoOptions = useMemo(
    () => (Array.isArray(config?.modalita_pagamento) ? config.modalita_pagamento : []),
    [config],
  )

  const formDisabled = saving || loading || !record || isCustomerAccount

  const numeroDisplay = useMemo(() => {
    if (!record) return '-'
    const { anno, numero_documento: numero } = record
    if (anno && numero) return `${anno}/${numero}`
    if (numero) return String(numero)
    return '-'
  }, [record])

  // Totali derivati dalle righe correnti (fallback ai valori record).
  const rowsTotals = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        imponibile: record?.totale_imponibile ?? 0,
        sconto: record?.totale_sconto ?? 0,
        iva: record?.totale_iva ?? 0,
        totale: record?.totale ?? 0,
      }
    }
    return rows.reduce(
      (acc, row) => {
        const amounts = computeRowAmounts(row)
        if (amounts.imponibile !== null) {
          acc.imponibile += amounts.imponibile
        }
        if (amounts.discount !== null) {
          acc.sconto += amounts.discount
        }
        if (amounts.iva !== null) {
          acc.iva += amounts.iva
        }
        if (amounts.totale !== null) {
          acc.totale += amounts.totale
        }
        return acc
      },
      { imponibile: 0, sconto: 0, iva: 0, totale: 0 },
    )
  }, [rows, record])

  // Riepilogo IVA per aliquota/natura utile al riepilogo fiscale.
  const ivaSummary = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return []
    }

    const buckets = new Map()
    rows.forEach((row) => {
      const amounts = computeRowAmounts(row)
      if (
        amounts.imponibile === null &&
        amounts.iva === null &&
        amounts.totale === null
      ) {
        return
      }
      const alias = row?.aliquota_iva
      const numericAliquota =
        alias !== '' && alias !== null && alias !== undefined ? Number(alias) : null
      const hasAliquota = Number.isFinite(numericAliquota)
      const key = hasAliquota ? numericAliquota.toFixed(2) : 'NA'
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          aliquota: hasAliquota ? numericAliquota : null,
          imponibile: 0,
          iva: 0,
          totale: 0,
          naturaIds: new Set(),
        })
      }
      const bucket = buckets.get(key)
      if (amounts.imponibile !== null) {
        bucket.imponibile += amounts.imponibile
      }
      if (amounts.iva !== null) {
        bucket.iva += amounts.iva
      }
      if (amounts.totale !== null) {
        bucket.totale += amounts.totale
      }
      if (bucket.aliquota === 0 && row.id_sdi_natura_iva) {
        const natId = Number(row.id_sdi_natura_iva)
        if (Number.isFinite(natId) && natId > 0) {
          bucket.naturaIds.add(natId)
        }
      }
    })

    return Array.from(buckets.values()).map((bucket) => {
      const naturaLabel =
        bucket.aliquota === 0 && bucket.naturaIds.size > 0
          ? Array.from(bucket.naturaIds)
            .map((id) => naturaMap.get(id)?.label || `Natura ${id}`)
            .join(', ')
          : null
      return {
        aliquota: bucket.aliquota,
        imponibile: bucket.imponibile,
        iva: bucket.iva,
        totale: bucket.totale,
        naturaLabel,
      }
    })
  }, [rows, naturaMap])

  const clienteAltriDati = useMemo(() => {
    if (!record?.cliente_altri_dati) {
      return null
    }
    const raw =
      typeof record.cliente_altri_dati === 'string'
        ? record.cliente_altri_dati.trim()
        : record.cliente_altri_dati
    if (!raw || (typeof raw === 'string' && raw === '')) {
      return null
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch (_err) {
        return raw
      }
    }
    return raw
  }, [record])
  const currentPaymentTermId = useMemo(() => {
    const raw = formValues.cliente_id_cond_pagamento
    if (raw === null || raw === undefined || raw === '') {
      return null
    }
    const numeric = Number(raw)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }, [formValues.cliente_id_cond_pagamento])

  // Piano scadenze calcolato dal termine pagamento selezionato.
  const paymentSchedule = useMemo(() => {
    const defaultSchedule = Array.isArray(record?.condizioni_pagamento_rate)
      ? record.condizioni_pagamento_rate
      : []
    const selectedTermId = Number(
      currentPaymentTermId ?? record?.cliente_id_cond_pagamento ?? 0,
    )
    if (!Number.isFinite(selectedTermId) || selectedTermId <= 0 || paymentTerms.length === 0) {
      return defaultSchedule
    }

    const term = paymentTerms.find(
      (item) => Number(item?.id) === selectedTermId || Number(item?.id_termine) === selectedTermId,
    )
    if (!term) {
      return defaultSchedule
    }

    const invoiceDate = formValues.data_fattura || record?.data_fattura
    const schedule = buildScheduleFromTerm(term, invoiceDate, record?.totale)
    return schedule.length > 0 ? schedule : defaultSchedule
  }, [
    currentPaymentTermId,
    formValues.cliente_id_cond_pagamento,
    formValues.data_fattura,
    paymentTerms,
    record?.condizioni_pagamento_rate,
    record?.data_fattura,
    record?.totale,
  ])

  const currentPaymentTermLabel = useMemo(() => {
    if (currentPaymentTermId !== null) {
      const term = paymentTerms.find(
        (item) =>
          Number(item?.id) === currentPaymentTermId ||
          Number(item?.id_termine) === currentPaymentTermId,
      )
      if (term?.label) {
        return term.label
      }
    }
    return record?.cliente_condizioni_pagamento ?? null
  }, [currentPaymentTermId, paymentTerms, record?.cliente_condizioni_pagamento])

  const currentPaymentTermInList = useMemo(() => {
    if (currentPaymentTermId === null) {
      return false
    }
    return paymentTerms.some((term) => Number(term?.id) === currentPaymentTermId)
  }, [currentPaymentTermId, paymentTerms])

  // Aggiorna i campi principali del form fattura.
  const handleFormChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSaveError(null)
    setSaveSuccess(null)
  }

  const resetPaymentForm = useCallback(() => {
    setPaymentForm({
      id_pagamento: null,
      data_pagamento: toDateInputValue(new Date()),
      importo: '',
      id_metodo: '',
      id_mp: '',
      note: '',
    })
    setPaymentSaveError(null)
  }, [])

  const openPaymentModal = (payment = null) => {
    if (payment && payment.id_pagamento) {
      setPaymentForm({
        id_pagamento: payment.id_pagamento,
        data_pagamento: toDateInputValue(payment.data_pagamento),
        importo:
          payment.importo !== undefined && payment.importo !== null
            ? String(payment.importo)
            : '',
        id_metodo: payment.id_metodo !== null && payment.id_metodo !== undefined ? String(payment.id_metodo) : '',
        id_mp: payment.id_mp !== null && payment.id_mp !== undefined ? String(payment.id_mp) : '',
        note: payment.note || '',
      })
    } else {
      resetPaymentForm()
    }
    setPaymentSaveError(null)
    setPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    if (paymentSaving) return
    setPaymentModalOpen(false)
    resetPaymentForm()
  }

  // Aggiorna i campi del form pagamento.
  const handlePaymentFieldChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setPaymentForm((prev) => ({
      ...prev,
      [field]: value,
    }))
    setPaymentSaveError(null)
  }

  // Inserisce/aggiorna un pagamento e sincronizza i totali.
  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    if (!token || !id) return
    const editingExisting = Boolean(paymentForm.id_pagamento)
    setPaymentSaving(true)
    setPaymentSaveError(null)
    try {
      await saveFatturaPagamento({
        token,
        id_fattura: id,
        id_pagamento: paymentForm.id_pagamento,
        data_pagamento: paymentForm.data_pagamento,
        importo: paymentForm.importo,
        id_metodo: paymentForm.id_metodo === '' ? undefined : Number(paymentForm.id_metodo),
        id_mp: paymentForm.id_mp === '' ? undefined : Number(paymentForm.id_mp),
        note: paymentForm.note,
      })
      setPaymentModalOpen(false)
      resetPaymentForm()
      setPaymentBanner(
        editingExisting ? 'Pagamento aggiornato con successo.' : 'Pagamento registrato con successo.',
      )
      setPaymentsReload((value) => value + 1)
      setReloadVersion((value) => value + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setPaymentSaveError(err)
    } finally {
      setPaymentSaving(false)
    }
  }

  const closeDeletePaymentModal = () => {
    if (paymentDeleting) return
    setPaymentDeleteTarget(null)
    setPaymentDeleteError(null)
  }

  // Elimina il pagamento selezionato.
  const handleDeletePayment = async () => {
    if (!paymentDeleteTarget || !token || !id) {
      return
    }
    setPaymentDeleting(true)
    setPaymentDeleteError(null)
    try {
      await deleteFatturaPagamento({
        token,
        id_fattura: id,
        id_pagamento: paymentDeleteTarget.id_pagamento,
      })
      setPaymentBanner('Pagamento eliminato.')
      setPaymentDeleteTarget(null)
      setPaymentsReload((value) => value + 1)
      setReloadVersion((value) => value + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setPaymentDeleteError(err)
    } finally {
      setPaymentDeleting(false)
    }
  }

  // Aggiorna i campi di una riga documento.
  const handleRowFieldChange = (rowId, field) => (event) => {
    const value = event?.target?.value ?? ''
    setRows((prev) =>
      prev.map((row) => {
        if (row.localId !== rowId) {
          return row
        }
        const updated = { ...row, [field]: value }
        if (field === 'aliquota_iva') {
          const numeric = Number(value)
          if (!Number.isFinite(numeric) || numeric !== 0) {
            updated.id_sdi_natura_iva = null
          }
        }
        return updated
      }),
    )
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Aggiunge una nuova riga vuota in fattura.
  const handleAddRow = () => {
    setRows((prev) => [...prev, createEditableRow()])
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Rimuove una riga dal documento.
  const handleRemoveRow = (rowId) => {
    setRows((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) {
        return prev
      }
      return prev.filter((row) => row.localId !== rowId)
    })
    setSaveError(null)
    setSaveSuccess(null)
  }

  // Gestisce cambio natura IVA su riga.
  const handleRowNaturaChange = (rowId) => (event) => {
    const rawValue = event?.target?.value ?? ''
    setRows((prev) =>
      prev.map((row) => {
        if (row.localId !== rowId) {
          return row
        }
        return {
          ...row,
          id_sdi_natura_iva: rawValue === '' ? null : Number(rawValue),
        }
      }),
    )
    setSaveError(null)
    setSaveSuccess(null)
  }

  const appendLinesToRows = useCallback(
    (lines) => {
      if (!Array.isArray(lines) || lines.length === 0) return
      setRows((prev) => [
        ...prev,
        ...lines.map((line) =>
          createEditableRow({
            descrizione: line.descrizione ?? '',
            quantita:
              line.quantita !== undefined && line.quantita !== null
                ? String(line.quantita)
                : '1',
            prezzo_unitario:
              line.prezzo_unitario !== undefined && line.prezzo_unitario !== null
                ? String(line.prezzo_unitario)
                : '',
            sconto:
              line.sconto !== undefined && line.sconto !== null
                ? String(line.sconto)
                : '',
            aliquota_iva:
              line.aliquota_iva !== undefined && line.aliquota_iva !== null
                ? String(line.aliquota_iva)
                : line.iva !== undefined && line.iva !== null
                  ? String(line.iva)
                  : '22',
            id_prodotto: line.id_prodotto ?? null,
            id_categoria: line.id_categoria ?? null,
            categoria_nome: line.categoria_nome ?? null,
            id_sdi_natura_iva: line.id_sdi_natura_iva ?? null,
            combo_key: line.combo_key ?? null,
          }),
        ),
      ])
      setSaveError(null)
      setSaveSuccess(null)
    },
    [createEditableRow],
  )

  const insertProductLine = useCallback(
    ({ product, quantity, price, ivaPerc, description, naturaId, comboKey }) => {
      if (!product) return
      const catId =
        product.id_categoria !== undefined && product.id_categoria !== null
          ? Number(product.id_categoria)
          : null
      const catName =
        catId && !Number.isNaN(catId)
          ? catOptions.find((c) => Number(c.id_categoria) === catId)?.nome ?? null
          : null
      appendLinesToRows([
        {
          descrizione: description ?? product.nome ?? '',
          quantita: quantity,
          prezzo_unitario: price,
          sconto: 0,
          aliquota_iva: ivaPerc,
          id_prodotto: product.id_prodotto ?? null,
          id_categoria: catId,
          categoria_nome: catName ?? product.categoria_nome ?? null,
          id_sdi_natura_iva: naturaId ?? null,
          combo_key: comboKey || null,
        },
      ])
    },
    [appendLinesToRows, catOptions],
  )

  // Ripristina il form ai valori caricati dal backend.
  const handleReset = () => {
    if (!record) return
    setFormValues({
      data_fattura: toDateInputValue(record.data_fattura),
      id_stato_fatt: record.id_stato_fatt ? String(record.id_stato_fatt) : '',
      note: record.note ?? '',
      saldo:
        record.saldo !== null && record.saldo !== undefined ? String(record.saldo) : '',
    })
    setRows(hydrateRowsFromRecord(record))
    setSaveError(null)
    setSaveSuccess(null)
  }

  const resetProductModal = useCallback(() => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    setProdVarOptions([])
    setModalQty(1)
    setModalPrice(0)
    setSelIva('22')
  }, [])

  const resetPkgModal = useCallback(() => {
    setPkgSearch('')
    setPkgOptions([])
    setSelPacchetto('')
    setPkgPreview([])
  }, [])

  const normalizeRowsForSubmit = useCallback((list) => {
    const normalized = []
    list.forEach((row, index) => {
      const descr = (row?.descrizione ?? '').trim()
      if (descr === '') {
        throw new Error(`La riga ${index + 1} deve avere una descrizione.`)
      }
      const qty = Number(row?.quantita)
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`La quantita della riga ${index + 1} deve essere maggiore di zero.`)
      }
      const price = Number(row?.prezzo_unitario)
      if (!Number.isFinite(price)) {
        throw new Error(`Il prezzo della riga ${index + 1} non e valido.`)
      }
      const discountValue =
        row?.sconto === '' || row?.sconto === null || row?.sconto === undefined
          ? null
          : Number(row.sconto)
      if (
        discountValue !== null &&
        (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100)
      ) {
        throw new Error(`Lo sconto della riga ${index + 1} deve essere compreso tra 0 e 100.`)
      }
      const ivaValue =
        row?.aliquota_iva === '' || row?.aliquota_iva === null || row?.aliquota_iva === undefined
          ? null
          : Number(row.aliquota_iva)
      if (ivaValue !== null && (!Number.isFinite(ivaValue) || ivaValue < 0 || ivaValue > 100)) {
        throw new Error(`L'IVA della riga ${index + 1} deve essere compresa tra 0 e 100.`)
      }
      let naturaId = row?.id_sdi_natura_iva ?? null
      if (ivaValue !== null && ivaValue === 0) {
        const parsedNatura = naturaId !== null ? Number(naturaId) : 0
        if (!Number.isFinite(parsedNatura) || parsedNatura <= 0) {
          throw new Error(`Se IVA e zero la natura deve essere selezionata per la riga ${index + 1}.`)
        }
        naturaId = parsedNatura
      } else if (ivaValue !== null && ivaValue > 0) {
        naturaId = null
      } else {
        naturaId = undefined
      }
      const comboKey = row?.combo_key ? String(row.combo_key) : null

      normalized.push({
        descrizione: descr,
        quantita: qty,
        prezzo_unitario: price,
        sconto: discountValue !== null ? discountValue : undefined,
        aliquota_iva: ivaValue !== null ? ivaValue : undefined,
        id_prodotto: row?.id_prodotto ?? undefined,
        id_sdi_natura_iva: naturaId,
        combo_key: comboKey || undefined,
      })
    })
    if (normalized.length === 0) {
      throw new Error('Inserire almeno una riga per la fattura.')
    }
    return normalized
  }, [])

  // Salva modifiche fattura (testata + righe).
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!record || !token) return

    const previousStatusId = showStatus && record?.id_stato_fatt ? Number(record.id_stato_fatt) : null
    const desiredStatusId = showStatus && formValues.id_stato_fatt ? Number(formValues.id_stato_fatt) : null
    const effectiveSezionale = clienteSezionaleId || formValues.id_sezionale || ''

    if (showStatus) {
      const wantsRejectTransition =
        desiredStatusId !== null &&
        rifiutataStatusId !== null &&
        desiredStatusId === rifiutataStatusId &&
        previousStatusId !== rifiutataStatusId
      if (wantsRejectTransition) {
        const confirmMessage =
          'Confermi di generare automaticamente una nota di credito e impostare lo stato su "Rifiutata"?'
        const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : true
        if (!confirmed) {
          setSaveError(null)
          setSaveSuccess(null)
          setFormValues((prev) => ({
            ...prev,
            id_stato_fatt: previousStatusId ? String(previousStatusId) : '',
          }))
          return
        }
      }
    }

    let linesPayload = []
    try {
      linesPayload = normalizeRowsForSubmit(rows)
    } catch (validationError) {
      setSaveError(validationError)
      setSaveSuccess(null)
      return
    }

    if (!effectiveSezionale) {
      setSaveError(new Error("Sezionale non configurato nell'anagrafica."))
      setSaveSuccess(null)
      return
    }

    let saldoValue = null
    if (!isAcquisto) {
      const parsed = Number(paymentsStats.saldo_residuo)
      saldoValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const updated = await updateFatturaDetail({
        token,
        id: record.id_fattura,
        data_fattura: formValues.data_fattura || undefined,
        note: formValues.note ?? '',
        id_stato_fatt:
          showStatus && formValues.id_stato_fatt ? Number(formValues.id_stato_fatt) : undefined,
        id_sezionale: clienteSezionaleId
          ? Number(clienteSezionaleId)
          : (formValues.id_sezionale ? Number(formValues.id_sezionale) : undefined),
        saldo: saldoValue,
        cliente_pec: formValues.cliente_pec,
        cliente_codice_sdi: formValues.cliente_codice_sdi,
        cliente_iban: formValues.cliente_iban,
        cliente_banca: formValues.cliente_banca,
        cliente_modalita_pagamento: formValues.cliente_modalita_pagamento,
        cliente_id_cond_pagamento: formValues.cliente_id_cond_pagamento,
        cliente_giorni_pagamento: formValues.cliente_giorni_pagamento,
        righe: linesPayload,
      })
      if (updated) {
        setRecord(updated)
        if (showStatus) {
          const updatedStatusId = updated.id_stato_fatt ? Number(updated.id_stato_fatt) : null
          if (
            desiredStatusId !== null &&
            updatedStatusId !== null &&
            updatedStatusId !== previousStatusId
          ) {
            const now = new Date().toISOString()
            const fromLabel =
              previousStatusId !== null
                ? statiById[previousStatusId]?.label || record?.stato_label || `#${previousStatusId}`
                : 'N.D.'
            const toLabel =
              statiById[updatedStatusId]?.label ||
              updated?.stato_label ||
              `#${updatedStatusId}`
            const operatorName = user?.username || user?.name || user?.email || 'Operatore'
            setStatusLog((prev) => [
              {
                at: now,
                from_status_id: previousStatusId,
                from_status: fromLabel,
                to_status_id: updatedStatusId,
                to_status: toLabel,
                user_name: operatorName,
              },
              ...prev,
            ])
          }
        }
      }
      setSaveSuccess('Fattura aggiornata correttamente.')
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

  // Azione salvataggio esposta nella breadcrumb action bar.
  const handleBreadcrumbSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }, [])

  // Trigger manuale refresh dati dettaglio.
  const handleRefreshData = useCallback(async () => {
    if (!record || !token) {
      setReloadVersion((prev) => prev + 1)
      return
    }
    try {
      await updateFatturaDetail({
        token,
        id: record.id_fattura,
        ricalcola_saldi: true,
      })
      setReloadVersion((prev) => prev + 1)
      setPaymentsReload((prev) => prev + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
      setSaveSuccess(null)
    }
  }, [logout, record, token])

  // Esporta XML SDI della fattura corrente.
  const handleExportXml = useCallback(async () => {
    if (!record || !token) {
      return
    }
    setExportError(null)
    setExportingXml(true)
    try {
      const { blob, filename } = await exportFatturaXml({
        token,
        id: record.id_fattura,
      })
      const downloadName = filename || `fattura-${record.id_fattura}.xml`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setExportError(err)
    } finally {
      setExportingXml(false)
    }
  }, [logout, record, token])

  // Apre PDF fattura in nuova scheda.
  const handlePrintPdf = useCallback(() => {
    if (!record || typeof window === 'undefined') {
      return
    }
    const url = buildFatturaPdfUrl(record.id_fattura)
    if (!url) {
      return
    }
    window.open(url, '_blank', 'noopener')
  }, [record])

  useEffect(() => {
    if (!id) {
      clearBreadcrumbActions()
      return
    }
    const actions = [
      {
        id: 'fattura-refresh',
        icon: cilReload,
        label: loading ? 'Aggiornamento dati...' : 'Aggiorna dati',
        onClick: handleRefreshData,
        disabled: loading,
      },
    ]
    if (record) {
      actions.push({
        id: 'fattura-save',
        icon: cilSave,
        label: saving ? 'Salvataggio fattura...' : 'Salva fattura',
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
    handleRefreshData,
    id,
    loading,
    record,
    saving,
    setBreadcrumbActions,
  ])

  return (
    <CCard className={isCustomerAccount ? 'customer-readonly' : undefined}>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-baseline gap-2 flex-wrap mb-1">
              <h5 className="mb-0">Fattura {numeroDisplay}</h5>
              {documentTypeLabel && (
                <CBadge color={documentTypeBadgeVariant} className="text-uppercase">
                  {documentTypeLabel}
                </CBadge>
              )}
            </div>
            <small className="text-body-secondary">
              Dettaglio documento {record?.id_fattura ? `#${record.id_fattura}` : ''}
            </small>
          </div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="ghost" onClick={handlePrintPdf} disabled={!record}>
              <CIcon icon={cilPrint} className="me-2" />
              Stampa PDF
            </CButton>
            {!isAcquisto && !isCustomerAccount && (
              <CButton color="primary" onClick={handleExportXml} disabled={!record || exportingXml}>
                {exportingXml ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Esportazione...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCloudDownload} className="me-2" />
                    Esporta XML SdI
                  </>
                )}
              </CButton>
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
          <CAlert color="danger">{error.message || 'Impossibile caricare la fattura.'}</CAlert>
        )}

        {!loading && !error && !record && (
          <CAlert color="warning">Fattura non trovata.</CAlert>
        )}

        {!loading && !error && record && (
          <>
            {saveError && (
              <CAlert color="danger" className="mb-4">
                {saveError.message || 'Errore durante il salvataggio della fattura.'}
              </CAlert>
            )}
            {exportError && (
              <CAlert color="danger" className="mb-4">
                {exportError.message || 'Errore durante l\'esportazione XML.'}
              </CAlert>
            )}
            {naturaError && (
              <CAlert color="warning" className="mb-4">
                {naturaError.message || 'Impossibile caricare le nature IVA.'}
              </CAlert>
            )}
            {saveSuccess && (
              <CAlert color="success" className="mb-4">
                {saveSuccess}
              </CAlert>
            )}

            <CRow className="mb-4 gy-3">
              <CCol md={3}>
                <div className="text-body-secondary small">{counterpartyLabel}</div>
                <div className="fw-semibold">{record.cliente_ragione_sociale || '-'}</div>
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Partita IVA</div>
                <div className="fw-semibold">{record.cliente_piva || '-'}</div>
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Cod. fiscale</div>
                <div className="fw-semibold">{record.cliente_codice_fiscale || '-'}</div>
              </CCol>
              {showStatus && (
                <CCol md={3}>
                  <div className="text-body-secondary small">Stato attuale</div>
                  {record.stato_label ? (
                    <CBadge color="secondary">{record.stato_label}</CBadge>
                  ) : (
                    <span className="text-body-secondary">-</span>
                  )}
                </CCol>
              )}
              <CCol md={3}>
                <div className="text-body-secondary small">Data fattura</div>
                <div className="fw-semibold">{formatDate(record.data_fattura)}</div>
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Ultimo aggiornamento</div>
                <div className="fw-semibold">
                  {record.updated_at ? formatDate(record.updated_at) : '-'}
                </div>
              </CCol>
            </CRow>

            {showStatusTimeline && (
              <section className="mb-4">
                <h6 className="mb-3 text-body-secondary">Timeline stato documento</h6>
                <div className="border rounded p-3 bg-body-tertiary">
                  <CNav variant="tabs" role="tablist" className="mb-3">
                    <CNavItem>
                      <CNavLink
                        role="tab"
                        aria-selected={statusTab === 'timeline'}
                        active={statusTab === 'timeline'}
                        onClick={() => setStatusTab('timeline')}
                      >
                        Timeline
                      </CNavLink>
                    </CNavItem>
                    <CNavItem>
                      <CNavLink
                        role="tab"
                        aria-selected={statusTab === 'log'}
                        active={statusTab === 'log'}
                        onClick={() => setStatusTab('log')}
                      >
                        Log
                      </CNavLink>
                    </CNavItem>
                  </CNav>
                  <CTabContent>
                    <CTabPane visible={statusTab === 'timeline'} role="tabpanel">
                      {timelineSteps.length > 0 ? (
                        <>
                          {statusUpdateError && (
                            <CAlert color="danger" className="mb-3">
                              {statusUpdateError?.message ||
                                "Errore durante l'aggiornamento dello stato."}
                            </CAlert>
                          )}
                          {statusUpdateSuccess && (
                            <CAlert color="success" className="mb-3">{statusUpdateSuccess}</CAlert>
                          )}
                          <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                            <small className="text-body-secondary">Stato attuale:</small>
                            {currentStatusLabel ? (
                              <CBadge color="secondary">{currentStatusLabel}</CBadge>
                            ) : (
                              <span className="text-body-secondary">N.D.</span>
                            )}
                            {statusUpdating && <CSpinner size="sm" />}
                          </div>
                          <div className={timelineStepperClass}>
                            <CStepper
                              className="w-100"
                              activeStepNumber={activeStatusStep || 1}
                              steps={timelineSteps.map((step) => step.label)}
                              linear={false}
                              validation={false}
                              onStepChange={(step) => {
                                if (statusUpdating || saving) return
                                const index = Number(step) - 1
                                if (!Number.isFinite(index) || index < 0) return
                                const meta = timelineSteps[index]
                                if (!meta || !Array.isArray(meta.matchIds) || meta.matchIds.length !== 1) {
                                  return
                                }
                                handleTimelineStatusChange(meta.matchIds[0])
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <small className="text-body-secondary">Nessuno stato configurato.</small>
                      )}
                    </CTabPane>
                    <CTabPane visible={statusTab === 'log'} role="tabpanel">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <h6 className="mb-0 text-body-secondary">Log cambi stato</h6>
                        {statusLogLoading && <CSpinner size="sm" />}
                      </div>
                      {statusLogError && (
                        <CAlert color="danger" className="mb-0">
                          Impossibile caricare il log degli stati.
                        </CAlert>
                      )}
                      {!statusLogError && statusLog.length === 0 && !statusLogLoading && (
                        <small className="text-body-secondary">Nessun evento registrato.</small>
                      )}
                      {!statusLogError && statusLog.length > 0 && (
                        <CTable data-testid="table" small responsive className="mb-0">
                          <CTableHead className="mp-table-head">
                            <CTableRow>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell>Transizione</CTableHeaderCell>
                              <CTableHeaderCell>Operatore</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {statusLog.map((entry, index) => (
                              <CTableRow key={`${entry.at || entry.timestamp || entry.created_at || index}-${index}`}>
                                <CTableDataCell className="text-nowrap">
                                  {formatDateTime(entry.at || entry.timestamp || entry.created_at || entry.ts)}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {entry.from_status
                                    ? `${entry.from_status} → ${entry.to_status || ''}`
                                    : entry.to_status || '-'}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div>{entry.user_name || entry.username || entry.user || '-'}</div>
                                  {entry.app && (
                                    <small className="text-body-secondary">{entry.app}</small>
                                  )}
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      )}
                    </CTabPane>
                  </CTabContent>
                </div>
              </section>
            )}

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Dati fiscali {counterpartyLabel.toLowerCase()}</h6>
              <div className="border rounded p-3 bg-body-tertiary">
                <CRow className="g-3">
                  <CCol md={4}>
                    <CFormLabel>PEC</CFormLabel>
                    <CFormInput
                      type="email"
                      value={formValues.cliente_pec}
                      onChange={handleFormChange('cliente_pec')}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Codice destinatario / SdI</CFormLabel>
                    <CFormInput
                      value={formValues.cliente_codice_sdi}
                      onChange={handleFormChange('cliente_codice_sdi')}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>IBAN</CFormLabel>
                    <CFormInput
                      value={formValues.cliente_iban}
                      onChange={handleFormChange('cliente_iban')}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Banca</CFormLabel>
                    <CFormInput
                      value={formValues.cliente_banca}
                      onChange={handleFormChange('cliente_banca')}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Modalità di pagamento</CFormLabel>
                    <CFormInput
                      value={formValues.cliente_modalita_pagamento}
                      onChange={handleFormChange('cliente_modalita_pagamento')}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Condizione di pagamento</CFormLabel>
                    <CFormSelect
                      value={formValues.cliente_id_cond_pagamento}
                      onChange={handleFormChange('cliente_id_cond_pagamento')}
                      disabled={formDisabled || paymentTermsLoading}
                    >
                      <option value="">
                        {paymentTermsLoading
                          ? 'Caricamento...'
                          : 'Rimuovi override (usa impostazioni cliente)'}
                      </option>
                      {paymentTerms.map((term) => (
                        <option key={`term-${term.id}`} value={String(term.id)}>{term.label}</option>
                      ))}
                      {!currentPaymentTermInList && currentPaymentTermId !== null && (
                        <option value={String(currentPaymentTermId)}>
                          {currentPaymentTermLabel || `Condizione #${currentPaymentTermId}`}
                        </option>
                      )}
                    </CFormSelect>
                    <small className="text-body-secondary d-block mt-1">
                      {currentPaymentTermLabel
                        ? `Attuale: ${currentPaymentTermLabel}`
                        : 'Nessuna condizione attiva'}
                      {record?.cliente_id_cond_pagamento
                        ? ` (#${record.cliente_id_cond_pagamento})`
                        : ''}
                    </small>
                    {paymentTermsError && (
                      <small className="text-danger d-block">
                        {paymentTermsError.message ||
                          'Impossibile caricare le condizioni di pagamento.'}
                      </small>
                    )}
                  </CCol>
                  {clienteAltriDati && (
                    <CCol xs={12}>
                      <div className="text-body-secondary small mb-1">Altri dati</div>
                      {typeof clienteAltriDati === 'string' ? (
                        <div className="border rounded bg-white p-2 small text-break">
                          {clienteAltriDati}
                        </div>
                      ) : (
                        <pre className="border rounded bg-white p-2 small mb-0">
                          {JSON.stringify(clienteAltriDati, null, 2)}
                        </pre>
                      )}
                    </CCol>
                  )}
                  {paymentSchedule.length > 0 && (
                    <div className="mt-3">
                      <div className="text-body-secondary small mb-2">Rate e scadenze</div>
                      <CTable data-testid="table" bordered responsive size="sm" className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell scope="col">Rata</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Data scadenza</CTableHeaderCell>
                            <CTableHeaderCell scope="col" className="text-end">
                              Importo
                            </CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {paymentSchedule.map((item) => (
                            <CTableRow key={`${item.index}-${item.due_date}`}>
                              <CTableDataCell>{item.label || `Rata ${item.index}`}</CTableDataCell>
                              <CTableDataCell>{formatDate(item.due_date)}</CTableDataCell>
                              <CTableDataCell className="text-end">
                                {formatCurrency(item.amount)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </div>
                  )}
                </CRow>
              </div>
            </section>
            <CForm id="fattura-detail-form" onSubmit={handleSubmit} ref={formRef}>
              <CRow className="g-3 mb-4">
                <CCol md={3}>
                  <CFormLabel>Data fattura</CFormLabel>
                  <CFormInput
                    type="date"
                    value={formValues.data_fattura}
                    onChange={handleFormChange('data_fattura')}
                    required
                    disabled={formDisabled}
                  />
                </CCol>
                {showSezionale && (
                  <CCol md={3}>
                    <CFormLabel>Sezionale</CFormLabel>
                    <CFormInput value={resolvedSezionaleLabel} disabled readOnly />
                  </CCol>
                )}
                {showStatus && (
                  <CCol md={3}>
                    <CFormLabel>Stato</CFormLabel>
                    <CFormSelect
                      value={formValues.id_stato_fatt}
                      onChange={handleFormChange('id_stato_fatt')}
                      disabled={formDisabled || configLoading}
                    >
                      <option value="">Seleziona stato</option>
                      {statiOptions.map((option) => (
                        <option key={option.id_stato} value={option.id_stato}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                )}
                {!isAcquisto && (
                  <CCol md={3}>
                    <CFormLabel>Saldo residuo</CFormLabel>
                    <CFormInput
                      type="text"
                      value={formatCurrency(paymentsStats.saldo_residuo)}
                      disabled
                      readOnly
                    />
                    <small className="text-body-secondary d-block mt-1">
                      Calcolato automaticamente dai pagamenti registrati.
                    </small>
                  </CCol>
                )}
                <CCol xs={12}>
                  <CFormLabel>Note</CFormLabel>
                  <CFormTextarea
                    rows={4}
                    value={formValues.note}
                    onChange={handleFormChange('note')}
                    disabled={formDisabled}
                  />
                </CCol>
              </CRow>
            </CForm>
            {showPayments && (
              <section className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h6 className="mb-0 text-body-secondary">Pagamenti registrati</h6>
                </div>
                {paymentBanner && (
                  <CAlert color="success" className="mb-3">
                    {paymentBanner}
                  </CAlert>
                )}
                {paymentsError && (
                  <CAlert color="danger" className="mb-3">
                    {paymentsError.message || 'Impossibile caricare i pagamenti.'}
                  </CAlert>
                )}
                <div className="border rounded p-3 mb-3 bg-body-tertiary">
                  {documentTypeLabel && (
                    <div className="d-flex justify-content-end mb-2">
                      <CBadge color={documentTypeBadgeVariant} className="text-uppercase">
                        {documentTypeLabel}
                      </CBadge>
                    </div>
                  )}
                  <CRow className="g-3">
                    <CCol md={4}>
                      <div className="text-body-secondary small">Totale documento</div>
                      <div className="fw-semibold">{formatCurrency(paymentsStats.totale_documento)}</div>
                    </CCol>
                    <CCol md={4}>
                      <div className="text-body-secondary small">Pagato</div>
                      <div className="fw-semibold text-success">
                        {formatCurrency(paymentsStats.totale_pagato)}
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="text-body-secondary small">Residuo stimato</div>
                      <div className="fw-semibold">{formatCurrency(paymentsStats.saldo_residuo)}</div>
                    </CCol>
                  </CRow>
                </div>
                {paymentsLoading ? (
                  <div className="d-flex justify-content-center py-4">
                    <CSpinner color="primary" />
                  </div>
                ) : payments.length === 0 ? (
                  <CAlert color="info">Nessun pagamento registrato.</CAlert>
                ) : (
                  <CTable data-testid="table" responsive hover>
                    <CTableHead className="mp-table-head">
                      <CTableRow className="align-middle">
                        <CTableHeaderCell className="text-nowrap">ID pagamento</CTableHeaderCell>
                        <CTableHeaderCell>Data</CTableHeaderCell>
                        <CTableHeaderCell>Metodo</CTableHeaderCell>
                        <CTableHeaderCell>Modalità SdI</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                        <CTableHeaderCell>Note</CTableHeaderCell>
                        <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {payments.map((payment) => (
                        <CTableRow key={payment.id_pagamento}>
                          <CTableDataCell className="text-nowrap">
                            {payment.id_pagamento ? (
                              <CButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => navigate(`/pagamenti/dettaglio?id=${payment.id_pagamento}`)}
                              >
                                #{payment.id_pagamento}
                              </CButton>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>{formatDate(payment.data_pagamento)}</CTableDataCell>
                          <CTableDataCell>
                            {payment.metodo_label ? (
                              <>
                                <div className="fw-semibold">{payment.metodo_label}</div>
                                {payment.metodo_code && (
                                  <small className="text-body-secondary">{payment.metodo_code}</small>
                                )}
                              </>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {payment.mp_code ? (
                              <>
                                <div className="fw-semibold">{payment.mp_code}</div>
                                {payment.mp_label && (
                                  <small className="text-body-secondary">{payment.mp_label}</small>
                                )}
                              </>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formatCurrency(payment.importo)}
                          </CTableDataCell>
                          <CTableDataCell className="text-break">
                            {payment.note ? payment.note : <span className="text-body-secondary">-</span>}
                          </CTableDataCell>
                          <CTableDataCell className="text-center text-nowrap">
                            <CButton
                              color="link"
                              size="sm"
                              className="p-0 me-2"
                              onClick={() => openPaymentModal(payment)}
                              disabled={formDisabled}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="link"
                              size="sm"
                              className="text-danger p-0"
                              onClick={() => {
                                setPaymentDeleteError(null)
                                setPaymentDeleteTarget(payment)
                              }}
                              disabled={formDisabled}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </section>
            )}
            {configError && (
              <CAlert color="warning" className="mb-4">
                {configError.message || 'Impossibile caricare le configurazioni fattura.'}
              </CAlert>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-body-secondary">Righe fattura</h6>
              <div className="d-flex flex-wrap gap-2">
                {!isCustomerAccount && (
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddRow}
                    disabled={formDisabled}
                  >
                    <CIcon icon={cilPlus} className="me-2" />
                    Aggiungi riga
                  </CButton>
                )}
                {!isCustomerAccount && (
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetProductModal()
                      setStepperOpen(true)
                    }}
                    disabled={formDisabled}
                  >
                    Selettore prodotti
                  </CButton>
                )}
                {!isCustomerAccount && (
                  <CButton
                    color="primary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      resetPkgModal()
                      setPkgOpen(true)
                    }}
                    disabled={formDisabled}
                  >
                    Inserisci pacchetto
                  </CButton>
                )}
              </div>
            </div>

            <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Seleziona pacchetto</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CRow className="g-3 mb-3 align-items-end">
                  <CCol md={7}>
                    <CFormLabel>Ricerca</CFormLabel>
                    <CFormInput
                      placeholder="Nome o codice pacchetto"
                      value={pkgSearch}
                      onChange={(e) => setPkgSearch(e.target.value)}
                      disabled={formDisabled}
                    />
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Pacchetto</CFormLabel>
                    <CFormSelect
                      value={selPacchetto}
                      onChange={(e) => setSelPacchetto(e.target.value)}
                      disabled={formDisabled}
                    >
                      <option value="">Seleziona…</option>
                      {pkgOptions.map((p) => (
                        <option key={p.id_pacchetto} value={p.id_pacchetto}>
                          {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={12}>
                    <div className="form-check mt-2">
                      <input
                        id="pkgOnlyActive"
                        type="checkbox"
                        className="form-check-input"
                        checked={pkgOnlyActive}
                        onChange={(e) => setPkgOnlyActive(e.target.checked)}
                        disabled={formDisabled}
                      />
                      <label htmlFor="pkgOnlyActive" className="form-check-label">
                        Solo attivi
                      </label>
                    </div>
                  </CCol>
                </CRow>
                {pkgPreview.length > 0 && (
                  <div className="border rounded p-2">
                    <div className="fw-semibold mb-2">Righe del pacchetto</div>
                    <CTable data-testid="table" compact hover responsive>
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell>Descrizione</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Sconto %</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pkgPreview.map((r, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{r.descrizione}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              {Number(r.quantita) || 1}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {(Number(r.prezzo_unitario) || 0).toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {r.aliquota_iva ?? r.iva ?? '-'}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{r.sconto ?? 0}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div />
                <div className="d-flex gap-2">
                  <CButton color="link" onClick={() => setPkgOpen(false)}>
                    Annulla
                  </CButton>
                  <CButton
                    color="primary"
                    disabled={!selPacchetto || pkgPreview.length === 0 || formDisabled}
                    onClick={() => {
                      if (!selPacchetto || pkgPreview.length === 0) return
                      const lines = pkgPreview.map((r) => ({
                        descrizione: r.descrizione ?? '',
                        quantita: Number(r.quantita) || 1,
                        prezzo_unitario:
                          r.prezzo_unitario != null ? Number(r.prezzo_unitario) : Number(r.prezzo) || 0,
                        aliquota_iva:
                          r.aliquota_iva != null
                            ? Number(r.aliquota_iva)
                            : r.iva != null
                            ? Number(r.iva)
                            : 22,
                        sconto: r.sconto != null ? Number(r.sconto) : 0,
                        id_prodotto: r.id_prodotto ?? null,
                        id_pacchetto: Number(selPacchetto) || null,
                        id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                        id_categoria:
                          r.id_categoria !== undefined && r.id_categoria !== null ? Number(r.id_categoria) : null,
                        categoria_nome: r.categoria_nome ?? null,
                      }))
                      appendLinesToRows(lines)
                      setPkgOpen(false)
                    }}
                  >
                    Inserisci in fattura
                  </CButton>
                </div>
              </CModalFooter>
            </CModal>

            <CModal visible={stepperOpen} onClose={() => setStepperOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Selettore prodotti</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CStepper
                  activeStepNumber={prodStep}
                  steps={['Categoria', 'Prodotto', 'Variazioni', 'Riepilogo']}
                  linear={false}
                  validation={false}
                  onStepChange={(next) => {
                    if (formDisabled) return
                    if (Number(next) === prodStep) return
                    if (next <= prodStep) {
                      setProdStep(next)
                      return
                    }
                    if (next === 2) {
                      setProdStep(2)
                      return
                    }
                    if (next === 3) {
                      if (!selProd) return
                      if (prodComboList.length > 0) {
                        setProdStep(3)
                      } else {
                        setProdStep(4)
                      }
                      return
                    }
                    if (next === 4) {
                      if (!selProd) return
                      setProdStep(4)
                    }
                  }}
                />
                {prodStep === 1 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Categoria prodotto</CFormLabel>
                      <CFormSelect
                        value={selCat}
                        onChange={(e) => setSelCat(e.target.value)}
                        disabled={formDisabled}
                      >
                        <option value="">Tutte</option>
                        {catOptions.map((cat) => (
                          <option key={cat.id_categoria} value={cat.id_categoria}>
                            {cat.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
                {prodStep === 2 && (
                  <>
                    <CRow className="g-3 align-items-end">
                      <CCol md={6}>
                        <CFormLabel>Prodotto</CFormLabel>
                        <CFormSelect
                          value={selProd}
                          onChange={(e) => {
                            const pid = e.target.value
                            setSelProd(pid)
                            const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                            if (prod && prod.iva_percento != null) {
                              setSelIva(String(prod.iva_percento))
                            }
                          }}
                          disabled={formDisabled}
                        >
                          <option value="">Seleziona...</option>
                          {prodOptions.map((p) => (
                            <option key={p.id_prodotto} value={p.id_prodotto}>
                              {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Ricerca prodotto</CFormLabel>
                        <CFormInput
                          placeholder="Cerca per nome o codice"
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          disabled={formDisabled}
                        />
                      </CCol>
                    </CRow>
                    <CRow className="g-3 mt-2 align-items-end">
                      <CCol md={4}>
                        <CFormLabel>Quantità</CFormLabel>
                        <CFormInput
                          type="number"
                          min="1"
                          step="1"
                          value={modalQty}
                          onChange={(e) => setModalQty(Number(e.target.value) || 1)}
                          disabled={formDisabled}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Prezzo</CFormLabel>
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalPrice}
                          onChange={(e) => setModalPrice(Number(e.target.value) || 0)}
                          disabled={formDisabled}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>IVA %</CFormLabel>
                        <CFormInput
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={selIva}
                          onChange={(e) => setSelIva(e.target.value)}
                          disabled={formDisabled}
                        />
                      </CCol>
                    </CRow>
                  </>
                )}
                {prodStep === 3 && (
                  <CRow className="g-3">
                    {prodComboList.length > 0 ? (
                      <CCol md={12}>
                        <CFormLabel>Combinazioni disponibili</CFormLabel>
                        <CFormSelect
                          value={selectedComboKey}
                          onChange={(e) => {
                            const key = e.target.value
                            setSelectedComboKey(key)
                            const opt = prodComboList.find((r) => String(r.combo_key) === String(key))
                            if (!opt) {
                              setSelectedVarIds([])
                              return
                            }
                            const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                            setSelectedVarIds(ids)
                          }}
                          disabled={formDisabled}
                        >
                          <option value="">Seleziona combinazione…</option>
                          {prodComboList.map((combo) => {
                            const labels = Array.isArray(combo.var_ids)
                              ? combo.var_ids.map((idv) => {
                                const vv = prodVarOptions.find(
                                  (x) => Number(x.id_variazione) === Number(idv),
                                )
                                return vv ? (vv.categoria ? `${vv.categoria} - ${vv.nome}` : vv.nome) : idv
                              })
                              : []
                            return (
                              <option key={combo.combo_key} value={combo.combo_key}>
                                {labels.join(', ')} — {Number(combo.prezzo) ?? 0}
                              </option>
                            )
                          })}
                        </CFormSelect>
                      </CCol>
                    ) : (
                      <CCol md={12}>
                        <CAlert color="info" className="mb-0">
                          Nessuna combinazione definita per il prodotto selezionato.
                        </CAlert>
                      </CCol>
                    )}
                  </CRow>
                )}
                {prodStep === 4 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <div className="mb-2">
                        <strong>Prodotto:</strong>{' '}
                        {(() => {
                          const p = prodOptions.find((x) => String(x.id_prodotto) === String(selProd))
                          return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-'
                        })()}
                      </div>
                      {(() => {
                        const ids = selectedComboKey
                          ? selectedComboKey.split('+').map((id) => Number(id) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        if (!ids || ids.length === 0) return null
                        const groups = {}
                        ids.forEach((idv) => {
                          const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                          const cat = vv?.categoria ? String(vv.categoria) : 'Opzione'
                          const nm = vv ? String(vv.nome) : String(idv)
                          if (!groups[cat]) groups[cat] = []
                          groups[cat].push(nm)
                        })
                        const label = Object.entries(groups)
                          .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
                          .join(' ; ')
                        return (
                          <div className="mb-2">
                            <strong>Variazioni:</strong> {label}
                          </div>
                        )
                      })()}
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Quantità</CFormLabel>
                      <CFormInput
                        type="number"
                        min="1"
                        step="1"
                        value={modalQty}
                        onChange={(e) => setModalQty(Number(e.target.value) || 1)}
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Prezzo unitario</CFormLabel>
                      <CFormInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={modalPrice}
                        onChange={(e) => setModalPrice(Number(e.target.value) || 0)}
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={selIva}
                        onChange={(e) => setSelIva(e.target.value)}
                        disabled={formDisabled}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Natura IVA</CFormLabel>
                      <CFormSelect value="" onChange={() => { }} disabled>
                        <option value="">Selezione disponibile dopo l'inserimento</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div>
                  {prodStep > 1 && (
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={() => setProdStep((prev) => Math.max(1, prev - 1))}
                      disabled={formDisabled}
                    >
                      Indietro
                    </CButton>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <CButton color="link" onClick={() => setStepperOpen(false)}>
                    Annulla
                  </CButton>
                  {prodStep < 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        if (prodStep === 1) {
                          setProdStep(2)
                          return
                        }
                        if (prodStep === 2) {
                          if (!selProd) return
                          if (prodComboList.length === 0) {
                            setProdStep(4)
                            return
                          }
                          setProdStep(3)
                          return
                        }
                        if (prodStep === 3) {
                          setProdStep(4)
                        }
                      }}
                      disabled={(prodStep === 2 && !selProd) || formDisabled}
                    >
                      Avanti
                    </CButton>
                  )}
                  {prodStep === 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const ids = selectedComboKey
                          ? selectedComboKey.split('+').map((id) => Number(id) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        let descr = prod.nome
                        if (ids && ids.length > 0) {
                          const groups = {}
                          ids.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = vv?.categoria ? String(vv.categoria) : 'Opzione'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups)
                            .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
                            .join(' ; ')
                          descr = `${prod.nome} - ${label}`
                        }
                        const comboKey = Array.isArray(ids) && ids.length > 0
                          ? ids
                            .map((idv) => Number(idv) || 0)
                            .filter((n) => n > 0)
                            .sort((a, b) => a - b)
                            .join('+')
                          : ''
                        let naturaId = null
                        if (ivaPerc === 0) {
                          const prodNat = Number(prod.id_sdi_natura_iva) || 0
                          if (prodNat > 0) {
                            naturaId = prodNat
                          } else if (naturaOptions.length > 0) {
                            naturaId = naturaOptions[0].id_natura
                          }
                        }
                        insertProductLine({
                          product: prod,
                          quantity: modalQty,
                          price: modalPrice,
                          ivaPerc,
                          description: descr,
                          naturaId,
                          comboKey,
                        })
                        setStepperOpen(false)
                      }}
                      disabled={formDisabled}
                    >
                      Inserisci riga
                    </CButton>
                  )}
                </div>
              </CModalFooter>
            </CModal>

            {showPayments && (
              <>
                <CModal visible={paymentModalOpen} onClose={closePaymentModal} backdrop="static">
                  <CForm onSubmit={handlePaymentSubmit}>
                    <CModalHeader>
                      <CModalTitle>
                        {paymentForm.id_pagamento ? 'Modifica pagamento' : 'Nuovo pagamento'}
                      </CModalTitle>
                    </CModalHeader>
                    <CModalBody>
                      {paymentSaveError && (
                        <CAlert color="danger" className="mb-3">
                          {paymentSaveError.message || 'Errore durante il salvataggio del pagamento.'}
                        </CAlert>
                      )}
                      <CRow className="g-3">
                        <CCol md={6}>
                          <CFormLabel>Data pagamento</CFormLabel>
                          <CFormInput
                            type="date"
                            value={paymentForm.data_pagamento}
                            onChange={handlePaymentFieldChange('data_pagamento')}
                            required
                            disabled={paymentSaving}
                          />
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel>Importo</CFormLabel>
                          <CFormInput
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={paymentForm.importo}
                            onChange={handlePaymentFieldChange('importo')}
                            required
                            disabled={paymentSaving}
                          />
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel>Metodo (interno)</CFormLabel>
                          <CFormSelect
                            value={paymentForm.id_metodo}
                            onChange={handlePaymentFieldChange('id_metodo')}
                            disabled={paymentSaving || metodiPagamentoOptions.length === 0}
                          >
                            <option value="">Non specificato</option>
                            {metodiPagamentoOptions.map((option) => (
                              <option key={option.id_metodo} value={option.id_metodo}>
                                {option.code ? `${option.code} - ${option.label}` : option.label}
                              </option>
                            ))}
                          </CFormSelect>
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel>Modalità SdI</CFormLabel>
                          <CFormSelect
                            value={paymentForm.id_mp}
                            onChange={handlePaymentFieldChange('id_mp')}
                            required
                            disabled={paymentSaving || modalitaPagamentoOptions.length === 0}
                          >
                            <option value="">Seleziona modalità SdI</option>
                            {modalitaPagamentoOptions.map((option) => (
                              <option key={option.id_modalita} value={option.id_modalita}>
                                {option.code ? `${option.code} - ${option.label}` : option.label}
                              </option>
                            ))}
                          </CFormSelect>
                        </CCol>
                        <CCol xs={12}>
                          <CFormLabel>Note</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={paymentForm.note}
                            onChange={handlePaymentFieldChange('note')}
                            disabled={paymentSaving}
                          />
                        </CCol>
                      </CRow>
                    </CModalBody>
                    <CModalFooter>
                      <CButton
                        color="secondary"
                        variant="ghost"
                        type="button"
                        onClick={closePaymentModal}
                        disabled={paymentSaving}
                      >
                        Annulla
                      </CButton>
                      <CButton color="primary" type="submit" disabled={paymentSaving}>
                        {paymentSaving ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Salvataggio...
                          </>
                        ) : (
                          'Salva pagamento'
                        )}
                      </CButton>
                    </CModalFooter>
                  </CForm>
                </CModal>

                <CModal visible={Boolean(paymentDeleteTarget)} onClose={closeDeletePaymentModal}>
                  <CModalHeader>
                    <CModalTitle>Elimina pagamento</CModalTitle>
                  </CModalHeader>
                  <CModalBody>
                    {paymentDeleteError && (
                      <CAlert color="danger" className="mb-3">
                        {paymentDeleteError.message || 'Impossibile eliminare il pagamento.'}
                      </CAlert>
                    )}
                    <p className="mb-0">
                      Confermi l'eliminazione del pagamento del{' '}
                      <strong>{formatDate(paymentDeleteTarget?.data_pagamento)}</strong> da{' '}
                      <strong>{formatCurrency(paymentDeleteTarget?.importo)}</strong>?
                    </p>
                  </CModalBody>
                  <CModalFooter>
                    <CButton
                      color="secondary"
                      variant="ghost"
                      onClick={closeDeletePaymentModal}
                      disabled={paymentDeleting}
                    >
                      Annulla
                    </CButton>
                    <CButton color="danger" onClick={handleDeletePayment} disabled={paymentDeleting}>
                      {paymentDeleting ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Eliminazione...
                        </>
                      ) : (
                        'Elimina'
                      )}
                    </CButton>
                  </CModalFooter>
                </CModal>
              </>
            )}

            {rows.length === 0 ? (
              <CAlert color="info">Nessuna riga presente nella fattura.</CAlert>
            ) : (
              <CTable data-testid="table" hover responsive>
                <CTableHead className="mp-table-head">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell style={{ minWidth: '220px' }}>Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '140px' }}>
                      Quantita
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '160px' }}>
                      Prezzo unitario
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '140px' }}>
                      Sconto %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '140px' }}>
                      IVA %
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '200px' }}>
                      Natura IVA
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '160px' }}>
                      Totale riga
                    </CTableHeaderCell>
                    {!isCustomerAccount && (
                      <CTableHeaderCell className="text-center" style={{ width: '90px' }}>
                        Azioni
                      </CTableHeaderCell>
                    )}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {rows.map((row) => {
                    const amounts = computeRowAmounts(row)
                    const requireNatura =
                      row.aliquota_iva !== '' && Number(row.aliquota_iva) === 0
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
                            step="0.01"
                            value={row.prezzo_unitario}
                            onChange={handleRowFieldChange(row.localId, 'prezzo_unitario')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={row.sconto}
                            onChange={handleRowFieldChange(row.localId, 'sconto')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={row.aliquota_iva}
                            onChange={handleRowFieldChange(row.localId, 'aliquota_iva')}
                            disabled={formDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          {requireNatura ? (
                            isCustomerAccount ? (
                              <span>
                                {(() => {
                                  const selected = naturaOptions.find((option) => Number(option.id_natura) === Number(row.id_sdi_natura_iva))
                                  return selected ? `${selected.code} - ${selected.label}` : '-'
                                })()}
                              </span>
                            ) : (
                              <CFormSelect
                                value={row.id_sdi_natura_iva ?? ''}
                                onChange={handleRowNaturaChange(row.localId)}
                                disabled={formDisabled || naturaLoading}
                              >
                                <option value="">Seleziona natura</option>
                                {naturaOptions.map((option) => (
                                  <option key={option.id_natura} value={option.id_natura}>
                                    {option.code} - {option.label}
                                  </option>
                                ))}
                              </CFormSelect>
                            )
                          ) : (
                            <span className="text-body-secondary">-</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {amounts.totale !== null ? formatCurrency(amounts.totale) : '-'}
                        </CTableDataCell>
                        {!isCustomerAccount && (
                          <CTableDataCell className="text-center">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRow(row.localId)}
                              disabled={formDisabled || rows.length <= 1}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        )}
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}

            <section className="mt-4">
              <h6 className="mb-3 text-body-secondary">Riepilogo IVA</h6>
              {ivaSummary.length === 0 ? (
                <CAlert color="info" className="mb-4">
                  Nessun dato IVA disponibile. Inserire almeno una riga con valori validi.
                </CAlert>
              ) : (
                <CTable data-testid="table" hover responsive className="mb-4">
                  <CTableHead className="mp-table-head">
                    <CTableRow className="align-middle">
                      <CTableHeaderCell>Aliquota</CTableHeaderCell>
                      <CTableHeaderCell>Natura</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {ivaSummary.map((item, idx) => (
                      <CTableRow key={`${item.aliquota ?? 'na'}-${idx}`}>
                        <CTableDataCell className="text-nowrap">
                          {item.aliquota !== null ? `${item.aliquota}%` : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {item.naturaLabel
                            ? item.naturaLabel
                            : item.aliquota === 0
                              ? 'Natura non impostata'
                              : 'Aliquota ordinaria'}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatCurrency(item.imponibile)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatCurrency(item.iva)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatCurrency(item.totale)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </section>

            <section className="mt-4">
              <h6 className="mb-3 text-body-secondary">Riepilogo importi</h6>
              <div className="border rounded p-3 bg-body-tertiary">
                <CRow>
                  <CCol md={3}>
                    <div className="text-body-secondary small">Totale imponibile</div>
                    <div className="fw-bold">{formatCurrency(rowsTotals.imponibile)}</div>
                  </CCol>
                  <CCol md={3}>
                    <div className="text-body-secondary small">Totale sconto</div>
                    <div className="fw-bold">{formatCurrency(rowsTotals.sconto)}</div>
                  </CCol>
                  <CCol md={3}>
                    <div className="text-body-secondary small">Totale IVA</div>
                    <div className="fw-bold">{formatCurrency(rowsTotals.iva)}</div>
                  </CCol>
                  <CCol md={3}>
                    <div className="text-body-secondary small">Totale documento</div>
                    <div className="fw-bold">{formatCurrency(rowsTotals.totale)}</div>
                  </CCol>
                </CRow>
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
              <CButton
                color="primary"
                type="submit"
                form="fattura-detail-form"
                disabled={formDisabled}
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </CButton>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default FattureDetail



