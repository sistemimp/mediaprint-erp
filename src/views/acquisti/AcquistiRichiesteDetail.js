import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilSettings } from '@coreui/icons'
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
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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

import { useAuth } from '../../context/AuthContext'
import {
  fetchAcquistiRichiestaDetail,
  createAcquistiRichiesta,
  updateAcquistiRichiesta,
  createAcquistiRichiestaComment,
  unlinkAcquistiRichiestaPreventivo,
} from '../../services/acquistiRichieste'
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

const formatCurrency = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

const AcquistiRichiesteDetail = () => {
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
  const [url, setUrl] = useState('')
  const [stato, setStato] = useState('aperto')
  const [priorita, setPriorita] = useState('media')
  const [assignedTo, setAssignedTo] = useState([])
  const [createdByName, setCreatedByName] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [closedAt, setClosedAt] = useState('')

  const [messages, setMessages] = useState([])
  const [preventivi, setPreventivi] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [messageSaving, setMessageSaving] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [assigneesModalVisible, setAssigneesModalVisible] = useState(false)
  const [assignedToDraft, setAssignedToDraft] = useState([])
  const [assigneeToAdd, setAssigneeToAdd] = useState('')

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
        const data = await fetchAcquistiRichiestaDetail({ token, id, signal: controller.signal })
        const ticket = data?.ticket || {}
        setTitolo(ticket.titolo || '')
        setDescrizione(ticket.descrizione || '')
        setUrl(ticket.url || '')
        setStato(ticket.stato || 'aperto')
        setPriorita(ticket.priorita || 'media')
        const assignees = Array.isArray(data?.assignees) ? data.assignees : []
        if (assignees.length > 0) {
          setAssignedTo(
            assignees
              .map((row) => Number(row?.id_account || 0))
              .filter((n) => Number.isFinite(n) && n > 0)
              .map(String),
          )
        } else {
          setAssignedTo(ticket.assigned_to ? [String(ticket.assigned_to)] : [])
        }
        setCreatedByName(ticket.created_by_name || '')
        setCreatedAt(ticket.created_at || '')
        setUpdatedAt(ticket.updated_at || '')
        setClosedAt(ticket.closed_at || '')
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
        setPreventivi(Array.isArray(data?.preventivi) ? data.preventivi : [])
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

  const assignedOperators = useMemo(() => {
    const labelById = new Map(accountOptions.map((option) => [String(option.value), option.label]))
    return assignedTo
      .map((idValue) => ({
        id: String(idValue),
        label: labelById.get(String(idValue)) || `Account ${idValue}`,
      }))
      .filter((item) => item.label.trim() !== '')
  }, [accountOptions, assignedTo])

  const commentsCountByOperator = useMemo(() => {
    const counts = {}
    messages.forEach((msg) => {
      const key = String(Number(msg?.created_by || 0))
      if (key === '0') return
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [messages])

  const availableAssigneeOptions = useMemo(
    () => accountOptions.filter((option) => !assignedToDraft.includes(String(option.value))),
    [accountOptions, assignedToDraft],
  )

  const draftAssignedOperators = useMemo(() => {
    const labelById = new Map(accountOptions.map((option) => [String(option.value), option.label]))
    return assignedToDraft.map((idValue) => ({
      id: String(idValue),
      label: labelById.get(String(idValue)) || `Account ${idValue}`,
    }))
  }, [accountOptions, assignedToDraft])

  const loadDetail = async () => {
    if (!token || !id) return
    const data = await fetchAcquistiRichiestaDetail({ token, id })
    setMessages(Array.isArray(data?.messages) ? data.messages : [])
    setPreventivi(Array.isArray(data?.preventivi) ? data.preventivi : [])
    setUpdatedAt(data?.ticket?.updated_at || updatedAt)
  }

  const handleOpenAssigneesModal = () => {
    setAssignedToDraft(Array.isArray(assignedTo) ? assignedTo : [])
    setAssigneeToAdd('')
    setAssigneesModalVisible(true)
  }

  const handleCloseAssigneesModal = () => {
    setAssigneesModalVisible(false)
    setAssignedToDraft([])
    setAssigneeToAdd('')
  }

  const handleAddDraftAssignee = () => {
    const idValue = String(assigneeToAdd || '').trim()
    if (idValue === '') return
    setAssignedToDraft((prev) => {
      if (prev.includes(idValue)) return prev
      return [...prev, idValue]
    })
    setAssigneeToAdd('')
  }

  const handleRemoveDraftAssignee = (idValue) => {
    const key = String(idValue)
    setAssignedToDraft((prev) => prev.filter((value) => value !== key))
  }

  const handleConfirmAssignees = () => {
    setAssignedTo(assignedToDraft)
    setAssigneesModalVisible(false)
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const result = await createAcquistiRichiesta({
          token,
          body: {
            titolo,
            descrizione,
            url,
            stato,
            priorita,
            assigned_to: assignedTo.map(Number).filter((n) => Number.isFinite(n) && n > 0),
          },
        })
        const newId = result?.id_ticket
        if (newId) {
          navigate(`/acquisti/richieste/dettagli?id=${newId}`)
          setFeedback({ message: 'Richiesta creata', color: 'success' })
        }
      } else {
        await updateAcquistiRichiesta({
          token,
          body: {
            id_ticket: id,
            stato,
            priorita,
            assigned_to: assignedTo.map(Number).filter((n) => Number.isFinite(n) && n > 0),
          },
        })
        setFeedback({ message: 'Richiesta aggiornata', color: 'success' })
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
      await createAcquistiRichiestaComment({
        token,
        body: { id_ticket: id, message },
      })
      setNewMessage('')
      await loadDetail()
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

  const handleUnlinkPreventivo = async (idPreventivo) => {
    if (!token || !id || !idPreventivo) return
    try {
      await unlinkAcquistiRichiestaPreventivo({
        token,
        body: { id_ticket: id, id_preventivo: idPreventivo },
      })
      await loadDetail()
      setFeedback({ message: 'Preventivo scollegato', color: 'success' })
    } catch (e) {
      setError(e)
    }
  }

  if (!isNew && !id) {
    navigate('/acquisti/richieste/lista', { replace: true })
    return null
  }

  return (
    <>
      <CRow className="g-3 mb-3">
        <CCol xs={12} xl={10}>
          <CCard className="h-100">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{isNew ? 'Nuova richiesta acquisto' : `Richiesta #${id}`}</h5>
                  {!isNew && (
                    <small className="text-body-secondary">
                      Creata da {createdByName || '-'} · {formatDate(createdAt)}
                    </small>
                  )}
                </div>
                <PermissionButton
                  color="primary"
                  onClick={handleSave}
                  disabled={saving || loading}
                  permission={isNew ? 'prev.create' : 'prev.write'}
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
                      {error.message || 'Errore durante il caricamento della richiesta.'}
                    </CAlert>
                  )}
                  <CForm>
                    <CRow className="g-3">
                      <CCol md={8}>
                        <CFormInput
                          label="Titolo"
                          value={titolo}
                          onChange={(e) => setTitolo(e.target.value)}
                          disabled={!isNew}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormInput
                          label="URL di riferimento"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://..."
                          disabled={!isNew}
                        />
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
                          label="Priorita"
                          value={priorita}
                          onChange={(e) => setPriorita(e.target.value)}
                          options={PRIORITY_OPTIONS}
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormTextarea
                          label="Descrizione richiesta"
                          rows={6}
                          value={descrizione}
                          onChange={(e) => setDescrizione(e.target.value)}
                          disabled={!isNew}
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
        <CCol xs={12} xl={2}>
          <CCard className="h-100">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Squadra e assegnazioni</strong>
              <PermissionButton
                color="light"
                size="sm"
                onClick={handleOpenAssigneesModal}
                disabled={saving || loading}
                permission={isNew ? 'prev.create' : 'prev.write'}
                title="Gestisci squadra e assegnazioni"
                aria-label="Gestisci squadra e assegnazioni"
              >
                <CIcon icon={cilSettings} />
              </PermissionButton>
            </CCardHeader>
            <CCardBody>
              {assignedOperators.length > 0 ? (
                <CListGroup className="mb-0">
                  {assignedOperators.map((operator) => (
                    <CListGroupItem key={`${operator.id}-${operator.label}`}>
                      <div className="fw-semibold">{operator.label}</div>
                      <CBadge color="secondary" size="sm" className="mt-2">
                        {commentsCountByOperator[operator.id] || 0} commenti
                      </CBadge>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun operatore assegnato.
                </CAlert>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {!isNew && (
        <CCard className="mb-3">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Preventivi acquisto collegati</h6>
            <PermissionButton
              color="primary"
              size="sm"
              permission="prev.create"
              onClick={() => navigate(`/acquisti/preventivi/crea?from_ticket=${id}`)}
            >
              Genera preventivo acquisto
            </PermissionButton>
          </CCardHeader>
          <CCardBody>
            {preventivi.length === 0 ? (
              <CAlert color="light" className="mb-0">Nessun preventivo collegato.</CAlert>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Numero</CTableHeaderCell>
                    <CTableHeaderCell>Fornitore</CTableHeaderCell>
                    <CTableHeaderCell>Data</CTableHeaderCell>
                    <CTableHeaderCell>Totale</CTableHeaderCell>
                    <CTableHeaderCell>Stato</CTableHeaderCell>
                    <CTableHeaderCell></CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {preventivi.map((row) => (
                    <CTableRow key={row.id_preventivo}>
                      <CTableDataCell>{row.id_preventivo}</CTableDataCell>
                      <CTableDataCell>
                        {row.numero_documento ? `${row.numero_documento}/${row.anno_preventivo || ''}` : '-'}
                      </CTableDataCell>
                      <CTableDataCell>{row.ragione_sociale || '-'}</CTableDataCell>
                      <CTableDataCell>{row.data_preventivo || '-'}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(row.totale)}</CTableDataCell>
                      <CTableDataCell>{row.stato_label || '-'}</CTableDataCell>
                      <CTableDataCell className="text-end d-flex gap-2 justify-content-end">
                        <PermissionButton
                          color="primary"
                          size="sm"
                          variant="ghost"
                          permission="prev.read"
                          onClick={() =>
                            navigate(`/acquisti/preventivi/dettagli?id=${row.id_preventivo}`)
                          }
                        >
                          Apri
                        </PermissionButton>
                        <PermissionButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          permission="prev.write"
                          onClick={() => handleUnlinkPreventivo(Number(row.id_preventivo))}
                        >
                          Scollega
                        </PermissionButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      )}

      {!isNew && (
        <CCard>
          <CCardHeader>
            <h6 className="mb-0">Commenti e attivita</h6>
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
                <CButton
                  color="primary"
                  onClick={handleAddMessage}
                  disabled={messageSaving || !newMessage.trim()}
                >
                  {messageSaving ? <CSpinner size="sm" /> : 'Invia commento'}
                </CButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      )}

      <CModal visible={assigneesModalVisible} onClose={handleCloseAssigneesModal} backdrop="static">
        <CForm>
          <CModalHeader>
            <CModalTitle>Operatori assegnati</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel>Aggiungi operatore</CFormLabel>
                <div className="d-flex gap-2">
                  <CFormSelect
                    value={assigneeToAdd}
                    onChange={(e) => setAssigneeToAdd(e.target.value)}
                    disabled={availableAssigneeOptions.length === 0}
                  >
                    <option value="">
                      {availableAssigneeOptions.length === 0 ? 'Nessun operatore disponibile' : 'Seleziona operatore'}
                    </option>
                    {availableAssigneeOptions.map((option) => (
                      <option key={option.value} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                  <CButton
                    color="primary"
                    type="button"
                    onClick={handleAddDraftAssignee}
                    disabled={!assigneeToAdd}
                  >
                    Aggiungi
                  </CButton>
                </div>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Operatori assegnati</CFormLabel>
                {draftAssignedOperators.length === 0 ? (
                  <CAlert color="light" className="mb-0">
                    Nessun operatore assegnato.
                  </CAlert>
                ) : (
                  <CListGroup className="mb-0">
                    {draftAssignedOperators.map((operator) => (
                      <CListGroupItem
                        key={`${operator.id}-${operator.label}`}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span>{operator.label}</span>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => handleRemoveDraftAssignee(operator.id)}
                        >
                          Rimuovi
                        </CButton>
                      </CListGroupItem>
                    ))}
                  </CListGroup>
                )}
                <small className="text-body-secondary">
                  La modifica viene applicata alla richiesta quando premi Salva.
                </small>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="link" type="button" onClick={handleCloseAssigneesModal}>
              Annulla
            </CButton>
            <CButton color="primary" type="button" onClick={handleConfirmAssignees}>
              Conferma
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default AcquistiRichiesteDetail
