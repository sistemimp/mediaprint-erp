import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CFormSelect,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchTickets } from '../../services/tickets'
import { fetchAccounts } from '../../services/accounts'
import PermissionButton from '../../components/PermissionButton'

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'aperto', label: 'Aperto' },
  { value: 'in_lavorazione', label: 'In lavorazione' },
  { value: 'risolto', label: 'Risolto' },
  { value: 'chiuso', label: 'Chiuso' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'bassa', label: 'Bassa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
]

// Mappa lo stato ticket sul colore badge in tabella.
const statusColor = (status) => {
  if (status === 'aperto') return 'warning'
  if (status === 'in_lavorazione') return 'info'
  if (status === 'risolto') return 'success'
  if (status === 'chiuso') return 'secondary'
  return 'primary'
}

// Mappa la priorita ticket sul colore badge in tabella.
const priorityColor = (priority) => {
  if (priority === 'bassa') return 'success'
  if (priority === 'media') return 'warning'
  if (priority === 'alta') return 'danger'
  if (priority === 'critica') return 'danger'
  return 'secondary'
}

// Formatta una data in locale italiano con fallback al valore originale.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

// Lista ticket con filtri operativi (stato/priorita/assegnatario) e accesso rapido al dettaglio.
const TicketsList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [accounts, setAccounts] = useState([])
  const [filters, setFilters] = useState({
    q: '',
    stato: '',
    priorita: '',
    assigned_to: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Carica la lista ticket usando i filtri correnti.
  const loadTickets = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const { items: list } = await fetchTickets({
        token,
        q: filters.q,
        stato: filters.stato,
        priorita: filters.priorita,
        assignedTo: filters.assigned_to,
      })
      setItems(list)
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [filters, logout, token])

  // Carica la lista operatori per il filtro "assegnato a".
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

  // Primo caricamento pagina e refresh quando cambia loadTickets.
  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Aggiorna il singolo filtro al cambio input/select.
  const handleChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  // Submit filtri: ricarica ticket senza refresh browser.
  const handleSearch = (event) => {
    event.preventDefault()
    loadTickets()
  }

  // Ripristina i filtri ai valori iniziali.
  const handleReset = () => {
    setFilters({ q: '', stato: '', priorita: '', assigned_to: '' })
  }

  // Costruisce le option del filtro operatori dalla lista account.
  const accountOptions = useMemo(() => {
    if (!Array.isArray(accounts)) return []
    return accounts.map((acc) => ({
      value: acc.id_account,
      label: acc.username || acc.email || `Account ${acc.id_account}`,
    }))
  }, [accounts])

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Ticketing bug</h5>
            <small className="text-body-secondary">Gestione interna delle segnalazioni</small>
          </div>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={() => navigate('/tickets/dettagli?mode=new')}
            permission="bug.create"
            data-testid="create"
          >
            <CIcon icon={cilPlus} className="me-2" />
            Nuovo ticket
          </PermissionButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CForm className="mb-3" onSubmit={handleSearch}>
          <CRow className="g-2 align-items-end">
            <CCol md={4}>
              <CFormInput
                name="q"
                label="Ricerca"
                placeholder="Titolo, descrizione o modulo"
                value={filters.q}
                onChange={handleChange}
                data-testid="search"
              />
            </CCol>
            <CCol md={3}>
              <CFormSelect
                name="stato"
                label="Stato"
                value={filters.stato}
                onChange={handleChange}
                options={STATUS_OPTIONS}
              />
            </CCol>
            <CCol md={3}>
              <CFormSelect
                name="priorita"
                label="Priorità"
                value={filters.priorita}
                onChange={handleChange}
                options={PRIORITY_OPTIONS}
              />
            </CCol>
            <CCol md={2}>
              <CFormSelect
                name="assigned_to"
                label="Assegnato a"
                value={filters.assigned_to}
                onChange={handleChange}
              >
                <option value="">Tutti</option>
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} className="d-flex gap-2">
              <CButton type="submit" color="primary" disabled={loading}>
                {loading ? <CSpinner size="sm" /> : 'Cerca'}
              </CButton>
              <CButton
                type="button"
                color="light"
                variant="outline"
                onClick={handleReset}
                data-testid="filters-reset"
              >
                Reset
              </CButton>
            </CCol>
          </CRow>
        </CForm>

        {error && (
          <CAlert color="danger">
            {error.message || 'Errore durante il caricamento dei ticket.'}
          </CAlert>
        )}

        <CTable hover responsive data-testid="table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: 80 }}>ID</CTableHeaderCell>
              <CTableHeaderCell>Titolo</CTableHeaderCell>
              <CTableHeaderCell>Stato</CTableHeaderCell>
              <CTableHeaderCell>Priorità</CTableHeaderCell>
              <CTableHeaderCell>Modulo</CTableHeaderCell>
              <CTableHeaderCell>Assegnato a</CTableHeaderCell>
              <CTableHeaderCell>Aggiornato</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {loading ? (
              <CTableRow>
                <CTableDataCell colSpan={8} className="text-center">
                  <CSpinner color="primary" />
                </CTableDataCell>
              </CTableRow>
            ) : items.length === 0 ? (
              <CTableRow>
                <CTableDataCell colSpan={8} className="text-center text-body-secondary">
                  Nessun ticket trovato.
                </CTableDataCell>
              </CTableRow>
            ) : (
              items.map((ticket) => (
                <CTableRow key={ticket.id_ticket} data-testid={`row-${ticket.id_ticket}`}>
                  <CTableDataCell>{ticket.id_ticket}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-semibold">{ticket.titolo}</div>
                    {ticket.messages_count ? (
                      <small className="text-body-secondary">
                        {ticket.messages_count} commenti
                      </small>
                    ) : null}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={statusColor(ticket.stato)} className="text-uppercase">
                      {ticket.stato || '-'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={priorityColor(ticket.priorita)} className="text-uppercase">
                      {ticket.priorita || '-'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>{ticket.modulo || '-'}</CTableDataCell>
                  <CTableDataCell>{ticket.assigned_to_name || '-'}</CTableDataCell>
                  <CTableDataCell>{formatDate(ticket.updated_at)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/tickets/dettagli?id=${ticket.id_ticket}`)}
                    >
                      Apri
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))
            )}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default TicketsList


