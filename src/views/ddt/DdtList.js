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
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilPrint, cilReload } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchDdtList } from '../../services/ddt'
import PermissionButton from '../../components/PermissionButton'

// Formatta una data in locale italiano.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

// Formatta un numero con fallback sicuro.
const formatNumber = (value, options = {}) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value === null || value === undefined || value === '' ? '-' : String(value)
  }
  if (options.decimals !== undefined) {
    return numeric.toFixed(options.decimals)
  }
  return numeric.toString()
}

// Costruisce URL Jasper per stampa PDF DDT.
const buildDdtPdfUrl = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  return `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/DDT.pdf?id_ddt=${numericId}&j_username=gestionaleMp&j_password=gestionaleMp`
}

// Lista DDT con filtri, refresh e azioni rapide.
const DdtList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [causaleFilter, setCausaleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clienteFilter, setClienteFilter] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Carica i DDT disponibili dal backend.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items: data = [] } = await fetchDdtList({
          token,
          signal: controller.signal,
          limit: 0,
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

  // Estrae anni disponibili per filtro select.
  const years = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.anno) values.add(row.anno)
    })
    return Array.from(values).sort((a, b) => b - a)
  }, [items])

  // Estrae causali disponibili per filtro select.
  const causali = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.causale_label) values.add(row.causale_label)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [items])

  // Estrae clienti disponibili per filtro select.
  const clienti = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.cliente_ragione_sociale) values.add(row.cliente_ragione_sociale)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [items])

  // Applica filtri testuali/anno/causale/stato/cliente/periodo lato client.
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    const fromTs = filterDateFrom ? new Date(`${filterDateFrom}T00:00:00`).getTime() : null
    const toTs = filterDateTo ? new Date(`${filterDateTo}T23:59:59`).getTime() : null
    return items.filter((row) => {
      if (yearFilter !== 'all' && row.anno && String(row.anno) !== String(yearFilter)) {
        return false
      }
      if (causaleFilter !== 'all') {
        if ((row.causale_label || '-') !== causaleFilter) {
          return false
        }
      }
      const rowStatus = Number(row.stato_documento) === 2 ? 'emesso' : 'bozza'
      if (statusFilter !== 'all' && rowStatus !== statusFilter) {
        return false
      }
      if (clienteFilter !== 'all' && (row.cliente_ragione_sociale || '-') !== clienteFilter) {
        return false
      }
      const rowTs = row.data_ddt ? new Date(`${row.data_ddt}T12:00:00`).getTime() : NaN
      if (Number.isFinite(fromTs) || Number.isFinite(toTs)) {
        if (!Number.isFinite(rowTs)) return false
        if (Number.isFinite(fromTs) && rowTs < fromTs) return false
        if (Number.isFinite(toTs) && rowTs > toTs) return false
      }
      if (term !== '') {
        const statusLabel = rowStatus
        const haystack = [
          row.cliente_ragione_sociale,
          row.causale_label,
          row.numero_documento,
          row.anno,
          row.note,
          statusLabel,
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
  }, [items, search, yearFilter, causaleFilter, statusFilter, clienteFilter, filterDateFrom, filterDateTo])

  // Reset pagina quando cambiano i filtri.
  useEffect(() => {
    setPage(1)
  }, [search, yearFilter, causaleFilter, statusFilter, clienteFilter, filterDateFrom, filterDateTo])

  // Calcolo paginazione lato client.
  const totalRows = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * rowsPerPage
  const pagedItems = useMemo(
    () => filteredItems.slice(pageStart, pageStart + rowsPerPage),
    [filteredItems, pageStart, rowsPerPage],
  )

  // Apre il dettaglio del DDT selezionato.
  const handleView = (id) => {
    if (!id) return
    navigate(`/ddt/dettagli?id=${id}`)
  }

  // Apre la stampa PDF del documento in nuova tab.
  const handlePrintPdf = (id) => {
    if (typeof window === 'undefined') return
    const url = buildDdtPdfUrl(id)
    if (!url) return
    window.open(url, '_blank', 'noopener')
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <h5 className="mb-0">Documenti di trasporto</h5>
            <small className="text-body-secondary">
              Elenco di tutti i DDT disponibili ordinati per data decrescente.
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
            <PermissionButton
              color="primary"
              onClick={() => navigate('/ddt/crea')}
              permission="ddt.create"
              data-testid="create"
            >
              Nuovo DDT
            </PermissionButton>
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-4">
          <CCol md={5}>
            <CFormInput
              placeholder="Cerca per cliente, numero o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search"
            />
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormSelect value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">Tutti gli anni</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={4} lg={3}>
            <CFormSelect value={causaleFilter} onChange={(e) => setCausaleFilter(e.target.value)}>
              <option value="all">Tutte le causali</option>
              {causali.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={4} lg={2}>
            <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tutti gli stati</option>
              <option value="bozza">Bozza</option>
              <option value="emesso">Emesso</option>
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={6} lg={4}>
            <CFormSelect value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)}>
              <option value="all">Tutti i clienti</option>
              {clienti.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormInput
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              aria-label="Data da"
            />
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormInput
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              aria-label="Data a"
            />
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormSelect
              value={rowsPerPage}
              onChange={(e) => {
                const next = Number(e.target.value) || 25
                setRowsPerPage(next)
                setPage(1)
              }}
            >
              <option value={10}>10 / pagina</option>
              <option value={25}>25 / pagina</option>
              <option value={50}>50 / pagina</option>
              <option value={100}>100 / pagina</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare i DDT.'}</CAlert>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <CAlert color="warning">Nessun DDT trovato.</CAlert>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <CTable hover responsive data-testid="table">
            <CTableHead className="mp-table-head">
              <CTableRow className="align-middle">
                <CTableHeaderCell>Numero</CTableHeaderCell>
                <CTableHeaderCell>Data</CTableHeaderCell>
                <CTableHeaderCell>Stato</CTableHeaderCell>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell>Causale</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Tot. pezzi</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Tot. peso (kg)</CTableHeaderCell>
                <CTableHeaderCell>Note</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {pagedItems.map((row) => {
                const statusMeta =
                  Number(row.stato_documento) === 2
                    ? { label: 'Emesso', color: 'success' }
                    : { label: 'Bozza', color: 'warning' }
                return (
                  <CTableRow key={row.id_ddt} data-testid={`row-${row.id_ddt}`}>
                    <CTableDataCell className="text-nowrap">
                      {row.anno ?? '-'}/{row.numero_documento ?? '-'}
                    </CTableDataCell>
                    <CTableDataCell>{formatDate(row.data_ddt)}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={statusMeta.color} className="text-uppercase">
                        {statusMeta.label}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{row.cliente_ragione_sociale || '-'}</CTableDataCell>
                    <CTableDataCell>
                      {row.causale_label ? (
                        <CBadge color="secondary" className="text-uppercase">
                          {row.causale_label}
                        </CBadge>
                      ) : (
                        <span className="text-body-secondary">-</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatNumber(row.totale_pezzi)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatNumber(row.totale_peso_kg, { decimals: 3 })}
                    </CTableDataCell>
                    <CTableDataCell className="text-truncate" style={{ maxWidth: 220 }}>
                      {row.note || <span className="text-body-secondary">-</span>}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <div className="d-inline-flex gap-2 flex-wrap justify-content-center">
                        <PermissionButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handleView(row.id_ddt)}
                          title="Apri dettaglio"
                          permission="ddt.read"
                        >
                          <CIcon icon={cilArrowRight} />
                        </PermissionButton>
                        <PermissionButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handlePrintPdf(row.id_ddt)}
                          title="Stampa PDF"
                          permission="ddt.read"
                        >
                          <CIcon icon={cilPrint} />
                        </PermissionButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        )}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
            <small className="text-body-secondary">
              Mostrati {pageStart + 1}-{Math.min(pageStart + rowsPerPage, totalRows)} di {totalRows}
            </small>
            <CPagination className="mb-0" align="end">
              <CPaginationItem disabled={safePage <= 1} onClick={() => setPage(1)}>
                «
              </CPaginationItem>
              <CPaginationItem disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ‹
              </CPaginationItem>
              <CPaginationItem active>{safePage}</CPaginationItem>
              <CPaginationItem disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                ›
              </CPaginationItem>
              <CPaginationItem disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                »
              </CPaginationItem>
            </CPagination>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default DdtList


