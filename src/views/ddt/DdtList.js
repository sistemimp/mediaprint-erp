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
import { cilArrowRight, cilPrint, cilReload } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchDdtList } from '../../services/ddt'
import PermissionButton from '../../components/PermissionButton'

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

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

const buildDdtPdfUrl = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  return `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/DDT.pdf?id_ddt=${numericId}&j_username=gestionaleMp&j_password=gestionaleMp`
}

const DdtList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [causaleFilter, setCausaleFilter] = useState('all')
  const [refreshIndex, setRefreshIndex] = useState(0)

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
          limit: 250,
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

  const causali = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.causale_label) values.add(row.causale_label)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [items])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((row) => {
      if (yearFilter !== 'all' && row.anno && String(row.anno) !== String(yearFilter)) {
        return false
      }
      if (causaleFilter !== 'all') {
        if ((row.causale_label || '-') !== causaleFilter) {
          return false
        }
      }
      if (term !== '') {
        const statusLabel = Number(row.stato_documento) === 2 ? 'emesso' : 'bozza'
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
  }, [items, search, yearFilter, causaleFilter])

  const handleView = (id) => {
    if (!id) return
    navigate(`/ddt/dettagli?id=${id}`)
  }

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
              Elenco ultimi {items.length} DDT ordinati per data decrescente.
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
            <PermissionButton color="primary" onClick={() => navigate('/ddt/crea')} permission="ddt.create">
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
          <CTable hover responsive>
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
              {filteredItems.map((row) => {
                const statusMeta =
                  Number(row.stato_documento) === 2
                    ? { label: 'Emesso', color: 'success' }
                    : { label: 'Bozza', color: 'warning' }
                return (
                  <CTableRow key={row.id_ddt}>
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
      </CCardBody>
    </CCard>
  )
}

export default DdtList
