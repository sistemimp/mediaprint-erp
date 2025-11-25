import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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
import { cilArrowRight, cilReload } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchFattureList } from '../../services/fatture'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

const formatCurrency = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value === null || value === undefined || value === '' ? '-' : String(value)
  }
  return currencyFormatter.format(numeric)
}

const FattureList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sezionaleFilter, setSezionaleFilter] = useState('all')
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items: data = [] } = await fetchFattureList({
          token,
          signal: controller.signal,
          limit: 300,
        })
        setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setItems([])
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout, refreshIndex])

  const years = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.anno) values.add(row.anno)
    })
    return Array.from(values).sort((a, b) => b - a)
  }, [items])

  const statuses = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.stato_label) values.add(row.stato_label)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [items])

  const sezionali = useMemo(() => {
    const map = new Map()
    items.forEach((row) => {
      if (row.id_sezionale == null) {
        return
      }
      const key = String(row.id_sezionale)
      if (map.has(key)) {
        return
      }
      const parts = []
      if (row.sezionale_code) {
        parts.push(row.sezionale_code)
      }
      if (row.sezionale_label && row.sezionale_label !== row.sezionale_code) {
        parts.push(row.sezionale_label)
      }
      map.set(key, {
        id: key,
        label: parts.length > 0 ? parts.join(' - ') : `Sezionale ${key}`,
      })
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((row) => {
      if (yearFilter !== 'all' && row.anno && String(row.anno) !== String(yearFilter)) {
        return false
      }
      if (statusFilter !== 'all') {
        if ((row.stato_label || '-') !== statusFilter) {
          return false
        }
      }
      if (sezionaleFilter !== 'all') {
        if (row.id_sezionale == null || String(row.id_sezionale) !== sezionaleFilter) {
          return false
        }
      }
      if (term !== '') {
        const haystack = [
          row.cliente_ragione_sociale,
          row.numero_documento,
          row.anno,
          row.stato_label,
          row.note,
          row.sezionale_code,
          row.sezionale_label,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(' ')
        if (!haystack.includes(term)) {
          return false
        }
      }
      return true
    })
  }, [items, search, yearFilter, statusFilter, sezionaleFilter])

  const handleView = (id) => {
    if (!id) return
    navigate(`/fatture/dettagli?id=${id}`)
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <h5 className="mb-0">Fatture</h5>
            <small className="text-body-secondary">
              Elenco ultimi {items.length} documenti fattura con importi principali.
            </small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              color="secondary"
              variant="ghost"
              disabled={loading}
              onClick={() => setRefreshIndex((v) => v + 1)}
            >
              <CIcon icon={cilReload} className="me-2" />
              Aggiorna
            </CButton>
            <CButton color="primary" onClick={() => navigate('/fatture/crea')} disabled>
              Nuova fattura
            </CButton>
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-4">
          <CCol xs={12} md={4}>
            <CFormInput
              placeholder="Cerca per cliente, numero o note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CCol>
          <CCol xs={6} md={2} lg={2}>
            <CFormSelect value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">Tutti gli anni</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={3}>
            <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tutti gli stati</option>
              {statuses.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={3}>
            <CFormSelect
              value={sezionaleFilter}
              onChange={(e) => setSezionaleFilter(e.target.value)}
              disabled={sezionali.length === 0}
            >
              <option value="all">Tutti i sezionali</option>
              {sezionali.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare le fatture.'}</CAlert>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <CAlert color="warning">Nessuna fattura trovata.</CAlert>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <CTable hover responsive>
            <CTableHead color="light">
              <CTableRow className="align-middle">
                <CTableHeaderCell>Numero</CTableHeaderCell>
                <CTableHeaderCell>Sezionale</CTableHeaderCell>
                <CTableHeaderCell>Data</CTableHeaderCell>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                <CTableHeaderCell>Stato</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredItems.map((row) => (
                <CTableRow key={row.id_fattura}>
                  <CTableDataCell className="text-nowrap">
                    {row.anno ?? '-'}/{row.numero_documento ?? '-'}
                  </CTableDataCell>
                  <CTableDataCell>
                    {row.id_sezionale || row.sezionale_code || row.sezionale_label ? (
                      <>
                        <div className="fw-semibold">{row.sezionale_code || row.sezionale_label || '-'}</div>
                        {row.sezionale_label && row.sezionale_code && row.sezionale_label !== row.sezionale_code && (
                          <small className="text-body-secondary">{row.sezionale_label}</small>
                        )}
                      </>
                    ) : (
                      <span className="text-body-secondary">-</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>{formatDate(row.data_fattura)}</CTableDataCell>
                  <CTableDataCell>{row.cliente_ragione_sociale || '-'}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(row.totale_imponibile)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{formatCurrency(row.totale_iva)}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatCurrency(row.totale)}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatCurrency(row.saldo)}</CTableDataCell>
                  <CTableDataCell>
                    {row.stato_label ? (
                      <CBadge color="secondary">{row.stato_label}</CBadge>
                    ) : (
                      <span className="text-body-secondary">-</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CButton color="link" size="sm" className="p-0" onClick={() => handleView(row.id_fattura)}>
                      <CIcon icon={cilArrowRight} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default FattureList
