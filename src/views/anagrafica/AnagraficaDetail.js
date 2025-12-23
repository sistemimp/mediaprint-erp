/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  CAlert,
  CBadge,
  CButton,
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
  CPagination,
  CPaginationItem,
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

import { fetchAnagraficaDetail, updateAnagraficaDetail } from "../../services/anagrafiche"
import { apiFetch } from "../../services/apiClient"
import { fetchPaymentTerms } from "../../services/paymentTerms"
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

const formatInteger = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-"
  }
  return Number(value).toLocaleString("it-IT")
}

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-"
  }
  return `${Number(value).toFixed(1)}%`
}

const toNumberOrZero = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
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

const renderBooleanBadge = (value) =>
  Number(value) === 1 ? (
    <CBadge color="primary">Si</CBadge>
  ) : (
    <span className="text-body-secondary">No</span>
  )

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
  id_tipologia: anagrafica?.id_tipologia ?? "",
  id_sdi_regime_fiscale: anagrafica?.id_sdi_regime_fiscale ?? "",
  is_pa: Number(anagrafica?.is_pa) === 1,
  is_active: Number(anagrafica?.is_active) === 1,
  stato: anagrafica?.stato ?? "attiva",
})

const createFiscalForm = (fiscale) => ({
  pec: fiscale?.pec ?? "",
  codice_sdi: fiscale?.codice_sdi ?? "",
  iban: fiscale?.iban ?? "",
  banca: fiscale?.banca ?? "",
  id_cond_pagamento: fiscale?.id_cond_pagamento ?? "",
  modalita_pagamento: fiscale?.modalita_pagamento ?? "",
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

const KPI_PERIOD_OPTIONS = [
  { value: 'all', label: 'Tutti' },
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Ultimo anno' },
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

  const [mutationError, setMutationError] = useState(null)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })
  const [kpiPeriod, setKpiPeriod] = useState('all')

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
  const currentPaymentTermSelection =
    fiscaleForm && fiscaleForm.id_cond_pagamento !== "" && fiscaleForm.id_cond_pagamento !== undefined && fiscaleForm.id_cond_pagamento !== null
      ? paymentTermsMap.get(String(fiscaleForm.id_cond_pagamento))
      : null

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
    setFiscaleForm((current) => ({
      ...current,
      [field]: event.target.value,
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
      id_cond_pagamento:
        fiscaleForm.id_cond_pagamento === "" ? null : Number(fiscaleForm.id_cond_pagamento),
      modalita_pagamento: fiscaleForm.modalita_pagamento,
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
  const PREVENTIVI_ROWS_PER_PAGE = 5
  const latestPreventivi = useMemo(() => {
    const sorted = [...preventivi].sort((a, b) => {
      const ad = new Date(a?.data_preventivo || a?.created_at || 0).getTime()
      const bd = new Date(b?.data_preventivo || b?.created_at || 0).getTime()
      return bd - ad
    })
    return sorted.slice(0, 10)
  }, [preventivi])
  const totalPreventivi = latestPreventivi.length
  const totalPreventiviPages = Math.max(Math.ceil(totalPreventivi / PREVENTIVI_ROWS_PER_PAGE), 1)
  const paginatedPreventivi = useMemo(() => {
    const start = preventiviPage * PREVENTIVI_ROWS_PER_PAGE
    return latestPreventivi.slice(start, start + PREVENTIVI_ROWS_PER_PAGE)
  }, [latestPreventivi, preventiviPage])
  const preventiviPaginationItems = useMemo(() => {
    const items = []
    for (let p = 1; p <= totalPreventiviPages; p += 1) items.push(p)
    return items
  }, [totalPreventiviPages])
  const handleViewPreventivo = (id) => {
    if (!id) return
    navigate(`/preventivi/dettagli?id=${id}`)
  }
  const ddt = detail?.ddt ?? []
  const fatture = detail?.fatture ?? []
  const [contactsView, setContactsView] = useState('associati')

  const kpiCutoffTimestamp = useMemo(() => {
    if (kpiPeriod === 'all') {
      return null
    }
    const now = new Date()
    if (kpiPeriod === 'month') {
      now.setMonth(now.getMonth() - 1)
    } else if (kpiPeriod === 'quarter') {
      now.setMonth(now.getMonth() - 3)
    } else if (kpiPeriod === 'semester') {
      now.setMonth(now.getMonth() - 6)
    } else if (kpiPeriod === 'year') {
      now.setFullYear(now.getFullYear() - 1)
    }
    return now.getTime()
  }, [kpiPeriod])

  const filteredPreventivi = useMemo(() => {
    if (!kpiCutoffTimestamp) {
      return preventivi
    }
    return preventivi.filter((row) => {
      const info = normalizeDocumentDate(row, 'data_preventivo', 'created_at')
      return info ? info.ts >= kpiCutoffTimestamp : false
    })
  }, [preventivi, kpiCutoffTimestamp])

  const filteredFatture = useMemo(() => {
    if (!kpiCutoffTimestamp) {
      return fatture
    }
    return fatture.filter((row) => {
      const info = normalizeDocumentDate(row, 'data_fattura', 'created_at')
      return info ? info.ts >= kpiCutoffTimestamp : false
    })
  }, [fatture, kpiCutoffTimestamp])

  const filteredDdt = useMemo(() => {
    if (!kpiCutoffTimestamp) {
      return ddt
    }
    return ddt.filter((row) => {
      const info = normalizeDocumentDate(row, 'data_ddt', 'created_at')
      return info ? info.ts >= kpiCutoffTimestamp : false
    })
  }, [ddt, kpiCutoffTimestamp])

  const kpiData = detail?.kpi ?? null
  const computedFatturatoTotale = useMemo(
    () => filteredFatture.reduce((sum, fattura) => sum + toNumberOrZero(fattura?.totale), 0),
    [filteredFatture],
  )
  const computedSaldoTotale = useMemo(
    () => filteredFatture.reduce((sum, fattura) => sum + toNumberOrZero(fattura?.saldo), 0),
    [filteredFatture],
  )
  const fattureCount = kpiData?.fatture?.count ?? filteredFatture.length
  const preventiviCount = kpiData?.preventivi?.count ?? filteredPreventivi.length
  const ddtCount = kpiData?.ddt?.count ?? filteredDdt.length
  const fatturatoTotale =
    kpiData?.fatture?.totale !== undefined && kpiData?.fatture?.totale !== null
      ? toNumberOrZero(kpiData.fatture.totale)
      : computedFatturatoTotale
  const saldoTotale =
    kpiData?.fatture?.saldo !== undefined && kpiData?.fatture?.saldo !== null
      ? toNumberOrZero(kpiData.fatture.saldo)
      : computedSaldoTotale
  const conversioneFatture = preventiviCount > 0 ? (fattureCount / preventiviCount) * 100 : 0
  const lastDocument = useMemo(() => {
    let latest = null
    const consider = (type, row, dateField, fallbackField) => {
      const info = normalizeDocumentDate(row, dateField, fallbackField)
      if (!info) return
      if (!latest || info.ts > latest.ts) {
        latest = { type, ts: info.ts, raw: info.raw }
      }
    }

    filteredFatture.forEach((row) => consider('Fattura', row, 'data_fattura', 'created_at'))
    filteredDdt.forEach((row) => consider('DDT', row, 'data_ddt', 'created_at'))
    filteredPreventivi.forEach((row) => consider('Preventivo', row, 'data_preventivo', 'created_at'))

    return latest
  }, [filteredFatture, filteredDdt, filteredPreventivi])

  const kpiPeriodLabel = useMemo(
    () => KPI_PERIOD_OPTIONS.find((option) => option.value === kpiPeriod)?.label ?? 'Tutti',
    [kpiPeriod],
  )

  const kpiCards = useMemo(
    () => [
      { key: 'fatturato', label: 'Fatturato', value: formatCurrency(fatturatoTotale) },
      { key: 'saldo', label: 'Saldo aperto', value: formatCurrency(saldoTotale) },
      { key: 'preventivi', label: 'Preventivi', value: formatInteger(preventiviCount) },
      { key: 'fatture', label: 'Fatture', value: formatInteger(fattureCount) },
      { key: 'ddt', label: 'DDT', value: formatInteger(ddtCount) },
    ],
    [fatturatoTotale, saldoTotale, preventiviCount, fattureCount, ddtCount],
  )

  const lastDocumentLabel =
    kpiData?.last_document?.date
      ? `${kpiData.last_document.type || 'Documento'} (${formatDate(kpiData.last_document.date)})`
      : (lastDocument ? `${lastDocument.type} (${formatDate(lastDocument.raw)})` : '-')

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
      { label: "ID tipologia", value: anagrafica.id_tipologia },
      { label: "ID regime fiscale", value: anagrafica.id_sdi_regime_fiscale },
      { label: "Pubblica amministrazione", value: Number(anagrafica.is_pa) === 1 ? "Si" : "No" },
      { label: "Attiva", value: Number(anagrafica.is_active) === 1 ? "Si" : "No" },
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

    return [
      { label: "PEC", value: fiscale.pec },
      { label: "Codice SDI", value: fiscale.codice_sdi },
      { label: "IBAN", value: fiscale.iban },
      { label: "Banca", value: fiscale.banca },
      { label: "Modalita di pagamento", value: fiscale.modalita_pagamento },
      {
        label: "Condizioni di pagamento",
        value: paymentTerm?.label ?? "-",
      },
      { label: "ID condizione pagamento", value: fiscale.id_cond_pagamento },
    ]
  }, [detail, paymentTermsMap])
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
        <div className="d-flex flex-column">
          <h2 className="h5 mb-1">Dettaglio anagrafica</h2>
          <div className="d-flex flex-wrap align-items-center gap-2 text-body-secondary">
            <span className="mb-0">
              {recordId
                ? `ID ${recordId}`
                : "Seleziona un record valido dalla lista per visualizzare i dettagli."}
            </span>
            {detail?.anagrafica?.ragione_sociale && (
              <span className="text-body fw-semibold">· {detail.anagrafica.ragione_sociale}</span>
            )}
            {detail?.anagrafica?.stato && (
              <span>{getStatusBadge(detail.anagrafica.stato)}</span>
            )}
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
            <section className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <h3 className="h6 mb-0">KPI cliente</h3>
                <CFormSelect
                  size="sm"
                  value={kpiPeriod}
                  onChange={(event) => setKpiPeriod(event.target.value)}
                  aria-label="Selettore periodo KPI cliente"
                  style={{ minWidth: 180 }}
                >
                  {KPI_PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="text-body-secondary small">Periodo: {kpiPeriodLabel}</div>
              <CRow className="g-3">
                {kpiCards.map((card) => (
                  <CCol key={card.key} sm={6} lg={3}>
                    <CCard className="h-100 border-0 shadow-sm">
                      <CCardBody>
                        <div className="text-body-secondary text-uppercase small fw-semibold">{card.label}</div>
                        <div className="fs-4 fw-semibold mt-2">{card.value}</div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                ))}
              </CRow>
              <CRow className="g-2">
                <CCol md={6}>
                  <DetailField label="Conversione fatture/preventivi" value={formatPercent(conversioneFatture)} compact />
                </CCol>
                <CCol md={6}>
                  <DetailField label="Ultimo documento" value={lastDocumentLabel} compact />
                </CCol>
              </CRow>
            </section>

            <section className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <h3 className="h6 mb-0">Informazioni generali</h3>
                {!isEditingGeneral && !isDisabled && (
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={startGeneralEditing}
                  >
                    Modifica
                  </CButton>
                )}
              </div>

              {isEditingGeneral && generalForm ? (
                <CForm
                  onSubmit={handleGeneralSubmit}
                  className="d-flex flex-column gap-3"
                  ref={generalFormRef}
                >
                  <CRow className={gridGapClass}>
                    <CCol md={6}>
                      <CFormLabel htmlFor="ragioneSociale">Ragione sociale</CFormLabel>
                      <CFormInput
                        id="ragioneSociale"
                        value={generalForm.ragione_sociale}
                        onChange={handleGeneralFieldChange("ragione_sociale")}
                        required
                        disabled={savingGeneral}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel htmlFor="piva">Partita IVA</CFormLabel>
                      <CFormInput
                        id="piva"
                        value={generalForm.piva}
                        onChange={handleGeneralFieldChange("piva")}
                        disabled={savingGeneral}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel htmlFor="codiceFiscale">Codice fiscale</CFormLabel>
                      <CFormInput
                        id="codiceFiscale"
                        value={generalForm.codice_fiscale}
                        onChange={handleGeneralFieldChange("codice_fiscale")}
                        disabled={savingGeneral}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel htmlFor="tipologia">ID tipologia</CFormLabel>
                      <CFormInput
                        id="tipologia"
                        type="number"
                        value={generalForm.id_tipologia}
                        onChange={handleGeneralFieldChange("id_tipologia")}
                        disabled={savingGeneral}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel htmlFor="regimeFiscale">ID regime fiscale</CFormLabel>
                      <CFormInput
                        id="regimeFiscale"
                        type="number"
                        value={generalForm.id_sdi_regime_fiscale}
                        onChange={handleGeneralFieldChange("id_sdi_regime_fiscale")}
                        disabled={savingGeneral}
                      />
                    </CCol>
                    <CCol md={3}>
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
                    <CCol md={3} className="d-flex flex-column justify-content-end gap-2">
                      <CFormCheck
                        type="checkbox"
                        id="isPa"
                        label="Pubblica amministrazione"
                        checked={generalForm.is_pa}
                        onChange={handleGeneralFieldChange("is_pa")}
                        disabled={savingGeneral}
                      />
                      <CButton color="danger" variant="outline" type="button" onClick={handleArchiveClick} disabled={savingGeneral}>
                        Archivia anagrafica
                      </CButton>
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
            </section>

            {/* Contatti archiviati: ora visibili nel selettore della sezione Contatti */}

            <section className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <h3 className="h6 mb-0">Sedi</h3>
                {!editingSedeId && !isDisabled && (
                  <CButton color="primary" variant="outline" size="sm" onClick={handleSedeCreate}>
                    Nuova sede
                  </CButton>
                )}
              </div>
              {sedi.length > 0 || editingSedeId === "new" ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Denominazione</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Indirizzo</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Contatti</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-center">
                        Legale
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-center">
                        Predefinita
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col">Aggiornata</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Azioni
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {(editingSedeId === "new" ? [...sedi, { id_sede: "new" }] : sedi).map((sede, index) => {
                      const isNewRow = sede.id_sede === "new"
                      const rowKey = isNewRow ? "new-sede" : String(sede.id_sede ?? index)
                      const isEditing =
                        editingSedeId === "new" ? isNewRow : editingSedeId === sede.id_sede
                      const isSaving = isEditing && savingSedeId === editingSedeId
                      const sedeData = isNewRow ? null : sede
                      const fullAddress = sedeData ? formatSedeAddress(sedeData) : "-"

                      if (isEditing && sedeForm) {
                        return (
                          <CTableRow key={rowKey}>
                            <CTableDataCell>
                              <div className="d-flex flex-column gap-2">
                                <CFormLabel className="small text-body-secondary mb-0">
                                  Denominazione
                                </CFormLabel>
                                <CFormInput
                                  value={sedeForm.denominazione}
                                  onChange={handleSedeFieldChange("denominazione")}
                                  disabled={isSaving || isDisabled}
                                />
                                <CFormLabel className="small text-body-secondary mb-0">
                                  Tipo
                                </CFormLabel>
                                <CFormInput
                                  type="number"
                                  value={sedeForm.id_tipo}
                                  onChange={handleSedeFieldChange("id_tipo")}
                                  disabled={isSaving || isDisabled}
                                />
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex flex-column gap-2">
                                <CFormLabel className="small text-body-secondary mb-0">
                                  Indirizzo
                                </CFormLabel>
                                <CFormInput
                                  value={sedeForm.indirizzo}
                                  onChange={handleSedeFieldChange("indirizzo")}
                                  disabled={isSaving || isDisabled}
                                />
                                <div className="d-flex flex-column flex-lg-row gap-2">
                                  <div className="flex-fill">
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      Civico
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.civico}
                                      onChange={handleSedeFieldChange("civico")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </div>
                                  <div className="flex-fill">
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      CAP
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.cap}
                                      onChange={handleSedeFieldChange("cap")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </div>
                                </div>
                                <div className="d-flex flex-column flex-lg-row gap-2">
                                  // eslint-disable-next-line prettier/prettier
                                  <div className="flex-fill">
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      Comune
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.comune}
                                      onChange={handleSedeFieldChange("comune")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </div>
                                  <div>
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      Provincia
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.provincia}
                                      onChange={handleSedeFieldChange("provincia")}
                                      disabled={isSaving || isDisabled}
                                    />
                                  </div>
                                  <div style={{ maxWidth: 80 }}>
                                    <CFormLabel className="small text-body-secondary mb-0">Nazione</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.nazione_iso2}
                                      onChange={handleSedeFieldChange("nazione_iso2")}
                                      disabled={isSaving || isDisabled}
                                      maxLength={2}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex flex-column gap-2">
                                <div>
                                  <CFormLabel className="small text-body-secondary mb-0">Telefono</CFormLabel>
                                  <CFormInput
                                    value={sedeForm.telefono}
                                    onChange={handleSedeFieldChange("telefono")}
                                    disabled={isSaving || isDisabled}
                                  />
                                </div>
                                <div>
                                  <CFormLabel className="small text-body-secondary mb-0">Email</CFormLabel>
                                  <CFormInput
                                    type="email"
                                    value={sedeForm.email}
                                    onChange={handleSedeFieldChange("email")}
                                    disabled={isSaving || isDisabled}
                                  />
                                </div>
                                <div>
                                  <CFormLabel className="small text-body-secondary mb-0">Note</CFormLabel>
                                  <CFormTextarea
                                    value={sedeForm.note}
                                    onChange={handleSedeFieldChange("note")}
                                    rows={2}
                                    disabled={isSaving || isDisabled}
                                  />
                                </div>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell className="text-center align-middle">
                              <CFormCheck
                                type="checkbox"
                                label="Legale"
                                checked={sedeForm.is_legale}
                                onChange={handleSedeFieldChange("is_legale")}
                                disabled={isSaving || isDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center align-middle">
                              <CFormCheck
                                type="checkbox"
                                label="Predefinita"
                                checked={sedeForm.is_predefinita}
                                onChange={handleSedeFieldChange("is_predefinita")}
                                disabled={isSaving || isDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="align-middle">
                              {sedeData ? formatDateTime(sedeData.updated_at || sedeData.created_at) : "-"}
                            </CTableDataCell>
                            <CTableDataCell className="text-end align-middle">
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
                            </CTableDataCell>
                          </CTableRow>
                        )
                      }

                      if (!sedeData) {
                        return null
                      }

                      const contactsSummary = [
                        sedeData.telefono ? `Tel: ${sedeData.telefono}` : null,
                        sedeData.email ? `Email: ${sedeData.email}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n")

                      return (
                        <CTableRow key={rowKey}>
                          <CTableDataCell>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold">{sedeData.denominazione || "-"}</span>
                              <span className="text-body-secondary small">ID {sedeData.id_sede}</span>
                              {sedeData.note && (
                                <span className="text-body-secondary small mt-1">{sedeData.note}</span>
                              )}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>{fullAddress}</CTableDataCell>
                          <CTableDataCell>
                            {contactsSummary ? (
                              <div style={{ whiteSpace: "pre-line" }}>{contactsSummary}</div>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {renderBooleanBadge(sedeData.is_legale)}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {renderBooleanBadge(sedeData.is_predefinita)}
                          </CTableDataCell>
                          <CTableDataCell>{formatDateTime(sedeData.updated_at || sedeData.created_at)}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            <div className="d-flex gap-2 justify-content-end">
                              <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSedeEdit(sedeData)}
                                disabled={isDisabled || Boolean(editingSedeId) || savingSedeId === sedeData.id_sede}
                              >
                                Modifica
                              </CButton>
                              <CButton
                                color="danger"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSedeDelete(sedeData.id_sede)}
                                disabled={isDisabled || Boolean(editingSedeId) || savingSedeId === sedeData.id_sede}
                              >
                                {savingSedeId === sedeData.id_sede ? "Eliminazione..." : "Elimina"}
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessuna sede registrata per questa anagrafica.
                </CAlert>
              )}
            </section>
            <section className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <h3 className="h6 mb-0">Dati fiscali</h3>
                {!isEditingFiscal && !isDisabled && (
                  <CButton color="secondary" variant="outline" size="sm" onClick={startFiscalEditing}>
                    Modifica
                  </CButton>
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
                      <CFormLabel htmlFor="modalitaPagamento">Modalita di pagamento</CFormLabel>
                      <CFormInput
                        id="modalitaPagamento"
                        value={fiscaleForm.modalita_pagamento}
                        onChange={handleFiscalFieldChange("modalita_pagamento")}
                        disabled={savingFiscal || isDisabled}
                      />
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
                      {fiscaleFields.map((field) => (
                        <CCol key={field.label} md={6} xl={4}>
                          <DetailField label={field.label} value={field.value} compact={isCompact} />
                        </CCol>
                      ))}
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
            </section>

            <section className="d-flex flex-column gap-3">
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
              {contactsView === 'associati' ? ((contatti.length > 0 || editingContactId === 'new') ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="dark">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Nome</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Ruolo</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Telefono</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Cellulare</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Email</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-center">
                        Predefinito
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Azioni
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {editingContactId === 'new' && contactForm && (
                      <CTableRow>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.nome}
                            onChange={handleContactFieldChange("nome")}
                            disabled={savingContactId === 'new' || isDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.ruolo}
                            onChange={handleContactFieldChange("ruolo")}
                            disabled={savingContactId === 'new' || isDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.telefono}
                            onChange={handleContactFieldChange("telefono")}
                            disabled={savingContactId === 'new' || isDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.cellulare}
                            onChange={handleContactFieldChange("cellulare")}
                            disabled={savingContactId === 'new' || isDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.email}
                            onChange={handleContactFieldChange("email")}
                            disabled={savingContactId === 'new' || isDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            value={String(contactForm.id_sede ?? '')}
                            onChange={handleContactFieldChange("id_sede")}
                            disabled={savingContactId === 'new'}
                          >
                            {sedeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </CFormSelect>
                          <CFormTextarea
                            value={contactForm.note}
                            onChange={handleContactFieldChange("note")}
                            rows={2}
                            className="mt-2"
                            disabled={savingContactId === 'new'}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <div className="d-flex flex-column gap-1 align-items-center">
                            <CFormCheck
                              type="checkbox"
                              label="Predefinito"
                              checked={contactForm.is_predefinito}
                              onChange={handleContactFieldChange("is_predefinito")}
                              disabled={savingContactId === 'new' || isDisabled}
                            />
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <CButton
                              color="secondary"
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={handleContactCancel}
                              disabled={savingContactId === 'new' || isDisabled}
                            >
                              Annulla
                            </CButton>
                            <CButton
                              color="primary"
                              size="sm"
                              type="button"
                              disabled={savingContactId === 'new' || isDisabled}
                              onClick={() => handleContactSave('new')}
                            >
                              {savingContactId === 'new' ? "Salvataggio..." : "Salva"}
                            </CButton>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {contattiGrouped.map((group) => (
                      <React.Fragment key={`group-${group.key}`}>
                        <CTableRow>
                          <CTableDataCell colSpan={8} color="secondary">
                            <strong>{group.label}</strong>
                          </CTableDataCell>
                        </CTableRow>
                        {group.items.map((contatto) => {
                          const isEditing = editingContactId === contatto.id_contatto
                          const sede =
                            contatto.sede_denominazione || contatto.sede_indirizzo
                              ? [
                                contatto.sede_denominazione,
                                contatto.sede_indirizzo,
                                [contatto.sede_cap, contatto.sede_comune].filter(Boolean).join(" "),
                                contatto.sede_provincia ? `${contatto.sede_provincia}` : null,
                              ]
                                .filter(Boolean)
                                .join(" ")
                              : "-"

                          if (isEditing && contactForm) {
                            return (
                              <CTableRow key={contatto.id_contatto}>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.nome}
                                    onChange={handleContactFieldChange("nome")}
                                    disabled={savingContactId === contatto.id_contatto || isDisabled}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.ruolo}
                                    onChange={handleContactFieldChange("ruolo")}
                                    disabled={savingContactId === contatto.id_contatto || isDisabled}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.telefono}
                                    onChange={handleContactFieldChange("telefono")}
                                    disabled={savingContactId === contatto.id_contatto || isDisabled}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.cellulare}
                                    onChange={handleContactFieldChange("cellulare")}
                                    disabled={savingContactId === contatto.id_contatto || isDisabled}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.email}
                                    onChange={handleContactFieldChange("email")}
                                    disabled={savingContactId === contatto.id_contatto}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormSelect
                                    value={String(contactForm.id_sede ?? '')}
                                    onChange={handleContactFieldChange("id_sede")}
                                    disabled={savingContactId === contatto.id_contatto}
                                  >
                                    {sedeOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                  <CFormTextarea
                                    value={contactForm.note}
                                    onChange={handleContactFieldChange("note")}
                                    rows={2}
                                    className="mt-2"
                                    disabled={savingContactId === contatto.id_contatto}
                                  />
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <div className="d-flex flex-column gap-1 align-items-center">

                                    <CFormCheck
                                      type="checkbox"
                                      label="Predefinito"
                                      checked={contactForm.is_predefinito}
                                      onChange={handleContactFieldChange("is_predefinito")}
                                      disabled={savingContactId === contatto.id_contatto || isDisabled}
                                    />

                                  </div>
                                </CTableDataCell>
                                <CTableDataCell className="text-end">
                                  <div className="d-flex gap-2 justify-content-end">
                                    <CButton
                                      color="secondary"
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      onClick={handleContactCancel}
                                      disabled={savingContactId === contatto.id_contatto || isDisabled}
                                    >
                                      Annulla
                                    </CButton>
                                    <CButton
                                      color="primary"
                                      size="sm"
                                      type="button"
                                      disabled={savingContactId === contatto.id_contatto}
                                      onClick={() => handleContactSave(contatto.id_contatto)}
                                    >
                                      {savingContactId === contatto.id_contatto ? "Salvataggio..." : "Salva"}
                                    </CButton>
                                  </div>
                                </CTableDataCell>
                              </CTableRow>
                            )
                          }

                          const fullName = String(contatto.nome || '').trim()
                          const isDefault = Boolean(contatto.is_predefinito)

                          return (
                            <CTableRow key={contatto.id_contatto}>
                              <CTableDataCell>{fullName || "-"}</CTableDataCell>
                              <CTableDataCell>{contatto.ruolo || "-"}</CTableDataCell>
                              <CTableDataCell>{contatto.telefono || "-"}</CTableDataCell>
                              <CTableDataCell>{contatto.cellulare || "-"}</CTableDataCell>
                              <CTableDataCell>{contatto.email || "-"}</CTableDataCell>
                              <CTableDataCell className="text-center">
                                {isDefault ? (
                                  <CBadge color="primary">Si</CBadge>
                                ) : (
                                  <span className="text-body-secondary">No</span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleContactEdit(contatto)}
                                    disabled={isDisabled || savingContactId !== null || isEditingGeneral || isEditingFiscal}
                                  >
                                    <CIcon icon={cilSettings} />
                                  </CButton>
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleContactArchive(contatto.id_contatto)}
                                    disabled={isDisabled || savingContactId !== null || isEditingGeneral || isEditingFiscal}
                                  >
                                    {savingContactId === contatto.id_contatto ? "Archiviazione..." : "Archivia"}
                                  </CButton>
                                </div>
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">Nessun contatto associato.</CAlert>
              )) : (
                contattiArchGrouped.length > 0 ? (
                  <CTable hover responsive size="sm">
                    <CTableHead color="dark">
                      <CTableRow>
                        <CTableHeaderCell scope="col">Nome</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Ruolo</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Telefono</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Cellulare</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Email</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-center">Predefinito</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-end">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {contattiArchGrouped.map((group) => (
                        <React.Fragment key={`arch-group-${group.key}`}>
                          <CTableRow>
                            <CTableDataCell colSpan={7} color="secondary"><strong>{group.label}</strong></CTableDataCell>
                          </CTableRow>
                          {group.items.map((c) => {
                            const fullName = String(c.nome || "").trim()
                            const sede =
                              c.sede_denominazione || c.sede_indirizzo
                                ? [
                                    c.sede_denominazione,
                                    c.sede_indirizzo,
                                    [c.sede_cap, c.sede_comune].filter(Boolean).join(' '),
                                    c.sede_provincia ? `${c.sede_provincia}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' ')
                                : '-'
                            const isDefault = Number(c.is_predefinito) === 1
                            return (
                              <CTableRow key={`arch-${c.id_contatto}`}>
                                <CTableDataCell>{fullName || '-'}</CTableDataCell>
                                <CTableDataCell>{c.ruolo || '-'}</CTableDataCell>
                                <CTableDataCell>{c.telefono || '-'}</CTableDataCell>
                                <CTableDataCell>{c.cellulare || '-'}</CTableDataCell>
                                <CTableDataCell>{c.email || '-'}</CTableDataCell>
                                <CTableDataCell className="text-center">
                                  {isDefault ? <CBadge color="primary">Si</CBadge> : <span className="text-body-secondary">No</span>}
                                  <div className="small text-body-secondary mt-1">{sede}</div>
                                </CTableDataCell>
                                <CTableDataCell className="text-end">
                                  <div className="d-flex gap-2 justify-content-end align-items-center">
                                    <small className="text-body-secondary me-2">{formatDateTime(c.archived_at)}</small>
                                    <CButton
                                      color="secondary"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDisabled || restoringArchivedId === c.id_contatto}
                                      onClick={async () => {
                                        if (!recordId) return
                                        setMutationError(null)
                                        setRestoringArchivedId(c.id_contatto)
                                        try {
                                          const response = await updateAnagraficaDetail({
                                            token,
                                            id: recordId,
                                            kpiPeriod,
                                            // Non forziamo id_sede: il backend ripristina sulla sede originale se esiste
                                            contatti: [{ action: 'restore', id_contatto: c.id_contatto }],
                                          })
                                          handleMutationSuccess(response)
                                        } catch (mutationErrorInstance) {
                                          if (mutationErrorInstance.status === 401 && logout) {
                                            logout();
                                            return
                                          }
                                          setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
                                        } finally {
                                          setRestoringArchivedId(null)
                                        }
                                      }}
                                    >
                                      {restoringArchivedId === c.id_contatto ? 'Ripristino...' : 'Ripristina'}
                                    </CButton>
                                    <CButton
                                      color="danger"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDisabled || deletingArchivedId === c.id_contatto}
                                      onClick={async () => {
                                        const confirmed = window.confirm(`Confermi l'eliminazione definitiva del contatto archiviato ${c.id_contatto}?`)
                                        if (!confirmed) return
                                        setMutationError(null)
                                        setDeletingArchivedId(c.id_contatto)
                                        try {
                                          const response = await updateAnagraficaDetail({
                                            token,
                                            id: recordId,
                                            kpiPeriod,
                                            contatti: [{ action: 'hard_delete', id_contatto: c.id_contatto }],
                                          })
                                          handleMutationSuccess(response)
                                        } catch (mutationErrorInstance) {
                                          if (mutationErrorInstance.status === 401 && logout) {
                                            logout();
                                            return
                                          }
                                          setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)
                                        } finally {
                                          setDeletingArchivedId(null)
                                        }
                                      }}
                                    >
                                      {deletingArchivedId === c.id_contatto ? 'Eliminazione...' : (<><CIcon icon={cilTrash} /> Elimina</>)}
                                    </CButton>
                                  </div>
                                </CTableDataCell>
                              </CTableRow>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </CTableBody>
                  </CTable>
                ) : (
                  <CAlert color="info" className="mb-0">Nessun contatto archiviato.</CAlert>
                )
              )}
            </section>

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
                <CTable hover responsive size="sm">
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
                  <CTable hover responsive size="sm">
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

                  <div className="d-flex justify-content-end mt-2">
                    <CPagination size="sm" className="mb-0">
                      <CPaginationItem
                        aria-label="Pagina precedente"
                        disabled={preventiviPage <= 0}
                        onClick={() => preventiviPage > 0 && setPreventiviPage(preventiviPage - 1)}
                      >
                        &laquo;
                      </CPaginationItem>
                      {preventiviPaginationItems.map((p) => (
                        <CPaginationItem key={p} active={p === preventiviPage + 1} onClick={() => setPreventiviPage(p - 1)}>
                          {p}
                        </CPaginationItem>
                      ))}
                      <CPaginationItem
                        aria-label="Pagina successiva"
                        disabled={preventiviPage >= totalPreventiviPages - 1}
                        onClick={() => preventiviPage < totalPreventiviPages - 1 && setPreventiviPage(preventiviPage + 1)}
                      >
                        &raquo;
                      </CPaginationItem>
                    </CPagination>
                  </div>
                </>
              ) : (
                <CAlert color="info" className="mb-0">Nessun preventivo disponibile.</CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">DDT correlati</h3>
              {ddt.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Tot. pezzi</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Tot. peso (kg)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {ddt.map((documento) => {
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
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun DDT disponibile.
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">Fatture correlate</h3>
              {fatture.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
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
                    {fatture.map((fattura) => (
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
