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
import { fetchAcquistiRichieste } from '../../services/acquistiRichieste'
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
  { value: '', label: 'Tutte le priorita' },
  { value: 'bassa', label: 'Bassa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
]

const statusColor = (status) => {
  if (status === 'aperto') return 'warning'
  if (status === 'in_lavorazione') return 'info'
  if (status === 'risolto') return 'success'
  if (status === 'chiuso') return 'secondary'
  return 'primary'
}

const priorityColor = (priority) => {
  if (priority === 'bassa') return 'success'
  if (priority === 'media') return 'warning'
  if (priority === 'alta' || priority === 'critica') return 'danger'
  return 'secondary'
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

const AcquistiRichiesteList = () => {
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

  const loadItems = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const { items: list } = await fetchAcquistiRichieste({
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
    loadItems()
  }, [loadItems])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = (event) => {
    event.preventDefault()
    loadItems()
  }

  const handleReset = () => {
    setFilters({ q: '', stato: '', priorita: '', assigned_to: '' })
  }

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
            <h5 className="mb-0">Richieste acquisto</h5>
            <small className="text-body-secondary">Gestione ticket interni per richieste di acquisto</small>
          </div>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={() => navigate('/acquisti/richieste/dettagli?mode=new')}
            permission="prev.create"
          >
            <CIcon icon={cilPlus} className="me-2" />
            Nuova richiesta
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
                placeholder="Titolo o descrizione"
                value={filters.q}
                onChange={handleChange}
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
                label="Priorita"
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
              <CButton type="button" color="light" variant="outline" onClick={handleReset}>
                Reset
              </CButton>
            </CCol>
          </CRow>
        </CForm>

        {error && (
          <CAlert color="danger">
            {error.message || 'Errore durante il caricamento delle richieste.'}
          </CAlert>
        )}

        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: 80 }}>ID</CTableHeaderCell>
              <CTableHeaderCell>Titolo</CTableHeaderCell>
              <CTableHeaderCell>Stato</CTableHeaderCell>
              <CTableHeaderCell>Priorita</CTableHeaderCell>
              <CTableHeaderCell>Assegnato a</CTableHeaderCell>
              <CTableHeaderCell>Aggiornato</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {loading ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center">
                  <CSpinner color="primary" />
                </CTableDataCell>
              </CTableRow>
            ) : items.length === 0 ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center text-body-secondary">
                  Nessuna richiesta trovata.
                </CTableDataCell>
              </CTableRow>
            ) : (
              items.map((ticket) => (
                <CTableRow key={ticket.id_ticket}>
                  <CTableDataCell>{ticket.id_ticket}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-semibold">{ticket.titolo}</div>
                    {ticket.messages_count ? (
                      <small className="text-body-secondary">{ticket.messages_count} commenti</small>
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
                  <CTableDataCell>{ticket.assigned_to_name || '-'}</CTableDataCell>
                  <CTableDataCell>{formatDate(ticket.updated_at)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/acquisti/richieste/dettagli?id=${ticket.id_ticket}`)}
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

export default AcquistiRichiesteList
