import React, { useEffect, useMemo, useState } from 'react'
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
  CRow,
  CSpinner,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import { fetchTicketDetail, createTicket, updateTicket, createTicketComment } from '../../services/tickets'
import { fetchAccounts } from '../../services/accounts'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { createPreventivo, generateLavorazioneFromPreventivo } from '../../services/preventivi'
import { fetchLavorazioniList, createLavorazioneActivity } from '../../services/lavorazioni'
import PermissionButton from '../../components/PermissionButton'

const STATUS_OPTIONS = [
  { value: 'aperto', label: 'Aperto' },
  { value: 'in_lavorazione', label: 'In lavorazione' },
  { value: 'risolto', label: 'Risolto' },
  { value: 'chiuso', label: 'Chiuso' },
]

const PRIORITY_OPTIONS = [
  { value: 'bassa', label: 'Bassa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
]

// Legge i parametri query dalla URL corrente (es. id ticket, mode=new).
const useQuery = () => {
  const { search } = useLocation()
  return React.useMemo(() => new URLSearchParams(search), [search])
}

// Converte una data in formato locale italiano; se non valida mostra il valore originale.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

// Estrae un id entita da URL assoluta/relativa cercando id, id_preventivo o id_lavorazione.
const parseEntityIdFromUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 0
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(raw, base)
    const candidate = Number(
      parsed.searchParams.get('id') ||
        parsed.searchParams.get('id_preventivo') ||
        parsed.searchParams.get('id_lavorazione') ||
        0,
    )
    return Number.isInteger(candidate) && candidate > 0 ? candidate : 0
  } catch (_error) {
    const match = raw.match(/[?&](?:id|id_preventivo|id_lavorazione)=(\d+)/i)
    if (!match) return 0
    const candidate = Number(match[1] || 0)
    return Number.isInteger(candidate) && candidate > 0 ? candidate : 0
  }
}

// Mappa la priorita ticket (CRM) nel formato richiesto dalle lavorazioni.
const mapTicketPriorityToLavorazione = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'bassa') return 'low'
  if (normalized === 'alta') return 'high'
  if (normalized === 'critica') return 'critical'
  return 'medium'
}

