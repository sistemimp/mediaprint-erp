/* eslint-disable prettier/prettier */
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
  CInputGroup,
  CInputGroupText,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CPopover,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import AnagraficaAutocomplete from '../../components/AnagraficaAutocomplete'
import PreventivoContattiTable from '../../components/PreventivoContattiTable'
import { normalizePreventivoContact, serializePreventivoContacts } from '../../utils/preventiviContacts'
import { getPreventivoIdFromResponse } from '../../utils/preventiviResponses'
import CIcon from '@coreui/icons-react'
import {
  cilArrowRight,
  cilCheckCircle,
  cilCog,
  cilCopy,
  cilEnvelopeClosed,
  cilPlus,
  cilReload,
  cilSave,
  cilTrash,
  cilWarning,
  cilX,
  cilZoom,
  cibAdobeAcrobatReader,
} from '@coreui/icons'


import { useAuth } from '../../context/AuthContext'
import { useBreadcrumbActions } from '../../context/BreadcrumbActionsContext'
import { fetchAnagrafiche, fetchAnagraficaDetail } from '../../services/anagrafiche'
import {
  createPreventivo,
  fetchPreventivoDetail,
  updatePreventivoStatus,
  logPreventivoStatusChange,
  fetchPreventivoStatusLog,
  fetchPreventivoOggettiOptions,
  createPreventivoOggettoOption,
  sendPreventivoEmail,
  fetchPreventivoRevisionDetail,
  logPreventivoEvent,
  generateLavorazioneFromPreventivo,
  archivePreventivo,
} from '../../services/preventivi'
import { fetchDdtCausali, emitPreventivoDdt } from '../../services/ddt'
import { fetchFattureConfig, emitPreventivoFattura } from '../../services/fatture'
import { CMultiSelect } from '@coreui/react-pro'
import {
  fetchCategorieProdotti,
  fetchProdotti,
  fetchNatureIva,
  fetchProdottoVariazioni,
  fetchProdottoPrezziCombinati,
  fetchProdottoDetail,
} from '../../services/prodotti'
import { fetchPacchetti, fetchPacchettoDetail } from '../../services/pacchetti'
import HtmlEditor from '../../components/HtmlEditor'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? currencyFormatter.format(n) : '-'
}

const formatNumberValue = (value, decimals = 0) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return decimals > 0 ? n.toFixed(decimals) : String(n)
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const SELECT_OPTION_WRAP_STYLE = { whiteSpace: 'normal', wordBreak: 'break-word' }
const CED_QTY_DIFF_THRESHOLD = 0.0001

const normalizeOggettoOption = (option) => {
  if (!option) return null
  const rawValue =
    option.id ??
    option.id_oggetto ??
    option.value ??
    option.valueId ??
    null
  const numericValue = Number(rawValue)
  const label = String(option.label ?? option.nome ?? option.text ?? '').trim()
  if (!Number.isFinite(numericValue) || numericValue <= 0 || label === '') {
    return null
  }
  const attivo = Number(option.attivo ?? option.active ?? option.is_active ?? 0) === 1 ? 1 : 0
  const rawOrdering = option.ordering ?? option.ordine ?? option.sort ?? option.position ?? null
  const ordering = Number.isFinite(Number(rawOrdering)) ? Number(rawOrdering) : null
  return {
    id: numericValue,
    id_oggetto: numericValue,
    value: String(numericValue),
    label,
    attivo,
    ordering,
  }
}

const mergeOggettoOptionLists = (base = [], extra = []) => {
  const merged = []
  const indexById = new Map()
  const pushOption = (opt) => {
    if (!opt) return
    const normalized = normalizeOggettoOption(opt)
    if (!normalized) return
    const id = normalized.id
    if (indexById.has(id)) {
      const idx = indexById.get(id)
      const current = merged[idx]
      merged[idx] = {
        ...current,
        ...normalized,
        id,
        id_oggetto: id,
        value: String(id),
        attivo: normalized.attivo ?? current.attivo ?? 0,
        ordering: normalized.ordering ?? current.ordering ?? null,
      }
      return
    }
    merged.push({
      ...normalized,
      id,
      id_oggetto: id,
      value: String(id),
      attivo: normalized.attivo ?? 0,
      ordering: normalized.ordering ?? null,
    })
    indexById.set(id, merged.length - 1)
  }
  base.forEach(pushOption)
  extra.forEach(pushOption)
  return merged
}

const normalizeLavorazioneItem = (item) => {
  if (!item) return null
  const rawId =
    item.id_lavorazione ??
    item.id ??
    item.idLavorazione ??
    null
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) {
    return null
  }
  return {
    id,
    id_lavorazione: id,
    codice: item.codice ?? item.code ?? null,
    titolo: item.titolo ?? item.title ?? null,
    stato: item.stato ?? item.status ?? null,
    created_at: item.created_at ?? item.createdAt ?? item.lavorazione_creata_il ?? null,
  }
}

