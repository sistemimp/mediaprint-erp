/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  CAlert,
  CBadge,
  CButton,
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
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
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilArrowLeft,
  cilReload,
  cilDescription,
  cilEnvelopeClosed,
  cilPrint,
  cilPlus,
  cilSave,
  cilSettings,
  cilTrash,
} from "@coreui/icons"

import { CSmartPagination } from "@coreui/react-pro"

import {
  fetchAnagraficaDetail,
  updateAnagraficaDetail,
  fetchTipologieAnagrafiche,
  fetchRegimiFiscali,
  fetchTipologieSedi,
} from "../../services/anagrafiche"
import { apiFetch } from "../../services/apiClient"
import { fetchPaymentTerms } from "../../services/paymentTerms"
import { fetchFattureConfig } from "../../services/fatture"
import BottomToast from "../../components/BottomToast"
import { useAuth } from "../../context/AuthContext"
import { useBreadcrumbActions } from "../../context/BreadcrumbActionsContext"

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-"
  }

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return currencyFormatter.format(numeric)
  }

  return value
}

const formatDate = (value) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("it-IT")
}

const formatDateTime = (value) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.toLocaleDateString("it-IT")} ${date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

const normalizeDocumentDate = (row, dateField, fallbackField) => {
  const raw = row?.[dateField] ?? row?.[fallbackField] ?? null
  if (!raw) {
    return null
  }
  const ts = new Date(raw).getTime()
  if (Number.isNaN(ts)) {
    return null
  }
  return { ts, raw }
}

const getDocumentTimestamp = (row, dateField, fallbackField) => {
  const info = normalizeDocumentDate(row, dateField, fallbackField)
  return info ? info.ts : 0
}

const sortRowsByDocumentDateDesc = (rows, dateField, fallbackField) =>
  [...rows].sort((a, b) => getDocumentTimestamp(b, dateField, fallbackField) - getDocumentTimestamp(a, dateField, fallbackField))

const formatSedeAddress = (sede) => {
  if (!sede) {
    return "-"
  }

  const line1 = [sede.indirizzo, sede.civico].filter(Boolean).join(" ").trim()
  const line2 = [sede.cap, sede.comune, sede.provincia ? `(${sede.provincia})` : null]
    .filter(Boolean)
    .join(" ")
    .trim()
  const line3 = sede.nazione_iso2

  return [line1, line2, line3].filter((segment) => segment && segment.length > 0).join(" - ") || "-"
}

const getStatusBadge = (value) => {
  if (!value) {
    return <CBadge color="secondary">-</CBadge>
  }

  const normalised = String(value).toLowerCase()
  const color = normalised === "attiva" ? "success" : normalised === "disattiva" ? "secondary" : "primary"
  const label = normalised === 'attiva' ? 'Attiva' : normalised === 'disattiva' ? 'Disattivata' : String(value)

  return (
    <CBadge color={color}>
      {label}
    </CBadge>
  )
}

const renderValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return <span className="text-body-secondary">-</span>
  }

  if (typeof value === "string" && /\r|\n/.test(value)) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
  }

  return value
}

const formatLookupOptionLabel = (label, code, fallbackValue) => {
  if (label && code) {
    return `${label} (${code})`
  }
  if (label) {
    return label
  }
  if (code) {
    return code
  }
  if (fallbackValue !== undefined && fallbackValue !== null) {
    return String(fallbackValue)
  }
  return ""
}

const formatLookupValue = (label, code, fallbackValue) => {
  if (label && code) {
    return `${label} (${code})`
  }
  if (label) {
    return label
  }
  if (code) {
    return code
  }
  if (fallbackValue !== undefined && fallbackValue !== null) {
    return fallbackValue
  }
  return null
}

const formatTipoLabel = (item) => {
  if (!item) {
    return null
  }
  if (item.label) {
    return item.label
  }
  if (item.code) {
    return item.code
  }
  if (item.id_tipo !== undefined && item.id_tipo !== null) {
    return `ID ${item.id_tipo}`
  }
  return null
}

const getTipologiaValue = (anagrafica) =>
  formatLookupValue(
    anagrafica?.tipologia_label,
    anagrafica?.tipologia_code,
    anagrafica?.id_tipologia,
  )

const getCategoriaValue = (anagrafica) => {
  const categoria = anagrafica?.categoria
  if (typeof categoria === "string" && categoria.trim() !== "") {
    return categoria.trim()
  }
  return Number(anagrafica?.is_pa) === 1 ? "Comune" : "Azienda Private"
}

const DetailField = ({ label, value, compact = false }) => (
  <div className={`detail-field bg-body-tertiary border rounded ${compact ? 'px-2 py-1' : 'px-3 py-2'} h-100`}>
    <div className="text-body-secondary text-uppercase small fw-semibold">{label}</div>
    <div className="mt-1">{renderValue(value)}</div>
  </div>
)

const createGeneralForm = (anagrafica) => ({
  ragione_sociale: anagrafica?.ragione_sociale ?? "",
  piva: anagrafica?.piva ?? "",
  codice_fiscale: anagrafica?.codice_fiscale ?? "",
  email: anagrafica?.email ?? "",
  telefono: anagrafica?.telefono ?? "",
  note: anagrafica?.note ?? "",
  categoria: getCategoriaValue(anagrafica),
  id_tipologia: anagrafica?.id_tipologia ?? "",
  id_sdi_regime_fiscale: anagrafica?.id_sdi_regime_fiscale ?? "",
  is_pa: Number(anagrafica?.is_pa) === 1,
  is_active: Number(anagrafica?.is_active) === 1,
  stato: anagrafica?.stato ?? "attiva",
})

const createFiscalForm = (fiscale) => ({
  pec: fiscale?.pec ?? "",
  codice_sdi: typeof fiscale?.codice_sdi === "string" ? fiscale.codice_sdi.toUpperCase() : "",
  iban: fiscale?.iban ?? "",
  banca: fiscale?.banca ?? "",
  split_pay:
    fiscale?.split_pay === 1 || fiscale?.split_pay === "1"
      ? "1"
      : fiscale?.split_pay === 0 || fiscale?.split_pay === "0"
        ? "0"
        : "",
  id_cond_pagamento: fiscale?.id_cond_pagamento ?? "",
  modalita_pagamento: fiscale?.modalita_pagamento ?? "",
  id_sezionale: fiscale?.id_sezionale ?? "",
  altri_dati: fiscale?.altri_dati ?? "",
})

const createContactForm = (contatto) => ({
  nome: contatto?.nome ?? "",
  ruolo: contatto?.ruolo ?? "",
  telefono: contatto?.telefono ?? "",
  cellulare: contatto?.cellulare ?? "",
  email: contatto?.email ?? "",
  note: contatto?.note ?? "",
  id_sede: contatto?.id_sede ?? "",
  is_referente: Number(contatto?.is_referente) === 1,
  is_predefinito: Number(contatto?.is_predefinito) === 1,
})

const createSedeForm = (sede) => ({
  id_tipo: sede?.id_tipo ?? "",
  denominazione: sede?.denominazione ?? "",
  indirizzo: sede?.indirizzo ?? "",
  civico: sede?.civico ?? "",
  cap: sede?.cap ?? "",
  comune: sede?.comune ?? "",
  provincia: sede?.provincia ?? "",
  nazione_iso2: sede?.nazione_iso2 ?? "IT",
  telefono: sede?.telefono ?? "",
  email: sede?.email ?? "",
  note: sede?.note ?? "",
  is_legale: Number(sede?.is_legale) === 1,
  is_predefinita: Number(sede?.is_predefinita) === 1,
})

const statoOptions = [
  { label: "Attiva", value: "attiva" },
  { label: "Disattiva", value: "disattiva" },
]

const DEFAULT_TIPOLOGIE_SEDI = [
  { id_tipo: 1, code: "LEGALE", label: "Sede legale" },
  { id_tipo: 2, code: "OPERATIVA", label: "Sede operativa" },
  { id_tipo: 3, code: "MAGAZZINO", label: "Magazzino" },
]

const CATEGORY_OPTIONS = [
  "Comune",
  "Scuola",
  "Ente provinciale",
  "Ente regionale",
  "software house",
  "consorzio idrico",
  "asl",
  "trasporto",
  "società di riscossione",
  "Libero professionista",
  "Azienda Private",
  "Consorzio",
  "Organismo di Certificazione e Controllo",
  "Fornitore di luce e gas",
  "Assicurazione e Amministratore di Condominio",
  "Cash And Carry",
  "Ente No Profit",
  "società di comunicazione e marketing",
  "tipografia",
]

const AnagraficaDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const { setBreadcrumbActions, clearBreadcrumbActions } = useBreadcrumbActions()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState([])
  const [paymentTermsLoading, setPaymentTermsLoading] = useState(false)
  const [paymentTermsError, setPaymentTermsError] = useState(null)
  const [modalitaOptions, setModalitaOptions] = useState([])
  const [modalitaLoading, setModalitaLoading] = useState(false)
  const [modalitaError, setModalitaError] = useState(null)
  const [sezionaliOptions, setSezionaliOptions] = useState([])
  const [tipologieLookup, setTipologieLookup] = useState([])
  const [regimiLookup, setRegimiLookup] = useState([])
  const [tipologieSediLookup, setTipologieSediLookup] = useState([])

  const [mutationError, setMutationError] = useState(null)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })
  const kpiPeriod = 'all'

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  const [isEditingGeneral, setIsEditingGeneral] = useState(false)
  const [generalForm, setGeneralForm] = useState(null)
  const [savingGeneral, setSavingGeneral] = useState(false)

  const [isEditingFiscal, setIsEditingFiscal] = useState(false)
  const [fiscaleForm, setFiscaleForm] = useState(null)
  const [savingFiscal, setSavingFiscal] = useState(false)
  const generalFormRef = useRef(null)
  const fiscalFormRef = useRef(null)

  const [editingSedeId, setEditingSedeId] = useState(null)
  const [sedeForm, setSedeForm] = useState(null)
  const [savingSedeId, setSavingSedeId] = useState(null)

  const [editingContactId, setEditingContactId] = useState(null)
  const [contactForm, setContactForm] = useState(null)
  const [savingContactId, setSavingContactId] = useState(null)
  const sedi = useMemo(() => (Array.isArray(detail?.sedi) ? detail.sedi : []), [detail?.sedi])
  const contatti = useMemo(
    () => (Array.isArray(detail?.contatti) ? detail.contatti : []),
    [detail?.contatti],
  )
  const editingContact = useMemo(() => {
    if (!editingContactId || editingContactId === 'new') {
      return null
    }
    return contatti.find((c) => c.id_contatto === editingContactId) ?? null
  }, [editingContactId, contatti])
  const contattiArchiviati = useMemo(
    () => (Array.isArray(detail?.contatti_archiviati) ? detail.contatti_archiviati : []),
    [detail?.contatti_archiviati],
  )
  const contratti = useMemo(
    () => (Array.isArray(detail?.contratti) ? detail.contratti : []),
    [detail?.contratti],
  )
  const paymentTermsMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(paymentTerms)) {
      paymentTerms.forEach((term) => {
        if (term && term.id !== undefined) {
          map.set(String(term.id), term)
        }
      })
    }
    return map
  }, [paymentTerms])
  const paymentTermOptions = useMemo(() => {
    if (!Array.isArray(paymentTerms)) {
      return []
    }
    return paymentTerms.map((term) => ({
      value: String(term.id),
      label: term.label,
    }))
  }, [paymentTerms])
  const modalitaSelectOptions = useMemo(() => {
    if (!Array.isArray(modalitaOptions)) {
      return []
    }
    const seen = new Set()
    return modalitaOptions
      .filter((item) => item && item.attivo !== false)
      .map((item) => {
        if (!item) {
          return null
        }
        const rawValue =
          item.code ?? item.label ?? (item.id_modalita !== undefined && item.id_modalita !== null ? String(item.id_modalita) : "")
        const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : ""
        if (!value) {
          return null
        }
        const labelParts = []
        if (item.code) {
          labelParts.push(item.code)
        }
        if (item.label) {
          labelParts.push(item.label)
        }
        const label = labelParts.length > 0 ? labelParts.join(" - ") : value
        return { value, label }
      })
      .filter(Boolean)
      .filter((option) => {
        if (seen.has(option.value)) {
          return false
        }
        seen.add(option.value)
        return true
      })
  }, [modalitaOptions])
  const sezionaliMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(sezionaliOptions)) {
      sezionaliOptions.forEach((item) => {
        if (item && item.id_sezionale !== undefined && item.id_sezionale !== null) {
          map.set(String(item.id_sezionale), item)
        }
      })
    }
    return map
  }, [sezionaliOptions])
  const sedeAccordionItems = useMemo(() => {
    if (editingSedeId === "new") {
      return [{ id_sede: "new" }, ...sedi]
    }
    return [...sedi]
  }, [editingSedeId, sedi])
  const currentPaymentTermSelection =
    fiscaleForm && fiscaleForm.id_cond_pagamento !== "" && fiscaleForm.id_cond_pagamento !== undefined && fiscaleForm.id_cond_pagamento !== null
      ? paymentTermsMap.get(String(fiscaleForm.id_cond_pagamento))
      : null
  const tipologiaSelectOptions = useMemo(() => {
    if (!Array.isArray(tipologieLookup)) {
      return []
    }
    return tipologieLookup
      .filter((item) => item && item.id_tipologia !== undefined && item.id_tipologia !== null)
      .map((item) => ({
        value: String(item.id_tipologia),
        label: formatLookupOptionLabel(item.label, item.code, item.id_tipologia),
      }))
  }, [tipologieLookup])
  const regimiSelectOptions = useMemo(() => {
    if (!Array.isArray(regimiLookup)) {
      return []
    }
    return regimiLookup
      .filter((item) => item && item.id_regime !== undefined && item.id_regime !== null)
      .map((item) => ({
        value: String(item.id_regime),
        label: formatLookupOptionLabel(item.label, item.code, item.id_regime),
      }))
  }, [regimiLookup])
  const tipologieSediSelectOptions = useMemo(() => {
    if (!Array.isArray(tipologieSediLookup)) {
      return []
    }
    return tipologieSediLookup
      .filter((item) => item && item.id_tipo !== undefined && item.id_tipo !== null)
      .map((item) => ({
        value: String(item.id_tipo),
        label: formatTipoLabel(item) ?? String(item.id_tipo),
      }))
  }, [tipologieSediLookup])
  const tipologieSediLookupMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(tipologieSediLookup)) {
      tipologieSediLookup.forEach((item) => {
        if (item && item.id_tipo !== undefined && item.id_tipo !== null) {
          map.set(String(item.id_tipo), formatTipoLabel(item) ?? String(item.id_tipo))
        }
      })
    }
    return map
  }, [tipologieSediLookup])

  const locationStateId =
    location && typeof location.state === "object" && location.state !== null
      ? location.state.id
      : null

  const queryId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("id")
  }, [location.search])

  const recordId = useMemo(() => {
    const candidate = locationStateId ?? queryId
    const numeric = Number(candidate)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
    return null
  }, [locationStateId, queryId])

  // Se manca l'id, ridireziona alla lista
  useEffect(() => {
    if (!recordId) {
      navigate('/anagrafica/lista', { replace: true })
    }
  }, [recordId, navigate])

  useEffect(() => {
    setDetail(null)
    setError(null)
    setIsEditingGeneral(false)
    setIsEditingFiscal(false)
    setEditingSedeId(null)
    setSedeForm(null)
    setSavingSedeId(null)
    setEditingContactId(null)
    setGeneralForm(null)
    setFiscaleForm(null)
    setContactForm(null)
  }, [recordId])

  useEffect(() => {
    if (!token || !recordId) {
      return
    }

    const controller = new AbortController()

    const loadDetail = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchAnagraficaDetail({
          token,
          id: recordId,
          kpiPeriod,
          signal: controller.signal,
        })

        setDetail(data)
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return
        }

        if (fetchError.status === 401 && logout) {
          logout()
          return
        }

        setError(fetchError)
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    loadDetail()

    return () => {
      controller.abort()
    }
  }, [token, recordId, refreshIndex, logout, kpiPeriod])

  useEffect(() => {
    if (!token) {
      setPaymentTerms([])
      return
    }

    const controller = new AbortController()
    let isMounted = true
    setPaymentTermsLoading(true)
    setPaymentTermsError(null)

    fetchPaymentTerms({ token, signal: controller.signal })
      .then(({ items }) => {
        if (!isMounted) {
          return
        }
        setPaymentTerms(Array.isArray(items) ? items : [])
      })
      .catch((fetchError) => {
        if (fetchError.name === "AbortError" || !isMounted) {
          return
        }
        setPaymentTermsError(fetchError)
        setPaymentTerms([])
      })
      .finally(() => {
        if (isMounted) {
          setPaymentTermsLoading(false)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setModalitaOptions([])
      setModalitaError(null)
      setModalitaLoading(false)
      setSezionaliOptions([])
      return
    }

    const controller = new AbortController()
    let isMounted = true
    setModalitaLoading(true)
    setModalitaError(null)

    fetchFattureConfig({ token, signal: controller.signal })
      .then((data) => {
        if (!isMounted) {
          return
        }
        const modalita = Array.isArray(data?.modalita_pagamento) ? data.modalita_pagamento : []
        const sezionali = Array.isArray(data?.sezionali) ? data.sezionali : []
        setModalitaOptions(modalita)
        setSezionaliOptions(sezionali)
      })
      .catch((fetchError) => {
        if (fetchError.name === "AbortError" || !isMounted) {
          return
        }
        if (fetchError.status === 401 && logout) {
          logout()
          return
        }
        setModalitaError(fetchError)
        setModalitaOptions([])
        setSezionaliOptions([])
      })
      .finally(() => {
        if (isMounted) {
          setModalitaLoading(false)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token, logout])

  useEffect(() => {
    if (!token) {
      setTipologieLookup([])
      setRegimiLookup([])
      setTipologieSediLookup(DEFAULT_TIPOLOGIE_SEDI)
      return
    }

    const controller = new AbortController()
    let isMounted = true

    const loadLookups = async () => {
      try {
        const [tipologie, regimi, tipologieSedi] = await Promise.all([
          fetchTipologieAnagrafiche({ token, signal: controller.signal }),
          fetchRegimiFiscali({ token, signal: controller.signal }),
          fetchTipologieSedi({ token, signal: controller.signal }),
        ])
        if (!isMounted) {
          return
        }
        setTipologieLookup(Array.isArray(tipologie) ? tipologie : [])
        setRegimiLookup(Array.isArray(regimi) ? regimi : [])
        const normalizedTipologieSedi =
          Array.isArray(tipologieSedi) && tipologieSedi.length > 0 ? tipologieSedi : DEFAULT_TIPOLOGIE_SEDI
        setTipologieSediLookup(normalizedTipologieSedi)
      } catch {
        if (!isMounted) {
          return
        }
        setTipologieLookup([])
        setRegimiLookup([])
        setTipologieSediLookup(DEFAULT_TIPOLOGIE_SEDI)
      }
    }

    loadLookups()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token])

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate("/anagrafica/lista")
  }

  const handleRefresh = () => {
    setRefreshIndex((value) => value + 1)
  }

  // Determina se nessuna sezione è in modalità modifica per compattare la UI
  const isCompact = !isEditingGeneral && !isEditingFiscal && editingSedeId === null && editingContactId === null
  const gridGapClass = isCompact ? 'g-2' : 'g-3'

  const handleMutationSuccess = useCallback((updatedDetail) => {
    setDetail(updatedDetail)
    setMutationError(null)
  }, [])

  const startGeneralEditing = () => {
    if (!detail?.anagrafica) {
      return
    }
    setMutationError(null)
    setGeneralForm(createGeneralForm(detail.anagrafica))
    setIsEditingGeneral(true)
  }

  const cancelGeneralEditing = () => {
    setIsEditingGeneral(false)
    setGeneralForm(null)
  }

  const handleGeneralFieldChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value
    setGeneralForm((current) => {
      if (!current) return current

      // Conferma esplicita alla disattivazione: comporta archiviazione/rimozione
      if (field === "is_active") {
        const wasActive = Boolean(current.is_active)
        const willBeActive = Boolean(value)

        // Transizione da attiva -> disattiva
        if (wasActive && !willBeActive) {
          const confirmed = window.confirm(
            "Disattivando l'anagrafica verrà archiviata e rimossa dal sistema. Vuoi continuare?",
          )
          if (!confirmed) {
            // Annulla modifica, lascia attiva
            return current
          }
          // Allinea anche lo stato a 'disattiva'
          return { ...current, is_active: false, stato: "disattiva" }
        }

        // Eventuale riattivazione: allinea lo stato se era precedentemente 'disattiva'
        if (!wasActive && willBeActive) {
          return { ...current, is_active: true, stato: current.stato === "disattiva" ? "attiva" : current.stato }
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  const handleGeneralSubmit = async (event) => {
    event.preventDefault()
    if (!generalForm || !recordId) {
      return
    }

    setSavingGeneral(true)
    setMutationError(null)

    const payload = {
      ragione_sociale: generalForm.ragione_sociale,
      piva: generalForm.piva,
      codice_fiscale: generalForm.codice_fiscale,
      email: generalForm.email,
      telefono: generalForm.telefono,
      note: generalForm.note,
      categoria: generalForm.categoria || null,
      id_tipologia: generalForm.id_tipologia === "" ? null : Number(generalForm.id_tipologia),
      id_sdi_regime_fiscale:
        generalForm.id_sdi_regime_fiscale === "" ? null : Number(generalForm.id_sdi_regime_fiscale),
      is_pa: generalForm.is_pa ? 1 : 0,
      is_active: generalForm.is_active ? 1 : 0,
      stato: generalForm.stato,
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === "string") {
        payload[key] = value.trim()
      }
      if (payload[key] === "") {
        payload[key] = null
      }
    })

    if (typeof payload.codice_sdi === "string") {
      payload.codice_sdi = payload.codice_sdi.toUpperCase()
    }

    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        anagrafica: payload,
      })
      handleMutationSuccess(response)
      setIsEditingGeneral(false)
      setGeneralForm(null)
      // Se è stata disattivata, ritorna alla lista (il record potrebbe essere archiviato/rimosso)
      if (payload.is_active === 0) {
        navigate('/anagrafica/lista', { replace: true })
        return
      }
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingGeneral(false)
    }
  }

  const startFiscalEditing = () => {
    setMutationError(null)
    setFiscaleForm(createFiscalForm(detail?.fiscale ?? {}))
    setIsEditingFiscal(true)
  }

  const cancelFiscalEditing = () => {
    setIsEditingFiscal(false)
    setFiscaleForm(null)
  }

const handleFiscalFieldChange = (field) => (event) => {
  const value = field === "codice_sdi" ? String(event.target.value || "").toUpperCase() : event.target.value
  setFiscaleForm((current) => ({
    ...current,
    [field]: value,
  }))
}

  const handleFiscalSubmit = async (event) => {
    event.preventDefault()
    if (!recordId || !fiscaleForm) {
      return
    }

    setSavingFiscal(true)
    setMutationError(null)

    const payload = {
      pec: fiscaleForm.pec,
      codice_sdi: fiscaleForm.codice_sdi,
      iban: fiscaleForm.iban,
      banca: fiscaleForm.banca,
      split_pay: fiscaleForm.split_pay === "" ? null : Number(fiscaleForm.split_pay),
      id_cond_pagamento:
        fiscaleForm.id_cond_pagamento === "" ? null : Number(fiscaleForm.id_cond_pagamento),
      modalita_pagamento: fiscaleForm.modalita_pagamento,
      id_sezionale:
        fiscaleForm.id_sezionale === "" ? null : Number(fiscaleForm.id_sezionale),
      altri_dati: fiscaleForm.altri_dati,
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === "string") {
        payload[key] = value.trim()
      }
      if (payload[key] === "") {
        payload[key] = null
      }
    })

    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        fiscale: payload,
      })
      handleMutationSuccess(response)
      setIsEditingFiscal(false)
      setFiscaleForm(null)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingFiscal(false)
    }
  }

  const handleSedeCreate = () => {
    setMutationError(null)
    setSavingSedeId(null)
    setEditingSedeId("new")
    setSedeForm(createSedeForm(null))
  }

  const handleSedeEdit = (sede) => {
    setMutationError(null)
    setSavingSedeId(null)
    setEditingSedeId(Number(sede.id_sede))
    setSedeForm(createSedeForm(sede))
  }

  const handleSedeCancel = () => {
    setEditingSedeId(null)
    setSedeForm(null)
  }

  const handleSedeFieldChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value
    setSedeForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSedeSave = useCallback(async () => {
    if (!recordId || !sedeForm || editingSedeId === null) {
      return
    }

    setSavingSedeId(editingSedeId)
    setMutationError(null)

    // Previous default sede id to check if default changes after save
    const prevDefaultSedeId = (() => {
      const currentDefault = Array.isArray(sedi)
        ? sedi.find((s) => Number(s.is_predefinita) === 1)
        : null
      return currentDefault?.id_sede ?? null
    })()

    const payload = {
      id_tipo: sedeForm.id_tipo === "" ? null : Number(sedeForm.id_tipo),
      denominazione: sedeForm.denominazione,
      indirizzo: sedeForm.indirizzo,
      civico: sedeForm.civico,
      cap: sedeForm.cap,
      comune: sedeForm.comune,
      provincia: sedeForm.provincia,
      telefono: sedeForm.telefono,
      email: sedeForm.email,
      note: sedeForm.note,
      is_legale: sedeForm.is_legale,
      is_predefinita: sedeForm.is_predefinita,
    }

    if (payload.id_tipo !== null && Number.isNaN(payload.id_tipo)) {
      payload.id_tipo = null
    }

    const nazione = (sedeForm.nazione_iso2 || "").trim().toUpperCase()
    if (nazione) {
      payload.nazione_iso2 = nazione.slice(0, 2)
    } else if (editingSedeId === "new") {
      payload.nazione_iso2 = "IT"
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim()
        payload[key] = trimmed === "" ? null : trimmed
      }
    })

    if (payload.id_tipo === null || payload.indirizzo === null || payload.comune === null) {
      setSavingSedeId(null)
      setMutationError("Compila tipo, indirizzo e comune della sede.")
      return
    }

    const requestBody =
      editingSedeId === "new"
        ? { create: [payload] }
        : { update: [{ id_sede: editingSedeId, ...payload }] }

    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        sedi: requestBody,
      })
      handleMutationSuccess(response)

      // If a new default sede was set, reassign contacts linked to previous default to the new one
      const nextDefault = Array.isArray(response?.sedi)
        ? response.sedi.find((s) => Number(s.is_predefinita) === 1)
        : null
      const nextDefaultSedeId = nextDefault?.id_sede ?? null

      if (
        sedeForm.is_predefinita &&
        prevDefaultSedeId &&
        nextDefaultSedeId &&
        Number(prevDefaultSedeId) !== Number(nextDefaultSedeId)
      ) {
        const contactsToMove = Array.isArray(response?.contatti)
          ? response.contatti.filter((c) => Number(c.id_sede) === Number(prevDefaultSedeId))
          : []

        if (contactsToMove.length > 0) {
          try {
            const updates = contactsToMove.map((c) => ({
              id_contatto: c.id_contatto,
              id_sede: Number(nextDefaultSedeId),
            }))

            const updateResp = await updateAnagraficaDetail({
              token,
              id: recordId,
              kpiPeriod,
              contatti: updates,
            })
            handleMutationSuccess(updateResp)
          } catch (contactsUpdateError) {
            if (contactsUpdateError.status === 401 && logout) {
              logout()
              return
            }
            setMutationError(
              contactsUpdateError.payload?.message ||
              contactsUpdateError.message ||
              'Aggiornamento contatti non riuscito dopo cambio sede predefinita.'
            )
          }
        }
      }
      setEditingSedeId(null)
      setSedeForm(null)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingSedeId(null)
    }
  }, [editingSedeId, handleMutationSuccess, kpiPeriod, logout, recordId, sedeForm, sedi, token])

  const handleSedeDelete = async (sedeId) => {
    if (!recordId || !sedeId) {
      return
    }

    const confirmed = window.confirm(`Confermi l'eliminazione della sede ${sedeId}?`)
    if (!confirmed) {
      return
    }

    setMutationError(null)
    setEditingSedeId((current) => (current === sedeId ? null : current))
    setSedeForm(null)
    setSavingSedeId(sedeId)

    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        sedi: { delete: [sedeId] },
      })
      handleMutationSuccess(response)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingSedeId(null)
    }
  }

  const handleContactEdit = (contatto) => {
    setMutationError(null)
    setEditingContactId(contatto.id_contatto)
    setContactForm(createContactForm(contatto))
  }

  const handleContactCancel = () => {
    setEditingContactId(null)
    setContactForm(null)
  }

  const handleContactCreate = () => {
    setMutationError(null)
    setEditingContactId('new')
    setContactForm(createContactForm(null))
  }

  const handleContactArchive = async (contattoId) => {
    if (!recordId || !contattoId) {
      return
    }

    const confirmed = window.confirm(`Confermi l'archiviazione del contatto ${contattoId}?`)
    if (!confirmed) {
      return
    }

    setMutationError(null)
    setEditingContactId((current) => (current === contattoId ? null : current))
    setContactForm(null)
    setSavingContactId(contattoId)

    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        // Archiviazione contatto (pass-through all'API)
        contatti: [{ action: 'archive', id_contatto: contattoId }],
      })
      // Se l'API restituisce il dettaglio aggiornato, aggiorna lo stato; altrimenti ricarica
      if (response && (response.contatti || response.anagrafica)) {
        handleMutationSuccess(response)
      } else {
        handleRefresh()
      }
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingContactId(null)
    }
  }

  const handleContactRestore = useCallback(async (contattoId) => {
    if (!recordId || !contattoId) {
      return
    }
    setMutationError(null)
    setRestoringArchivedId(contattoId)
    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        contatti: [{ action: "restore", id_contatto: contattoId }],
      })
      handleMutationSuccess(response)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setRestoringArchivedId(null)
    }
  }, [handleMutationSuccess, kpiPeriod, logout, recordId, token])

  const handleArchivedDelete = useCallback(async (contattoId) => {
    if (!recordId || !contattoId) {
      return
    }
    const confirmed = window.confirm(`Confermi l'eliminazione definitiva del contatto archiviato ${contattoId}?`)
    if (!confirmed) {
      return
    }
    setMutationError(null)
    setDeletingArchivedId(contattoId)
    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        contatti: [{ action: "hard_delete", id_contatto: contattoId }],
      })
      handleMutationSuccess(response)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setDeletingArchivedId(null)
    }
  }, [handleMutationSuccess, kpiPeriod, logout, recordId, token])

  const handleContactFieldChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value
    setContactForm((current) => ({
      ...current,
      [field]: value,
    }))
  }
  const handleContactSave = useCallback(async (contattoId) => {
    if (!recordId || !contactForm) {
      return
    }

    setSavingContactId(contattoId)
    setMutationError(null)

    const payload = {
      nome: contactForm.nome,
      ruolo: contactForm.ruolo,
      telefono: contactForm.telefono,
      cellulare: contactForm.cellulare,
      email: contactForm.email,
      note: contactForm.note,
      id_sede: contactForm.id_sede === "" ? null : Number(contactForm.id_sede),
      is_referente: contactForm.is_referente ? 1 : 0,
      is_predefinito: contactForm.is_predefinito ? 1 : 0,
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === "string") {
        payload[key] = value.trim()
      }
      if (payload[key] === "") {
        payload[key] = null
      }
    })

    try {
      if (contattoId === 'new') {
        const prevIds = contatti.map((c) => c.id_contatto)

        const createdResp = await updateAnagraficaDetail({
          token,
          id: recordId,
          kpiPeriod,
          contatti: { create: [payload] },
        })
        handleMutationSuccess(createdResp)

        const newId = (createdResp?.contatti ?? [])
          .map((c) => c.id_contatto)
          .find((id) => !prevIds.includes(id))

        // Enforce uniqueness for defaults if requested on creation (per sede)
        const followUps = []
        if (payload.is_predefinito === 1 && newId) {
          const sedeId = payload.id_sede
          if (sedeId) {
            const sameSede = (createdResp?.contatti ?? []).filter((c) => c.id_contatto !== newId && Number(c.id_sede) === Number(sedeId) && Number(c.is_predefinito) === 1)
            sameSede.forEach((c) => followUps.push({ id_contatto: c.id_contatto, is_predefinito: 0 }))
            followUps.push({ id_contatto: newId, is_predefinito: 1 })
          }
        }

        if (followUps.length > 0) {
          const updatesResp = await updateAnagraficaDetail({ token, id: recordId, kpiPeriod, contatti: followUps })
          handleMutationSuccess(updatesResp)
        }
      } else {
        // For updates, include uniqueness enforcement per sede in one batch
        const batch = [{ id_contatto: contattoId, ...payload }]
        if (payload.is_predefinito === 1) {
          const sedeId = payload.id_sede ?? contatti.find((c) => c.id_contatto === contattoId)?.id_sede
          if (sedeId) {
            const sameSede = contatti.filter(
              (c) => c.id_contatto !== contattoId && Number(c.id_sede) === Number(sedeId) && Number(c.is_predefinito) === 1,
            )
            sameSede.forEach((c) => batch.push({ id_contatto: c.id_contatto, is_predefinito: 0 }))
          }
        }

        const response = await updateAnagraficaDetail({ token, id: recordId, kpiPeriod, contatti: batch })
        handleMutationSuccess(response)
      }
      setEditingContactId(null)
      setContactForm(null)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    } finally {
      setSavingContactId(null)
    }
  }, [contactForm, contatti, handleMutationSuccess, kpiPeriod, logout, recordId, token])

  const preventivi = useMemo(
    () => (Array.isArray(detail?.preventivi) ? detail.preventivi : []),
    [detail?.preventivi],
  )
  // Preventivi: ultimi 10 con pager 5/pg
  const [preventiviPage, setPreventiviPage] = useState(0)
  const [ddtPage, setDdtPage] = useState(0)
  const [fatturePage, setFatturePage] = useState(0)
  const PREVENTIVI_ROWS_PER_PAGE = 5
  const RELATED_ROWS_PER_PAGE = 5
  const RELATED_DOCUMENTS_LIMIT = 10
  const latestPreventivi = useMemo(
    () => sortRowsByDocumentDateDesc(preventivi, "data_preventivo", "created_at").slice(0, RELATED_DOCUMENTS_LIMIT),
    [preventivi],
  )
  const totalPreventivi = latestPreventivi.length
  const totalPreventiviPages = Math.max(Math.ceil(totalPreventivi / PREVENTIVI_ROWS_PER_PAGE), 1)
  const paginatedPreventivi = useMemo(() => {
    const start = preventiviPage * PREVENTIVI_ROWS_PER_PAGE
    return latestPreventivi.slice(start, start + PREVENTIVI_ROWS_PER_PAGE)
  }, [latestPreventivi, preventiviPage])
  const handleViewPreventivo = (id) => {
    if (!id) return
    navigate(`/preventivi/dettagli?id=${id}`)
  }
  const ddt = detail?.ddt ?? []
  const fatture = detail?.fatture ?? []
  const [contactsView, setContactsView] = useState('associati')

  const latestDdt = useMemo(
    () => sortRowsByDocumentDateDesc(ddt, "data_ddt", "created_at").slice(0, RELATED_DOCUMENTS_LIMIT),
    [ddt],
  )
  const totalDdtPages = Math.max(Math.ceil(latestDdt.length / RELATED_ROWS_PER_PAGE), 1)
  const paginatedDdt = useMemo(() => {
    const start = ddtPage * RELATED_ROWS_PER_PAGE
    return latestDdt.slice(start, start + RELATED_ROWS_PER_PAGE)
  }, [latestDdt, ddtPage])
  const latestFatture = useMemo(
    () => sortRowsByDocumentDateDesc(fatture, "data_fattura", "created_at").slice(0, RELATED_DOCUMENTS_LIMIT),
    [fatture],
  )
  const totalFatturePages = Math.max(Math.ceil(latestFatture.length / RELATED_ROWS_PER_PAGE), 1)
  const paginatedFatture = useMemo(() => {
    const start = fatturePage * RELATED_ROWS_PER_PAGE
    return latestFatture.slice(start, start + RELATED_ROWS_PER_PAGE)
  }, [latestFatture, fatturePage])

  useEffect(() => {
    setPreventiviPage((prev) => Math.min(prev, Math.max(totalPreventiviPages - 1, 0)))
  }, [totalPreventiviPages])

  useEffect(() => {
    setDdtPage((prev) => Math.min(prev, Math.max(totalDdtPages - 1, 0)))
  }, [totalDdtPages])

  useEffect(() => {
    setFatturePage((prev) => Math.min(prev, Math.max(totalFatturePages - 1, 0)))
  }, [totalFatturePages])

  const sedeOptions = useMemo(() => {
    const options = [
      { label: 'Nessuna sede', value: '' },
      ...sedi.map((sede) => {
        const labelParts = [
          sede.denominazione,
          sede.indirizzo,
          [sede.cap, sede.comune].filter(Boolean).join(' '),
          sede.provincia ? `(${sede.provincia})` : null,
        ].filter(Boolean)
        return {
          label: labelParts.length ? labelParts.join(' - ') : `ID ${sede.id_sede}`,
          value: String(sede.id_sede),
        }
      }),
    ]
    return options
  }, [sedi])

  const contattiGrouped = useMemo(() => {
    if (!Array.isArray(contatti) || contatti.length === 0) return []

    const groups = []
    const byKey = new Map()

    const formatSedeFromContact = (c) => {
      const composed = (c?.sede_denominazione || c?.sede_indirizzo)
        ? [
          c.sede_denominazione,
          c.sede_indirizzo,
          [c.sede_cap, c.sede_comune].filter(Boolean).join(" "),
          c.sede_provincia ? `(${c.sede_provincia})` : null,
        ]
          .filter(Boolean)
          .join(" - ")
        : "-"
      return composed && composed !== "-" ? composed : "Sede non assegnata"
    }

    contatti.forEach((c) => {
      const key = c?.id_sede ?? "none"
      if (!byKey.has(key)) {
        const label = formatSedeFromContact(c)
        const group = { key: String(key), label, items: [] }
        byKey.set(key, group)
        groups.push(group)
      }
      byKey.get(key).items.push(c)
    })

    return groups
  }, [contatti])

  // Gruppi per contatti archiviati (stessa grafica degli associati)
  const contattiArchGrouped = useMemo(() => {
    if (!Array.isArray(contattiArchiviati) || contattiArchiviati.length === 0) return []

    const groups = []
    const byKey = new Map()

    const formatSedeFromContact = (c) => {
      const composed = (c?.sede_denominazione || c?.sede_indirizzo)
        ? [
          c.sede_denominazione,
          c.sede_indirizzo,
          [c.sede_cap, c.sede_comune].filter(Boolean).join(' '),
          c.sede_provincia ? `(${c.sede_provincia})` : null,
        ]
          .filter(Boolean)
          .join(' ')
        : '-'
      return composed && composed !== '-' ? composed : 'Sede non assegnata'
    }

    contattiArchiviati.forEach((c) => {
      const key = c?.id_sede ?? 'none'
      if (!byKey.has(key)) {
        const label = formatSedeFromContact(c)
        const group = { key: String(key), label, items: [] }
        byKey.set(key, group)
        groups.push(group)
      }
      byKey.get(key).items.push(c)
    })

    return groups
  }, [contattiArchiviati])
  // Contatti archiviati: ultimi 10, con paginazione 5/pg (come preventivi)
  const [contattiArchPage, setContattiArchPage] = useState(0)
  const [restoringArchivedId, setRestoringArchivedId] = useState(null)
  const [deletingArchivedId, setDeletingArchivedId] = useState(null)
  const CONTATTI_ARCH_ROWS_PER_PAGE = 5
  const latestContattiArch = useMemo(() => {
    const sorted = [...contattiArchiviati].sort((a, b) => {
      const ad = new Date(a?.archived_at || a?.updated_at || a?.created_at || 0).getTime()
      const bd = new Date(b?.archived_at || b?.updated_at || b?.created_at || 0).getTime()
      return bd - ad
    })
    return sorted.slice(0, 10)
  }, [contattiArchiviati])
  const totalContattiArch = latestContattiArch.length
  const totalContattiArchPages = Math.max(
    Math.ceil(totalContattiArch / CONTATTI_ARCH_ROWS_PER_PAGE),
    1,
  )
  const paginatedContattiArch = useMemo(() => {
    const start = contattiArchPage * CONTATTI_ARCH_ROWS_PER_PAGE
    return latestContattiArch.slice(start, start + CONTATTI_ARCH_ROWS_PER_PAGE)
  }, [latestContattiArch, contattiArchPage])
  const contattiArchPaginationItems = useMemo(() => {
    const items = []
    for (let p = 1; p <= totalContattiArchPages; p += 1) items.push(p)
    return items
  }, [totalContattiArchPages])

  const renderContactFormCard = ({ isNew, contact }) => {
    if (!contactForm) {
      return null
    }
    const targetId = isNew ? "new" : contact?.id_contatto
    const isSavingCurrent = savingContactId === targetId
    const displayName = String(contact?.nome || contactForm.nome || "").trim()
    const headerTitle = isNew ? "Nuovo contatto" : `Modifica contatto ${displayName || ""}`
    const headerSubtitle = !isNew && contact?.id_contatto ? `ID ${contact.id_contatto}` : null

    return (
      <div className="border border-primary-subtle rounded-3 p-3 bg-body">
        <div className="d-flex justify-content-between align-items-center mb-3 gap-3">
          <div>
            <div className="fw-semibold">{headerTitle}</div>
            {headerSubtitle && <div className="text-body-secondary small">{headerSubtitle}</div>}
          </div>
          <CBadge color="primary" className="text-uppercase small">
            In modifica
          </CBadge>
        </div>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormInput
              value={contactForm.nome}
              onChange={handleContactFieldChange("nome")}
              placeholder="Nome"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              value={contactForm.ruolo}
              onChange={handleContactFieldChange("ruolo")}
              placeholder="Ruolo"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              value={contactForm.telefono}
              onChange={handleContactFieldChange("telefono")}
              placeholder="Telefono"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              value={contactForm.cellulare}
              onChange={handleContactFieldChange("cellulare")}
              placeholder="Cellulare"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              value={contactForm.email}
              onChange={handleContactFieldChange("email")}
              placeholder="Email"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              value={String(contactForm.id_sede ?? "")}
              onChange={handleContactFieldChange("id_sede")}
              disabled={isSavingCurrent || isDisabled}
            >
              {sedeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={6}>
            <CFormCheck
              type="checkbox"
              label="Predefinito"
              checked={contactForm.is_predefinito}
              onChange={handleContactFieldChange("is_predefinito")}
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
          <CCol xs={12}>
            <CFormTextarea
              value={contactForm.note}
              onChange={handleContactFieldChange("note")}
              rows={2}
              className="mt-2"
              placeholder="Note"
              disabled={isSavingCurrent || isDisabled}
            />
          </CCol>
        </CRow>
        <div className="d-flex gap-2 flex-wrap justify-content-end mt-3">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            type="button"
            onClick={handleContactCancel}
            disabled={isSavingCurrent || isDisabled}
          >
            Annulla
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="button"
            onClick={() => handleContactSave(targetId)}
            disabled={isSavingCurrent || isDisabled}
          >
            {isSavingCurrent ? "Salvataggio..." : "Salva"}
          </CButton>
        </div>
      </div>
    )
  }

  const renderContactAccordionItem = (contatto, groupLabel) => {
    if (!contatto) {
      return null
    }
    const fullName = String(contatto.nome || "").trim() || "-"
    const isDefault = Number(contatto.is_predefinito) === 1
    const isReferente = Number(contatto.is_referente) === 1
    const actionDisabled = isDisabled || savingContactId !== null || isEditingGeneral || isEditingFiscal
    return (
      <CAccordionItem key={`contatto-${contatto.id_contatto}`} itemKey={`contatto-${contatto.id_contatto}`}>
        <CAccordionHeader className="py-2">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between w-100">
            <div>
              <strong>{fullName}</strong>
              <div className="small text-body-secondary">{contatto.ruolo || "-"}</div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {isReferente && (
                <CBadge color="info" className="text-uppercase small">
                  Referente
                </CBadge>
              )}
              {isDefault && (
                <CBadge color="primary" className="text-uppercase small">
                  Predefinito
                </CBadge>
              )}
            </div>
          </div>
        </CAccordionHeader>
        <CAccordionBody className="pt-0">
          <CRow className="g-3">
            <CCol md={6}>
              <DetailField label="Telefono" value={contatto.telefono || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Cellulare" value={contatto.cellulare || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Email" value={contatto.email || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Sede" value={groupLabel || "-"} compact />
            </CCol>
            <CCol xs={12}>
              <DetailField label="Note" value={contatto.note} />
            </CCol>
          </CRow>
          <div className="d-flex gap-2 flex-wrap justify-content-end mt-3">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => handleContactEdit(contatto)}
              disabled={actionDisabled}
            >
              <CIcon icon={cilSettings} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => handleContactArchive(contatto.id_contatto)}
              disabled={actionDisabled}
            >
              {savingContactId === contatto.id_contatto ? "Archiviazione..." : "Archivia"}
            </CButton>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    )
  }

  const renderArchivedContactAccordionItem = (contatto, groupLabel) => {
    if (!contatto) {
      return null
    }
    const fullName = String(contatto.nome || "").trim() || "-"
    const isDefault = Number(contatto.is_predefinito) === 1
    const archivedLabel = formatDateTime(contatto.archived_at)
    const isRestoring = restoringArchivedId === contatto.id_contatto
    const isDeleting = deletingArchivedId === contatto.id_contatto
    return (
      <CAccordionItem key={`arch-${contatto.id_contatto}`} itemKey={`arch-${contatto.id_contatto}`}>
        <CAccordionHeader className="py-2">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between w-100">
            <div>
              <strong>{fullName}</strong>
              <div className="small text-body-secondary">{contatto.ruolo || "-"}</div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {isDefault && (
                <CBadge color="primary" className="text-uppercase small">
                  Predefinito
                </CBadge>
              )}
            </div>
          </div>
        </CAccordionHeader>
        <CAccordionBody className="pt-0">
          <CRow className="g-3">
            <CCol md={6}>
              <DetailField label="Telefono" value={contatto.telefono || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Cellulare" value={contatto.cellulare || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Email" value={contatto.email || "-"} compact />
            </CCol>
            <CCol md={6}>
              <DetailField label="Sede" value={groupLabel || "-"} compact />
            </CCol>
            <CCol xs={12}>
              <DetailField label="Note" value={contatto.note} />
            </CCol>
          </CRow>
          <div className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-center mt-3">
            <small className="text-body-secondary">Archiviato {archivedLabel}</small>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => handleContactRestore(contatto.id_contatto)}
                disabled={isDisabled || isRestoring}
              >
                {isRestoring ? "Ripristino..." : "Ripristina"}
              </CButton>
              <CButton
                color="danger"
                variant="outline"
                size="sm"
                onClick={() => handleArchivedDelete(contatto.id_contatto)}
                disabled={isDisabled || isDeleting}
              >
                {isDeleting ? "Eliminazione..." : (<><CIcon icon={cilTrash} /> Elimina</>)}
              </CButton>
            </div>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    )
  }

  const errorMessage = error?.payload?.message ?? error?.message

  const generalFields = useMemo(() => {
    if (!detail?.anagrafica) {
      return []
    }

    const anagrafica = detail.anagrafica

    return [
      { label: "Ragione Sociale", value: anagrafica.ragione_sociale },
      { label: "Stato", value: getStatusBadge(anagrafica.stato) },
      { label: "Partita IVA", value: anagrafica.piva },
      { label: "Codice fiscale", value: anagrafica.codice_fiscale },
      { label: "Tipologia", value: getTipologiaValue(anagrafica) },
      { label: "Categoria", value: getCategoriaValue(anagrafica) },
      { label: "Creato il", value: formatDateTime(anagrafica.created_at) },
      { label: "Aggiornato il", value: formatDateTime(anagrafica.updated_at) },
    ]
  }, [detail])

  const fiscaleFields = useMemo(() => {
    if (!detail?.fiscale) {
      return []
    }

    const fiscale = detail.fiscale
    const paymentTerm =
      fiscale.id_cond_pagamento != null ? paymentTermsMap.get(String(fiscale.id_cond_pagamento)) : null
    const sezionale = fiscale.id_sezionale != null ? sezionaliMap.get(String(fiscale.id_sezionale)) : null
    const sezionaleLabel = sezionale
      ? (sezionale.code ? `${sezionale.code} - ${sezionale.label}` : (sezionale.label ?? sezionale.id_sezionale))
      : "-"

    return [
      { label: "PEC", value: fiscale.pec },
      { label: "Codice SDI", value: typeof fiscale.codice_sdi === "string" ? fiscale.codice_sdi.toUpperCase() : fiscale.codice_sdi },
      { label: "IBAN", value: fiscale.iban },
      { label: "Banca", value: fiscale.banca },
      {
        label: "Split PAY",
        value:
          fiscale.split_pay === 1 || fiscale.split_pay === "1"
            ? "Si"
            : fiscale.split_pay === 0 || fiscale.split_pay === "0"
              ? "No"
              : "-",
      },
      { label: "Modalita di pagamento", value: fiscale.modalita_pagamento },
      { label: "Sezionale fattura", value: sezionaleLabel },
      {
        label: "Condizioni di pagamento",
        value: paymentTerm?.label ?? "-",
      },
      { label: "Altri dati", value: fiscale.altri_dati, fullWidth: true },
    ]
  }, [detail, paymentTermsMap, sezionaliMap])
  const anagraficaStatus = String(detail?.anagrafica?.stato || '').toLowerCase()
  const isDisabled = anagraficaStatus === 'disattiva' || Number(detail?.anagrafica?.is_active) !== 1

  const handleGeneralBreadcrumbSave = useCallback(() => {
    if (generalFormRef.current) {
      generalFormRef.current.requestSubmit()
    }
  }, [])

  const handleFiscalBreadcrumbSave = useCallback(() => {
    if (fiscalFormRef.current) {
      fiscalFormRef.current.requestSubmit()
    }
  }, [])

  const handleRefreshData = useCallback(() => {
    setRefreshIndex((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!recordId) {
      clearBreadcrumbActions()
      return
    }
    const actions = [
      {
        id: 'anagrafica-refresh',
        icon: cilReload,
        label: loading ? 'Aggiornamento dati...' : 'Aggiorna dati',
        onClick: handleRefreshData,
        disabled: loading,
      },
    ]
    if (isEditingGeneral && !isDisabled) {
      actions.push({
        id: 'anagrafica-general-save',
        icon: cilSave,
        label: savingGeneral ? 'Salvataggio anagrafica...' : 'Salva anagrafica',
        onClick: handleGeneralBreadcrumbSave,
        disabled: savingGeneral || !generalForm,
      })
    } else if (isEditingFiscal && !isDisabled) {
      actions.push({
        id: 'anagrafica-fiscale-save',
        icon: cilSave,
        label: savingFiscal ? 'Salvataggio dati fiscali...' : 'Salva dati fiscali',
        onClick: handleFiscalBreadcrumbSave,
        disabled: savingFiscal || !fiscaleForm,
      })
    } else if (!isDisabled && editingSedeId !== null && sedeForm) {
      const savingCurrentSede = savingSedeId === editingSedeId
      actions.push({
        id: 'anagrafica-sede-save',
        icon: cilSave,
        label: savingCurrentSede
          ? 'Salvataggio sede...'
          : editingSedeId === 'new'
            ? 'Crea sede'
            : 'Salva sede',
        onClick: handleSedeSave,
        disabled: savingCurrentSede,
      })
    } else if (!isDisabled && editingContactId !== null && contactForm) {
      const savingCurrentContact = savingContactId === editingContactId
      const isNewContact = editingContactId === 'new'
      actions.push({
        id: 'anagrafica-contact-save',
        icon: cilSave,
        label: savingCurrentContact
          ? 'Salvataggio contatto...'
          : isNewContact
            ? 'Crea contatto'
            : 'Salva contatto',
        onClick: () => handleContactSave(isNewContact ? 'new' : editingContactId),
        disabled: savingCurrentContact,
      })
    }
    setBreadcrumbActions(actions)
    return () => clearBreadcrumbActions()
  }, [
    clearBreadcrumbActions,
    handleFiscalBreadcrumbSave,
    handleGeneralBreadcrumbSave,
    handleRefreshData,
    handleContactSave,
    isDisabled,
    isEditingFiscal,
    isEditingGeneral,
    loading,
    recordId,
    savingFiscal,
    savingGeneral,
    generalForm,
    fiscaleForm,
    editingSedeId,
    sedeForm,
    savingSedeId,
    contactForm,
    editingContactId,
    savingContactId,
    handleSedeSave,
    setBreadcrumbActions,
  ])

  const handleReactivateStato = async () => {
    if (!recordId) return
    setMutationError(null)
    try {
      const response = await updateAnagraficaDetail({
        token,
        id: recordId,
        kpiPeriod,
        anagrafica: { stato: 'attiva', is_active: 1 },
      })
      handleMutationSuccess(response)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
    }
  }

  const handleArchiveClick = async () => {
    if (!recordId) return
    const confirmed = window.confirm(
      "Disattivando l'anagrafica verrà archiviata e rimossa dal sistema. Vuoi continuare?",
    )
    if (!confirmed) return
    setSavingGeneral(true)
    setMutationError(null)
    try {
      await apiFetch('/anagraficheUpdate.php', {
        method: 'POST',
        token,
        body: { id: recordId, anagrafica: { is_active: 0 } },
      })
      showToast('Anagrafica archiviata', 'success')
      window.setTimeout(() => {
        navigate('/anagrafica/lista', { replace: true })
      }, 800)
    } catch (mutationErrorInstance) {
      if (mutationErrorInstance.status === 401 && logout) {
        logout()
        return
      }
      const msg = mutationErrorInstance.payload?.message || mutationErrorInstance.message
      setMutationError(msg)
      showToast(msg || 'Archiviazione non riuscita', 'error')
    } finally {
      setSavingGeneral(false)
    }
  }

  return (
    <>
      <CCard className={`anagrafica-detail ${isCompact ? 'compact' : ''}`}>
        <CCardHeader className={`sticky-card-header ${isDisabled ? 'anagrafica-disabled' : ''} d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3`}>
          <div className="d-flex flex-column gap-1">
            <div className="text-body-secondary text-uppercase small fw-semibold">
              Dettaglio anagrafica
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h2 className="h4 mb-0">
                {detail?.anagrafica?.ragione_sociale || 'Anagrafica'}
              </h2>
              {detail?.anagrafica?.stato && (
                <span>{getStatusBadge(detail.anagrafica.stato)}</span>
              )}
            </div>
            <div className="text-body-secondary small">
              {recordId
                ? `ID ${recordId}`
                : "Seleziona un record valido dalla lista per visualizzare i dettagli."}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton color="secondary" variant="outline" onClick={handleGoBack}>
              <CIcon icon={cilArrowLeft} className="me-2" /> Torna indietro
            </CButton>
            <CButton
              color="primary"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading || !recordId}
            >
              <CIcon icon={cilReload} className="me-2" /> Aggiorna
            </CButton>
            {isDisabled && recordId && (
              <CButton color="success" variant="outline" onClick={handleReactivateStato} disabled={loading}>
                Riattiva
              </CButton>
            )}
          </div>
        </CCardHeader>
        <CCardBody className={`d-flex flex-column ${isCompact ? 'gap-3' : 'gap-4'}`}>
          {isDisabled && (
            <CAlert color="warning" className="mb-0">
              Anagrafica disattivata: modifiche non consentite. Puoi solo riattivarla.
            </CAlert>
          )}

          {mutationError && (
            <CAlert color="danger" className="mb-0">
              {mutationError}
            </CAlert>
          )}

          {!recordId && (
            <CAlert color="warning" className="mb-0">
              Nessun identificativo fornito. Scegli una anagrafica dalla lista per visualizzarne i
              dettagli.
            </CAlert>
          )}

          {recordId && loading && (
            <div className="d-flex justify-content-center py-5">
              <CSpinner color="primary" />
            </div>
          )}

          {recordId && !loading && errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}

          {recordId && !loading && !errorMessage && detail && (
            <>
              <div className="d-flex flex-column flex-lg-row gap-3 align-items-start">
                <CCard style={{ flex: 6 }}>
                  <CCardBody className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <h3 className="h6 mb-0">Informazioni generali</h3>
                  {!isDisabled && (
                    !isEditingGeneral ? (
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={startGeneralEditing}
                        aria-label="Modifica informazioni generali"
                        title="Modifica"
                      >
                        <CIcon icon={cilSettings} />
                      </CButton>
                    ) : (
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={handleGeneralBreadcrumbSave}
                        disabled={savingGeneral || !generalForm}
                        aria-label="Salva informazioni generali"
                        title="Salva"
                      >
                        <CIcon icon={cilSave} />
                      </CButton>
                    )
                  )}
                </div>

                {isEditingGeneral && generalForm ? (
                  <CForm
                    onSubmit={handleGeneralSubmit}
                    className="d-flex flex-column gap-3"
                    ref={generalFormRef}
                  >
                    <CRow className="g-3">
                      <CCol md={8}>
                        <CFormLabel htmlFor="ragioneSociale">Ragione sociale</CFormLabel>
                        <CFormInput
                          id="ragioneSociale"
                          value={generalForm.ragione_sociale}
                          onChange={handleGeneralFieldChange("ragione_sociale")}
                          required
                          disabled={savingGeneral}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="piva">Partita IVA</CFormLabel>
                        <CFormInput
                          id="piva"
                          value={generalForm.piva}
                          onChange={handleGeneralFieldChange("piva")}
                          disabled={savingGeneral}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="codiceFiscale">Codice fiscale</CFormLabel>
                        <CFormInput
                          id="codiceFiscale"
                          value={generalForm.codice_fiscale}
                          onChange={handleGeneralFieldChange("codice_fiscale")}
                          disabled={savingGeneral}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="tipologia">Tipologia</CFormLabel>
                        <CFormSelect
                          id="tipologia"
                          value={
                            generalForm.id_tipologia !== null && generalForm.id_tipologia !== undefined
                              ? String(generalForm.id_tipologia)
                              : ""
                          }
                          onChange={handleGeneralFieldChange("id_tipologia")}
                          disabled={savingGeneral}
                        >
                          <option value="">Seleziona tipologia</option>
                          {tipologiaSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="categoria">Categoria</CFormLabel>
                        <CFormSelect
                          id="categoria"
                          value={generalForm.categoria ?? ""}
                          onChange={handleGeneralFieldChange("categoria")}
                          disabled={savingGeneral}
                        >
                          <option value="">Seleziona categoria</option>
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="regimeFiscale">Regime fiscale</CFormLabel>
                        <CFormSelect
                          id="regimeFiscale"
                          value={
                            generalForm.id_sdi_regime_fiscale !== null && generalForm.id_sdi_regime_fiscale !== undefined
                              ? String(generalForm.id_sdi_regime_fiscale)
                              : ""
                          }
                          onChange={handleGeneralFieldChange("id_sdi_regime_fiscale")}
                          disabled={savingGeneral}
                        >
                          <option value="">Seleziona regime fiscale</option>
                          {regimiSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="stato">Stato</CFormLabel>
                        <CFormSelect
                          id="stato"
                          value={generalForm.stato}
                          onChange={handleGeneralFieldChange("stato")}
                          disabled
                        >
                          {statoOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel htmlFor="note">Note</CFormLabel>
                        <CFormTextarea
                          id="note"
                          value={generalForm.note}
                          onChange={handleGeneralFieldChange("note")}
                          rows={4}
                          disabled={savingGeneral}
                        />
                      </CCol>
                    </CRow>
                    <CRow className="g-3">
                      <CCol lg={12} className="d-flex align-items-center justify-content-lg-end">
                        <CButton
                          color="danger"
                          variant="outline"
                          type="button"
                          onClick={handleArchiveClick}
                          disabled={savingGeneral}
                        >
                          Archivia anagrafica
                        </CButton>
                      </CCol>
                    </CRow>
                    <div className="d-flex gap-2 justify-content-end">
                      <CButton
                        color="secondary"
                        variant="outline"
                        type="button"
                        onClick={cancelGeneralEditing}
                        disabled={savingGeneral}
                      >
                        Annulla
                      </CButton>
                      <CButton color="primary" type="submit" disabled={savingGeneral}>
                        {savingGeneral ? "Salvataggio..." : "Salva modifiche"}
                      </CButton>
                    </div>
                  </CForm>
                ) : (
                  <>
                    <CRow className={gridGapClass}>
                      {generalFields.map((field) => (
                        <CCol key={field.label} md={6} xl={4}>
                          <DetailField label={field.label} value={field.value} compact={isCompact} />
                        </CCol>
                      ))}
                    </CRow>
                    {detail.anagrafica?.note && (
                      <CAlert color="info" className="mt-3 mb-0">
                        <div className="text-body-secondary text-uppercase small fw-semibold mb-2">
                          Note
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{detail.anagrafica.note}</div>
                      </CAlert>
                    )}
                  </>
                )}
                  </CCardBody>
                </CCard>

                <CCard style={{ flex: 4 }}>
                  <CCardBody className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <h3 className="h6 mb-0">Dati fiscali</h3>
                      {!isDisabled && (
                        !isEditingFiscal ? (
                          <CButton
                            color="secondary"
                            variant="outline"
                            size="sm"
                            onClick={startFiscalEditing}
                            aria-label="Modifica dati fiscali"
                            title="Modifica"
                          >
                            <CIcon icon={cilSettings} />
                          </CButton>
                        ) : (
                          <CButton
                            color="primary"
                            size="sm"
                            onClick={handleFiscalBreadcrumbSave}
                            disabled={savingFiscal || !fiscaleForm}
                            aria-label="Salva dati fiscali"
                            title="Salva"
                          >
                            <CIcon icon={cilSave} />
                          </CButton>
                        )
                      )}
                    </div>

                    {isEditingFiscal && fiscaleForm ? (
                      <CForm
                        onSubmit={handleFiscalSubmit}
                        className="d-flex flex-column gap-3"
                        ref={fiscalFormRef}
                      >
                        <CRow className="g-3">
                          <CCol md={4}>
                            <CFormLabel htmlFor="pec">PEC</CFormLabel>
                            <CFormInput
                              id="pec"
                              type="email"
                              value={fiscaleForm.pec}
                              onChange={handleFiscalFieldChange("pec")}
                              disabled={savingFiscal || isDisabled}
                            />
                          </CCol>
                          <CCol md={4}>
                            <CFormLabel htmlFor="codiceSdi">Codice SDI</CFormLabel>
                            <CFormInput
                              id="codiceSdi"
                              value={fiscaleForm.codice_sdi}
                              onChange={handleFiscalFieldChange("codice_sdi")}
                              disabled={savingFiscal || isDisabled}
                            />
                          </CCol>
                          <CCol md={4}>
                            <CFormLabel htmlFor="iban">IBAN</CFormLabel>
                            <CFormInput
                              id="iban"
                              value={fiscaleForm.iban}
                              onChange={handleFiscalFieldChange("iban")}
                              disabled={savingFiscal || isDisabled}
                            />
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel htmlFor="banca">Banca</CFormLabel>
                            <CFormInput
                              id="banca"
                              value={fiscaleForm.banca}
                              onChange={handleFiscalFieldChange("banca")}
                              disabled={savingFiscal || isDisabled}
                            />
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel htmlFor="splitPay">Split PAY</CFormLabel>
                            <CFormSelect
                              id="splitPay"
                              value={fiscaleForm.split_pay ?? ""}
                              onChange={handleFiscalFieldChange("split_pay")}
                              disabled={savingFiscal || isDisabled}
                            >
                              <option value="">Seleziona</option>
                              <option value="1">Si</option>
                              <option value="0">No</option>
                            </CFormSelect>
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel htmlFor="modalitaPagamento">Modalita di pagamento</CFormLabel>
                            <CFormSelect
                              id="modalitaPagamento"
                              value={fiscaleForm.modalita_pagamento ?? ""}
                              onChange={handleFiscalFieldChange("modalita_pagamento")}
                              disabled={savingFiscal || isDisabled || modalitaLoading}
                            >
                              <option value="">Seleziona una modalità</option>
                              {modalitaSelectOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                              {fiscaleForm.modalita_pagamento &&
                                fiscaleForm.modalita_pagamento !== "" &&
                                !modalitaSelectOptions.some((option) => option.value === fiscaleForm.modalita_pagamento) && (
                                  <option key="external-modalita" value={fiscaleForm.modalita_pagamento}>
                                    {fiscaleForm.modalita_pagamento}
                                  </option>
                                )}
                            </CFormSelect>
                            {modalitaLoading && (
                              <div className="form-text text-body-secondary">Caricamento modalità.</div>
                            )}
                            {modalitaError && !modalitaLoading && (
                              <div className="form-text text-danger">
                                Impossibile caricare le modalità: {modalitaError.message || "errore sconosciuto"}
                              </div>
                            )}
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel htmlFor="sezionaleFattura">Sezionale fattura</CFormLabel>
                            <CFormSelect
                              id="sezionaleFattura"
                              value={fiscaleForm.id_sezionale ?? ""}
                              onChange={handleFiscalFieldChange("id_sezionale")}
                              disabled={savingFiscal || isDisabled || modalitaLoading || sezionaliOptions.length === 0}
                            >
                              <option value="">Seleziona sezionale</option>
                              {sezionaliOptions.map((option) => (
                                <option key={option.id_sezionale} value={option.id_sezionale}>
                                  {option.code
                                    ? `${option.code} - ${option.label}`
                                    : option.label || option.id_sezionale}
                                </option>
                              ))}
                            </CFormSelect>
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel htmlFor="idCondPagamento">Condizioni di pagamento</CFormLabel>
                            <CFormSelect
                              id="idCondPagamento"
                              value={fiscaleForm.id_cond_pagamento}
                              onChange={handleFiscalFieldChange("id_cond_pagamento")}
                              disabled={savingFiscal || isDisabled || paymentTermsLoading}
                            >
                              <option value="">Seleziona una condizione</option>
                              {paymentTermOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </CFormSelect>
                            {paymentTermsLoading && (
                              <div className="form-text text-body-secondary">Caricamento condizioni…</div>
                            )}
                            {paymentTermsError && !paymentTermsLoading && (
                              <div className="form-text text-danger">
                                Impossibile caricare le condizioni: {paymentTermsError.message || "errore sconosciuto"}
                              </div>
                            )}
                            {currentPaymentTermSelection?.description && (
                              <div className="form-text">{currentPaymentTermSelection.description}</div>
                            )}
                          </CCol>
                          <CCol xs={12}>
                            <CFormLabel htmlFor="altriDati">Altri dati</CFormLabel>
                            <CFormTextarea
                              id="altriDati"
                              rows={4}
                              value={fiscaleForm.altri_dati}
                              onChange={handleFiscalFieldChange("altri_dati")}
                              disabled={savingFiscal || isDisabled}
                            />
                          </CCol>
                        </CRow>
                        <div className="d-flex gap-2 justify-content-end">
                          <CButton color="secondary" variant="outline" type="button" onClick={cancelFiscalEditing} disabled={savingFiscal || isDisabled}>
                            Annulla
                          </CButton>
                          <CButton color="primary" type="submit" disabled={savingFiscal || isDisabled}>
                            {savingFiscal ? "Salvataggio..." : "Salva modifiche"}
                          </CButton>
                        </div>
                      </CForm>
                    ) : (
                      <>
                        {fiscaleFields.length > 0 ? (
                        <CRow className="g-3">
                          {fiscaleFields.map((field) => {
                            const colProps = field.fullWidth
                              ? { xs: 12, md: 12 }
                              : { md: 6, xl: 4 }
                            return (
                              <CCol key={field.label} {...colProps}>
                                <DetailField label={field.label} value={field.value} compact={isCompact} />
                              </CCol>
                            )
                          })}
                        </CRow>
                        ) : (
                          <CAlert color="info" className="mb-0">
                            Nessun dato fiscale registrato per questa anagrafica.
                          </CAlert>
                        )}
                        {detail.fiscale?.altri_dati && (
                          <CAlert color="secondary" className="mt-3 mb-0">
                            <div className="text-body-secondary text-uppercase small fw-semibold mb-2">Altri dati</div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{detail.fiscale.altri_dati}</div>
                          </CAlert>
                        )}
                      </>
                    )}
                  </CCardBody>
                </CCard>
              </div>

              {/* Contatti archiviati: ora visibili nel selettore della sezione Contatti */}
              <div className="d-flex flex-column flex-lg-row gap-3 align-items-start">
                <CCard style={{ flex: 1 }}>
                  <CCardBody className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <h3 className="h6 mb-0">Sedi</h3>
                  {!editingSedeId && !isDisabled && (
                    <CButton color="primary" variant="outline" size="sm" onClick={handleSedeCreate}>
                      Nuova sede
                    </CButton>
                  )}
                </div>
                {sedi.length > 0 || editingSedeId === "new" ? (
                  <CAccordion alwaysOpen flush>
                    {sedeAccordionItems.map((sede, index) => {
                      const isNewRow = sede.id_sede === "new"
                      const rowKey = isNewRow ? "new-sede" : String(sede.id_sede ?? index)
                      const isEditing =
                        editingSedeId === "new" ? isNewRow : editingSedeId === sede.id_sede
                      const isSaving = isEditing && savingSedeId === editingSedeId
                      const sedeData = isNewRow ? null : sede
                      const fullAddress = sedeData ? formatSedeAddress(sedeData) : "-"
                      const tipoRaw =
                        (isEditing && sedeForm ? sedeForm.id_tipo : null) ??
                        (sedeData ? sedeData.id_tipo : null)
                      const tipoLabel = tipoRaw
                        ? tipologieSediLookupMap.get(String(tipoRaw)) ?? `ID ${tipoRaw}`
                        : isEditing
                          ? "Tipo non selezionato"
                          : "Tipo non definito"

                      return (
                        <CAccordionItem
                          itemKey={rowKey}
                          key={rowKey}
                          className="border rounded-3 border-secondary mb-3"
                        >
                          <CAccordionHeader className="px-3 py-2">
                            <div className="d-flex flex-column gap-1 w-100">
                              <div className="d-flex justify-content-between align-items-start gap-3">
                                <div>
                                  <span className="fw-semibold">{sedeData?.denominazione || "Nuova sede"}</span>
                                  <span className="text-body-secondary small ms-2">
                                    {sedeData ? `ID ${sedeData.id_sede}` : "In creazione"}
                                  </span>
                                </div>
                                <span className="text-body-secondary small">{tipoLabel}</span>
                              </div>
                              <span className="text-body-secondary small">{fullAddress}</span>
                            </div>
                          </CAccordionHeader>
                          <CAccordionBody className="px-3 py-3">
                            {isEditing && sedeForm ? (
                              <div className="d-flex flex-column gap-3">
                                <CRow className="g-3">
                                  <CCol md={6}>
                                    <CFormLabel>Denominazione</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.denominazione}
                                      onChange={handleSedeFieldChange("denominazione")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                  <CCol md={6}>
                                    <CFormLabel>Tipo</CFormLabel>
                                    <CFormSelect
                                      value={
                                        sedeForm.id_tipo !== null && sedeForm.id_tipo !== undefined
                                          ? String(sedeForm.id_tipo)
                                          : ""
                                      }
                                      onChange={handleSedeFieldChange("id_tipo")}
                                      disabled={isSaving || isDisabled}
                                    >
                                      <option value="">Seleziona tipo</option>
                                      {tipologieSediSelectOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </CFormSelect>
                                  </CCol>
                                </CRow>
                                <CRow className="g-3">
                                  <CCol md={8}>
                                    <CFormLabel>Indirizzo</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.indirizzo}
                                      onChange={handleSedeFieldChange("indirizzo")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                  <CCol md={4}>
                                    <CFormLabel>Civico</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.civico}
                                      onChange={handleSedeFieldChange("civico")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                </CRow>
                                <CRow className="g-3">
                                  <CCol md={3}>
                                    <CFormLabel>CAP</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.cap}
                                      onChange={handleSedeFieldChange("cap")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                  <CCol md={3}>
                                    <CFormLabel>Comune</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.comune}
                                      onChange={handleSedeFieldChange("comune")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                  <CCol md={3}>
                                    <CFormLabel>Provincia</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.provincia}
                                      onChange={handleSedeFieldChange("provincia")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </CCol>
                                  <CCol md={3}>
                                    <CFormLabel>Nazione</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.nazione_iso2}
                                      onChange={handleSedeFieldChange("nazione_iso2")}
                                      disabled={isSaving || isDisabled}
                                      maxLength={2}
                                    />
                                  </CCol>
                                </CRow>
                                <div>
                                  <CFormLabel>Note</CFormLabel>
                                  <CFormTextarea
                                    value={sedeForm.note}
                                    onChange={handleSedeFieldChange("note")}
                                    rows={2}
                                    disabled={isSaving || isDisabled}
                                  />
                                </div>
                                <div className="d-flex gap-2 justify-content-end">
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={handleSedeCancel}
                                    disabled={isSaving || isDisabled}
                                  >
                                    Annulla
                                  </CButton>
                                  {!isNewRow && sedeData && (
                                    <CButton
                                      color="danger"
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      onClick={() => handleSedeDelete(sedeData.id_sede)}
                                      disabled={isSaving || isDisabled || savingSedeId === sedeData.id_sede}
                                    >
                                      {savingSedeId === sedeData.id_sede ? "Eliminazione..." : "Elimina"}
                                    </CButton>
                                  )}
                                  <CButton
                                    color="primary"
                                    size="sm"
                                    type="button"
                                    onClick={handleSedeSave}
                                    disabled={isSaving || isDisabled}
                                  >
                                    {isSaving ? "Salvataggio..." : "Salva"}
                                  </CButton>
                                </div>
                              </div>
                            ) : (
                              <div className="d-flex flex-column gap-3">
                                <CRow className="g-3">
                                  <CCol md={12}>
                                    <div className="text-body-secondary text-uppercase small mb-1">Indirizzo</div>
                                    <div className="fw-semibold">
                                      {[sedeData?.indirizzo, sedeData?.civico]
                                        .filter(Boolean)
                                        .join(" ")
                                        .trim() || "-"}
                                    </div>
                                  </CCol>
                                </CRow>
                                <CRow className="g-3">
                                  <CCol md={3}>
                                    <div className="text-body-secondary text-uppercase small mb-1">CAP</div>
                                    <div>{sedeData?.cap || "-"}</div>
                                  </CCol>
                                  <CCol md={3}>
                                    <div className="text-body-secondary text-uppercase small mb-1">Comune</div>
                                    <div>{sedeData?.comune || "-"}</div>
                                  </CCol>
                                  <CCol md={3}>
                                    <div className="text-body-secondary text-uppercase small mb-1">Provincia</div>
                                    <div>{sedeData?.provincia || "-"}</div>
                                  </CCol>
                                  <CCol md={3}>
                                    <div className="text-body-secondary text-uppercase small mb-1">Nazione</div>
                                    <div>{sedeData?.nazione_iso2 || "-"}</div>
                                  </CCol>
                                </CRow>
                                <div>
                                  <div className="text-body-secondary text-uppercase small mb-1">Note</div>
                                  <div style={{ whiteSpace: "pre-wrap" }}>
                                    {renderValue(sedeData?.note)}
                                  </div>
                                </div>
                                <div className="d-flex gap-2 justify-content-end">
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSedeEdit(sedeData)}
                                    disabled={isDisabled || Boolean(editingSedeId) || savingSedeId === sedeData?.id_sede}
                                  >
                                    Modifica
                                  </CButton>
                                  <CButton
                                    color="danger"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSedeDelete(sedeData?.id_sede)}
                                    disabled={isDisabled || Boolean(editingSedeId) || savingSedeId === sedeData?.id_sede}
                                  >
                                    {savingSedeId === sedeData?.id_sede ? "Eliminazione..." : "Elimina"}
                                  </CButton>
                                </div>
                              </div>
                            )}
                          </CAccordionBody>
                        </CAccordionItem>
                      )
                    })}
                  </CAccordion>
                ) : (
                  <CAlert color="info" className="mb-0">
                    Nessuna sede registrata per questa anagrafica.
                  </CAlert>
                )}
                  </CCardBody>
                </CCard>
                <CCard style={{ flex: 1 }}>
                  <CCardBody className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <h3 className="h6 mb-0">Contatti</h3>
                  <div className="d-flex gap-2 align-items-center">
                    {contactsView === 'associati' && !editingContactId && (
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        onClick={handleContactCreate}
                        disabled={savingContactId !== null || isEditingGeneral || isEditingFiscal}
                      >
                        Nuovo contatto
                      </CButton>
                    )}
                    <CFormSelect size="sm" value={contactsView} onChange={(e) => setContactsView(e.target.value)}>
                      <option value="associati">Associati</option>
                      <option value="archiviati">Archiviati</option>
                    </CFormSelect>
                  </div>
                </div>
                {contactsView === 'associati' ? (
                  (contatti.length > 0 || editingContactId === 'new') ? (
                    <div className="d-flex flex-column gap-3">
                      {editingContactId === 'new' && contactForm && renderContactFormCard({ isNew: true })}
                      {editingContactId && editingContact && editingContactId !== 'new' && contactForm && (
                        renderContactFormCard({ isNew: false, contact: editingContact })
                      )}
                      {contattiGrouped.map((group) => {
                        const visibleItems = group.items.filter((contact) => editingContactId !== contact.id_contatto)
                        if (visibleItems.length === 0) {
                          return null
                        }
                        return (
                          <div key={`group-${group.key}`} className="border border-1 rounded-3 p-3 bg-body">
                            <div className="text-body-secondary small text-uppercase fw-semibold mb-3">
                              {group.label}
                            </div>
                            <CAccordion flush alwaysOpen>
                              {visibleItems.map((contatto) => renderContactAccordionItem(contatto, group.label))}
                            </CAccordion>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <CAlert color="info" className="mb-0">Nessun contatto associato.</CAlert>
                  )
                ) : (
                  contattiArchGrouped.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {contattiArchGrouped.map((group) => (
                        <div key={`arch-group-${group.key}`} className="border border-1 rounded-3 p-3 bg-body">
                          <div className="text-body-secondary small text-uppercase fw-semibold mb-3">
                            {group.label}
                          </div>
                          <CAccordion flush alwaysOpen>
                            {group.items.map((contatto) => renderArchivedContactAccordionItem(contatto, group.label))}
                          </CAccordion>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <CAlert color="info" className="mb-0">Nessun contatto archiviato.</CAlert>
                  )
                )}
                  </CCardBody>
                </CCard>
              </div>

              <section>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 mb-0">Contratti</h3>
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate('/contratti/crea', {
                        state: {
                          prefill: {
                            id_anagrafica: detail?.anagrafica?.id_anagrafica ?? recordId,
                            ragione_sociale: detail?.anagrafica?.ragione_sociale ?? null,
                          },
                        },
                      })
                    }
                    disabled={isDisabled}
                  >
                    <CIcon icon={cilPlus} className="me-2" /> Nuovo contratto
                  </CButton>
                </div>
                {contratti.length > 0 ? (
                  <CTable data-testid="table" hover responsive size="sm">
                    <CTableHead color="dark">
                      <CTableRow>
                        <CTableHeaderCell scope="col">Titolo</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Codice</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Inizio</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Fine</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-center">Rinnovo</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-center">Attivo</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-end">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {contratti.map((c) => (
                        <CTableRow key={c.id_contratto}>
                          <CTableDataCell>{c.titolo}</CTableDataCell>
                          <CTableDataCell>{c.codice || '-'}</CTableDataCell>
                          <CTableDataCell>{formatDate(c.data_inizio)}</CTableDataCell>
                          <CTableDataCell>{formatDate(c.data_fine)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {Number(c.rinnovo_automatico) === 1 ? <CBadge color="primary">Si</CBadge> : <span className="text-body-secondary">No</span>}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {Number(c.attivo) === 1 ? <CBadge color="success">Si</CBadge> : <span className="text-body-secondary">No</span>}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              color="link"
                              size="sm"
                              className="p-0"
                              onClick={() => navigate(`/contratti/dettagli?id=${c.id_contratto}`)}
                            >
                              <CIcon icon={cilDescription} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                ) : (
                  <CAlert color="info" className="mb-0">Nessun contratto disponibile.</CAlert>
                )}
              </section>

              <section>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 mb-0">Preventivi correlati</h3>
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/preventivi/crea')}
                    disabled={isDisabled}
                  >
                    <CIcon icon={cilPlus} className="me-2" /> Nuovo preventivo
                  </CButton>
                </div>
                {totalPreventivi > 0 ? (
                  <>
                    <CTable data-testid="table" hover responsive size="sm">
                      <CTableHead color="dark">
                        <CTableRow className="align-middle">
                          <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Totale imponibile</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Totale IVA</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Totale</CTableHeaderCell>
                          <CTableHeaderCell scope="col" className="text-center">Stato</CTableHeaderCell>
                          <CTableHeaderCell scope="col" className="text-center">Azioni</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {paginatedPreventivi.map((preventivo, idx) => (
                          <CTableRow key={preventivo.id_preventivo ?? idx}>
                            <CTableDataCell>
                              {preventivo.anno_preventivo}/{preventivo.numero_documento}
                            </CTableDataCell>
                            <CTableDataCell>{formatDate(preventivo.data_preventivo)}</CTableDataCell>
                            <CTableDataCell>{formatCurrency(preventivo.totale_imponibile)}</CTableDataCell>
                            <CTableDataCell>{formatCurrency(preventivo.totale_iva)}</CTableDataCell>
                            <CTableDataCell>{formatCurrency(preventivo.totale)}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              {preventivo.stato_label ? (
                                <CBadge color="secondary">{preventivo.stato_label}</CBadge>
                              ) : (
                                <span className="text-body-secondary">-</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <div className="d-inline-flex gap-2">
                                <CButton
                                  color="link"
                                  size="sm"
                                  className="p-0"
                                  onClick={() => handleViewPreventivo(preventivo.id_preventivo)}
                                  disabled={isDisabled}
                                >
                                  <CIcon icon={cilDescription} />
                                </CButton>
                                <CButton
                                  color="link"
                                  size="sm"
                                  className="p-0"
                                  onClick={() => { /* email no-op */ }}
                                  disabled={isDisabled}
                                >
                                  <CIcon icon={cilEnvelopeClosed} />
                                </CButton>
                                <CButton
                                  color="link"
                                  size="sm"
                                  className="p-0"
                                  onClick={() => { /* pdf no-op */ }}
                                  disabled={isDisabled}
                                >
                                  <CIcon icon={cilPrint} />
                                </CButton>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>

                    {totalPreventiviPages > 1 && (
                      <div className="d-flex justify-content-end mt-2">
                        <CSmartPagination
                          size="sm"
                          align="end"
                          pages={totalPreventiviPages}
                          activePage={preventiviPage + 1}
                          onActivePageChange={(page) => setPreventiviPage(Math.max(page - 1, 0))}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <CAlert color="info" className="mb-0">Nessun preventivo disponibile.</CAlert>
                )}
              </section>

              <section>
                <h3 className="h6 mb-3">DDT correlati</h3>
                {latestDdt.length > 0 ? (
                  <>
                    <CTable data-testid="table" hover responsive size="sm">
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Tot. pezzi</CTableHeaderCell>
                          <CTableHeaderCell scope="col">Tot. peso (kg)</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {paginatedDdt.map((documento) => {
                          const pezziValue = Number(documento.totale_pezzi)
                          const pezziDisplay = Number.isFinite(pezziValue)
                            ? pezziValue
                            : documento.totale_pezzi ?? "-"
                          const pesoValue = Number(documento.totale_peso_kg)
                          const pesoDisplay = Number.isFinite(pesoValue) ? pesoValue.toFixed(3) : "-"

                          return (
                            <CTableRow key={documento.id_ddt}>
                              <CTableDataCell>
                                {documento.anno}/{documento.numero_documento}
                              </CTableDataCell>
                              <CTableDataCell>{formatDate(documento.data_ddt)}</CTableDataCell>
                              <CTableDataCell>{pezziDisplay}</CTableDataCell>
                              <CTableDataCell>{pesoDisplay}</CTableDataCell>
                            </CTableRow>
                          )
                        })}
                      </CTableBody>
                    </CTable>
                    {totalDdtPages > 1 && (
                      <div className="d-flex justify-content-end mt-2">
                        <CSmartPagination
                          size="sm"
                          align="end"
                          pages={totalDdtPages}
                          activePage={ddtPage + 1}
                          onActivePageChange={(page) => setDdtPage(Math.max(page - 1, 0))}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <CAlert color="info" className="mb-0">
                    Nessun DDT disponibile.
                  </CAlert>
                )}
              </section>

                <section>
                  <h3 className="h6 mb-3">Fatture correlate</h3>
                  {latestFatture.length > 0 ? (
                    <>
                      <CTable data-testid="table" hover responsive size="sm">
                        <CTableHead className="mp-table-head">
                          <CTableRow>
                            <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Totale imponibile</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Totale IVA</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Totale</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Saldo</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Stato</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {paginatedFatture.map((fattura) => (
                            <CTableRow key={fattura.id_fattura}>
                              <CTableDataCell>
                                {fattura.anno}/{fattura.numero_documento}
                              </CTableDataCell>
                              <CTableDataCell>{formatDate(fattura.data_fattura)}</CTableDataCell>
                              <CTableDataCell>{formatCurrency(fattura.totale_imponibile)}</CTableDataCell>
                              <CTableDataCell>{formatCurrency(fattura.totale_iva)}</CTableDataCell>
                              <CTableDataCell>{formatCurrency(fattura.totale)}</CTableDataCell>
                              <CTableDataCell>{formatCurrency(fattura.saldo)}</CTableDataCell>
                              <CTableDataCell>
                                {fattura.stato_label ? (
                                  <CBadge color="secondary">{fattura.stato_label}</CBadge>
                                ) : (
                                  <span className="text-body-secondary">-</span>
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                      {totalFatturePages > 1 && (
                        <div className="d-flex justify-content-end mt-2">
                          <CSmartPagination
                            size="sm"
                            align="end"
                            pages={totalFatturePages}
                            activePage={fatturePage + 1}
                            onActivePageChange={(page) => setFatturePage(Math.max(page - 1, 0))}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                  <CAlert color="info" className="mb-0">
                    Nessuna fattura disponibile.
                  </CAlert>
                )}
              </section>
            </>
          )}
        </CCardBody>
      </CCard>
      <BottomToast open={toast.open} type={toast.type} message={toast.message} />
    </>
  )
}

export default AnagraficaDetail



