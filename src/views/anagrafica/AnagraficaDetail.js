/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState } from "react"
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
import { cilArrowLeft, cilReload, cilDescription, cilEnvelopeClosed, cilPrint, cilPlus } from "@coreui/icons"

import { fetchAnagraficaDetail, updateAnagraficaDetail } from "../../services/anagrafiche"
import { useAuth } from "../../context/AuthContext"

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

  return (
    <CBadge color={color} className="text-uppercase">
      {normalised}
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

const DetailField = ({ label, value }) => (
  <div className="bg-body-tertiary border rounded px-3 py-2 h-100">
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
  giorni_pagamento: fiscale?.giorni_pagamento ?? "",
  altri_dati: fiscale?.altri_dati ?? "",
})

const createContactForm = (contatto) => ({
  nome: contatto?.nome ?? "",
  cognome: contatto?.cognome ?? "",
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

const AnagraficaDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const [mutationError, setMutationError] = useState(null)

  const [isEditingGeneral, setIsEditingGeneral] = useState(false)
  const [generalForm, setGeneralForm] = useState(null)
  const [savingGeneral, setSavingGeneral] = useState(false)

  const [isEditingFiscal, setIsEditingFiscal] = useState(false)
  const [fiscaleForm, setFiscaleForm] = useState(null)
  const [savingFiscal, setSavingFiscal] = useState(false)

  const [editingSedeId, setEditingSedeId] = useState(null)
  const [sedeForm, setSedeForm] = useState(null)
  const [savingSedeId, setSavingSedeId] = useState(null)

  const [editingContactId, setEditingContactId] = useState(null)
  const [contactForm, setContactForm] = useState(null)
  const [savingContactId, setSavingContactId] = useState(null)

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
  }, [token, recordId, refreshIndex, logout])

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

  const handleMutationSuccess = (updatedDetail) => {
    setDetail(updatedDetail)
    setMutationError(null)
  }

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
      giorni_pagamento:
        fiscaleForm.giorni_pagamento === "" ? null : Number(fiscaleForm.giorni_pagamento),
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

  const handleSedeSave = async () => {
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
  }

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

  const handleContactDelete = async (contattoId) => {
    if (!recordId || !contattoId) {
      return
    }

    const confirmed = window.confirm(`Confermi l'eliminazione del contatto ${contattoId}?`)
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
        contatti: { delete: [contattoId] },
      })
      handleMutationSuccess(response)
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
  const handleContactSave = async (contattoId) => {
    if (!recordId || !contactForm) {
      return
    }

    setSavingContactId(contattoId)
    setMutationError(null)

    const payload = {
      nome: contactForm.nome,
      cognome: contactForm.cognome,
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
        const prevIds = (detail?.contatti ?? []).map((c) => c.id_contatto)

        const createdResp = await updateAnagraficaDetail({
          token,
          id: recordId,
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
          const updatesResp = await updateAnagraficaDetail({ token, id: recordId, contatti: followUps })
          handleMutationSuccess(updatesResp)
        }
      } else {
        // For updates, include uniqueness enforcement per sede in one batch
        const batch = [{ id_contatto: contattoId, ...payload }]
        if (payload.is_predefinito === 1) {
          const sedeId = payload.id_sede ?? (detail?.contatti ?? []).find((c) => c.id_contatto === contattoId)?.id_sede
          if (sedeId) {
            const sameSede = (detail?.contatti ?? []).filter(
              (c) => c.id_contatto !== contattoId && Number(c.id_sede) === Number(sedeId) && Number(c.is_predefinito) === 1,
            )
            sameSede.forEach((c) => batch.push({ id_contatto: c.id_contatto, is_predefinito: 0 }))
          }
        }

        const response = await updateAnagraficaDetail({ token, id: recordId, contatti: batch })
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
  }

  const preventivi = detail?.preventivi ?? []
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
  const sedi = detail?.sedi ?? []
  const contatti = detail?.contatti ?? []

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

    return [
      { label: "PEC", value: fiscale.pec },
      { label: "Codice SDI", value: fiscale.codice_sdi },
      { label: "IBAN", value: fiscale.iban },
      { label: "Banca", value: fiscale.banca },
      { label: "Modalita di pagamento", value: fiscale.modalita_pagamento },
      { label: "Giorni pagamento", value: fiscale.giorni_pagamento },
      { label: "ID condizione pagamento", value: fiscale.id_cond_pagamento },
    ]
  }, [detail])
  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
        <div>
          <h2 className="h5 mb-1">Dettaglio anagrafica</h2>
          <p className="text-body-secondary mb-0">
            {recordId
              ? `ID ${recordId}`
              : "Seleziona un record valido dalla lista per visualizzare i dettagli."}
          </p>
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
        </div>
      </CCardHeader>
      <CCardBody className="d-flex flex-column gap-4">
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
                <h3 className="h6 mb-0">Informazioni generali</h3>
                {!isEditingGeneral && (
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
                <CForm onSubmit={handleGeneralSubmit} className="d-flex flex-column gap-3">
                  <CRow className="g-3">
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
                        disabled={savingGeneral}
                      >
                        {statoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={3} className="d-flex flex-column justify-content-end">
                      <CFormCheck
                        type="checkbox"
                        id="isPa"
                        label="Pubblica amministrazione"
                        checked={generalForm.is_pa}
                        onChange={handleGeneralFieldChange("is_pa")}
                        disabled={savingGeneral}
                      />
                      <CFormCheck
                        type="checkbox"
                        id="isActive"
                        label="Attiva"
                        checked={generalForm.is_active}
                        onChange={handleGeneralFieldChange("is_active")}
                        disabled={savingGeneral}
                      />
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
                  <CRow className="g-3">
                    {generalFields.map((field) => (
                      <CCol key={field.label} md={6} xl={4}>
                        <DetailField label={field.label} value={field.value} />
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

            <section className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <h3 className="h6 mb-0">Sedi</h3>
                {!editingSedeId && (
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
                                  disabled={isSaving}
                                />
                                <CFormLabel className="small text-body-secondary mb-0">
                                  Tipo
                                </CFormLabel>
                                <CFormInput
                                  type="number"
                                  value={sedeForm.id_tipo}
                                  onChange={handleSedeFieldChange("id_tipo")}
                                  disabled={isSaving}
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
                                  disabled={isSaving}
                                />
                                <div className="d-flex flex-column flex-lg-row gap-2">
                                  <div className="flex-fill">
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      Civico
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.civico}
                                      onChange={handleSedeFieldChange("civico")}
                                      disabled={isSaving}
                                    />
                                  </div>
                                  <div className="flex-fill">
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      CAP
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.cap}
                                      onChange={handleSedeFieldChange("cap")}
                                      disabled={isSaving}
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
                                      disabled={isSaving}
                                    />
                                  </div>
                                  <div>
                                    <CFormLabel className="small text-body-secondary mb-0">
                                      Provincia
                                    </CFormLabel>
                                    <CFormInput
                                      value={sedeForm.provincia}
                                      onChange={handleSedeFieldChange("provincia")}
                                      disabled={isSaving}
                                    />
                                  </div>
                                  <div style={{ maxWidth: 80 }}>
                                    <CFormLabel className="small text-body-secondary mb-0">Nazione</CFormLabel>
                                    <CFormInput
                                      value={sedeForm.nazione_iso2}
                                      onChange={handleSedeFieldChange("nazione_iso2")}
                                      disabled={isSaving}
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
                                    disabled={isSaving}
                                  />
                                </div>
                                <div>
                                  <CFormLabel className="small text-body-secondary mb-0">Email</CFormLabel>
                                  <CFormInput
                                    type="email"
                                    value={sedeForm.email}
                                    onChange={handleSedeFieldChange("email")}
                                    disabled={isSaving}
                                  />
                                </div>
                                <div>
                                  <CFormLabel className="small text-body-secondary mb-0">Note</CFormLabel>
                                  <CFormTextarea
                                    value={sedeForm.note}
                                    onChange={handleSedeFieldChange("note")}
                                    rows={2}
                                    disabled={isSaving}
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
                                disabled={isSaving}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center align-middle">
                              <CFormCheck
                                type="checkbox"
                                label="Predefinita"
                                checked={sedeForm.is_predefinita}
                                onChange={handleSedeFieldChange("is_predefinita")}
                                disabled={isSaving}
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
                                  disabled={isSaving}
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
                                    disabled={isSaving || savingSedeId === sedeData.id_sede}
                                  >
                                    {savingSedeId === sedeData.id_sede ? "Eliminazione..." : "Elimina"}
                                  </CButton>
                                )}
                                <CButton
                                  color="primary"
                                  size="sm"
                                  type="button"
                                  onClick={handleSedeSave}
                                  disabled={isSaving}
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
                                disabled={Boolean(editingSedeId) || savingSedeId === sedeData.id_sede}
                              >
                                Modifica
                              </CButton>
                              <CButton
                                color="danger"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSedeDelete(sedeData.id_sede)}
                                disabled={Boolean(editingSedeId) || savingSedeId === sedeData.id_sede}
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
                {!isEditingFiscal && (
                  <CButton color="secondary" variant="outline" size="sm" onClick={startFiscalEditing}>
                    Modifica
                  </CButton>
                )}
              </div>

              {isEditingFiscal && fiscaleForm ? (
                <CForm onSubmit={handleFiscalSubmit} className="d-flex flex-column gap-3">
                  <CRow className="g-3">
                    <CCol md={4}>
                      <CFormLabel htmlFor="pec">PEC</CFormLabel>
                      <CFormInput
                        id="pec"
                        type="email"
                        value={fiscaleForm.pec}
                        onChange={handleFiscalFieldChange("pec")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel htmlFor="codiceSdi">Codice SDI</CFormLabel>
                      <CFormInput
                        id="codiceSdi"
                        value={fiscaleForm.codice_sdi}
                        onChange={handleFiscalFieldChange("codice_sdi")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel htmlFor="iban">IBAN</CFormLabel>
                      <CFormInput
                        id="iban"
                        value={fiscaleForm.iban}
                        onChange={handleFiscalFieldChange("iban")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="banca">Banca</CFormLabel>
                      <CFormInput
                        id="banca"
                        value={fiscaleForm.banca}
                        onChange={handleFiscalFieldChange("banca")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="modalitaPagamento">Modalita di pagamento</CFormLabel>
                      <CFormInput
                        id="modalitaPagamento"
                        value={fiscaleForm.modalita_pagamento}
                        onChange={handleFiscalFieldChange("modalita_pagamento")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="idCondPagamento">ID condizione pagamento</CFormLabel>
                      <CFormInput
                        id="idCondPagamento"
                        type="number"
                        value={fiscaleForm.id_cond_pagamento}
                        onChange={handleFiscalFieldChange("id_cond_pagamento")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="giorniPagamento">Giorni pagamento</CFormLabel>
                      <CFormInput
                        id="giorniPagamento"
                        type="number"
                        value={fiscaleForm.giorni_pagamento}
                        onChange={handleFiscalFieldChange("giorni_pagamento")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                    <CCol xs={12}>
                      <CFormLabel htmlFor="altriDati">Altri dati</CFormLabel>
                      <CFormTextarea
                        id="altriDati"
                        rows={4}
                        value={fiscaleForm.altri_dati}
                        onChange={handleFiscalFieldChange("altri_dati")}
                        disabled={savingFiscal}
                      />
                    </CCol>
                  </CRow>
                  <div className="d-flex gap-2 justify-content-end">
                    <CButton color="secondary" variant="outline" type="button" onClick={cancelFiscalEditing} disabled={savingFiscal}>
                      Annulla
                    </CButton>
                    <CButton color="primary" type="submit" disabled={savingFiscal}>
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
                          <DetailField label={field.label} value={field.value} />
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
                <h3 className="h6 mb-0">Contatti associati</h3>
                {!editingContactId && (
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
              </div>
              {(contatti.length > 0 || editingContactId === 'new') ? (
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
                            disabled={savingContactId === 'new'}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.ruolo}
                            onChange={handleContactFieldChange("ruolo")}
                            disabled={savingContactId === 'new'}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.telefono}
                            onChange={handleContactFieldChange("telefono")}
                            disabled={savingContactId === 'new'}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.cellulare}
                            onChange={handleContactFieldChange("cellulare")}
                            disabled={savingContactId === 'new'}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={contactForm.email}
                            onChange={handleContactFieldChange("email")}
                            disabled={savingContactId === 'new'}
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
                              disabled={savingContactId === 'new'}
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
                              disabled={savingContactId === 'new'}
                            >
                              Annulla
                            </CButton>
                            <CButton
                              color="primary"
                              size="sm"
                              type="button"
                              disabled={savingContactId === 'new'}
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
                                    disabled={savingContactId === contatto.id_contatto}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.ruolo}
                                    onChange={handleContactFieldChange("ruolo")}
                                    disabled={savingContactId === contatto.id_contatto}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.telefono}
                                    onChange={handleContactFieldChange("telefono")}
                                    disabled={savingContactId === contatto.id_contatto}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CFormInput
                                    value={contactForm.cellulare}
                                    onChange={handleContactFieldChange("cellulare")}
                                    disabled={savingContactId === contatto.id_contatto}
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
                                      disabled={savingContactId === contatto.id_contatto}
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
                                      disabled={savingContactId === contatto.id_contatto}
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

                          const fullName = [contatto.nome, contatto.cognome].filter(Boolean).join(" ").trim()
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
                                    disabled={savingContactId !== null || isEditingGeneral || isEditingFiscal}
                                  >
                                    Modifica
                                  </CButton>
                                  <CButton
                                    color="danger"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleContactDelete(contatto.id_contatto)}
                                    disabled={savingContactId !== null || isEditingGeneral || isEditingFiscal}
                                  >
                                    {savingContactId === contatto.id_contatto ? "Eliminazione..." : "Elimina"}
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
                <CAlert color="info" className="mb-0">
                  Nessun contatto associato.
                </CAlert>
              )}
            </section>

            <section>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 mb-0">Preventivi correlati</h3>
                <CButton color="primary" variant="outline" size="sm" onClick={() => navigate('/preventivi/crea')}>
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
                              <CButton color="link" size="sm" className="p-0" onClick={() => handleViewPreventivo(preventivo.id_preventivo)}>
                                <CIcon icon={cilDescription} />
                              </CButton>
                              <CButton color="link" size="sm" className="p-0" onClick={() => { /* email no-op */ }}>
                                <CIcon icon={cilEnvelopeClosed} />
                              </CButton>
                              <CButton color="link" size="sm" className="p-0" onClick={() => { /* pdf no-op */ }}>
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
  )
}

export default AnagraficaDetail