const buildAnagraficaOptions = ({
  baseList,
  currentId,
  display = {},
  query = '',
}) => {
  const list = Array.isArray(baseList) ? [...baseList] : []
  const numericId = Number(currentId)
  const shouldInjectFallback =
    Number.isFinite(numericId) && numericId > 0
  if (shouldInjectFallback) {
    const fallbackLabel =
      display?.label ??
      display?.ragione_sociale ??
      display?.ragioneSociale ??
      ''
    const fallbackEntry = {
      id_anagrafica: numericId,
      ragione_sociale: fallbackLabel || '--',
      codice_cliente:
        display?.codiceCliente ?? display?.codice_cliente ?? null,
      piva: display?.piva ?? display?.partita_iva ?? null,
      codice_fiscale:
        display?.codiceFiscale ?? display?.codice_fiscale ?? null,
      email: display?.email ?? null,
    }
    const exists = list.some(
      (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === numericId,
    )
    if (!exists) {
      list.unshift(fallbackEntry)
    }
  }

  const mapById = new Map()
  for (const item of list) {
    const cid = item?.id_anagrafica ?? item?.id
    if (cid == null) continue
    if (!mapById.has(cid)) {
      mapById.set(cid, item)
    }
  }

  const normalizedList = Array.from(mapById.values())
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (normalizedQuery === '') {
    return normalizedList
  }

  const queryNoSep = normalizedQuery.replace(/[ .-]/g, '')
  return normalizedList.filter((item) => {
    const rgSociale = String(
      item?.ragione_sociale ?? item?.ragioneSociale ?? '',
    ).toLowerCase()
    const rawPiva = String(
      item?.piva ?? item?.partita_iva ?? item?.partitaIva ?? '',
    ).toLowerCase()
    const pivaNoSep = rawPiva.replace(/[ .-]/g, '')
    const cf = String(item?.codice_fiscale ?? item?.codiceFiscale ?? '').toLowerCase()
    const codice = String(
      item?.codice_cliente ?? item?.codiceCliente ?? '',
    ).toLowerCase()
    return (
      rgSociale.includes(normalizedQuery) ||
      pivaNoSep.includes(queryNoSep) ||
      cf.includes(normalizedQuery) ||
      (codice && codice.includes(normalizedQuery))
    )
  })
}

const DEFAULT_OGGETTO_OPTIONS = [
  { id: 1, id_oggetto: 1, value: '1', label: 'Stampa', attivo: 1 },
  { id: 2, id_oggetto: 2, value: '2', label: 'Imbustamento', attivo: 1 },
  { id: 3, id_oggetto: 3, value: '3', label: 'Cellophanatura', attivo: 1 },
  { id: 4, id_oggetto: 4, value: '4', label: 'Posta Digitale', attivo: 1 },
]

const getTodayIsoDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const useQuery = () => new URLSearchParams(useLocation().search)

const PreventiviDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAcquisto = location.pathname.startsWith('/acquisti')
  const basePath = isAcquisto ? '/acquisti/preventivi' : '/preventivi'
  const clienteLabel = isAcquisto ? 'Fornitore' : 'Cliente'
  const query = useQuery()
  const modeParam = String(query.get('mode') || '').toLowerCase()
  const createMode = Boolean(
    modeParam === 'create' ||
    modeParam === 'nuovo' ||
    modeParam === 'new' ||
    location.state?.createMode,
  )
  const id = Number(query.get('id') || 0)
  const { token, logout, user } = useAuth()
  const { setBreadcrumbActions, clearBreadcrumbActions } = useBreadcrumbActions()
  const prefill = location.state?.prefill ?? null
  const prefillAppliedRef = useRef(false)
  const bozzaSaveHandlerRef = useRef(() => {})

  // Se non viene passato un ID valido, reindirizza alla lista
  useEffect(() => {
    if ((!id || Number.isNaN(id)) && !createMode) {
      navigate(`${basePath}/lista`, { replace: true })
    }
  }, [createMode, id, navigate])

  const [loading, setLoading] = useState(createMode ? false : true)
  const [loadError, setLoadError] = useState(null)
  const [editable, setEditable] = useState(createMode)
  const [header, setHeader] = useState({ anno: null, numero: null, stato: null })
  const [statusOptions, setStatusOptions] = useState([])
  const [currentStatus, setCurrentStatus] = useState({ code: null, label: null })
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const [statusSuccess, setStatusSuccess] = useState(null)
  const [statusLog, setStatusLog] = useState([])
  const [statusLogLoading, setStatusLogLoading] = useState(false)
  const [statusLogError, setStatusLogError] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [statusTab, setStatusTab] = useState('timeline')
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState(null)
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [duplicateError, setDuplicateError] = useState(null)
  const [revisionModalVisible, setRevisionModalVisible] = useState(false)
  const [revisionModalLoading, setRevisionModalLoading] = useState(false)
  const [revisionModalError, setRevisionModalError] = useState(null)
  const [revisionModalData, setRevisionModalData] = useState(null)

  // Dati generali
  const [clienteSearch, setClienteSearch] = useState('')
  const [loadingClienti, setLoadingClienti] = useState(false)
  const [allClientiOptions, setAllClientiOptions] = useState([])
  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [clienteDisplay, setClienteDisplay] = useState({
    id: null,
    label: '',
    codiceCliente: null,
    piva: null,
    codiceFiscale: null,
    email: null,
  })
  const [mittenteMode, setMittenteMode] = useState('cliente')
  const [mittenteAnagraficaId, setMittenteAnagraficaId] = useState('')
  const [customMittente, setCustomMittente] = useState(null)
  const [mittenteSearch, setMittenteSearch] = useState('')
  useEffect(() => {
    if (mittenteMode === 'cliente') {
      setMittenteAnagraficaId('')
      setCustomMittente(null)
    }
  }, [mittenteMode])
  const [dataPreventivo, setDataPreventivo] = useState('')
  const [note, setNote] = useState('')
  const [noteDirty, setNoteDirty] = useState(false)
  const [oggetto, setOggetto] = useState('')
  const [oggettiOptions, setOggettiOptions] = useState([])
  const [selectedOggetti, setSelectedOggetti] = useState([])
  const [pendingOggettoCreate, setPendingOggettoCreate] = useState(false)
  const creatingOggettoPromisesRef = useRef(new Map())
  const pendingOggettoCreateCountRef = useRef(0)
  const adjustPendingOggettoCreate = useCallback((delta) => {
    pendingOggettoCreateCountRef.current += delta
    if (pendingOggettoCreateCountRef.current < 0) {
      pendingOggettoCreateCountRef.current = 0
    }
    setPendingOggettoCreate(pendingOggettoCreateCountRef.current > 0)
  }, [])
  const [rifCliente, setRifCliente] = useState('')
  const [preventivoContatti, setPreventivoContatti] = useState([])
  const [anagraficaContactOptions, setAnagraficaContactOptions] = useState([])
  const [emailModalVisible, setEmailModalVisible] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(null)
  const [ddtModalVisible, setDdtModalVisible] = useState(false)
  const [ddtCausali, setDdtCausali] = useState([])
  const [ddtCausaliLoading, setDdtCausaliLoading] = useState(false)
  const [ddtForm, setDdtForm] = useState(() => ({
    data_ddt: getTodayIsoDate(),
    id_causale: '',
    note: '',
  }))
  const [ddtSubmitting, setDdtSubmitting] = useState(false)
  const [ddtError, setDdtError] = useState(null)
  const [ddtSuccess, setDdtSuccess] = useState(null)
  const [ddtResult, setDdtResult] = useState(null)
  const [fatturaModalVisible, setFatturaModalVisible] = useState(false)
  const [fatturaConfig, setFatturaConfig] = useState({ sezionali: [], tipi: [], stati: [] })
  const [fatturaConfigLoading, setFatturaConfigLoading] = useState(false)
  const [fatturaForm, setFatturaForm] = useState(() => ({
    data_fattura: getTodayIsoDate(),
    id_sezionale: '',
    id_tipo_fatt: '',
    id_stato_fatt: '',
    note: '',
  }))
  const [fatturaSubmitting, setFatturaSubmitting] = useState(false)
  const [fatturaError, setFatturaError] = useState(null)
  const [fatturaSuccess, setFatturaSuccess] = useState(null)
  const [fatturaResult, setFatturaResult] = useState(null)
  const [linkedDdt, setLinkedDdt] = useState([])
  const [linkedFatture, setLinkedFatture] = useState([])
  const [linkedLavorazioni, setLinkedLavorazioni] = useState([])
  const [lavorazioneGenerating, setLavorazioneGenerating] = useState(false)
  const [lavorazioneError, setLavorazioneError] = useState(null)
  const [lavorazioneSuccess, setLavorazioneSuccess] = useState(null)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const handleRefreshData = useCallback(() => setRefreshCounter((prev) => prev + 1), [])
  // CIG / Determine
  const [cigList, setCigList] = useState([])
  const [newCig, setNewCig] = useState({ cig: '', data_cig: '', motivazione: '' })
  const [determineList, setDetermineList] = useState([])
  const [newDetermina, setNewDetermina] = useState({ determina: '', data_determina: '', motivazione: '' })

  // Righe
  const [righe, setRighe] = useState([])
  // Mappa id_prodotto -> nome categoria per raggruppamento righe
  const [prodCategoryMap, setProdCategoryMap] = useState({})
  const computeCedWarning = useCallback((row) => {
    if (!row) {
      return false
    }
    const cedRaw = row.quantita_ced
    const hasCedQty = cedRaw !== null && cedRaw !== undefined && cedRaw !== ''
    const currentQty = Number(row.quantita ?? 0) || 0
    if (hasCedQty) {
      const cedQty = Number(cedRaw)
      if (Number.isFinite(cedQty)) {
        const diff = Math.abs(cedQty - currentQty)
        return diff > CED_QTY_DIFF_THRESHOLD
      }
      return true
    }
    return Boolean(row.created_by_ced)
  }, [])

  // Stepper prodotti
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  // Variazioni prodotto selezionato
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [comboSelectionError, setComboSelectionError] = useState(null)
  const [selIva, setSelIva] = useState('')
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [anagraficaDisabled, setAnagraficaDisabled] = useState(false)
  // Pacchetti (modal selezione)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgOptions, setPkgOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)

  useEffect(() => {
    const currentId = Number(idAnagrafica || clienteDisplay.id || 0)
    if (!currentId) return
    const existing = allClientiOptions.find(
      (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === currentId,
    )
    if (!existing) return
    const nextLabel = existing.ragione_sociale ?? existing.ragioneSociale ?? ''
    const nextCodice = existing.codice_cliente ?? null
    const nextPiva = existing.piva ?? null
    const nextCf = existing.codice_fiscale ?? null
    const nextEmail = existing.email ?? existing.cliente_email ?? null
    setClienteDisplay((prev) => {
      if (
        prev.id === currentId &&
        prev.label === nextLabel &&
        prev.codiceCliente === nextCodice &&
        prev.piva === nextPiva &&
        prev.codiceFiscale === nextCf &&
        prev.email === nextEmail
      ) {
        return prev
      }
      return {
        id: currentId,
        label: nextLabel,
        codiceCliente: nextCodice,
        piva: nextPiva,
        codiceFiscale: nextCf,
        email: nextEmail,
      }
    })
  }, [allClientiOptions, idAnagrafica])

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) return

    if (prefill.id_anagrafica != null && prefill.id_anagrafica !== '') {
      setIdAnagrafica(String(prefill.id_anagrafica))
    }
    if (prefill.data_preventivo) {
      setDataPreventivo(prefill.data_preventivo)
    }
    if (prefill.note != null) {
      setNote(prefill.note)
      setNoteDirty(false)
    }
    if (prefill.oggetto != null) {
      setOggetto(prefill.oggetto)
    }
    if (Array.isArray(prefill.oggetti)) {
      setSelectedOggetti(
        prefill.oggetti
          .map((v) => Number(v))
          .filter((num) => Number.isFinite(num) && num > 0),
      )
    }
    if (Array.isArray(prefill.oggetti_detail)) {
      const detailOptions = prefill.oggetti_detail
        .map(normalizeOggettoOption)
        .filter(Boolean)
      if (detailOptions.length > 0) {
        setOggettiOptions((prev) =>
          mergeOggettoOptionLists(
            Array.isArray(prev) ? prev : [],
            detailOptions,
          ),
        )
      }
    }

    if (prefill.riferimento_cliente != null) {
      setRifCliente(prefill.riferimento_cliente)
    }
    const label =
      prefill.cliente?.label ??
      prefill.clienteLabel ??
      null

    if (prefill.cliente && prefill.cliente.id) {
      setClienteDisplay((prev) => ({
        id: Number(prefill.cliente.id),
        label: prefill.cliente.label ?? label ?? prev.label ?? '',
        codiceCliente: prefill.cliente.codiceCliente ?? prev.codiceCliente,
        piva: prefill.cliente.piva ?? prev.piva,
        codiceFiscale: prefill.cliente.codiceFiscale ?? prev.codiceFiscale,
        email: prefill.cliente.email ?? prev.email ?? prefill.clienteEmail ?? null,
      }))
      setAllClientiOptions((prev) => {
        const exists = prev.some(
          (c) =>
            Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(prefill.cliente.id ?? 0),
        )
        if (exists) return prev
        return [
          {
            id_anagrafica: prefill.cliente.id,
            ragione_sociale: prefill.cliente.label ?? label ?? '--',
            codice_cliente: prefill.cliente.codiceCliente ?? null,
            piva: prefill.cliente.piva ?? null,
            codice_fiscale: prefill.cliente.codiceFiscale ?? null,
            email: prefill.cliente.email ?? prefill.clienteEmail ?? null,
          },
          ...prev,
        ]
      })
    } else if (prefill.id_anagrafica && label) {
      setClienteDisplay((prev) => ({
        id: Number(prefill.id_anagrafica),
        label: label ?? prev.label ?? '',
        codiceCliente: prev.codiceCliente,
        piva: prev.piva,
        codiceFiscale: prev.codiceFiscale,
        email: prev.email ?? prefill.clienteEmail ?? null,
      }))
      setAllClientiOptions((prev) => {
        const exists = prev.some(
          (c) =>
            Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(prefill.id_anagrafica ?? 0),
        )
        if (exists) return prev
        return [
          {
            id_anagrafica: prefill.id_anagrafica,
            ragione_sociale: label,
            codice_cliente: null,
            piva: null,
            codice_fiscale: null,
          },
          ...prev,
        ]
      })
    }

    if (Array.isArray(prefill.contatti)) {
      setPreventivoContatti(
        prefill.contatti
          .map((c) => normalizePreventivoContact(c, prefill.id_anagrafica ?? null))
          .filter(Boolean),
      )
    }

    prefillAppliedRef.current = true
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [prefill, navigate, location.pathname, location.search])

  useEffect(() => {
    if (!createMode) return
    setLoadError(null)
    setEditable(true)
    setLoading(false)
  }, [createMode])

  useEffect(() => {
    if (!ddtModalVisible || !token) return
    if (ddtCausali.length > 0) return

    const controller = new AbortController()
    setDdtCausaliLoading(true)
    fetchDdtCausali({ token, signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return
        setDdtCausali(Array.isArray(items) ? items : [])
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare le causali DDT', error)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDdtCausaliLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [ddtModalVisible, token, ddtCausali.length])

  useEffect(() => {
    if (!fatturaModalVisible || !token) return
    if (
      fatturaConfig.sezionali.length > 0 &&
      fatturaConfig.tipi.length > 0 &&
      fatturaConfig.stati.length > 0
    ) {
      return
    }
    const controller = new AbortController()
    setFatturaConfigLoading(true)
    fetchFattureConfig({ token, signal: controller.signal })
      .then((cfg) => {
        if (controller.signal.aborted) return
        setFatturaConfig({
          sezionali: Array.isArray(cfg?.sezionali) ? cfg.sezionali : [],
          tipi: Array.isArray(cfg?.tipi) ? cfg.tipi : [],
          stati: Array.isArray(cfg?.stati) ? cfg.stati : [],
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare la configurazione fatture', error)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFatturaConfigLoading(false)
        }
      })
    return () => controller.abort()
  }, [fatturaModalVisible, token, fatturaConfig.sezionali.length, fatturaConfig.tipi.length, fatturaConfig.stati.length])

  useEffect(() => {
    if (!fatturaModalVisible) return
    setFatturaForm((prev) => {
      const defaults = { ...prev }
      if (!defaults.id_sezionale && fatturaConfig.sezionali.length > 0) {
        defaults.id_sezionale = String(fatturaConfig.sezionali[0].id_sezionale)
      }
      if (!defaults.id_tipo_fatt && fatturaConfig.tipi.length > 0) {
        // Prefer the "Immediata" type when available so the modal defaults accordingly.
        const preferredTipo = fatturaConfig.tipi.find((option) => {
          const normalizedCode = String(option.code || '').toLowerCase()
          const normalizedLabel = String(option.label || '').toLowerCase()
          return normalizedCode === 'immediata' || normalizedLabel === 'immediata'
        })
        const preferredId = preferredTipo?.id_tipo ?? fatturaConfig.tipi[0].id_tipo
        defaults.id_tipo_fatt = String(preferredId)
      }
      if (!defaults.id_stato_fatt && fatturaConfig.stati.length > 0) {
        const bozza = fatturaConfig.stati.find((s) => String(s.code || '').toLowerCase() === 'bozza')
        defaults.id_stato_fatt = String((bozza ?? fatturaConfig.stati[0]).id_stato)
      }
      return defaults
    })
  }, [fatturaConfig, fatturaModalVisible])

  const loadOggettoOptions = useCallback(
    async ({ signal, extraOptions = [] } = {}) => {
      if (!token) return []
      const extraNormalized = Array.isArray(extraOptions)
        ? extraOptions.map(normalizeOggettoOption).filter(Boolean)
        : []
      try {
        const opts = await fetchPreventivoOggettiOptions({ token, signal })
        if (signal?.aborted) return []
        const normalized = (Array.isArray(opts) ? opts : []).map(normalizeOggettoOption).filter(Boolean)
        setOggettiOptions((prev) => {
          const prevList = Array.isArray(prev) ? prev : []
          const withServer = mergeOggettoOptionLists(normalized, prevList)
          return mergeOggettoOptionLists(withServer, extraNormalized)
        })
        return normalized
      } catch (error) {
        if (signal?.aborted) return []
        console.error('Impossibile caricare le opzioni oggetto preventivo (dettaglio)', error)
        setOggettiOptions((prev) => {
          const prevList = Array.isArray(prev) ? prev : []
          const withFallback = mergeOggettoOptionLists(DEFAULT_OGGETTO_OPTIONS, prevList)
          return mergeOggettoOptionLists(withFallback, extraNormalized)
        })
        return []
      }
    },
    [token],
  )

  const createOggettoOptionForLabel = useCallback(
    async (rawLabel) => {
      const cleanLabel = String(rawLabel || '').trim()
      if (!cleanLabel || !token) {
        return null
      }

      const existingOption = (Array.isArray(oggettiOptions) ? oggettiOptions : []).find(
        (opt) => String(opt?.label ?? '').toLowerCase() === cleanLabel.toLowerCase(),
      )
      if (existingOption) {
        return normalizeOggettoOption(existingOption)
      }

      const key = cleanLabel.toLowerCase()
      if (creatingOggettoPromisesRef.current.has(key)) {
        return creatingOggettoPromisesRef.current.get(key)
      }

      const createPromise = (async () => {
        adjustPendingOggettoCreate(1)
        try {
          const created = await createPreventivoOggettoOption({
            token,
            label: cleanLabel,
            active: false,
          })
          const normalized = normalizeOggettoOption(created)
          if (normalized) {
            await loadOggettoOptions({ extraOptions: [normalized] })
          }
          return normalized
        } finally {
          adjustPendingOggettoCreate(-1)
          creatingOggettoPromisesRef.current.delete(key)
        }
      })()

      creatingOggettoPromisesRef.current.set(key, createPromise)
      return createPromise
    },
    [token, oggettiOptions, loadOggettoOptions, adjustPendingOggettoCreate],
  )

  const handleOggettiChange = useCallback(
    (vals) => {
      const incoming = Array.isArray(vals) ? vals : []
      const next = new Set()
      incoming.forEach((item) => {
        let candidate = null
        if (item && typeof item === 'object') {
          candidate = item.id ?? item.id_oggetto ?? item.value ?? null
        } else {
          candidate = item
        }
        const numeric = Number(candidate)
        if (Number.isFinite(numeric) && numeric > 0) {
          next.add(numeric)
        }
      })
      setSelectedOggetti(Array.from(next))
    },
    [],
  )

  // Carica opzioni per multi-select Oggetto preventivo
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    loadOggettoOptions({ signal: controller.signal })
    return () => controller.abort()
  }, [token, loadOggettoOptions])

  // L'oggetto testuale è calcolato dal backend dalle etichette selezionate.

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      setRevisions([])
      try {
        setStatusError(null)
        setStatusSuccess(null)
        const {
          data,
          editable,
          righe: righeSrv,
          cig: cigSrv,
          determine: determineSrv,
          contatti: contattiSrv,
          linkedDdt: linkedDdtSrv,
          linkedFatture: linkedFattureSrv,
          linkedLavorazioni: linkedLavorazioniSrv,
          revisions: revisionsSrv,
          statuses,
          currentStatus: current,
        } = await fetchPreventivoDetail({
          token,
          id,
          is_acquisto: isAcquisto,
          signal: controller.signal,
        })
        if (!data) throw new Error('Dettaglio non disponibile')
        setEditable(!!editable)
        setHeader({
          anno: data.anno_preventivo ?? null,
          numero: data.numero_documento ?? null,
          stato: data.stato_label ?? data.stato_code ?? null,
        })
        setStatusOptions(Array.isArray(statuses) ? statuses : [])
        if (current && (current.code || current.label)) {
          setCurrentStatus({
            code: current.code ?? null,
            label: current.label ?? data.stato_label ?? data.stato_code ?? null,
          })
        } else {
          setCurrentStatus({
            code: data.stato_code ?? null,
            label: data.stato_label ?? data.stato_code ?? null,
          })
        }
        setRevisions(Array.isArray(revisionsSrv) ? revisionsSrv : [])
        if (data.id_anagrafica != null && data.id_anagrafica !== '') {
          setIdAnagrafica(String(data.id_anagrafica))
        }
        if (data.data_preventivo) {
          setDataPreventivo(data.data_preventivo)
        }
        if (data.note != null) {
          setNote(data.note)
          setNoteDirty(false)
        }
        const fetchedOggetto = data.oggetto ?? data.oggetto_preventivo ?? data.subject ?? null
        if (fetchedOggetto != null) {
          setOggetto(fetchedOggetto)
        }
        // Inizializza la multi-select "Oggetto preventivo" con i valori dal backend
        if (Array.isArray(data.oggetti)) {
          setSelectedOggetti(
            data.oggetti
              .map((v) => Number(v))
              .filter((num) => Number.isFinite(num) && num > 0),
          )
        }
        if (Array.isArray(data.oggetti_detail)) {
          const detailOptions = data.oggetti_detail
            .map(normalizeOggettoOption)
            .filter(Boolean)
          if (detailOptions.length > 0) {
            setOggettiOptions((prev) =>
              mergeOggettoOptionLists(
                Array.isArray(prev) ? prev : [],
                detailOptions,
              ),
            )
            if (!Array.isArray(data.oggetti) || data.oggetti.length === 0) {
              const detailIds = detailOptions
                .map((opt) => Number(opt.id))
                .filter((num) => Number.isFinite(num) && num > 0)
              if (detailIds.length > 0) {
                setSelectedOggetti(detailIds)
              }
            }
          }
        }
        const fetchedRif =
          data.riferimento_cliente ?? data.riferimento ?? data.rif_cliente ?? null
        if (fetchedRif != null) {
          setRifCliente(fetchedRif)
        }
        if (data.id_anagrafica != null && data.id_anagrafica !== '') {
          const numericId = Number(data.id_anagrafica)
          const clienteLabel =
            data.cliente_ragione_sociale ??
            data.ragione_sociale ??
            null
          setClienteDisplay((prev) => ({
            id: Number.isFinite(numericId) && numericId > 0 ? numericId : prev.id,
            label: clienteLabel ?? prev.label ?? '',
            codiceCliente: data.cliente_codice_cliente ?? prev.codiceCliente ?? null,
            piva: data.cliente_piva ?? prev.piva ?? null,
            codiceFiscale: data.cliente_codice_fiscale ?? prev.codiceFiscale ?? null,
            email: data.cliente_email ?? prev.email ?? null,
          }))
          setAllClientiOptions((prev) => {
            const list = Array.isArray(prev) ? prev : []
            if (!Number.isFinite(numericId) || numericId <= 0) {
              return list
            }
            const exists = list.some(
              (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === numericId,
            )
            if (exists) {
              return list
            }
            return [
              {
                id_anagrafica: numericId,
                ragione_sociale: clienteLabel ?? '--',
                codice_cliente: data.cliente_codice_cliente ?? null,
                piva: data.cliente_piva ?? null,
                codice_fiscale: data.cliente_codice_fiscale ?? null,
                email: data.cliente_email ?? null,
              },
              ...list,
            ]
          })
        }
        const baseClienteId = Number(data.id_anagrafica ?? 0)
        const rawMittenteId = Number(data.id_mittente ?? 0)
        const resolvedMittenteId = rawMittenteId > 0 ? rawMittenteId : baseClienteId
        if (resolvedMittenteId > 0 && resolvedMittenteId !== baseClienteId) {
          setMittenteMode('altro')
          setMittenteAnagraficaId(String(resolvedMittenteId))
          setCustomMittente({
            id_anagrafica: resolvedMittenteId,
            ragione_sociale:
              data.mittente_ragione_sociale ??
              data.cliente_ragione_sociale ??
              data.ragione_sociale ??
              '',
            piva: data.mittente_piva ?? null,
            codice_fiscale: data.mittente_codice_fiscale ?? null,
            email: null,
          })
        } else {
          setMittenteMode('cliente')
          setMittenteAnagraficaId('')
          setCustomMittente(null)
        }

        // Righe dal server -> mappa a forma UI (nessun fallback sintetico)
        if (Array.isArray(righeSrv)) {
          setRighe(
            righeSrv.map((r) => {
              const idCategoria =
                r.id_categoria ?? r.id_categoria_prodotto ?? r.id_categoria_prodotto_default ?? null
              const categoriaNome =
                r.categoria_nome ?? r.categoria ?? r.nome_categoria ?? r.nome_categoria_prodotto ?? null
              return {
                id_riga: r.id_riga ?? null,
                descrizione: r.descrizione ?? '',
                quantita: r.quantita ?? 1,
                prezzo: r.prezzo_unitario ?? 0,
                iva: r.iva ?? 22,
                sconto: r.sconto ?? 0,
                id_prodotto: r.id_prodotto ?? null,
                combo_key: r.combo_key ?? null,
                id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                id_categoria: idCategoria != null ? Number(idCategoria) : null,
                categoria_nome: categoriaNome != null ? String(categoriaNome) : undefined,
                created_by_ced: Boolean(r.created_by_ced),
                quantita_ced: r.quantita_ced ?? null,
                ced_warning: Boolean(r.ced_warning),
              }
            }),
          )
        } else {
          setRighe([])
        }
        // CIG / Determine dal server
        setCigList(Array.isArray(cigSrv) ? cigSrv.map((c) => ({
          id_cig: c.id_cig ?? undefined,
          cig: c.cig ?? '',
          data_cig: c.data_cig ?? '',
          motivazione: c.motivazione ?? '',
        })) : [])
        setDetermineList(Array.isArray(determineSrv) ? determineSrv.map((d) => ({
          id_determina: d.id_determina ?? undefined,
          determina: d.determina ?? '',
          data_determina: d.data_determina ?? '',
          motivazione: d.motivazione ?? '',
        })) : [])
        setPreventivoContatti(
          Array.isArray(contattiSrv)
            ? contattiSrv
              .map((c) => normalizePreventivoContact(c, data.id_anagrafica))
              .filter(Boolean)
            : [],
        )
        setLinkedDdt(Array.isArray(linkedDdtSrv) ? linkedDdtSrv : [])
        setLinkedFatture(Array.isArray(linkedFattureSrv) ? linkedFattureSrv : [])
        const normalizedLavorazioni = Array.isArray(linkedLavorazioniSrv)
          ? linkedLavorazioniSrv.map(normalizeLavorazioneItem).filter(Boolean)
          : []
        if (normalizedLavorazioni.length === 0) {
          const fallback = normalizeLavorazioneItem({
            id_lavorazione: data.id_lavorazione_corrente ?? null,
            codice: data.lavorazione_codice ?? null,
            created_at: data.lavorazione_creata_il ?? null,
          })
          setLinkedLavorazioni(fallback ? [fallback] : [])
        } else {
          setLinkedLavorazioni(normalizedLavorazioni)
        }
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setLoadError(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, id, refreshCounter, isAcquisto])

  // Carica storico cambi stato
  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const loadLog = async () => {
      setStatusLogLoading(true)
      setStatusLogError(null)
      try {
        const { items } = await fetchPreventivoStatusLog({ token, id, signal: controller.signal })
        const normalized = Array.isArray(items) ? items.slice() : []
        normalized.sort((a, b) => {
          const da = new Date(a?.at || a?.created_at || a?.timestamp || 0).getTime()
          const db = new Date(b?.at || b?.created_at || b?.timestamp || 0).getTime()
          return db - da
        })
        setStatusLog(normalized)
      } catch (e) {
        if (e?.name === 'AbortError') return
        setStatusLogError(e)
        setStatusLog([])
      } finally {
        setStatusLogLoading(false)
      }
    }
    loadLog()
    return () => controller.abort()
  }, [token, id])

  // Verifica se l'anagrafica associata è disattiva per disabilitare attività
  useEffect(() => {
    const run = async () => {
      try {
        const aid = Number(idAnagrafica)
        if (!token || !aid) {
          setAnagraficaDisabled(false)
          setClienteDisplay({
            id: null,
            label: '',
            codiceCliente: null,
            piva: null,
            codiceFiscale: null,
            email: null,
          })
          setAnagraficaContactOptions([])
          return
        }
        const det = await fetchAnagraficaDetail({ token, id: aid })
        const detailData = det?.anagrafica ?? det?.data ?? null
        setAnagraficaContactOptions(Array.isArray(det?.contatti) ? det.contatti : [])
        if (detailData) {
          setClienteDisplay((prev) => ({
            id: Number(detailData.id_anagrafica ?? detailData.id ?? aid),
            label:
              detailData.ragione_sociale ??
              detailData.ragioneSociale ??
              prev.label ??
              '',
            codiceCliente: detailData.codice_cliente ?? prev.codiceCliente ?? null,
            piva: detailData.piva ?? detailData.partita_iva ?? prev.piva ?? null,
            codiceFiscale: detailData.codice_fiscale ?? prev.codiceFiscale ?? null,
            email: detailData.email ?? prev.email ?? detailData.contatto_email ?? null,
          }))
        }
        const active =
          Number(det?.anagrafica?.is_active) === 1 &&
          String(det?.anagrafica?.stato || '').toLowerCase() === 'attiva'
        setAnagraficaDisabled(!active)
      } catch (_e) {
        setAnagraficaDisabled(false)
        setAnagraficaContactOptions([])
      }
    }
    run()
  }, [token, idAnagrafica])

  // Carica tutti i clienti una volta (come in Crea) e filtra in locale
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoadingClienti(true)
      try {
        const PAGE_SIZE = 100
        const first = await fetchAnagrafiche({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: PAGE_SIZE,
          // no search: fetch all, filter locally
          sortBy: 'ragione_sociale',
          sortDirection: 'asc',
          tipologie: isAcquisto ? [2, 3] : undefined,
        })
        let allItems = Array.isArray(first.items) ? [...first.items] : []
        const totalPages = Math.max(first?.meta?.pages ?? first?.meta?.last_page ?? 1, 1)
        const perPage = first?.meta?.per_page ?? (allItems.length || PAGE_SIZE)
        if (totalPages > 1) {
          for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
            if (controller.signal.aborted) return
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
              tipologie: isAcquisto ? [2, 3] : undefined,
            })
            if (Array.isArray(pageItems) && pageItems.length > 0) {
              allItems = allItems.concat(pageItems)
            }
          }
        } else {
          // Fallback: continua se la prima pagina è piena
          let nextPage = 2
          let safety = 0
          while (!controller.signal.aborted && allItems.length > 0 && allItems.length % perPage === 0 && safety < 100) {
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
              tipologie: isAcquisto ? [2, 3] : undefined,
            })
            if (!Array.isArray(pageItems) || pageItems.length === 0) break
            allItems = allItems.concat(pageItems)
            nextPage += 1
            safety += 1
            if (pageItems.length < perPage) break
          }
        }
        const mapById = new Map()
        for (const c of allItems) {
          const cid = c?.id_anagrafica ?? c?.id
          if (cid !== undefined && cid !== null && !mapById.has(cid)) {
            mapById.set(cid, c)
          }
        }
        const normalized = Array.from(mapById.values()).sort((a, b) => {
          const A = String(a?.ragione_sociale ?? '').toLowerCase()
          const B = String(b?.ragione_sociale ?? '').toLowerCase()
          return A.localeCompare(B)
        })
        setAllClientiOptions(normalized)
      } catch (e) {
        if (e.name === 'AbortError') return
        // Silenzia errori minori
        setAllClientiOptions([])
      } finally {
        setLoadingClienti(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, isAcquisto])

  const clientiOptions = useMemo(
    () =>
      buildAnagraficaOptions({
        baseList: allClientiOptions,
        currentId: clienteDisplay.id ?? (idAnagrafica ? Number(idAnagrafica) : null),
        display: clienteDisplay,
        query: clienteSearch,
      }),
    [allClientiOptions, clienteDisplay, clienteSearch, idAnagrafica],
  )

  // Opzioni già filtrate a monte; il componente si occupa solo del rendering/controllo
  const mittenteInfo = useMemo(() => {
    const resolvedClienteId =
      clienteDisplay.id ?? (idAnagrafica ? Number(idAnagrafica) : null)
    const generalInfo = {
      id:
        Number.isFinite(Number(resolvedClienteId)) && Number(resolvedClienteId) > 0
          ? Number(resolvedClienteId)
          : null,
      label: clienteDisplay.label ?? '',
      codiceCliente: clienteDisplay.codiceCliente ?? null,
      piva: clienteDisplay.piva ?? null,
      codiceFiscale: clienteDisplay.codiceFiscale ?? null,
      email: clienteDisplay.email ?? null,
    }
    if (mittenteMode === 'cliente') {
      return generalInfo
    }
    if (!customMittente) {
      return {
        id: null,
        label: '',
        codiceCliente: null,
        piva: null,
        codiceFiscale: null,
        email: null,
      }
    }
    const rawId = Number(customMittente?.id_anagrafica ?? customMittente?.id ?? null)
    return {
      id: Number.isFinite(rawId) && rawId > 0 ? rawId : null,
      label:
        customMittente.ragione_sociale ??
        customMittente.ragioneSociale ??
        customMittente.nome ??
        '',
      codiceCliente: customMittente.codice_cliente ?? customMittente.codiceCliente ?? null,
      piva:
        customMittente.piva ??
        customMittente.partita_iva ??
        customMittente.partitaIva ??
        null,
      codiceFiscale:
        customMittente.codice_fiscale ?? customMittente.codiceFiscale ?? null,
      email: customMittente.email ?? customMittente.contatto_email ?? null,
    }
  }, [clienteDisplay, customMittente, idAnagrafica, mittenteMode])

  const mittenteOptions = useMemo(
    () =>
      buildAnagraficaOptions({
        baseList: allClientiOptions,
        currentId: mittenteInfo.id,
        display: mittenteInfo,
        query: mittenteSearch,
      }),
    [allClientiOptions, mittenteInfo, mittenteSearch],
  )

  // Carica categorie e nature IVA per stepper
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: cats }, { items: nats }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
        ])
        setCatOptions(cats)
        setNaturaOptions(nats)
      } catch (_e) { }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica prodotti in base a categoria/ricerca
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({ token, id_categoria: idcat, q: prodSearch, signal: controller.signal })
        setProdOptions(items)
      } catch (_e) {
        setProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  // Risolve la categoria dei prodotti presenti nelle righe (per raggruppamento)
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const run = async () => {
      try {
        const ids = Array.from(new Set((Array.isArray(righe) ? righe : [])
          .map((r) => Number(r?.id_prodotto) || 0)
          .filter((n) => n > 0)))
        const missing = ids.filter((idp) => prodCategoryMap[idp] == null)
        if (missing.length === 0) return
        // Carica categorie se non presenti
        let cats = Array.isArray(catOptions) && catOptions.length > 0 ? catOptions : []
        if (cats.length === 0) {
          try {
            const { items } = await fetchCategorieProdotti({ token, signal: controller.signal })
            cats = Array.isArray(items) ? items : []
            if (cats.length > 0) setCatOptions(cats)
          } catch (_e) {
            cats = []
          }
        }
        const catNameById = {}
        cats.forEach((c) => { if (c?.id_categoria != null) catNameById[Number(c.id_categoria)] = String(c.nome || '') })
        const updates = {}
        for (const idp of missing) {
          try {
            const resp = await fetchProdottoDetail({ token, id_prodotto: idp, signal: controller.signal })
            const detail = resp?.item ?? resp?.data ?? resp ?? {}
            const idcat = Number(detail?.id_categoria) || 0
            const nameFromDetail = detail?.categoria_nome ?? detail?.categoria ?? detail?.nome_categoria
            const name =
              (nameFromDetail && String(nameFromDetail)) || (idcat && catNameById[idcat] ? catNameById[idcat] : 'Altro')
            updates[idp] = name || 'Altro'
          } catch (_e) {
            updates[idp] = 'Altro'
          }
        }
        if (Object.keys(updates).length > 0) {
          setProdCategoryMap((prev) => ({ ...prev, ...updates }))
        }
      } catch (_e) { }
    }
    run()
    return () => controller.abort()
  }, [token, righe, catOptions, prodCategoryMap])

  // Carica variazioni del prodotto selezionato + prezzi combinati
  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    if (!token) return
    if (!selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items)
          ? [...items].sort((a, b) => String(a?.codice || '').localeCompare(String(b?.codice || '')) || String(a?.nome || '').localeCompare(String(b?.nome || '')))
          : []
        setProdVarOptions(sorted)
        const cmap = {}
        const rows = Array.isArray(combo?.items) ? combo.items : []
        rows.forEach((r) => { if (r?.combo_key) cmap[String(r.combo_key)] = Number(r.prezzo) || 0 })
        setProdComboMap(cmap)
        setProdComboList(rows)
      } catch (_e) {
        setProdVarOptions([])
        setProdComboMap({})
        setProdComboList([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selProd])

  // Aggiorna prezzo suggerito nel riepilogo del modal
  useEffect(() => {
    const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey = selectedComboKey && String(selectedComboKey).trim() !== ''
      ? selectedComboKey
      : (selectedVarIds
        .map((id) => Number(id) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .join('+'))
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const suggested = comboPrice != null ? comboPrice : base
    setModalPrice(suggested)
  }, [selProd, prodOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  const updateRiga = (index, patch) => {
    setRighe((rows) =>
      rows.map((r, i) => {
        if (i !== index) {
          return r
        }
        const updated = { ...r, ...patch }
        return { ...updated, ced_warning: computeCedWarning(updated) }
      }),
    )
  }
  const handleAddRiga = () => {
    const newRow = {
      descrizione: '',
      quantita: 1,
      prezzo: 0,
      iva: 22,
      sconto: 0,
      combo_key: null,
    }
    setRighe((rows) => rows.concat({ ...newRow, ced_warning: computeCedWarning(newRow) }))
  }

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setComboSelectionError(null)
    setSelIva('')
    setModalQty(1)
    setModalPrice(0)
  }
  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgOptions([])
    setPkgPreview([])
  }
  const handleRemoveRiga = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }

  // Gestione CIG
  const addCig = () => {
    const code = String(newCig.cig || '').trim()
    if (!code) return
    setCigList((list) => [...list, { cig: code, data_cig: newCig.data_cig || '', motivazione: newCig.motivazione || '' }])
    setNewCig({ cig: '', data_cig: '', motivazione: '' })
  }
  const removeCig = (index) => setCigList((list) => list.filter((_, i) => i !== index))

  // Gestione Determine
  const addDetermina = () => {
    const num = String(newDetermina.determina || '').trim()
    if (!num) return
    setDetermineList((list) => [...list, { determina: num, data_determina: newDetermina.data_determina || '', motivazione: newDetermina.motivazione || '' }])
    setNewDetermina({ determina: '', data_determina: '', motivazione: '' })
  }
  const removeDetermina = (index) => setDetermineList((list) => list.filter((_, i) => i !== index))

  const totals = useMemo(() => {
    let imponibile = 0
    let totaleIva = 0
    for (const r of righe) {
      const q = Number(r.quantita) || 0
      const p = Number(r.prezzo) || 0
      const s = Number(r.sconto) || 0
      const aliq = Number(r.iva) || 0
      const rigaImpon = Math.max(0, q * p * (1 - s / 100))
      const rigaIva = rigaImpon * (aliq / 100)
      imponibile += rigaImpon
      totaleIva += rigaIva
    }
    const totale = imponibile + totaleIva
    return { imponibile, totaleIva, totale }
  }, [righe])

  const defaultEmailToValue = useMemo(() => {
    const seen = new Set()
    const collected = []
    const push = (value) => {
      const email = String(value || '').trim()
      if (!email) return
      const key = email.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      collected.push(email)
    }
    if (Array.isArray(preventivoContatti)) {
      preventivoContatti.forEach((contact) => push(contact?.email))
    }
    return collected.join(', ')
  }, [preventivoContatti])

  const defaultEmailSubject = useMemo(() => {
    const segments = []
    if (header?.numero) {
      const suffix = header?.anno ? `/${header.anno}` : ''
      segments.push(`Preventivo ${header.numero}${suffix}`)
    } else if (header?.anno) {
      segments.push(`Preventivo ${header.anno}`)
    } else {
      segments.push('Preventivo')
    }
    if (clienteDisplay?.label) {
      segments.push(clienteDisplay.label)
    }
    return segments.join(' - ')
  }, [header, clienteDisplay])

  const computedOggettoText = useMemo(() => {
    const manual = String(oggetto || '').trim()
    if (manual) return manual
    const map = new Map(
      (Array.isArray(oggettiOptions) ? oggettiOptions : []).map((o) => [
        Number(o?.id ?? o?.value ?? 0),
        String(o.label || ''),
      ]),
    )
    const labels = (Array.isArray(selectedOggetti) ? selectedOggetti : [])
      .map((v) => map.get(Number(v)))
      .filter(Boolean)
    return labels.join(' - ')
  }, [oggetto, oggettiOptions, selectedOggetti])

  const defaultEmailBody = useMemo(() => {
    const clienteName = clienteDisplay?.label || clienteLabel
    const numero =
      header?.numero != null
        ? `${header.numero}${header?.anno ? `/${header.anno}` : ''}`
        : `ID ${id}`
    const docDate = dataPreventivo
      ? (() => {
        const parsed = new Date(dataPreventivo)
        return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString('it-IT') : null
      })()
      : null
    const descrizione = (computedOggettoText || oggetto || 'la lavorazione richiesta').trim()
    const totalFormatted = totals?.totale ? formatCurrency(totals.totale) : formatCurrency(0)
    const id_preventivo = Number(id) || 0
    const operatorName = user?.name || user?.username || 'MediaPrint S.r.l.'
    return [
      `Gentile ${clienteName},<br>`,
      '',
      `Nel seguente link trova il preventivo n. ${numero}${docDate ? ` del ${docDate}` : ''} relativo a ${descrizione}.<br><br>`,
      `<a href="https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Preventivi.pdf?id_preventivo=${id_preventivo}&j_username=gestionaleMp&j_password=gestionaleMp">Scarica Preventivo #${numero}</a><br><br> `,
      'Restiamo a disposizione per qualsiasi chiarimento.<br>',
      '<br>',
      'Cordiali saluti,<br>',
      operatorName,
    ].join('\n')
  }, [clienteDisplay, header, id, dataPreventivo, computedOggettoText, oggetto, totals, user])

  // Carica pacchetti quando apro modal o modifico ricerca
  useEffect(() => {
    if (!token) return
    if (!pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({ token, q: pkgSearch, onlyActive: pkgOnlyActive, signal: controller.signal })
        setPkgOptions(items)
      } catch (_e) {
        setPkgOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  // Carica righe pacchetto selezionato
  useEffect(() => {
    if (!token || !pkgOpen) return
    if (!selPacchetto) { setPkgPreview([]); return }
    const controller = new AbortController()
    const loadDetail = async () => {
      try {
        const { righe } = await fetchPacchettoDetail({ token, id: Number(selPacchetto), signal: controller.signal })
        setPkgPreview(righe)
      } catch (_e) {
        setPkgPreview([])
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  const handleStatusChange = useCallback(async (nextCode) => {
    const safeCode = typeof nextCode === 'string' ? nextCode.trim().toLowerCase() : String(nextCode || '').trim().toLowerCase()
    if (!safeCode) return
    if (!token || !id) return
    if (statusUpdating) return
    const operatorName = user?.username || user?.name || user?.email || null
    const statusNote = safeCode === 'inviato' ? 'Invio manuale da timeline.' : null
    const prevCode = String(currentStatus?.code || '').toLowerCase()
    const prevLabel = currentStatus?.label ?? prevCode
    setStatusError(null)
    setStatusSuccess(null)
    setStatusUpdating(true)
    try {
      const result = await updatePreventivoStatus({
        token,
        id,
        statusCode: safeCode,
        operatorName,
        note: statusNote,
      })
      const updatedStatuses = Array.isArray(result.statuses) ? result.statuses : null
      if (updatedStatuses) {
        setStatusOptions(updatedStatuses)
      }
      const resolvedCode = result.currentStatus?.code ?? safeCode
      let resolvedLabel = result.currentStatus?.label ?? null
      if (!resolvedLabel) {
        const sourceStatuses = updatedStatuses || statusOptions
        if (Array.isArray(sourceStatuses)) {
          const match = sourceStatuses.find((s) => s?.code === resolvedCode)
          if (match) {
            resolvedLabel = match.label ?? resolvedLabel
          }
        }
      }
      setCurrentStatus({
        code: resolvedCode ?? null,
        label: resolvedLabel ?? resolvedCode ?? null,
      })
      // best-effort: salva log cambio stato (non blocca il flusso)
      try {
        const description = `Cambio stato da ${prevLabel || prevCode || '-'} a ${resolvedLabel || resolvedCode || safeCode}`
        await logPreventivoStatusChange({
          token,
          id,
          fromStatus: prevLabel || prevCode || null,
          toStatus: resolvedLabel || resolvedCode || safeCode,
          note: description,
          description,
          userId: (user && (user.id || user.user_id)) || null,
          userName: (user && (user.username || user.name || user.nome)) || null,
          context: {
            preventivo_id: id,
            previous_code: prevCode || null,
            previous_label: prevLabel || null,
            new_code: resolvedCode || safeCode,
            new_label: resolvedLabel || null,
          },
        })
        try {
          const { items } = await fetchPreventivoStatusLog({ token, id })
          const normalized = Array.isArray(items) ? items.slice() : []
          normalized.sort((a, b) => {
            const da = new Date(a?.at || a?.created_at || a?.timestamp || 0).getTime()
            const db = new Date(b?.at || b?.created_at || b?.timestamp || 0).getTime()
            return db - da
          })
          setStatusLog(normalized)
        } catch (_e2) { }
      } catch (_e) { }
      if (result.data) {
        setHeader((prev) => ({
          ...prev,
          stato: result.data.stato_label ?? result.data.stato_code ?? prev?.stato ?? null,
        }))
      }
      if (typeof result.editable === 'boolean') {
        setEditable(result.editable)
      }
      setStatusSuccess('Stato aggiornato correttamente.')
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setStatusError(err)
    } finally {
      setStatusUpdating(false)
    }
  }, [token, id, statusUpdating, logout, statusOptions, user])

  // Stepper usa gestione inline (3 step). Le transizioni 1->bozza, 2->inviato
  // sono gestite direttamente, mentre il passo 3 (Finale) usa la select.

  const buildPayload = ({ includeId = true } = {}) => {
    const normalizedRighe = (Array.isArray(righe) ? righe : []).map((r) => ({
      ...r,
      combo_key: r?.combo_key ?? null,
    }))
    const mittenteTarget = mittenteMode === 'altro' ? mittenteAnagraficaId : idAnagrafica
    const numericMittente = Number(mittenteTarget)
    const resolvedMittenteId =
      Number.isFinite(numericMittente) && numericMittente > 0 ? numericMittente : null
    const payload = {
      id_preventivo: includeId ? id : undefined,
      id_anagrafica: Number(idAnagrafica) || 0,
      id_mittente: resolvedMittenteId,
      data_preventivo: dataPreventivo,
      oggetto: computedOggettoText,
      note,
      oggetti: selectedOggetti.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0),
      riferimento_cliente: rifCliente,
      cig: cigList.map((c) => ({ cig: c.cig, data_cig: c.data_cig || null, motivazione: c.motivazione || null })),
      determine: determineList.map((d) => ({ determina: d.determina, data_determina: d.data_determina || null, motivazione: d.motivazione || null })),
      contatti: serializePreventivoContacts(preventivoContatti, Number(idAnagrafica) || null),
      righe: normalizedRighe,
      totals: {
        imponibile: totals.imponibile,
        totaleIva: totals.totaleIva,
        totale: totals.totale,
        sconto: 0,
      },
    }
    if (!includeId) {
      delete payload.id_preventivo
    }
    payload.note_dirty = noteDirty ? 1 : 0
    return payload
  }

  const headerAnno = header?.anno ?? null
  const headerNumero = header?.numero ?? null
  const currentStatusLabel = currentStatus?.label ?? null
  const isConfirmed = useMemo(
    () => String(currentStatus?.code || '').toLowerCase() === 'confermato',
    [currentStatus],
  )
  const defaultDdtNote = useMemo(() => {
    if (headerNumero && headerAnno) {
      return `Documento generato dal preventivo ${headerNumero}/${headerAnno}.`
    }
    if (headerNumero) {
      return `Documento generato dal preventivo n. ${headerNumero}.`
    }
    return `Documento generato dal preventivo ID ${id}.`
  }, [headerNumero, headerAnno, id])
  const defaultFatturaNote = useMemo(() => {
    if (headerNumero && headerAnno) {
      return `Fattura generata dal preventivo ${headerNumero}/${headerAnno}.`
    }
    if (headerNumero) {
      return `Fattura generata dal preventivo n. ${headerNumero}.`
    }
    return `Fattura generata dal preventivo ID ${id}.`
  }, [headerNumero, headerAnno, id])
  const preventivoHasRighe = useMemo(() => Array.isArray(righe) && righe.length > 0, [righe])
  const latestLinkedLavorazione = useMemo(
    () => (linkedLavorazioni.length > 0 ? linkedLavorazioni[0] : null),
    [linkedLavorazioni],
  )
  const hasLinkedLavorazione = linkedLavorazioni.length > 0
  const linkedLavorazioneId = latestLinkedLavorazione?.id ?? null
  const canGenerateLavorazione = isConfirmed && preventivoHasRighe
  const currentUserId = user?.id_user ?? user?.id ?? null
  const currentUserName = user?.full_name ?? user?.name ?? user?.username ?? user?.nickname ?? null

  const handleOpenLavorazioneDetail = useCallback(
    (targetId) => {
      const resolvedId = Number(targetId ?? linkedLavorazioneId)
      if (!Number.isFinite(resolvedId) || resolvedId <= 0) return
      navigate(`/lavorazioni/dettaglio?id=${resolvedId}`)
    },
    [navigate, linkedLavorazioneId],
  )

  const handleGenerateLavorazione = useCallback(async () => {
    if (!token || !id) return
    setLavorazioneGenerating(true)
    setLavorazioneError(null)
    setLavorazioneSuccess(null)
    const normalizedNote = typeof note === 'string' ? note.trim() : ''
    try {
        const titoloLavorazione =
          (computedOggettoText && computedOggettoText.trim() !== '' ? computedOggettoText : null) ||
          (oggetto && oggetto.trim() !== '' ? oggetto : null) ||
          (headerNumero ? `Preventivo ${headerNumero}` : null)

        const payload = await generateLavorazioneFromPreventivo({
          token,
          id,
          titolo: titoloLavorazione ?? undefined,
          descrizione: normalizedNote || titoloLavorazione || undefined,
          note: normalizedNote || undefined,
        })

        const newId = payload?.id_lavorazione ?? payload?.lavorazione?.id_lavorazione ?? null
        const newCode = payload?.codice ?? payload?.lavorazione?.codice ?? null
        const activitiesCreated =
          Number(payload?.attivita_create ?? payload?.lavorazione?.attivita_create ?? 0) || 0
        const newEntry = normalizeLavorazioneItem({
          id_lavorazione: newId,
          codice: newCode,
          titolo: titoloLavorazione ?? null,
          stato: 'aperta',
          created_at: new Date().toISOString(),
        })
        if (newEntry) {
          setLinkedLavorazioni((prev) => {
            const list = Array.isArray(prev) ? prev : []
            const filtered = list.filter((item) => item.id !== newEntry.id)
            return [newEntry, ...filtered]
          })
        }
        const successMessage = newCode
          ? `Lavorazione ${newCode} generata correttamente.`
          : 'Lavorazione generata correttamente.'
        const activitySuffix = activitiesCreated > 0 ? ` Generate ${activitiesCreated} attivita.` : ''
        setLavorazioneSuccess(successMessage + activitySuffix)
    } catch (err) {
      if (err?.name === 'AbortError') {
        return
      }
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setLavorazioneError(err)
    } finally {
      setLavorazioneGenerating(false)
    }
  }, [token, id, computedOggettoText, oggetto, note, headerNumero, logout])

  const handleOpenDdtModal = useCallback(() => {
    setDdtError(null)
    setDdtSuccess(null)
    setDdtResult(null)
    setDdtForm((prev) => ({
      data_ddt: prev?.data_ddt && prev.data_ddt !== '' ? prev.data_ddt : getTodayIsoDate(),
      id_causale: prev?.id_causale ?? '',
      note: prev?.note && prev.note.trim() !== '' ? prev.note : defaultDdtNote,
    }))
    setDdtModalVisible(true)
  }, [defaultDdtNote])

  const handleCloseDdtModal = useCallback(() => {
    if (ddtSubmitting) return
    setDdtModalVisible(false)
  }, [ddtSubmitting])

  const handleEmitDdt = useCallback(async () => {
    if (!token || !id) return
    if (!preventivoHasRighe) {
      setDdtError(new Error('Il preventivo non contiene righe da trasferire nel DDT.'))
      return
    }
    setDdtSubmitting(true)
    setDdtError(null)
    setDdtSuccess(null)
    setDdtResult(null)
    try {
      const response = await emitPreventivoDdt({
        token,
        id,
        data_ddt: ddtForm?.data_ddt || undefined,
        id_causale: ddtForm?.id_causale || undefined,
        note: ddtForm?.note && ddtForm.note.trim() !== '' ? ddtForm.note.trim() : defaultDdtNote,
      })
      const numero = response?.ddt?.numero_documento
      const anno = response?.ddt?.anno
      const successMessage =
        numero && anno
          ? `DDT emesso con numero ${numero}/${anno}.`
          : 'DDT emesso con successo.'
      setDdtSuccess(successMessage)
      setDdtResult(response?.ddt ?? null)
      setRefreshCounter((count) => count + 1)
      const docNumber =
        response?.ddt?.numero_documento && response?.ddt?.anno
          ? `${response.ddt.numero_documento}/${response.ddt.anno}`
          : response?.ddt?.numero_documento ?? ''
      logPreventivoEvent({
        token,
        id,
        description: 'Emissione DDT dal preventivo',
        note: `Emesso DDT ${docNumber || ''}`.trim(),
        context: { type: 'ddt', id_ddt: response?.ddt?.id_ddt ?? null },
        userId: currentUserId,
        userName: currentUserName,
      }).catch(() => { })
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setDdtError(error)
    } finally {
      setDdtSubmitting(false)
    }
  }, [token, id, preventivoHasRighe, ddtForm, defaultDdtNote, logout])

  const handleOpenFatturaModal = useCallback(() => {
    setFatturaError(null)
    setFatturaSuccess(null)
    setFatturaResult(null)
    setFatturaForm((prev) => ({
      data_fattura: prev?.data_fattura && prev.data_fattura !== '' ? prev.data_fattura : getTodayIsoDate(),
      id_sezionale: prev?.id_sezionale ?? '',
      id_tipo_fatt: prev?.id_tipo_fatt ?? '',
      id_stato_fatt: prev?.id_stato_fatt ?? '',
      note: prev?.note && prev.note.trim() !== '' ? prev.note : defaultFatturaNote,
    }))
    setFatturaModalVisible(true)
  }, [defaultFatturaNote])

  const handleCloseFatturaModal = useCallback(() => {
    if (fatturaSubmitting) return
    setFatturaModalVisible(false)
  }, [fatturaSubmitting])

  const handleEmitFattura = useCallback(async () => {
    if (!token || !id) return
    if (!preventivoHasRighe) {
      setFatturaError(new Error('Il preventivo non contiene righe da trasferire nella fattura.'))
      return
    }
    if (!fatturaForm?.id_sezionale) {
      setFatturaError(new Error('Selezionare un sezionale valido.'))
      return
    }
    setFatturaSubmitting(true)
    setFatturaError(null)
    setFatturaSuccess(null)
    setFatturaResult(null)
    try {
      const response = await emitPreventivoFattura({
        token,
        id,
        data_fattura: fatturaForm?.data_fattura || undefined,
        id_sezionale: fatturaForm?.id_sezionale || undefined,
        id_tipo_fatt: fatturaForm?.id_tipo_fatt || undefined,
        id_stato_fatt: fatturaForm?.id_stato_fatt || undefined,
        note: fatturaForm?.note && fatturaForm.note.trim() !== '' ? fatturaForm.note.trim() : defaultFatturaNote,
      })
      const numero = response?.fattura?.numero_documento
      const anno = response?.fattura?.anno
      const successMessage =
        numero && anno
          ? `Fattura emessa con numero ${numero}/${anno}.`
          : 'Fattura emessa con successo.'
      setFatturaSuccess(successMessage)
      setFatturaResult(response?.fattura ?? null)
      setRefreshCounter((count) => count + 1)
      const docNumber =
        response?.fattura?.numero_documento && response?.fattura?.anno
          ? `${response.fattura.numero_documento}/${response.fattura.anno}`
          : response?.fattura?.numero_documento ?? ''
      logPreventivoEvent({
        token,
        id,
        description: 'Emissione fattura dal preventivo',
        note: `Emessa fattura ${docNumber || ''}`.trim(),
        context: { type: 'fattura', id_fattura: response?.fattura?.id_fattura ?? null },
        userId: currentUserId,
        userName: currentUserName,
      }).catch(() => { })
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setFatturaError(error)
    } finally {
      setFatturaSubmitting(false)
    }
  }, [token, id, preventivoHasRighe, fatturaForm, defaultFatturaNote, logout])


  const handleOpenPrintPDF = useCallback(() => {
    if (typeof window === 'undefined') return
    const idPreventivo = Number(id)
    if (!Number.isFinite(idPreventivo) || idPreventivo <= 0) return
    window.open(
      `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Preventivi.pdf?id_preventivo=${idPreventivo}&j_username=gestionaleMp&j_password=gestionaleMp`,
      '_blank',
      'noopener',
    )
  }, [id])

  const handleOpenEmailModal = useCallback(() => {
    setEmailError(null)
    setEmailSuccess(null)
    setEmailModalVisible(true)
    setEmailTo((prev) => (prev && prev.trim() !== '' ? prev : defaultEmailToValue))
    setEmailSubject((prev) => (prev && prev.trim() !== '' ? prev : defaultEmailSubject || `Preventivo ${id}`))
    setEmailBody((prev) => (prev && prev.trim() !== '' ? prev : defaultEmailBody))
  }, [defaultEmailToValue, defaultEmailSubject, defaultEmailBody, id])

  const handleCloseEmailModal = useCallback(() => {
    if (emailSending) return
    setEmailModalVisible(false)
  }, [emailSending])

  const handleSendPreventivoEmail = useCallback(async () => {
    if (!token || !id) return
    const sanitizedTo = String(emailTo || '').trim()
    if (sanitizedTo === '') {
      setEmailError(new Error('Indicare almeno un destinatario.'))
      return
    }
    try {
      await saveDraft({ silent: true })
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setEmailError(err)
      return
    }
    setEmailSending(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      const result = await sendPreventivoEmail({
        token,
        id,
        to: emailTo,
        cc: emailCc,
        subject: emailSubject,
        message: emailBody,
        revisionNote: emailSubject,
        revisionOperator: user?.username ?? user?.email ?? undefined,
      })
      if (!result?.ok) {
        const error = new Error(result?.message || 'Invio email non riuscito.')
        error.payload = result
        throw error
      }
      setEmailSuccess('Email inviata con successo.')
      setEmailModalVisible(false)
      setRefreshCounter((count) => count + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setEmailError(err)
    } finally {
      setEmailSending(false)
    }
  }, [token, id, emailTo, emailCc, emailSubject, emailBody, logout, user])

  const handleOpenRevisionDetail = useCallback(
    async (revisionId) => {
      const numericId = Number(revisionId)
      if (!token || !Number.isFinite(numericId) || numericId <= 0) return
      setRevisionModalVisible(true)
      setRevisionModalLoading(true)
      setRevisionModalError(null)
      setRevisionModalData(null)
      try {
        const result = await fetchPreventivoRevisionDetail({ token, id: numericId })
        setRevisionModalData(result?.revision ?? null)
      } catch (error) {
        setRevisionModalError(error)
      } finally {
        setRevisionModalLoading(false)
      }
    },
    [token],
  )

  const saveDraft = useCallback(
    async ({ silent = false } = {}) => {
      if (!editable || pendingOggettoCreate) {
        return null
      }
      setStatusError(null)
      setStatusSuccess(null)
      if (!silent) {
        setSubmitError(null)
        setSubmitSuccess(null)
      }
      setSubmitting(true)
      try {
        const controller = new AbortController()
        const payload = buildPayload()
        const result = await createPreventivo({
          token,
          ...payload,
          is_acquisto: isAcquisto,
          send: false,
          signal: controller.signal,
        })
        setNoteDirty(false)
        const newId = getPreventivoIdFromResponse(result)
        if (!silent && (!id || createMode) && newId) {
          navigate(`${basePath}/dettagli?id=${newId}`, { replace: true })
        }
        if (!silent) {
          setSubmitSuccess(
            result?.anno_preventivo && result?.numero_documento
              ? `Bozza aggiornata. N. ${result.anno_preventivo}/${result.numero_documento}`
              : `Bozza aggiornata (ID ${result?.id_preventivo ?? id})`,
          )
        }
        return result
      } catch (err) {
        if (err?.status === 401 && logout) {
          logout()
          throw err
        }
        if (!silent) {
          setSubmitError(err)
        }
        throw err
      } finally {
        setSubmitting(false)
      }
    },
    [
      buildPayload,
      createPreventivo,
      createMode,
      editable,
      id,
      isAcquisto,
      logout,
      navigate,
      pendingOggettoCreate,
      token,
    ],
  )

  const handleSalvaBozza = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }
    try {
      await saveDraft()
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
      }
    }
  }

  bozzaSaveHandlerRef.current = handleSalvaBozza

  const handleArchivePreventivo = useCallback(async () => {
    if (!token || !id) return
    const confirmed = window.confirm('Confermi l\'archiviazione di questo preventivo?')
    if (!confirmed) return
    setArchiveError(null)
    setArchiveLoading(true)
    try {
      await archivePreventivo({ token, id })
      navigate(`${basePath}/lista`, { replace: true })
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setArchiveError(err)
    } finally {
      setArchiveLoading(false)
    }
  }, [token, id, navigate, logout])

  const handleDuplicatePreventivo = useCallback(async () => {
    if (!token) return
    setDuplicateError(null)
    setDuplicateLoading(true)
    try {
      const controller = new AbortController()
      const payload = buildPayload({ includeId: false })
      const result = await createPreventivo({
        token,
        ...payload,
        is_acquisto: isAcquisto,
        send: false,
        signal: controller.signal,
      })
      const newId = getPreventivoIdFromResponse(result)
      if (!newId) {
        throw new Error('Non è stato possibile recuperare l\'ID del preventivo duplicato.')
      }
      navigate(`${basePath}/dettagli?id=${newId}`)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setDuplicateError(err)
    } finally {
      setDuplicateLoading(false)
    }
  }, [buildPayload, createPreventivo, isAcquisto, token, navigate, logout])

  // Allow the component to run all Hooks on every render; effects and logic below already guard on `id`.
  // Visualizzazione stato: 3 step (Bozza -> Inviato -> Finale),
  // con select per scegliere lo stato finale (Confermato/Rifiutato/Annullato)
  const isFinalCode = useCallback((code) => {
    const s = String(code || '').toLowerCase()
    return s === 'confermato' || s === 'rifiutato_cliente' || s === 'annullato'
  }, [])

  const visualStatusSteps = useMemo(() => ['Bozza', 'Inviato', 'Finale'], [])

  const activeVisualStatusStep = useMemo(() => {
    const code = String(currentStatus?.code || '').toLowerCase()
    if (code === 'bozza') return 1
    if (code === 'inviato') return 2
    if (isFinalCode(code)) return 3
    return 1
  }, [currentStatus, isFinalCode])

  const finalStatusOptions = useMemo(() => {
    const all = Array.isArray(statusOptions) ? statusOptions : []
    return all.filter((s) => {
      const c = String(s?.code || '').toLowerCase()
      return c && c !== 'bozza' && c !== 'inviato'
    })
  }, [statusOptions])

  const uiDisabled = !editable || anagraficaDisabled
  const latestRevisionLabel = revisions.length > 0 ? revisions[0].label : null
  const revisionModalDetail = revisionModalData?.payload?.detail ?? null
  const revisionModalLines = Array.isArray(revisionModalDetail?.righe) ? revisionModalDetail.righe : []

  const handleBreadcrumbSave = useCallback(() => {
    if (uiDisabled || submitting || pendingOggettoCreate) {
      return
    }
    if (typeof bozzaSaveHandlerRef.current === 'function') {
      bozzaSaveHandlerRef.current()
    }
  }, [pendingOggettoCreate, submitting, uiDisabled])

  useEffect(() => {
    if (!id && !createMode) {
      clearBreadcrumbActions()
      return
    }
    const actions = []
    if (id) {
      actions.push({
        id: 'preventivo-refresh',
        icon: cilReload,
        label: loading ? 'Aggiornamento dati...' : 'Aggiorna dati',
        onClick: handleRefreshData,
        disabled: loading,
      })
    }
    if (!loading && !loadError) {
      actions.push({
        id: 'preventivo-save',
        label: submitting ? 'Salvataggio preventivo...' : 'Aggiorna bozza',
        onClick: handleBreadcrumbSave,
        disabled: uiDisabled || submitting || pendingOggettoCreate,
      })
    }
    setBreadcrumbActions(actions)
    return () => clearBreadcrumbActions()
  }, [
    clearBreadcrumbActions,
    createMode,
    handleBreadcrumbSave,
    handleRefreshData,
    id,
    loadError,
    loading,
    pendingOggettoCreate,
    setBreadcrumbActions,
    submitting,
    uiDisabled,
  ])
  const formatDateTime = (val) => {
    const d = new Date(val)
    if (Number.isFinite(d.getTime())) return d.toLocaleString('it-IT')
    return String(val || '')
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h5 className="mb-0">Preventivi - Dettagli</h5>
            <small className="text-body-secondary">
              Documento {header.anno ?? '-'} / {header.numero ?? '-'}
            </small>
            {hasLinkedLavorazione && (
              <div className="text-body-secondary small">
                Lavorazioni collegate: {linkedLavorazioni.length}
                {latestLinkedLavorazione
                  ? ` - Ultima: ${latestLinkedLavorazione.codice || `ID ${latestLinkedLavorazione.id}`}`
                  : ''}
              </div>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {header.stato && (
              <CBadge color={editable ? 'info' : 'secondary'} className="text-uppercase">
                {header.stato}
              </CBadge>
            )}
            {latestRevisionLabel && (
              <CBadge color="dark" className="text-uppercase">
                {latestRevisionLabel}
              </CBadge>
            )}
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleOpenEmailModal}
              disabled={loading || !token}
            >
              <CIcon icon={cilEnvelopeClosed} className="me-2" />
              Invia email
            </CButton>
            <CButton
              color="danger"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleOpenPrintPDF}
              disabled={loading || !token}
            >
              <CIcon icon={cibAdobeAcrobatReader} className="me-2" />
              Stampa PDF
            </CButton>
            <CButton
              color="warning"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleArchivePreventivo}
              disabled={loading || archiveLoading || !token}
            >
              <CIcon icon={cilTrash} className="me-2" />
              Archivia
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleDuplicatePreventivo}
              disabled={loading || archiveLoading || duplicateLoading || !token}
            >
              <CIcon icon={cilCopy} className="me-2" />
              {duplicateLoading ? 'Duplicazione...' : 'Duplica per nuove attività'}
            </CButton>
            {hasLinkedLavorazione && (
              null
            )}
            {isConfirmed && (
              <>
                {canGenerateLavorazione && (
                  <CButton
                    color="warning"
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleGenerateLavorazione}
                    disabled={lavorazioneGenerating || loading || !token}
                  >
                    <CIcon icon={cilCog} className="me-2" />
                    {lavorazioneGenerating ? 'Generazione...' : 'Genera lavorazione'}
                  </CButton>
                )}
                <CButton
                  color="success"
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleOpenDdtModal}
                  disabled={loading || !token || !preventivoHasRighe}
                >
                  <CIcon icon={cilCheckCircle} className="me-2" />
                  Emetti DDT
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleOpenFatturaModal}
                >
                  <CIcon icon={cilSave} className="me-2" />
                  Emetti Fattura
                </CButton>
              </>
            )}
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && loadError && (
          <CAlert color="danger">{loadError.message || 'Impossibile caricare il dettaglio.'}</CAlert>
        )}

        {!loading && !loadError && (
          <CForm>
            {archiveError && (
              <CAlert color="danger" className="mb-3">
                {archiveError?.payload?.message || archiveError.message || 'Impossibile archiviare il preventivo.'}
              </CAlert>
            )}
            {lavorazioneError && (
              <CAlert color="danger" className="mb-3">
                {lavorazioneError?.payload?.message || lavorazioneError.message || 'Impossibile generare la lavorazione.'}
              </CAlert>
            )}
            {lavorazioneSuccess && (
              <CAlert color="success" className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>{lavorazioneSuccess}</span>
              </CAlert>
            )}
            {anagraficaDisabled && (
              <CAlert color="warning" className="mb-3">
                {clienteLabel} disattivato: modifiche e conferma disabilitate.
              </CAlert>
            )}
            {submitError && (
              <CAlert color="danger" className="mb-3">
                {submitError?.payload?.message || submitError.message || 'Errore durante il salvataggio.'}
              </CAlert>
            )}
            {submitSuccess && (
              <CAlert color="success" className="mb-3">{submitSuccess}</CAlert>
            )}
            {duplicateError && (
              <CAlert color="danger" className="mb-3">
                {duplicateError?.payload?.message || duplicateError.message || 'Impossibile duplicare il preventivo.'}
              </CAlert>
            )}

            {!editable && (
              <CAlert color="info" className="mb-3">
                Il documento non è in stato bozza. La modifica è disabilitata.
              </CAlert>
            )}

            <section className="mb-4">
              <CNav variant="tabs" role="tablist" className="mb-3">
                <CNavItem>
                  <CNavLink active={statusTab === 'timeline'} role="tab" aria-selected={statusTab === 'timeline'} onClick={() => setStatusTab('timeline')}>
                    Timeline
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={statusTab === 'storico'} role="tab" aria-selected={statusTab === 'storico'} onClick={() => setStatusTab('storico')}>
                    Storico
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={statusTab === 'revisioni'} role="tab" aria-selected={statusTab === 'revisioni'} onClick={() => setStatusTab('revisioni')}>
                    Revisioni
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={statusTab === 'documenti'} role="tab" aria-selected={statusTab === 'documenti'} onClick={() => setStatusTab('documenti')}>
                    Documenti correlati
                  </CNavLink>
                </CNavItem>
              </CNav>
              <CTabContent>
                <CTabPane visible={statusTab === 'timeline'} role="tabpanel">
                  {visualStatusSteps.length > 0 && (
                    <>
                      {statusError && (
                        <CAlert color="danger" className="mb-3">
                          {statusError?.payload?.message || statusError.message || "Errore durante l'aggiornamento dello stato."}
                        </CAlert>
                      )}
                      {statusSuccess && (
                        <CAlert color="success" className="mb-3">{statusSuccess}</CAlert>
                      )}
                      <div className="px-2 px-lg-3 py-3 border rounded bg-body-tertiary">
                        <div className="d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3">
                          <div className="flex-grow-1 w-100">
                            <CStepper
                              className="w-100"
                              activeStepNumber={activeVisualStatusStep}
                              steps={visualStatusSteps}
                              linear={false}
                              validation={false}
                              onStepChange={(n) => {
                                const step = Number(n)
                                // Evita loop: non reagire se già su quello step o durante update
                                if (statusUpdating) return
                                if (step === activeVisualStatusStep) return
                                // Mappa step -> codice stato e salta se già coerente
                                let nextCode = null
                                if (step === 1) nextCode = 'bozza'
                                if (step === 2) nextCode = 'inviato'
                                if (!nextCode) return
                                const currCode = String(currentStatus?.code || '').toLowerCase()
                                if (currCode === nextCode) return
                                handleStatusChange(nextCode)
                              }}
                            />
                          </div>
                          <div className="w-100 w-lg-auto align-self-center" style={{ minWidth: '220px', maxWidth: '320px' }}>
                            <CInputGroup size="sm">
                              <CInputGroupText>Stato finale</CInputGroupText>
                              <CFormSelect
                                size="sm"
                                value={isFinalCode(currentStatus?.code) ? currentStatus.code : ''}
                                onChange={(e) => {
                                  const next = e.target.value
                                  if (!next) return
                                  handleStatusChange(next)
                                }}
                                disabled={statusUpdating || finalStatusOptions.length === 0}
                              >
                                <option value="">Seleziona...</option>
                                {finalStatusOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>{opt.label ?? opt.code}</option>
                                ))}
                              </CFormSelect>
                            </CInputGroup>
                          </div>
                        </div>
                        <div className="mt-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">
                          <div>
                            <small className="text-body-secondary">
                              Stato attuale: <span className="fw-semibold">{currentStatusLabel || 'N.D.'}</span>
                            </small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {statusUpdating && <CSpinner size="sm" />}
                            <small className="text-body-secondary">Seleziona uno step per aggiornare manualmente lo stato.</small>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CTabPane>
                <CTabPane visible={statusTab === 'storico'} role="tabpanel">
                  {statusLogLoading && (
                    <div className="d-flex align-items-center gap-2">
                      <CSpinner size="sm" />
                      <small className="text-body-secondary">Caricamento storico...</small>
                    </div>
                  )}
                  {!statusLogLoading && statusLogError && (
                    <CAlert color="danger" className="mb-0">Impossibile caricare lo storico dei cambi di stato.</CAlert>
                  )}
                  {!statusLogLoading && !statusLogError && (
                    statusLog.length === 0 ? (
                      <small className="text-body-secondary">Nessun evento di stato.</small>
                    ) : (
                      <CTable data-testid="table" small responsive className="mb-0">
                        <CTableHead className="mp-table-head">
                          <CTableRow>
                            <CTableHeaderCell>Data</CTableHeaderCell>
                            <CTableHeaderCell>Utente</CTableHeaderCell>
                            <CTableHeaderCell>Transizione</CTableHeaderCell>
                            <CTableHeaderCell>Nota</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {statusLog.map((e, idx) => (
                            <CTableRow key={idx}>
                              <CTableDataCell>{formatDateTime(e.at || e.created_at || e.timestamp)}</CTableDataCell>
                              <CTableDataCell>{e.user_name || e.username || e.user || e.operatore || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {(e.from_status || e.from || e.da)
                                  ? `${e.from_status || e.from || e.da} → ${e.to_status || e.to || e.a || e.status || ''}`
                                  : (e.to_status || e.to || e.a || e.status || '')}
                              </CTableDataCell>
                              <CTableDataCell>{e.note || e.message || ''}</CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )
                  )}
                </CTabPane>
                <CTabPane visible={statusTab === 'revisioni'} role="tabpanel">
                  {revisions.length === 0 ? (
                    <small className="text-body-secondary">Nessuna revisione registrata.</small>
                  ) : (
                    <CTable data-testid="table" small responsive className="mb-0">
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell>Revisione</CTableHeaderCell>
                          <CTableHeaderCell>Data</CTableHeaderCell>
                          <CTableHeaderCell>Operatore</CTableHeaderCell>
                          <CTableHeaderCell>Nota</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {revisions.map((rev) => (
                          <CTableRow key={rev.id_revisione}>
                            <CTableDataCell>{rev.label || `Rev.${rev.numero_revision}`}</CTableDataCell>
                            <CTableDataCell>{formatDateTime(rev.created_at)}</CTableDataCell>
                            <CTableDataCell>{rev.operatore || '-'}</CTableDataCell>
                            <CTableDataCell>{rev.note || '-'}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => handleOpenRevisionDetail(rev.id_revisione)}
                                title="Apri dettaglio revisione"
                                aria-label="Apri dettaglio revisione"
                              >
                                <CIcon icon={cilZoom} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </CTabPane>
                <CTabPane visible={statusTab === 'documenti'} role="tabpanel">
                  <h6 className="text-body-secondary mb-3">Lavorazioni collegate</h6>
                  {linkedLavorazioni.length === 0 ? (
                    <CAlert color="info" className="mb-4">Nessuna lavorazione collegata al preventivo.</CAlert>
                  ) : (
                    <CTable data-testid="table" small responsive className="mb-4">
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell>Codice</CTableHeaderCell>
                          <CTableHeaderCell>Titolo</CTableHeaderCell>
                          <CTableHeaderCell>Stato</CTableHeaderCell>
                          <CTableHeaderCell>Creata il</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {linkedLavorazioni.map((lavorazione) => (
                          <CTableRow key={lavorazione.id}>
                            <CTableDataCell>{lavorazione.codice || `ID ${lavorazione.id}`}</CTableDataCell>
                            <CTableDataCell>{lavorazione.titolo || '-'}</CTableDataCell>
                            <CTableDataCell>{lavorazione.stato || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDateTime(lavorazione.created_at)}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => handleOpenLavorazioneDetail(lavorazione.id)}
                              >
                                Dettagli
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                  <CRow className="g-4">
                    <CCol md={6}>
                      <h6 className="text-body-secondary mb-3">DDT collegati</h6>
                      {linkedDdt.length === 0 ? (
                        <CAlert color="info" className="mb-0">Nessun DDT collegato al preventivo.</CAlert>
                      ) : (
                        <CTable data-testid="table" small responsive>
                          <CTableHead className="mp-table-head">
                            <CTableRow>
                              <CTableHeaderCell>Numero</CTableHeaderCell>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell>Causale</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Pezzi</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Peso (kg)</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {linkedDdt.map((doc) => (
                              <CTableRow key={doc.id_ddt}>
                                <CTableDataCell>
                                  {doc.anno ?? '-'}/{doc.numero_documento ?? '-'}
                                </CTableDataCell>
                                <CTableDataCell>{formatDate(doc.data_ddt)}</CTableDataCell>
                                <CTableDataCell>{doc.causale_label || '-'}</CTableDataCell>
                                <CTableDataCell className="text-end">
                                  {formatNumberValue(doc.totale_pezzi)}
                                </CTableDataCell>
                                <CTableDataCell className="text-end">
                                  {formatNumberValue(doc.totale_peso_kg, 3)}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => navigate(`/ddt/dettagli?id=${doc.id_ddt}`)}
                                  >
                                    Dettagli
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      )}
                    </CCol>
                    <CCol md={6}>
                      <h6 className="text-body-secondary mb-3">Fatture collegate</h6>
                      {linkedFatture.length === 0 ? (
                        <CAlert color="info" className="mb-0">Nessuna fattura collegata al preventivo.</CAlert>
                      ) : (
                        <CTable data-testid="table" small responsive>
                          <CTableHead className="mp-table-head">
                            <CTableRow>
                              <CTableHeaderCell>Numero</CTableHeaderCell>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                              <CTableHeaderCell>Stato</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {linkedFatture.map((doc) => (
                              <CTableRow key={doc.id_fattura}>
                                <CTableDataCell>
                                  {doc.anno ?? '-'}/{doc.numero_documento ?? '-'}
                                </CTableDataCell>
                                <CTableDataCell>{formatDate(doc.data_fattura)}</CTableDataCell>
                                <CTableDataCell className="text-end">{formatCurrency(doc.totale)}</CTableDataCell>
                                <CTableDataCell className="text-end">{formatCurrency(doc.saldo)}</CTableDataCell>
                                <CTableDataCell>
                                  {doc.stato_label ? (
                                    <CBadge color="secondary">{doc.stato_label}</CBadge>
                                  ) : (
                                    <span className="text-body-secondary">-</span>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => navigate(`/fatture/dettagli?id=${doc.id_fattura}`)}
                                  >
                                    Dettagli
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      )}
                    </CCol>
                  </CRow>
                </CTabPane>
              </CTabContent>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Dati generali</h6>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>{clienteLabel}</CFormLabel>
                  <AnagraficaAutocomplete
                    items={clientiOptions}
                    value={idAnagrafica}
                    onChange={(id) => setIdAnagrafica(id)}
                    onChangeCliente={(cliente) => {
                      // Evita aggiornamenti ridondanti del display cliente
                      if (cliente) {
                        const nextId = Number(cliente.id_anagrafica ?? cliente.id ?? idAnagrafica ?? 0) || null
                        const nextLabel = String(
                          cliente.ragione_sociale ?? cliente.ragioneSociale ?? cliente.cliente_ragione_sociale ?? ''
                        )
                        const nextCodice = cliente.codice_cliente ?? null
                        const nextPiva = cliente.piva ?? null
                        const nextCf = cliente.codice_fiscale ?? null
                        const nextEmail = cliente.email ?? cliente.cliente_email ?? cliente.mail ?? null
                        setClienteDisplay((prev) => {
                          if (
                            prev.id === nextId &&
                            prev.label === nextLabel &&
                            prev.codiceCliente === nextCodice &&
                            prev.piva === nextPiva &&
                            prev.codiceFiscale === nextCf &&
                            prev.email === nextEmail
                          ) {
                            return prev
                          }
                          return {
                            id: nextId,
                            label: nextLabel,
                            codiceCliente: nextCodice,
                            piva: nextPiva,
                            codiceFiscale: nextCf,
                            email: nextEmail,
                          }
                        })
                      } else {
                        setClienteDisplay((prev) => {
                          if (
                            prev.id == null &&
                            prev.label === '' &&
                            prev.codiceCliente == null &&
                            prev.piva == null &&
                            prev.codiceFiscale == null &&
                            prev.email == null
                          ) {
                            return prev
                          }
                          return {
                            id: null,
                            label: '',
                            codiceCliente: null,
                            piva: null,
                            codiceFiscale: null,
                            email: null,
                          }
                        })
                      }
                    }}
                    onSearch={(q) => {
                      const s = String(q || '')
                      setClienteSearch((prev) => (prev === s ? prev : s))
                    }}
                    loading={loadingClienti}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>CIG</CFormLabel>
                  <CTable data-testid="table" small bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '25%' }}>CIG</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '20%' }}>Data</CTableHeaderCell>
                        <CTableHeaderCell>Motivazione</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '10%' }} className="text-center">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>
                          <CFormInput placeholder="CIG" value={newCig.cig} onChange={(e) => setNewCig((s) => ({ ...s, cig: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput type="date" value={newCig.data_cig} onChange={(e) => setNewCig((s) => ({ ...s, data_cig: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput placeholder="Motivazione" value={newCig.motivazione} onChange={(e) => setNewCig((s) => ({ ...s, motivazione: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton size="sm" color="primary" variant="outline" type="button" onClick={addCig} disabled={uiDisabled || !String(newCig.cig || '').trim()}>
                            Aggiungi
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                      {cigList.map((c, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>{c.cig}</CTableDataCell>
                          <CTableDataCell>{c.data_cig || '-'}</CTableDataCell>
                          <CTableDataCell>{c.motivazione || ''}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton size="sm" color="link" type="button" onClick={() => removeCig(idx)} disabled={uiDisabled}>Rimuovi</CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Data preventivo</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dataPreventivo || ''}
                    onChange={(e) => setDataPreventivo(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Riferimento {clienteLabel.toLowerCase()}</CFormLabel>
                  <CFormInput
                    value={rifCliente}
                    onChange={(e) => setRifCliente(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Determina</CFormLabel>
                  <CTable data-testid="table" small bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '25%' }}>Determina</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '20%' }}>Data</CTableHeaderCell>
                        <CTableHeaderCell>Motivazione</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '10%' }} className="text-center">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>
                          <CFormInput placeholder="Num./Codice" value={newDetermina.determina} onChange={(e) => setNewDetermina((s) => ({ ...s, determina: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput type="date" value={newDetermina.data_determina} onChange={(e) => setNewDetermina((s) => ({ ...s, data_determina: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput placeholder="Motivazione" value={newDetermina.motivazione} onChange={(e) => setNewDetermina((s) => ({ ...s, motivazione: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton size="sm" color="primary" variant="outline" type="button" onClick={addDetermina} disabled={uiDisabled || !String(newDetermina.determina || '').trim()}>
                            Aggiungi
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                      {determineList.map((d, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>{d.determina}</CTableDataCell>
                          <CTableDataCell>{d.data_determina || '-'}</CTableDataCell>
                          <CTableDataCell>{d.motivazione || ''}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton size="sm" color="link" type="button" onClick={() => removeDetermina(idx)} disabled={uiDisabled}>Rimuovi</CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Attività lavorative</CFormLabel>
                  <CMultiSelect
                    options={oggettiOptions}
                    selectionType="tags"
                    placeholder="Seleziona o crea opzioni"
                    value={selectedOggetti.map((id) => String(id))}
                    allowCreateOptions
                    disabled={uiDisabled || pendingOggettoCreate}
                    onChange={(vals) => {
                      void handleOggettiChange(vals)
                    }}
                    onCreateOption={async (label) => {
                      const cleanLabel = String(label || '').trim()
                      if (cleanLabel === '') {
                        return null
                      }

                      const existing = (Array.isArray(oggettiOptions) ? oggettiOptions : []).find(
                        (opt) => String(opt.label ?? '').toLowerCase() === cleanLabel.toLowerCase(),
                      )
                      if (existing) {
                        const numericExisting = Number(existing.id ?? existing.id_oggetto ?? existing.value ?? 0)
                        if (Number.isFinite(numericExisting) && numericExisting > 0) {
                          setSelectedOggetti((prev) => {
                            const next = new Set(prev ?? [])
                            next.add(numericExisting)
                            return Array.from(next)
                          })
                          return {
                            id: existing.id ?? existing.id_oggetto ?? numericExisting,
                            value: existing.value ?? String(numericExisting),
                            label: existing.label ?? cleanLabel,
                          }
                        }
                      }

                      try {
                        const normalized = await createOggettoOptionForLabel(cleanLabel)
                        if (normalized) {
                          const numericId = Number(normalized.id)
                          if (Number.isFinite(numericId) && numericId > 0) {
                            setSelectedOggetti((prev) => {
                              const next = new Set(prev ?? [])
                              next.add(numericId)
                              return Array.from(next)
                            })
                          }
                          return {
                            id: normalized.id,
                            value: normalized.value,
                            label: normalized.label,
                          }
                        }
                      } catch (error) {
                        console.error('Creazione opzione oggetto fallita (dettaglio)', error)
                      }
                      return null
                    }}
                  />
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <h6 className="mb-0 text-body-secondary">Mittente spedizione</h6>
                <small className="text-body-secondary">
                  Puoi spedire dal cliente indicato o selezionare un altro mittente.
                </small>
              </div>
              <CRow className="g-3">
                <CCol md={12}>
                  <div className="d-flex flex-wrap gap-3">
                    <CFormCheck
                      type="radio"
                      id="mittente-mode-cliente"
                      name="mittente-mode"
                      label="Usa l'anagrafica del preventivo"
                      checked={mittenteMode === 'cliente'}
                      onChange={() => setMittenteMode('cliente')}
                      disabled={uiDisabled}
                    />
                    <CFormCheck
                      type="radio"
                      id="mittente-mode-altro"
                      name="mittente-mode"
                      label="Seleziona un mittente alternativo"
                      checked={mittenteMode === 'altro'}
                      onChange={() => setMittenteMode('altro')}
                      disabled={uiDisabled}
                    />
                  </div>
                </CCol>
                  {mittenteMode === 'altro' && (
                    <CCol md={6}>
                      <CFormLabel>Mittente alternativo</CFormLabel>
                      <div className="d-flex flex-wrap gap-2">
                        <div className="flex-grow-1 min-w-0">
                          <AnagraficaAutocomplete
                            items={mittenteOptions}
                            value={mittenteAnagraficaId}
                            onChange={(id) => setMittenteAnagraficaId(id)}
                            onChangeCliente={(cliente) => setCustomMittente(cliente)}
                            onSearch={(q) => {
                              const s = String(q || '')
                              setMittenteSearch((prev) => (prev === s ? prev : s))
                            }}
                            loading={loadingClienti}
                            disabled={uiDisabled}
                            placeholder="Seleziona mittente spedizione"
                          />
                        </div>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => navigate('/anagrafica/crea')}
                          disabled={uiDisabled}
                        >
                          <CIcon icon={cilPlus} className="me-1" />
                          Nuova anagrafica
                        </CButton>
                      </div>
                    </CCol>
                  )}
                <CCol md={12}>
                  <div className="border rounded-3 p-3 bg-body">
                    <div className="text-body-secondary small mb-1">Mittente attivo</div>
                    <div className="fw-semibold mb-2">
                      {mittenteInfo.label || 'Mittente non definito'}
                    </div>
                    <CRow className="gy-2">
                      <CCol xs={6} sm={4} md={3}>
                        <div className="text-body-secondary small">P.IVA</div>
                        <div className="fw-semibold">{mittenteInfo.piva || '-'}</div>
                      </CCol>
                      <CCol xs={6} sm={4} md={3}>
                        <div className="text-body-secondary small">Codice fiscale</div>
                        <div className="fw-semibold">
                          {mittenteInfo.codiceFiscale || '-'}
                        </div>
                      </CCol>
                      <CCol xs={6} sm={4} md={3}>
                        <div className="text-body-secondary small">Codice cliente</div>
                        <div className="fw-semibold">
                          {mittenteInfo.codiceCliente || '-'}
                        </div>
                      </CCol>
                      <CCol xs={6} sm={4} md={3}>
                        <div className="text-body-secondary small">Email</div>
                        <div className="fw-semibold">{mittenteInfo.email || '-'}</div>
                      </CCol>
                    </CRow>
                  </div>
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Contatti preventivo</h6>
              <PreventivoContattiTable
                contatti={preventivoContatti}
                onChange={setPreventivoContatti}
                disabled={uiDisabled || submitting}
                anagraficaContacts={anagraficaContactOptions}
                canImport={Boolean(Number(idAnagrafica) || 0)}
                currentAnagraficaId={Number(idAnagrafica) || null}
              />
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0 text-body-secondary">Righe preventivo</h6>
                <div className="d-flex gap-2">
                  <CButton color="primary" variant="outline" size="sm" onClick={() => { resetProductModal(); setStepperOpen(true) }} disabled={uiDisabled}>
                    Selettore prodotti
                  </CButton>
                  <CButton color="primary" size="sm" type="button" onClick={() => { resetPkgModal(); setPkgOpen(true) }} disabled={uiDisabled}>
                    Inserisci pacchetto
                  </CButton>
                </div>
              </div>
              {/* Modal selezione pacchetto */}
              <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
                <CModalHeader>
                  <CModalTitle>Seleziona pacchetto</CModalTitle>
                </CModalHeader>
                <CModalBody>
                  <CRow className="g-3 mb-3 align-items-end">
                    <CCol md={7}>
                      <CFormLabel>Ricerca</CFormLabel>
                      <CFormInput placeholder="Nome o codice pacchetto" value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={5}>
                      <CFormLabel>Pacchetto</CFormLabel>
                      <CFormSelect value={selPacchetto} onChange={(e) => setSelPacchetto(e.target.value)} disabled={uiDisabled}>
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
                        <input id="pkgOnlyActive" type="checkbox" className="form-check-input" checked={pkgOnlyActive} onChange={(e) => setPkgOnlyActive(e.target.checked)} />
                        <label htmlFor="pkgOnlyActive" className="form-check-label">Solo attivi</label>
                      </div>
                    </CCol>
                  </CRow>
                  {pkgPreview.length > 0 && (
                    <div className="border rounded p-2">
                      <div className="fw-semibold mb-2">Righe del pacchetto</div>
                      <CTable data-testid="table" small hover responsive>
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
                              <CTableDataCell>
                                <span className="d-inline-flex align-items-center">
                                  {r.descrizione}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell className="text-end">{Number(r.quantita) || 1}</CTableDataCell>
                              <CTableDataCell className="text-end">{(Number(r.prezzo_unitario) || 0).toFixed(2)}</CTableDataCell>
                              <CTableDataCell className="text-end">{r.iva ?? '-'}</CTableDataCell>
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
                    <CButton color="link" onClick={() => setPkgOpen(false)}>Annulla</CButton>
                    <CButton
                      color="primary"
                      disabled={!selPacchetto || pkgPreview.length === 0 || uiDisabled}
                      onClick={() => {
                        if (!selPacchetto || pkgPreview.length === 0) return
                        const newLines = pkgPreview.map((r) => {
                          const line = {
                            descrizione: r.descrizione ?? '',
                            quantita: Number(r.quantita) || 1,
                            prezzo: Number(r.prezzo_unitario) || 0,
                            iva: r.iva != null ? Number(r.iva) : 22,
                            sconto: r.sconto != null ? Number(r.sconto) : 0,
                            id_prodotto: r.id_prodotto ?? null,
                            combo_key: r.combo_key ?? null,
                            id_pacchetto: Number(selPacchetto) || null,
                            id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                          }

                          const catId = r.id_categoria != null ? Number(r.id_categoria) : null
                          if (catId && !Number.isNaN(catId)) {
                            line.id_categoria = catId
                          }

                          if (r.categoria_nome) {
                            line.categoria_nome = String(r.categoria_nome)
                          }

                          if (line.id_categoria != null && line.categoria_nome == null) {
                            const cat = (catOptions || []).find(
                              (c) => Number(c.id_categoria) === Number(line.id_categoria),
                            )
                            if (cat && cat.nome) {
                              line.categoria_nome = String(cat.nome)
                            }
                          }

                          if (!line.categoria_nome) {
                            const idp = Number(r.id_prodotto) || 0
                            if (idp > 0 && prodCategoryMap[idp]) {
                              line.categoria_nome = String(prodCategoryMap[idp])
                            }
                          }

                          return line
                        })
                        setRighe((rows) => rows.concat(newLines))
                        setPkgOpen(false)
                      }}>
                      Inserisci in preventivo
                    </CButton>
                  </div>
                </CModalFooter>
              </CModal>
              {false && (
                <div className="border rounded p-3 mt-3">
                  <CRow className="g-3 align-items-end">
                    <CCol md={3}>
                      <CFormLabel>Categoria</CFormLabel>
                      <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
                        <option value="">Tutte</option>
                        {catOptions.map((c) => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Prodotto</CFormLabel>
                      <CFormSelect
                        value={selProd}
                        onChange={(e) => {
                          const pid = e.target.value
                          setSelProd(pid)
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                          if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                        }}
                        disabled={uiDisabled}>
                        <option value="">Seleziona...</option>
                        {prodOptions.map((p) => (
                          <option key={p.id_prodotto} value={p.id_prodotto}>
                            {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={2}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    {/* Rimosso: selettore manuale variazioni. Si usano direttamente le combinazioni */}
                    {prodComboList.length > 0 && (
                      <CCol md={4}>
                        <CFormLabel>Combinazioni disponibili</CFormLabel>
                        <CFormSelect
                          value={(() => {
                            const key = selectedVarIds
                              .map((id) => Number(id) || 0)
                              .filter((n) => n > 0)
                              .sort((a, b) => a - b)
                              .join('+')
                            return key
                          })()}
                          onChange={(e) => {
                            const opt = prodComboList.find((r) => String(r.combo_key) === String(e.target.value))
                            if (!opt) return
                            const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                            setSelectedVarIds(ids)
                            const prezzo = Number(opt.prezzo) || 0
                            const prezzoInput = document.getElementById('step-prezzo')
                            if (prezzoInput) prezzoInput.value = String(prezzo)
                          }}
                          disabled={uiDisabled || prodComboList.length === 0}>
                          <option value="">--</option>
                          {prodComboList.map((r, idx) => {
                            const labels = Array.isArray(r.var_ids)
                              ? r.var_ids.map((idv) => {
                                const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                                return vv ? (vv.categoria ? `${vv.categoria} - ${vv.nome}` : vv.nome) : String(idv)
                              })
                              : []
                            return (
                              <option key={r.combo_key || idx} value={r.combo_key}>
                                {labels.join(', ')} — {Number(r.prezzo) ?? 0}
                              </option>
                            )
                          })}
                        </CFormSelect>
                        <div className="mt-2">
                          <CButton color="secondary" variant="outline" size="sm" onClick={() => setSelectedVarIds([])} disabled={uiDisabled || selectedVarIds.length === 0}>Annulla selezione</CButton>
                        </div>
                      </CCol>
                    )}
                  </CRow>
                  <CRow className="g-3 mt-2 align-items-end">
                    <CCol md={3}>
                      <CFormLabel>Ricerca prodotto</CFormLabel>
                      <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Quantità</CFormLabel>
                      <CFormInput id="step-qta" type="number" min="1" step="1" defaultValue={1} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput id="step-prezzo" type="number" min="0" step="0.01" defaultValue={(() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        return prod?.prezzo_listino ?? 0
                      })()} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3} className="d-flex gap-2">
                      <CButton color="primary" type="button" disabled={uiDisabled}
                        onClick={() => {
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                          if (!prod) return
                          const q = Number(document.getElementById('step-qta')?.value || 1)
                          const prezzoBase = Number(document.getElementById('step-prezzo')?.value || prod.prezzo_listino || 0)
                          const ivaPerc = Number(selIva || prod.iva_percento || 22)
                            const selectedVars = prodVarOptions.filter((v) => selectedVarIds.includes(v.id_variazione))
                            const comboKey = selectedVars
                              .map((v) => Number(v.id_variazione) || 0)
                              .filter((n) => n > 0)
                              .sort((a, b) => a - b)
                              .join('+')
                            const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
                          const descr = selectedVars.length > 0
                            ? `${prod.nome} - ${selectedVars.map((v) => `${v.nome}${v.codice ? ' [' + v.codice + ']' : ''}`).join(', ')}`
                            : prod.nome
                            const prezzoFinale = comboPrice != null ? comboPrice : prezzoBase
                          const riga = { descrizione: descr, quantita: q, prezzo: prezzoFinale, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto, combo_key: comboKey || null }
                          // Aggiungi categoria del prodotto alla riga per raggruppamento immediato
                          if (prod.id_categoria != null) {
                            riga.id_categoria = Number(prod.id_categoria)
                            const c = (catOptions || []).find((x) => Number(x.id_categoria) === Number(prod.id_categoria))
                            if (c && c.nome) riga.categoria_nome = String(c.nome)
                          }
                          if (ivaPerc === 0) {
                            const natId = Number(prod.id_sdi_natura_iva) || 0
                            if (natId > 0) {
                              riga.id_sdi_natura_iva = natId
                            } else {
                              const nat = naturaOptions[0]
                              if (nat) riga.id_sdi_natura_iva = nat.id_natura
                            }
                          }
                          setRighe((rows) => rows.concat(riga))
                          setSelectedVarIds([])
                        }}>
                        Inserisci riga
                      </CButton>
                      <CButton color="link" type="button" onClick={() => setStepperOpen(false)}>
                        Chiudi
                      </CButton>
                    </CCol>
                  </CRow>
                </div>
              )}

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
                    onStepChange={(n) => {
                      if (uiDisabled) return
                      if (Number(n) === prodStep) return
                      // Always allow going back
                      if (n <= prodStep) {
                        setProdStep(n)
                        return
                      }
                      // Forward navigation with prerequisites
                      if (n === 2) {
                        setProdStep(2)
                        return
                      }
                      if (n === 3) {
                        if (!selProd) return
                        if (Array.isArray(prodComboList) && prodComboList.length > 0) {
                          setProdStep(3)
                        } else {
                          setProdStep(4)
                        }
                        return
                      }
                      if (n === 4) {
                        if (!selProd) return
                        setProdStep(4)
                        return
                      }
                    }}
                  />
                  {prodStep === 1 && (
                    <CRow className="g-3">
                      <CCol md={12}>
                        <CFormLabel>Categoria prodotto</CFormLabel>
                        <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
                          <option value="">Tutte</option>
                          {catOptions.map((c) => (
                            <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                          ))}
                        </CFormSelect>
                      </CCol>
                    </CRow>
                  )}
                  {prodStep === 2 && (
                    <CRow className="g-3">
                      <CCol md={6}>
                        <CFormLabel>Prodotto</CFormLabel>
                        <CFormSelect
                          value={selProd}
                          onChange={(e) => {
                            const pid = e.target.value
                            setSelProd(pid)
                            const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                            if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                          }}
                          disabled={uiDisabled}>
                          <option value="">Seleziona...</option>
                          {prodOptions.map((p) => (
                            <option key={p.id_prodotto} value={p.id_prodotto}>
                              {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Ricerca</CFormLabel>
                        <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
                      </CCol>
                    </CRow>
                  )}
                  {prodStep === 3 && (
                    <CRow className="g-3">
                      {comboSelectionError && (
                        <CCol md={12}>
                          <CAlert color="danger" className="mb-0">
                            {comboSelectionError}
                          </CAlert>
                        </CCol>
                      )}
                      {prodComboList.length > 0 ? (
                        <CCol md={12}>
                          <CFormLabel>Combinazioni</CFormLabel>
                          <CFormSelect
                            value={selectedComboKey}
                            onChange={(e) => {
                              const key = e.target.value
                              setSelectedComboKey(key)
                              setComboSelectionError(null)
                              const opt = prodComboList.find((r) => String(r.combo_key) === String(key))
                              if (!opt) { setSelectedVarIds([]); return }
                              const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                              setSelectedVarIds(ids)
                            }}
                            disabled={uiDisabled || prodComboList.length === 0}>
                            <option value="">Seleziona una combinazione…</option>
                            {prodComboList.map((r, idx) => {
                              const ids = Array.isArray(r.var_ids) ? r.var_ids : String(r.combo_key).split('+').map((x) => Number(x) || 0)
                              const groups = {}
                              ids.forEach((idv) => {
                                const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                                const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                                const nm = vv ? String(vv.nome) : String(idv)
                                if (!groups[cat]) groups[cat] = []
                                groups[cat].push(nm)
                              })
                              const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                              return (
                                <option key={r.combo_key || idx} value={r.combo_key}>
                                  {label || r.combo_key}
                                </option>
                              )
                            })}
                          </CFormSelect>
                        </CCol>
                      ) : (
                        <CCol md={12}>
                          <CAlert color="info" className="mb-0">Nessuna variazione combinata definita per il prodotto selezionato.</CAlert>
                        </CCol>
                      )}
                    </CRow>
                  )}
                  {prodStep === 4 && (
                    <CRow className="g-3">
                      {comboSelectionError && (
                        <CCol md={12}>
                          <CAlert color="danger" className="mb-0">
                            {comboSelectionError}
                          </CAlert>
                        </CCol>
                      )}
                      <CCol md={12}>
                        <div className="mb-2"><strong>Prodotto:</strong> {(() => { const p = prodOptions.find((x) => String(x.id_prodotto) === String(selProd)); return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-' })()}</div>
                        {(() => {
                          const ids = selectedComboKey
                            ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                            : selectedVarIds
                          if (!ids || ids.length === 0) return null
                          const groups = {}
                          ids.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                          return (<div className="mb-2"><strong>Variazioni:</strong> {label}</div>)
                        })()}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Quantità</CFormLabel>
                        <CFormInput type="number" min="1" step="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value) || 1)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Prezzo</CFormLabel>
                        <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>IVA %</CFormLabel>
                        <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Natura IVA</CFormLabel>
                        <CFormSelect value={(() => '')()} onChange={() => { }} disabled={true}>
                          <option value="">Selezione natura disponibile nella riga dopo inserimento</option>
                        </CFormSelect>
                      </CCol>
                    </CRow>
                  )}
                </CModalBody>
                <CModalFooter className="d-flex justify-content-between">
                  <div>
                    {prodStep > 1 && (
                      <CButton color="secondary" variant="outline" onClick={() => setProdStep((s) => Math.max(1, s - 1))} disabled={uiDisabled}>Indietro</CButton>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <CButton color="link" onClick={() => setStepperOpen(false)}>Annulla</CButton>
                    {prodStep < 4 && (
                      <CButton
                        color="primary"
                        onClick={() => {
                          if (prodStep === 1) { setProdStep(2); return }
                          if (prodStep === 2) {
                            if (!selProd) return
                            if (prodComboList.length === 0) { setProdStep(4); return }
                            setProdStep(3); return
                          }
                          if (prodStep === 3) { setProdStep(4); return }
                        }}
                        disabled={(prodStep === 2 && !selProd) || uiDisabled}>
                        Avanti
                      </CButton>
                    )}
                    {prodStep === 4 && (
                      <CButton
                        color="primary"
                        onClick={() => {
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                          if (!prod) return
                          if (prodComboList.length > 0 && !selectedComboKey) {
                            setComboSelectionError('Seleziona una combinazione prima di inserire la riga.')
                            return
                          }
                          const ivaPerc = Number(selIva || prod.iva_percento || 22)
                          const comboIds = selectedComboKey
                            ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                            : selectedVarIds
                          const comboKey = Array.isArray(comboIds) && comboIds.length > 0
                            ? comboIds.map((idv) => Number(idv) || 0).filter((n) => n > 0).sort((a, b) => a - b).join('+')
                            : ''
                          let descr = prod.nome
                          if (comboIds && comboIds.length > 0) {
                            const groups = {}
                            comboIds.forEach((idv) => {
                              const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                              const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                              const nm = vv ? String(vv.nome) : String(idv)
                              if (!groups[cat]) groups[cat] = []
                              groups[cat].push(nm)
                            })
                            const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                            descr = `${prod.nome} - ${label}`
                          }
                          const riga = { descrizione: descr, quantita: modalQty, prezzo: modalPrice, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto, combo_key: comboKey || null }
                          // Aggiungi categoria del prodotto alla riga per raggruppamento immediato
                          if (prod.id_categoria != null) {
                            riga.id_categoria = Number(prod.id_categoria)
                            const c = (catOptions || []).find((x) => Number(x.id_categoria) === Number(prod.id_categoria))
                            if (c && c.nome) riga.categoria_nome = String(c.nome)
                          }
                          if (ivaPerc === 0) {
                            // Se IVA 0, natura IVA modificabile in tabella dopo inserimento
                          }
                          setRighe((rows) => rows.concat(riga))
                          setStepperOpen(false)
                        }}
                        disabled={uiDisabled}>
                        Inserisci riga
                      </CButton>
                    )}
                  </div>
                </CModalFooter>
              </CModal>

              <CTable data-testid="table" className="mt-3" responsive small>
                <CTableHead className="mp-table-head">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell>Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 180 }}>
                      Q.tà
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 100 }}>
                      Prezzo
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 80 }}>
                      Sconto %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 80 }}>
                      IVA %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 200 }}>
                      Natura IVA
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">
                      Azioni
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(() => {
                    // Raggruppa righe per categoria prodotto
                    const rows = Array.isArray(righe) ? righe : []
                    const groupMap = new Map()
                    const getCat = (r) => {
                      // Priorità: nome categoria già presente in riga
                      if (r && r.categoria_nome) return String(r.categoria_nome)
                      // Poi: id_categoria presente in riga -> lookup
                      if (r && r.id_categoria) {
                        const c = (catOptions || []).find((x) => String(x.id_categoria) === String(r.id_categoria))
                        if (c && c.nome) return String(c.nome)
                      }
                      // Poi: mappa risolta da id_prodotto
                      const idp = Number(r?.id_prodotto) || 0
                      if (idp > 0 && prodCategoryMap[idp]) return prodCategoryMap[idp]
                      // Fallback
                      return 'Varie'
                    }
                    rows.forEach((r, i) => {
                      const cat = getCat(r)
                      if (!groupMap.has(cat)) groupMap.set(cat, [])
                      groupMap.get(cat).push([r, i])
                    })
                    const groups = Array.from(groupMap.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                    const out = []
                    for (const [cat, arr] of groups) {
                      out.push(
                        <CTableRow key={`grp-${cat}`}>
                          <CTableDataCell colSpan={10} className="bg-body-secondary fw-semibold">
                            Categoria: {cat}
                          </CTableDataCell>
                        </CTableRow>,
                      )
                      for (const [riga, idx] of arr) {
                        const q = Number(riga.quantita) || 0
                        const p = Number(riga.prezzo) || 0
                        const s = Number(riga.sconto) || 0
                        const iva = Number(riga.iva) || 0
                        const impon = Math.max(0, q * p * (1 - s / 100))
                        const ivaVal = impon * (iva / 100)
                        const tot = impon + ivaVal
                        const showCedWarning = Boolean(riga.ced_warning)
                        const cedQtyLabel =
                          riga.quantita_ced != null && riga.quantita_ced !== ''
                            ? `Quantita CED: ${riga.quantita_ced}`
                            : 'Quantita CED non disponibile.'
                        out.push(
                          <CTableRow key={idx} className="align-middle">
                            <CTableDataCell>
                              <div className="d-flex align-items-start gap-2">
                                {showCedWarning ? (
                                  <CPopover
                                    content={<span className="text-warning">{cedQtyLabel}</span>}
                                    placement="top"
                                    trigger="focus"
                                  >
                                    <CButton
                                      color="link"
                                      className="p-0 text-warning"
                                      aria-label="Dettagli quantita CED"
                                    >
                                      <CIcon icon={cilWarning} className="mt-1" />
                                    </CButton>
                                  </CPopover>
                                ) : null}
                                <CFormTextarea
                                  placeholder="Descrizione articolo/servizio"
                                  value={riga.descrizione}
                                  onChange={(e) => updateRiga(idx, { descrizione: e.target.value })}
                                  disabled={uiDisabled}
                                  style={{ fontSize: "10pt", width: "400px" }}
                                />
                              </div>
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                step="1"
                                value={riga.quantita}
                                onChange={(e) => updateRiga(idx, { quantita: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={riga.prezzo}
                                onChange={(e) => updateRiga(idx, { prezzo: e.target.value })}
                                disabled={uiDisabled}

                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={riga.sconto}
                                onChange={(e) => updateRiga(idx, { sconto: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={riga.iva}
                                onChange={(e) => {
                                  const newIva = e.target.value
                                  const patch = { iva: newIva }
                                  if (Number(newIva) !== 0) {
                                    patch.id_sdi_natura_iva = null
                                  }
                                  updateRiga(idx, patch)
                                }}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormSelect
                                value={riga.id_sdi_natura_iva ?? ''}
                                onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                                disabled={uiDisabled || Number(riga.iva) !== 0}
                                style={SELECT_OPTION_WRAP_STYLE}
                              >
                                <option value="" style={SELECT_OPTION_WRAP_STYLE}>
                                  --
                                </option>
                                {naturaOptions.map((n) => (
                                  <option key={n.id_natura} value={n.id_natura} style={SELECT_OPTION_WRAP_STYLE}>
                                    {n.code} - {n.label}
                                  </option>
                                ))}
                              </CFormSelect>
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(impon)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(ivaVal)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(tot)}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton color="link" size="sm" className="p-0" onClick={() => handleRemoveRiga(idx)} disabled={uiDisabled}>
                                <CIcon icon={cilX} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>,
                        )
                      }
                    }
                    return out
                  })()}
                </CTableBody>
              </CTable>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Riepilogo</h6>
              <CRow className="g-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale imponibile</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.imponibile)} readOnly disabled />
                  </CInputGroup>
                </CCol>
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale IVA</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.totaleIva)} readOnly disabled />
                  </CInputGroup>
                </CCol>
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.totale)} readOnly disabled />
                  </CInputGroup>
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Note</h6>
              <CRow>
                <CCol md={12}>
                  <CFormTextarea
                    rows={5}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value)
                      setNoteDirty(true)
                    }}
                    disabled={uiDisabled}
                  />
                </CCol>
              </CRow>
            </section>

            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" type="button" onClick={handleSalvaBozza} disabled={uiDisabled || submitting || pendingOggettoCreate}>
                <CIcon icon={cilSave} className="me-2" /> Aggiorna bozza
              </CButton>
              <CButton color="link" type="button" onClick={() => navigate(`${basePath}/lista`)}>
                Torna alla lista
              </CButton>
            </div>
          </CForm>
        )}
        <CModal visible={ddtModalVisible} onClose={handleCloseDdtModal} size="xl" backdrop="static">
          <CModalHeader>
            <CModalTitle>Emetti DDT</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {ddtError && (
              <CAlert color="danger">{ddtError?.message || 'Impossibile emettere il DDT.'}</CAlert>
            )}
            {ddtSuccess && <CAlert color="success">{ddtSuccess}</CAlert>}
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CFormLabel>Data DDT</CFormLabel>
                <CFormInput
                  type="date"
                  value={ddtForm?.data_ddt || ''}
                  onChange={(e) =>
                    setDdtForm((prev) => ({
                      ...prev,
                      data_ddt: e.target.value,
                    }))
                  }
                  disabled={ddtSubmitting}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Causale</CFormLabel>
                <CFormSelect
                  value={ddtForm?.id_causale || ''}
                  onChange={(e) =>
                    setDdtForm((prev) => ({
                      ...prev,
                      id_causale: e.target.value,
                    }))
                  }
                  disabled={ddtSubmitting || ddtCausaliLoading}
                >
                  <option value="">Seleziona causale</option>
                  {ddtCausali.map((causale) => (
                    <option key={causale.id_causale} value={causale.id_causale}>
                      {causale.label}
                    </option>
                  ))}
                </CFormSelect>
                {ddtCausaliLoading && (
                  <small className="text-body-secondary">Caricamento causali...</small>
                )}
              </CCol>
              <CCol md={12}>
                <CFormLabel>Note documento</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={ddtForm?.note ?? ''}
                  onChange={(e) =>
                    setDdtForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  disabled={ddtSubmitting}
                />
              </CCol>
            </CRow>
            <div className="mt-4">
              <h6 className="mb-2 text-body-secondary">Righe incluse</h6>
              {preventivoHasRighe ? (
                <CTable data-testid="table" responsive hover small>
                  <CTableHead className="mp-table-head">
                    <CTableRow>
                      <CTableHeaderCell>Descrizione</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {righe.map((row, idx) => (
                      <CTableRow key={row.id_riga ?? idx}>
                        <CTableDataCell>
                          <span className="d-inline-flex align-items-center">
                            {row.descrizione}
                          </span>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">{Number(row.quantita) || 0}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="warning" className="mb-0">
                  Non sono presenti righe nel preventivo.
                </CAlert>
              )}
            </div>
            {ddtResult && (
              <div className="border rounded p-3 mt-3 bg-body-tertiary">
                <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                  <div className="fw-semibold">Ultimo DDT generato</div>
                  {ddtResult.id_ddt && (
                    <CButton
                      color="link"
                      size="sm"
                      className="p-0"
                      onClick={() => navigate(`/ddt/dettagli?id=${ddtResult.id_ddt}`)}
                    >
                      Apri dettaglio
                    </CButton>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-3 small">
                  <div>
                    Numero:{' '}
                    <strong>
                      {ddtResult.numero_documento ?? '—'}
                      {ddtResult.anno ? `/${ddtResult.anno}` : ''}
                    </strong>
                  </div>
                  <div>Data: <strong>{ddtResult.data_ddt ?? '-'}</strong></div>
                  <div>Pezzi: <strong>{ddtResult.totale_pezzi ?? 0}</strong></div>
                  <div>Peso kg: <strong>{ddtResult.totale_peso_kg ?? 0}</strong></div>
                </div>
              </div>
            )}
          </CModalBody>
          <CModalFooter className="d-flex justify-content-between align-items-center">
            <small className="text-body-secondary">
              Le righe del preventivo verranno copiate automaticamente nel DDT.
            </small>
            <div className="d-flex gap-2">
              <CButton color="link" onClick={handleCloseDdtModal} disabled={ddtSubmitting}>
                Annulla
              </CButton>
              <CButton
                color="success"
                onClick={handleEmitDdt}
                disabled={ddtSubmitting || !preventivoHasRighe}
              >
                {ddtSubmitting ? 'Emissione...' : 'Emetti DDT'}
              </CButton>
            </div>
          </CModalFooter>
        </CModal>
        <CModal visible={fatturaModalVisible} onClose={handleCloseFatturaModal} size="xl" backdrop="static">
          <CModalHeader>
            <CModalTitle>Emetti fattura</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {fatturaError && (
              <CAlert color="danger">{fatturaError?.message || 'Impossibile emettere la fattura.'}</CAlert>
            )}
            {fatturaSuccess && <CAlert color="success">{fatturaSuccess}</CAlert>}
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CFormLabel>Data fattura</CFormLabel>
                <CFormInput
                  type="date"
                  value={fatturaForm?.data_fattura || ''}
                  onChange={(e) =>
                    setFatturaForm((prev) => ({
                      ...prev,
                      data_fattura: e.target.value,
                    }))
                  }
                  disabled={fatturaSubmitting}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Sezionale</CFormLabel>
                <CFormSelect
                  value={fatturaForm?.id_sezionale || ''}
                  onChange={(e) =>
                    setFatturaForm((prev) => ({
                      ...prev,
                      id_sezionale: e.target.value,
                    }))
                  }
                  disabled={fatturaSubmitting || fatturaConfigLoading}
                >
                  <option value="">Seleziona sezionale</option>
                  {fatturaConfig.sezionali.map((option) => (
                    <option key={option.id_sezionale} value={option.id_sezionale}>
                      {option.label || option.code}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tipo fattura</CFormLabel>
                <CFormSelect
                  value={fatturaForm?.id_tipo_fatt || ''}
                  onChange={(e) =>
                    setFatturaForm((prev) => ({
                      ...prev,
                      id_tipo_fatt: e.target.value,
                    }))
                  }
                  disabled={fatturaSubmitting || fatturaConfigLoading}
                >
                  <option value="">Seleziona tipo</option>
                  {fatturaConfig.tipi.map((option) => (
                    <option key={option.id_tipo} value={option.id_tipo}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Stato iniziale</CFormLabel>
                <CFormSelect
                  value={fatturaForm?.id_stato_fatt || ''}
                  onChange={(e) =>
                    setFatturaForm((prev) => ({
                      ...prev,
                      id_stato_fatt: e.target.value,
                    }))
                  }
                  disabled={fatturaSubmitting || fatturaConfigLoading}
                >
                  <option value="">Seleziona stato</option>
                  {fatturaConfig.stati.map((option) => (
                    <option key={option.id_stato} value={option.id_stato}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Note</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={fatturaForm?.note ?? ''}
                  onChange={(e) =>
                    setFatturaForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  disabled={fatturaSubmitting}
                />
              </CCol>
            </CRow>

            <div className="mt-4">
              <h6 className="mb-2 text-body-secondary">Righe incluse</h6>
              {preventivoHasRighe ? (
                <CTable data-testid="table" responsive hover small>
                  <CTableHead className="mp-table-head">
                    <CTableRow>
                      <CTableHeaderCell>Descrizione</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {righe.map((row, idx) => {
                      const qty = Number(row.quantita) || 0
                      const rawPrice = Number(row.prezzo ?? row.prezzo_unitario ?? 0)
                      const price = Number.isFinite(rawPrice) ? rawPrice : 0
                      const discount = Number(row.sconto) || 0
                      const ivaPerc = Number(row.iva ?? 0) || 0
                      const imponibile = Math.max(0, qty * price * (1 - discount / 100))
                      const ivaAmount = ivaPerc !== 0 ? imponibile * (ivaPerc / 100) : 0
                      const lineTotal = imponibile + ivaAmount
                      return (
                        <CTableRow key={row.id_riga ?? idx}>
                          <CTableDataCell>
                            <span className="d-inline-flex align-items-center">
                              {row.descrizione}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="text-end">{qty}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatCurrency(price)}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {row.iva != null ? `${row.iva}%` : '-'}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">{formatCurrency(lineTotal)}</CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="warning" className="mb-0">
                  Non sono presenti righe nel preventivo.
                </CAlert>
              )}
            </div>

            {fatturaResult && (
              <div className="border rounded p-3 mt-3 bg-body-tertiary">
                <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                  <div className="fw-semibold">Ultima fattura generata</div>
                  {fatturaResult.id_fattura && (
                    <CButton
                      color="link"
                      size="sm"
                      className="p-0"
                      onClick={() => navigate(`/fatture/dettagli?id=${fatturaResult.id_fattura}`)}
                    >
                      Apri dettaglio
                    </CButton>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-3 small">
                  <div>
                    Numero:{' '}
                    <strong>
                      {fatturaResult.numero_documento ?? '—'}
                      {fatturaResult.anno ? `/${fatturaResult.anno}` : ''}
                    </strong>
                  </div>
                  <div>Data: <strong>{fatturaResult.data_fattura ?? '-'}</strong></div>
                  <div>Totale: <strong>{formatCurrency(fatturaResult.totale)}</strong></div>
                  <div>Saldo: <strong>{formatCurrency(fatturaResult.saldo)}</strong></div>
                </div>
              </div>
            )}
          </CModalBody>
          <CModalFooter className="d-flex justify-content-between align-items-center">
            <small className="text-body-secondary">Le righe del preventivo verranno copiate automaticamente nella fattura.</small>
            <div className="d-flex gap-2">
              <CButton color="link" onClick={handleCloseFatturaModal} disabled={fatturaSubmitting}>
                Annulla
              </CButton>
              <CButton
                color="primary"
                onClick={handleEmitFattura}
                disabled={fatturaSubmitting || !preventivoHasRighe}
              >
                {fatturaSubmitting ? 'Emissione...' : 'Emetti fattura'}
              </CButton>
            </div>
          </CModalFooter>
        </CModal>
        <CModal visible={emailModalVisible} onClose={handleCloseEmailModal} size="lg" backdrop="static">
          <CModalHeader>
            <CModalTitle>Invia preventivo via email</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {emailError && (
              <CAlert color="danger">
                {emailError?.payload?.message || emailError.message || 'Invio email non riuscito.'}
              </CAlert>
            )}
            {emailSuccess && <CAlert color="success">{emailSuccess}</CAlert>}
            <div className="mb-3">
              <CFormLabel>Destinatari</CFormLabel>
              <CFormInput
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="es. referente@cliente.it"
                disabled={emailSending}
              />
              <div className="form-text">Separare piu' email con virgola o punto e virgola.</div>
            </div>
            <div className="mb-3">
              <CFormLabel>CC (opzionale)</CFormLabel>
              <CFormInput
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="es. collega@azienda.it"
                disabled={emailSending}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Oggetto</CFormLabel>
              <CFormInput
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={emailSending}
              />
            </div>
            <div className="mb-0">
              <CFormLabel>Messaggio</CFormLabel>
              <HtmlEditor
                value={emailBody}
                onChange={setEmailBody}
                disabled={emailSending}
                placeholder="Scrivi il testo dell'email..."
                minHeight={260}
              />
              <div className="form-text">Il testo verra' inviato come corpo HTML del messaggio.</div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={handleCloseEmailModal} disabled={emailSending}>
              Annulla
            </CButton>
            <CButton color="primary" onClick={handleSendPreventivoEmail} disabled={emailSending}>
              {emailSending ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Invio...
                </>
              ) : (
                <>
                  <CIcon icon={cilEnvelopeClosed} className="me-2" />
                  Invia email
                </>
              )}
            </CButton>

          </CModalFooter>
        </CModal>
        <CModal visible={revisionModalVisible} onClose={() => setRevisionModalVisible(false)} size="lg" backdrop="static">
          <CModalHeader>
            <CModalTitle>Dettaglio revisione</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {revisionModalLoading && (
              <div className="d-flex justify-content-center py-4">
                <CSpinner />
              </div>
            )}
            {!revisionModalLoading && revisionModalError && (
              <CAlert color="danger" className="mb-0">
                {revisionModalError?.message || 'Impossibile caricare il dettaglio della revisione.'}
              </CAlert>
            )}
            {!revisionModalLoading && !revisionModalError && (
              <>
                <div className="mb-3">
                  <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2">
                    <h6 className="mb-0">
                      Revisione {revisionModalData?.label || `Rev.${revisionModalData?.numero_revision ?? '-'}`}
                    </h6>
                    <small className="text-body-secondary">
                      {formatDateTime(revisionModalData?.created_at)}
                    </small>
                  </div>
                  <div className="small text-body-secondary">
                    Operatore: {revisionModalData?.operatore || '-'}
                  </div>
                  <p className="mb-0">
                    Nota: {revisionModalData?.note || '-'}
                  </p>
                </div>
                {revisionModalDetail?.data ? (
                  <div className="border rounded p-3 mb-3">
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <small className="text-body-secondary">Numero</small>
                        <div className="fw-semibold">
                          {revisionModalDetail.data.numero_documento ?? '-'}
                          {revisionModalDetail.data.anno_preventivo ? `/${revisionModalDetail.data.anno_preventivo}` : ''}
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <small className="text-body-secondary">{clienteLabel}</small>
                        <div className="fw-semibold">{revisionModalDetail.data.ragione_sociale ?? '-'}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <small className="text-body-secondary">Data preventivo</small>
                        <div>{formatDate(revisionModalDetail.data.data_preventivo)}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <small className="text-body-secondary">Totale</small>
                        <div className="fw-semibold">{formatCurrency(revisionModalDetail.data.totale)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CAlert color="warning" className="mb-3">
                    Dettaglio documento non disponibile.
                  </CAlert>
                )}
                {revisionModalLines.length > 0 ? (
                  <CTable data-testid="table" small responsive className="mb-0">
                    <CTableHead className="mp-table-head">
                      <CTableRow>
                        <CTableHeaderCell>Descrizione</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Sconto (%)</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">IVA (%)</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {revisionModalLines.map((line, idx) => (
                        <CTableRow key={`${line.id_riga ?? idx}-${idx}`}>
                          <CTableDataCell>{line.descrizione || '-'}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatNumberValue(line.quantita ?? 0, 2)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatCurrency(line.prezzo_unitario ?? line.prezzo ?? 0)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatNumberValue(line.sconto ?? 0, 2)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatNumberValue(line.iva ?? 0, 2)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatCurrency(line.totale ?? line.importo_scontato ?? 0)}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                ) : (
                  <small className="text-body-secondary">Non sono presenti righe nella revisione.</small>
                )}
              </>
            )}
          </CModalBody>
          <CModalFooter className="justify-content-end">
            <CButton color="secondary" variant="outline" onClick={() => setRevisionModalVisible(false)}>
              Chiudi
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default PreventiviDetail