// Dettaglio ticket con editing, commenti e integrazione CRM (preventivo/lavorazione/attivita).
const TicketsDetail = () => {
  const navigate = useNavigate()
  const query = useQuery()
  const { token, logout } = useAuth()

  const id = Number(query.get('id') || 0)
  const isNew = query.get('mode') === 'new' || !id

  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [modulo, setModulo] = useState('')
  const [url, setUrl] = useState('')
  const [stato, setStato] = useState('aperto')
  const [priorita, setPriorita] = useState('media')
  const [assignedTo, setAssignedTo] = useState('')
  const [createdByName, setCreatedByName] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [closedAt, setClosedAt] = useState('')

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [messageSaving, setMessageSaving] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [crmSaving, setCrmSaving] = useState(false)
  const [anagraficaSearch, setAnagraficaSearch] = useState('')
  const [anagraficaResults, setAnagraficaResults] = useState([])
  const [anagraficaLoading, setAnagraficaLoading] = useState(false)
  const [selectedAnagraficaId, setSelectedAnagraficaId] = useState('')
  const [linkedPreventivoId, setLinkedPreventivoId] = useState(0)
  const [linkedLavorazioneId, setLinkedLavorazioneId] = useState(0)
  const [lavorazioneSearch, setLavorazioneSearch] = useState('')
  const [lavorazioneResults, setLavorazioneResults] = useState([])
  const [lavorazioneLoading, setLavorazioneLoading] = useState(false)
  const [selectedLavorazioneId, setSelectedLavorazioneId] = useState('')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityDescription, setActivityDescription] = useState('')
  const [crmMessage, setCrmMessage] = useState(null)

  // Carica la lista operatori disponibili per l'assegnazione del ticket.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const loadAccounts = async () => {
      try {
        const { items: list } = await fetchAccounts({
          token,
          accountType: 'operatore',
          isActive: 1,
          pageSize: 200,
          signal: controller.signal,
        })
        setAccounts(list)
      } catch (_e) {
        setAccounts([])
      }
    }
    loadAccounts()
    return () => controller.abort()
  }, [token])

  // Se siamo in modifica, carica dettaglio ticket e inizializza form, commenti e link CRM.
  useEffect(() => {
    if (!token || isNew) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTicketDetail({ token, id, signal: controller.signal })
        const ticket = data?.ticket || {}
        setTitolo(ticket.titolo || '')
        setDescrizione(ticket.descrizione || '')
        setModulo(ticket.modulo || '')
        setUrl(ticket.url || '')
        setStato(ticket.stato || 'aperto')
        setPriorita(ticket.priorita || 'media')
        setAssignedTo(ticket.assigned_to ? String(ticket.assigned_to) : '')
        setCreatedByName(ticket.created_by_name || '')
        setCreatedAt(ticket.created_at || '')
        setUpdatedAt(ticket.updated_at || '')
        setClosedAt(ticket.closed_at || '')
        setMessages(Array.isArray(data?.messages) ? data.messages : [])

        const moduloValue = String(ticket.modulo || '').trim().toLowerCase()
        const urlValue = String(ticket.url || '').trim()
        const linkedId = parseEntityIdFromUrl(urlValue)
        if (moduloValue === 'preventivi' && linkedId > 0) {
          setLinkedPreventivoId(linkedId)
        } else if (urlValue.includes('/preventivi/')) {
          setLinkedPreventivoId(linkedId)
        } else {
          setLinkedPreventivoId(0)
        }
        if (moduloValue === 'lavorazioni' && linkedId > 0) {
          setLinkedLavorazioneId(linkedId)
          setSelectedLavorazioneId(String(linkedId))
        } else if (urlValue.includes('/lavorazioni/')) {
          setLinkedLavorazioneId(linkedId)
          setSelectedLavorazioneId(String(linkedId))
        } else {
          setLinkedLavorazioneId(0)
        }
      } catch (e) {
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, isNew, logout])

  // Nasconde automaticamente il messaggio di feedback dopo pochi secondi.
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  // Ricerca anagrafiche con debounce per evitare chiamate API troppo frequenti.
  useEffect(() => {
    if (!token) return
    const term = String(anagraficaSearch || '').trim()
    if (term.length < 2) {
      setAnagraficaResults([])
      return
    }
    let active = true
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setAnagraficaLoading(true)
        const response = await fetchAnagrafiche({
          token,
          search: term,
          page: 1,
          pageSize: 8,
          signal: controller.signal,
        })
        if (!active) return
        setAnagraficaResults(Array.isArray(response?.items) ? response.items : [])
      } catch (_error) {
        if (!active) return
        setAnagraficaResults([])
      } finally {
        if (active) setAnagraficaLoading(false)
      }
    }, 250)
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [anagraficaSearch, token])

  // Ricerca lavorazioni con debounce per collegare una lavorazione esistente al ticket.
  useEffect(() => {
    if (!token) return
    const term = String(lavorazioneSearch || '').trim()
    if (term.length < 2) {
      setLavorazioneResults([])
      return
    }
    let active = true
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setLavorazioneLoading(true)
        const response = await fetchLavorazioniList({
          token,
          page: 1,
          pageSize: 8,
          search: term,
          signal: controller.signal,
        })
        if (!active) return
        setLavorazioneResults(Array.isArray(response?.items) ? response.items : [])
      } catch (_error) {
        if (!active) return
        setLavorazioneResults([])
      } finally {
        if (active) setLavorazioneLoading(false)
      }
    }, 250)
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [lavorazioneSearch, token])

  // Prepara le option del select "assegnato a" a partire dalla lista account API.
  const accountOptions = useMemo(() => {
    if (!Array.isArray(accounts)) return []
    return accounts.map((acc) => ({
      value: acc.id_account,
      label: acc.username || acc.email || `Account ${acc.id_account}`,
    }))
  }, [accounts])

  // Crea un ticket nuovo o aggiorna quello corrente in base alla modalita pagina.
  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const result = await createTicket({
          token,
          body: {
            titolo,
            descrizione,
            modulo,
            url,
            stato,
            priorita,
            assigned_to: assignedTo ? Number(assignedTo) : null,
          },
        })
        const newId = result?.id_ticket
        if (newId) {
          navigate(`/tickets/dettagli?id=${newId}`)
          setFeedback({ message: 'Ticket creato', color: 'success' })
        }
      } else {
        await updateTicket({
          token,
          body: {
            id_ticket: id,
            titolo,
            descrizione,
            modulo,
            url,
            stato,
            priorita,
            assigned_to: assignedTo ? Number(assignedTo) : null,
          },
        })
        setFeedback({ message: 'Ticket aggiornato', color: 'success' })
      }
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  // Aggiunge un commento e ricarica i messaggi del ticket per avere lo stato aggiornato.
  const handleAddMessage = async () => {
    const message = newMessage.trim()
    if (!message || !token || !id) return
    setMessageSaving(true)
    setError(null)
    try {
      await createTicketComment({
        token,
        body: { id_ticket: id, message },
      })
      setNewMessage('')
      const data = await fetchTicketDetail({ token, id })
      setMessages(Array.isArray(data?.messages) ? data.messages : [])
      setUpdatedAt(data?.ticket?.updated_at || updatedAt)
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setMessageSaving(false)
    }
  }

  // Salva nel ticket il contesto CRM corrente (modulo + URL) dopo operazioni correlate.
  const persistTicketContext = async (nextModulo, nextUrl, successMessage) => {
    if (!token || isNew || !id) return
    await updateTicket({
      token,
      body: {
        id_ticket: id,
        titolo,
        descrizione,
        modulo: nextModulo,
        url: nextUrl,
        stato,
        priorita,
        assigned_to: assignedTo ? Number(assignedTo) : null,
      },
    })
    setModulo(nextModulo)
    setUrl(nextUrl)
    if (nextModulo === 'preventivi') {
      setLinkedPreventivoId(parseEntityIdFromUrl(nextUrl))
    }
    if (nextModulo === 'lavorazioni') {
      const linkedId = parseEntityIdFromUrl(nextUrl)
      setLinkedLavorazioneId(linkedId)
      if (linkedId > 0) {
        setSelectedLavorazioneId(String(linkedId))
      }
    }
    setCrmMessage(successMessage)
  }

  // Crea un preventivo in bozza dall'anagrafica selezionata e lo collega al ticket.
  const handleCreatePreventivo = async () => {
    const idAnagrafica = Number(selectedAnagraficaId)
    if (!Number.isInteger(idAnagrafica) || idAnagrafica <= 0) {
      setError(new Error('Seleziona un\'anagrafica valida per creare il preventivo.'))
      return
    }
    try {
      setCrmSaving(true)
      setError(null)
      setCrmMessage(null)
      const result = await createPreventivo({
        token,
        id_anagrafica: idAnagrafica,
        id_mittente: idAnagrafica,
        oggetto: titolo || `Ticket #${id}`,
        note: descrizione || null,
        send: false,
      })
      const idPreventivo = Number(result?.id_preventivo || 0)
      if (!Number.isInteger(idPreventivo) || idPreventivo <= 0) {
        throw new Error('Creazione preventivo non riuscita.')
      }
      setLinkedPreventivoId(idPreventivo)
      await persistTicketContext(
        'preventivi',
        `/preventivi/dettagli?id=${idPreventivo}`,
        `Preventivo #${idPreventivo} creato e collegato al ticket.`,
      )
    } catch (e) {
      setError(e)
    } finally {
      setCrmSaving(false)
    }
  }

  // Genera una lavorazione dal preventivo gia collegato e aggiorna il link sul ticket.
  const handleGenerateLavorazione = async () => {
    if (!linkedPreventivoId) {
      setError(new Error('Collega prima un preventivo al ticket.'))
      return
    }
    try {
      setCrmSaving(true)
      setError(null)
      setCrmMessage(null)
      const result = await generateLavorazioneFromPreventivo({
        token,
        id: linkedPreventivoId,
        titolo: titolo || `Lavorazione ticket #${id}`,
        descrizione: descrizione || null,
        priorita: mapTicketPriorityToLavorazione(priorita),
      })
      const idLavorazione = Number(result?.id_lavorazione || 0)
      if (!Number.isInteger(idLavorazione) || idLavorazione <= 0) {
        throw new Error('Generazione lavorazione non riuscita.')
      }
      setLinkedLavorazioneId(idLavorazione)
      await persistTicketContext(
        'lavorazioni',
        `/lavorazioni/dettaglio?id=${idLavorazione}`,
        `Lavorazione #${idLavorazione} creata e collegata al ticket.`,
      )
    } catch (e) {
      setError(e)
    } finally {
      setCrmSaving(false)
    }
  }

  // Collega manualmente una lavorazione esistente al ticket.
  const handleLinkExistingLavorazione = async () => {
    const idLavorazione = Number(selectedLavorazioneId)
    if (!Number.isInteger(idLavorazione) || idLavorazione <= 0) {
      setError(new Error('Seleziona una lavorazione valida da collegare.'))
      return
    }
    try {
      setCrmSaving(true)
      setError(null)
      setCrmMessage(null)
      setLinkedLavorazioneId(idLavorazione)
      await persistTicketContext(
        'lavorazioni',
        `/lavorazioni/dettaglio?id=${idLavorazione}`,
        `Lavorazione #${idLavorazione} collegata al ticket.`,
      )
    } catch (e) {
      setError(e)
    } finally {
      setCrmSaving(false)
    }
  }

  // Crea una nuova attivita sulla lavorazione selezionata/collegata.
  const handleCreateActivity = async () => {
    const idLavorazione = Number(selectedLavorazioneId || linkedLavorazioneId || 0)
    const title = String(activityTitle || '').trim()
    if (!Number.isInteger(idLavorazione) || idLavorazione <= 0) {
      setError(new Error('Seleziona o collega prima una lavorazione valida.'))
      return
    }
    if (!title) {
      setError(new Error("Inserisci il titolo dell'attivita."))
      return
    }

    try {
      setCrmSaving(true)
      setError(null)
      setCrmMessage(null)
      const result = await createLavorazioneActivity({
        token,
        idLavorazione,
        titolo: title,
        descrizione: String(activityDescription || '').trim() || undefined,
        priorita: mapTicketPriorityToLavorazione(priorita),
      })
      const activityId = Number(result?.activity?.id_attivita || 0)
      setCrmMessage(
        activityId > 0
          ? `Attivita #${activityId} creata sulla lavorazione #${idLavorazione}.`
          : `Attivita creata sulla lavorazione #${idLavorazione}.`,
      )
      setActivityTitle('')
      setActivityDescription('')
    } catch (e) {
      setError(e)
    } finally {
      setCrmSaving(false)
    }
  }

  // Protezione route: in modalita edit richiede un ID ticket valido.
  if (!isNew && !id) {
    navigate('/tickets/lista', { replace: true })
    return null
  }

  return (
    <>
      <CRow className="g-3 align-items-start">
        <CCol xs={12} lg={8}>
          <CCard className="mb-3">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{isNew ? 'Nuovo ticket' : `Ticket #${id}`}</h5>
                  {!isNew && (
                    <small className="text-body-secondary">
                      Creato da {createdByName || '-'} · {formatDate(createdAt)}
                    </small>
                  )}
                </div>
                <PermissionButton
                  color="primary"
                  onClick={handleSave}
                  disabled={saving || loading}
                  permission={isNew ? 'bug.create' : 'bug.write'}
                >
                  {saving ? <CSpinner size="sm" /> : 'Salva'}
                </PermissionButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <>
                  {feedback && <CAlert color={feedback.color}>{feedback.message}</CAlert>}
                  {error && (
                    <CAlert color="danger">
                      {error.message || 'Errore durante il caricamento del ticket.'}
                    </CAlert>
                  )}
                  <CForm>
                    <CRow className="g-3">
                      <CCol md={8}>
                        <CFormInput
                          label="Titolo"
                          value={titolo}
                          onChange={(e) => setTitolo(e.target.value)}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormSelect
                          label="Modulo"
                          value={modulo}
                          onChange={(e) => setModulo(e.target.value)}
                        >
                          <option value="">Seleziona modulo</option>
                          <option value="dashboard">Dashboard</option>
                          <option value="anagrafica">Anagrafica</option>
                          <option value="preventivi">Preventivi</option>
                          <option value="ddt">DDT</option>
                          <option value="fatture">Fatture</option>
                          <option value="pagamenti">Pagamenti</option>
                          <option value="lavorazioni">Lavorazioni</option>
                          <option value="prodotti">Prodotti</option>
                          <option value="pacchetti">Pacchetti</option>
                          <option value="contratti">Contratti</option>
                          <option value="accounts">Account</option>
                          <option value="altro">Altro</option>
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormSelect
                          label="Stato"
                          value={stato}
                          onChange={(e) => setStato(e.target.value)}
                          options={STATUS_OPTIONS}
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormSelect
                          label="Priorità"
                          value={priorita}
                          onChange={(e) => setPriorita(e.target.value)}
                          options={PRIORITY_OPTIONS}
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormSelect
                          label="Assegnato a"
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                        >
                          <option value="">Non assegnato</option>
                          {accountOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormInput
                          label="URL pagina"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormTextarea
                          label="Descrizione"
                          rows={6}
                          value={descrizione}
                          onChange={(e) => setDescrizione(e.target.value)}
                        />
                      </CCol>
                    </CRow>
                  </CForm>
                  {!isNew && (
                    <div className="mt-3 d-flex flex-wrap gap-2 text-body-secondary">
                      <span>Aggiornato: {formatDate(updatedAt)}</span>
                      {closedAt && (
                        <span>
                          <CBadge color="secondary" className="ms-2">
                            Chiuso {formatDate(closedAt)}
                          </CBadge>
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {!isNew && (
          <CCol xs={12} lg={4}>
            <CCard className="mb-3">
          <CCardHeader>
            <h6 className="mb-0">CRM - Preventivi, lavorazioni e attività</h6>
          </CCardHeader>
          <CCardBody>
            {crmMessage ? <CAlert color="success">{crmMessage}</CAlert> : null}
            <CRow className="g-3">
              <CCol md={12}>
                <div className="fw-semibold mb-2">1) Nuovo preventivo</div>
                <div className="small text-body-secondary mb-2">
                  Seleziona anagrafica cliente e crea un preventivo in bozza, collegato al ticket.
                </div>
                <CFormInput
                  type="text"
                  value={anagraficaSearch}
                  onChange={(e) => setAnagraficaSearch(e.target.value)}
                  placeholder="Cerca anagrafica (nome / CF / P.IVA)"
                  disabled={crmSaving}
                />
                {anagraficaLoading ? (
                  <div className="small text-body-secondary mt-2">Ricerca anagrafica in corso...</div>
                ) : null}
                {anagraficaResults.length > 0 ? (
                  <div className="border rounded mt-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    {anagraficaResults.map((entry) => {
                      const anagId = Number(entry?.id_anagrafica || 0)
                      const label =
                        String(entry?.ragione_sociale || '').trim() || `Anagrafica #${anagId}`
                      return (
                        <button
                          key={`ticket-anag-${anagId}`}
                          type="button"
                          className="btn btn-link text-start w-100 text-decoration-none border-bottom rounded-0"
                          onClick={() => {
                            setSelectedAnagraficaId(String(anagId))
                            setAnagraficaSearch(label)
                            setAnagraficaResults([])
                          }}
                        >
                          <div className="fw-semibold">{label}</div>
                          <div className="small text-body-secondary">ID: {anagId}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                <div className="d-flex gap-2 mt-2" style={{ maxWidth: '420px' }}>
                  <CFormInput
                    type="number"
                    min={1}
                    value={selectedAnagraficaId}
                    onChange={(e) => setSelectedAnagraficaId(e.target.value)}
                    placeholder="ID anagrafica"
                    disabled={crmSaving}
                  />
                  <CButton color="primary" onClick={handleCreatePreventivo} disabled={crmSaving}>
                    {crmSaving ? 'Salvataggio...' : 'Crea preventivo'}
                  </CButton>
                </div>
                {linkedPreventivoId > 0 ? (
                  <div className="small mt-2">
                    Preventivo collegato:{' '}
                    <a href={`/preventivi/dettagli?id=${linkedPreventivoId}`}>#{linkedPreventivoId}</a>
                  </div>
                ) : null}
              </CCol>

              <CCol md={12}>
                <div className="fw-semibold mb-2">2) Lavorazione</div>
                <div className="d-flex gap-2 flex-wrap">
                  <CButton
                    color="primary"
                    variant="outline"
                    onClick={handleGenerateLavorazione}
                    disabled={crmSaving || linkedPreventivoId <= 0}
                  >
                    {crmSaving ? 'Elaborazione...' : 'Genera da preventivo collegato'}
                  </CButton>
                </div>
                <div className="small text-body-secondary mt-2">
                  Se esiste gia una lavorazione puoi collegarla direttamente:
                </div>
                <CFormInput
                  className="mt-2"
                  type="text"
                  value={lavorazioneSearch}
                  onChange={(e) => setLavorazioneSearch(e.target.value)}
                  placeholder="Cerca lavorazione per codice o titolo"
                  disabled={crmSaving}
                />
                {lavorazioneLoading ? (
                  <div className="small text-body-secondary mt-2">Ricerca lavorazione in corso...</div>
                ) : null}
                {lavorazioneResults.length > 0 ? (
                  <div className="border rounded mt-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    {lavorazioneResults.map((row) => {
                      const lavoroId = Number(row?.id_lavorazione || 0)
                      const codice = String(row?.codice || '').trim()
                      const titoloLavoro = String(row?.titolo || '').trim()
                      return (
                        <button
                          key={`ticket-lav-${lavoroId}`}
                          type="button"
                          className="btn btn-link text-start w-100 text-decoration-none border-bottom rounded-0"
                          onClick={() => {
                            setSelectedLavorazioneId(String(lavoroId))
                            setLavorazioneSearch(`${codice || '#'} ${titoloLavoro}`.trim())
                            setLavorazioneResults([])
                          }}
                        >
                          <div className="fw-semibold">
                            {codice || `Lavorazione #${lavoroId}`} {titoloLavoro ? `- ${titoloLavoro}` : ''}
                          </div>
                          <div className="small text-body-secondary">ID: {lavoroId}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                <div className="d-flex gap-2 mt-2" style={{ maxWidth: '420px' }}>
                  <CFormInput
                    type="number"
                    min={1}
                    value={selectedLavorazioneId}
                    onChange={(e) => setSelectedLavorazioneId(e.target.value)}
                    placeholder="ID lavorazione"
                    disabled={crmSaving}
                  />
                  <CButton
                    color="primary"
                    variant="outline"
                    onClick={handleLinkExistingLavorazione}
                    disabled={crmSaving}
                  >
                    Collega lavorazione
                  </CButton>
                </div>
                {linkedLavorazioneId > 0 ? (
                  <div className="small mt-2">
                    Lavorazione collegata:{' '}
                    <a href={`/lavorazioni/dettaglio?id=${linkedLavorazioneId}`}>#{linkedLavorazioneId}</a>
                  </div>
                ) : null}
              </CCol>

              <CCol md={12}>
                <div className="fw-semibold mb-2">3) Attivita (solo con lavorazione)</div>
                <div className="small text-body-secondary mb-2">
                  Crea attivita se la lavorazione e gia collegata/selezionata.
                </div>
                <CFormInput
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="Titolo attivita"
                  disabled={crmSaving || !(Number(selectedLavorazioneId || linkedLavorazioneId) > 0)}
                />
                <CFormTextarea
                  className="mt-2"
                  rows={3}
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Descrizione attivita"
                  disabled={crmSaving || !(Number(selectedLavorazioneId || linkedLavorazioneId) > 0)}
                />
                <div className="d-flex justify-content-end mt-2">
                  <CButton
                    color="primary"
                    onClick={handleCreateActivity}
                    disabled={crmSaving || !(Number(selectedLavorazioneId || linkedLavorazioneId) > 0)}
                  >
                    {crmSaving ? 'Creazione...' : 'Crea attivita'}
                  </CButton>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>

      {!isNew && (
        <CCard>
          <CCardHeader>
            <h6 className="mb-0">Commenti e attività</h6>
          </CCardHeader>
          <CCardBody>
            {messages.length === 0 ? (
              <CAlert color="light">Nessun commento presente.</CAlert>
            ) : (
              <div className="d-flex flex-column gap-3">
                {messages.map((msg) => (
                  <div key={msg.id_message} className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-semibold">{msg.created_by_name || 'Sistema'}</div>
                      <small className="text-body-secondary">{formatDate(msg.created_at)}</small>
                    </div>
                    <div>{msg.message}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <CFormLabel>Aggiungi commento</CFormLabel>
              <CFormTextarea
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi un aggiornamento..."
              />
              <div className="d-flex justify-content-end mt-2">
                <PermissionButton
                  color="primary"
                  onClick={handleAddMessage}
                  disabled={messageSaving || !newMessage.trim()}
                  permission="bug.write"
                >
                  {messageSaving ? <CSpinner size="sm" /> : 'Invia commento'}
                </PermissionButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default TicketsDetail
