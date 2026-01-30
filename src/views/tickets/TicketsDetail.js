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

const useQuery = () => {
  const { search } = useLocation()
  return React.useMemo(() => new URLSearchParams(search), [search])
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

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

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const accountOptions = useMemo(() => {
    if (!Array.isArray(accounts)) return []
    return accounts.map((acc) => ({
      value: acc.id_account,
      label: acc.username || acc.email || `Account ${acc.id_account}`,
    }))
  }, [accounts])

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

  if (!isNew && !id) {
    navigate('/tickets/lista', { replace: true })
    return null
  }

  return (
    <>
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
