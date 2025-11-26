/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CProgress,
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
import { cilCalendar, cilFilter, cilList, cilReload, cilViewColumn } from '@coreui/icons'
import classNames from 'classnames'
import { fetchLavorazioniDashboard, fetchLavorazioniList } from '../../services/lavorazioni'
import { useAuth } from '../../context/AuthContext'

const fallbackLavorazioni = [
  {
    id_lavorazione: 1001,
    codice: 'JOB-2025-001',
    titolo: 'Campagna tesseramento 2025',
    cliente: 'Comune di Milano',
    stato: 'in_produzione',
    stato_label: 'In produzione',
    priorita: 'high',
    percentuale_avanzamento: 45,
    reparto_label: 'Stampa',
    data_inizio_prevista: '2025-11-15',
    data_fine_prevista: '2025-11-25',
    attivita_aperte: 3,
    attivita_totali: 5,
    operatore_principale: 'Luca Bianchi',
    id_preventivo: 21,
    numero_preventivo: '2025/021',
    ritardo_giorni: 2,
  },
  {
    id_lavorazione: 1002,
    codice: 'JOB-2025-002',
    titolo: 'Stampa brochure istituzionali',
    cliente: 'Regione Lombardia',
    stato: 'pianificata',
    stato_label: 'Pianificata',
    priorita: 'medium',
    percentuale_avanzamento: 10,
    reparto_label: 'Imbustamento',
    data_inizio_prevista: '2025-11-28',
    data_fine_prevista: '2025-12-05',
    attivita_aperte: 2,
    attivita_totali: 4,
    operatore_principale: 'Sara Conti',
    id_preventivo: 22,
    numero_preventivo: '2025/022',
    ritardo_giorni: 0,
  },
  {
    id_lavorazione: 1003,
    codice: 'JOB-2025-003',
    titolo: 'Cellophanatura tessere loyalty',
    cliente: 'ACME S.p.A.',
    stato: 'aperta',
    stato_label: 'In attesa',
    priorita: 'low',
    percentuale_avanzamento: 0,
    reparto_label: 'Cellophanatura',
    data_inizio_prevista: '2025-12-02',
    data_fine_prevista: '2025-12-10',
    attivita_aperte: 1,
    attivita_totali: 3,
    operatore_principale: 'Team Produzione',
    id_preventivo: 25,
    numero_preventivo: '2025/025',
    ritardo_giorni: 0,
  },
]

const fallbackDashboard = {
  totali: {
    aperte: 4,
    in_produzione: 2,
    completate: 1,
    ritardo: 1,
  },
  performance: {
    completamento: 68,
  },
  workload: {
    attivita_aperte: 11,
    attivita_ritardo: 2,
  },
  reparti: [
    { code: 'stampa', label: 'Stampa', attive: 3 },
    { code: 'imbustamento', label: 'Imbustamento', attive: 2 },
    { code: 'cellophanatura', label: 'Cellophanatura', attive: 1 },
  ],
}

const statoOptions = [
  { value: '', label: 'Tutte' },
  { value: 'aperta', label: 'Aperte' },
  { value: 'pianificata', label: 'Pianificate' },
  { value: 'in_produzione', label: 'In produzione' },
  { value: 'completata', label: 'Completate' },
  { value: 'annullata', label: 'Annullate' },
]

const periodoOptions = [
  { value: '7d', label: 'Ultimi 7 giorni' },
  { value: '30d', label: 'Ultimi 30 giorni' },
  { value: '90d', label: 'Ultimi 90 giorni' },
  { value: 'year', label: 'Anno corrente' },
]

const viewModes = [
  { value: 'lista', label: 'Lista', icon: cilList },
  { value: 'kanban', label: 'Kanban', icon: cilViewColumn },
  { value: 'calendario', label: 'Calendario', icon: cilCalendar },
]

const statoBadgeMap = {
  aperta: 'secondary',
  pianificata: 'info',
  in_produzione: 'primary',
  completata: 'success',
  annullata: 'danger',
}

const prioritaBadgeMap = {
  low: 'secondary',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
}

const defaultFilters = {
  search: '',
  stato: '',
  reparto: '',
  periodo: '30d',
}

const defaultPagination = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 1,
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('it-IT')
}

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0%'
  }
  const numeric = Math.min(100, Math.max(0, Number(value)))
  return `${numeric.toFixed(0)}%`
}

const renderStatoBadge = (job) => {
  const code = job?.stato || 'aperta'
  const color = statoBadgeMap[code] || 'secondary'
  const label = job?.stato_label || code.replace('_', ' ')
  return <CBadge color={color}>{label}</CBadge>
}

const renderPrioritaBadge = (priority) => {
  if (!priority) {
    return <CBadge color="secondary">n/d</CBadge>
  }
  const color = prioritaBadgeMap[priority] || 'secondary'
  const label =
    priority === 'low'
      ? 'Bassa'
      : priority === 'medium'
        ? 'Media'
        : priority === 'high'
          ? 'Alta'
          : priority === 'critical'
            ? 'Critica'
            : priority
  return <CBadge color={color}>{label}</CBadge>
}

const LavorazioniList = () => {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [filters, setFilters] = useState(defaultFilters)
  const [viewMode, setViewMode] = useState('lista')
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [serverPagination, setServerPagination] = useState(defaultPagination)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const repartoOptions = useMemo(() => {
    const unique = new Map()
    const source = Array.isArray(stats?.reparti) && stats.reparti.length > 0 ? stats.reparti : fallbackDashboard.reparti
    source.forEach((reparto) => {
      if (reparto?.code && !unique.has(reparto.code)) {
        unique.set(reparto.code, reparto.label || reparto.code)
      }
    })
    return [
      { value: '', label: 'Tutti i reparti' },
      ...Array.from(unique.entries()).map(([code, label]) => ({ value: code, label })),
    ]
  }, [stats?.reparti])

  useEffect(() => {
    setPage(1)
  }, [filters.stato, filters.reparto, filters.periodo])

  useEffect(() => {
    if (!token) {
      return
    }
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dashResp, listResp] = await Promise.all([
          fetchLavorazioniDashboard({
            token,
            periodo: filters.periodo,
            reparto: filters.reparto,
            stato: filters.stato,
            signal: controller.signal,
          }),
          fetchLavorazioniList({
            token,
            page,
            pageSize,
            search: filters.search,
            stato: filters.stato,
            reparto: filters.reparto,
            periodo: filters.periodo,
            signal: controller.signal,
          }),
        ])
        setStats(dashResp)
        setItems(listResp.items)
        if (listResp.pagination) {
          setServerPagination(listResp.pagination)
        } else {
          setServerPagination({
            ...defaultPagination,
            page,
            page_size: pageSize,
            total_items: listResp.items?.length ?? 0,
            total_pages: 1,
          })
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('Impossibile caricare il modulo lavorazioni:', err)
        setError(err)
        setStats((prev) => prev || fallbackDashboard)
        setItems((prev) => (prev.length > 0 ? prev : fallbackLavorazioni))
        setServerPagination((prev) =>
          prev?.total_items > 0
            ? prev
            : {
                ...defaultPagination,
                page: 1,
                page_size: fallbackLavorazioni.length,
                total_items: fallbackLavorazioni.length,
                total_pages: 1,
              },
        )
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, filters.periodo, filters.reparto, filters.search, filters.stato, page, pageSize, refreshIndex])

  const summaryCards = useMemo(() => {
    const source = stats?.totali || fallbackDashboard.totali
    return [
      {
        key: 'aperte',
        label: 'Lavorazioni attive',
        value: source?.aperte ?? 0,
      },
      {
        key: 'in_produzione',
        label: 'In produzione',
        value: source?.in_produzione ?? 0,
      },
      {
        key: 'completate',
        label: 'Completate (mese)',
        value: source?.completate ?? 0,
      },
      {
        key: 'ritardo',
        label: 'Attivita in ritardo',
        value: source?.ritardo ?? fallbackDashboard.totali.ritardo,
      },
    ]
  }, [stats?.totali])

  const handleFilterChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setRefreshIndex((value) => value + 1)
  }

  const handleRefreshClick = () => {
    setRefreshIndex((value) => value + 1)
  }

  const handlePageChange = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, serverPagination?.total_pages || 1)))
  }

  const handlePageSizeChange = (event) => {
    const value = Number(event.target.value) || 10
    setPageSize(value)
    setPage(1)
  }

  const currentItems = items.length > 0 ? items : fallbackLavorazioni

  const pageInfo = `Pagina ${serverPagination.page || page} di ${serverPagination.total_pages || 1}`

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-0">Lavorazioni e attivita</h2>
          <p className="text-body-secondary small mb-0">Monitora il flusso operativo derivante dai preventivi confermati.</p>
        </div>
        <CButton color="primary" variant="outline" onClick={handleRefreshClick}>
          <CIcon icon={cilReload} className="me-2" />
          Aggiorna
        </CButton>
      </div>

      <CRow className="mb-4">
        {summaryCards.map((card) => (
          <CCol key={card.key} sm={6} lg={3} className="mb-3 mb-lg-0">
            <CCard className="h-100 border-0 shadow-sm">
              <CCardBody>
                <div className="text-body-secondary text-uppercase small fw-semibold">{card.label}</div>
                <div className="fs-3 fw-semibold mt-2">{card.value}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between">
            <strong>Filtri rapidi</strong>
            <CButtonGroup>
              {viewModes.map((mode) => (
                <CButton
                  key={mode.value}
                  color={viewMode === mode.value ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode(mode.value)}
                >
                  <CIcon icon={mode.icon} className="me-2" />
                  {mode.label}
                </CButton>
              ))}
            </CButtonGroup>
          </div>
        </CCardHeader>
        <CCardBody>
          <CForm className="row g-3" onSubmit={handleSearchSubmit}>
            <CCol md={4}>
              <CFormLabel htmlFor="lavorazioni-search">Ricerca</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilList} />
                </CInputGroupText>
                <CFormInput
                  id="lavorazioni-search"
                  placeholder="Titolo, cliente, codice, preventivo..."
                  value={filters.search}
                  onChange={handleFilterChange('search')}
                />
              </CInputGroup>
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="lavorazioni-stato">Stato</CFormLabel>
              <CFormSelect id="lavorazioni-stato" value={filters.stato} onChange={handleFilterChange('stato')}>
                {statoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="lavorazioni-reparto">Reparto</CFormLabel>
              <CFormSelect id="lavorazioni-reparto" value={filters.reparto} onChange={handleFilterChange('reparto')}>
                {repartoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormLabel htmlFor="lavorazioni-periodo">Periodo</CFormLabel>
              <CFormSelect id="lavorazioni-periodo" value={filters.periodo} onChange={handleFilterChange('periodo')}>
                {periodoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} className="d-flex justify-content-end gap-2">
              <CButton color="light" type="button" onClick={() => setFilters(defaultFilters)}>
                Azzera filtri
              </CButton>
              <CButton color="primary" type="submit">
                <CIcon icon={cilFilter} className="me-2" />
                Applica
              </CButton>
            </CCol>
          </CForm>
          {viewMode !== 'lista' ? (
            <CAlert color="warning" className="mt-4 mb-0">
              Le viste {viewMode} saranno disponibili a breve. Al momento mostriamo l&apos;elenco tabellare per permettere la
              navigazione e la validazione del backend.
            </CAlert>
          ) : null}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader className="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
          <div>
            <strong>Elenco lavorazioni</strong>
            <div className="small text-body-secondary">{pageInfo}</div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <CFormSelect
              size="sm"
              value={pageSize}
              onChange={handlePageSizeChange}
              style={{ width: '120px' }}
              aria-label="Elementi per pagina"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / pagina
                </option>
              ))}
            </CFormSelect>
            <CButtonGroup size="sm">
              <CButton color="outline-primary" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                «
              </CButton>
              <CButton
                color="outline-primary"
                disabled={page >= (serverPagination?.total_pages || 1)}
                onClick={() => handlePageChange(page + 1)}
              >
                »
              </CButton>
            </CButtonGroup>
          </div>
        </CCardHeader>
        <CCardBody className="p-0">
          {error ? (
            <CAlert color="danger" className="m-3">
              {error?.message || 'Errore durante il caricamento delle lavorazioni.'}
            </CAlert>
          ) : null}
          <div className="position-relative">
            {loading ? (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
                <CSpinner color="primary" />
              </div>
            ) : null}
            <CTable hover responsive className="mb-0">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Lavorazione</CTableHeaderCell>
                  <CTableHeaderCell>Cliente</CTableHeaderCell>
                  <CTableHeaderCell>Stato</CTableHeaderCell>
                  <CTableHeaderCell>Priorita</CTableHeaderCell>
                  <CTableHeaderCell>Avanzamento</CTableHeaderCell>
                  <CTableHeaderCell>Reparto</CTableHeaderCell>
                  <CTableHeaderCell>Periodo</CTableHeaderCell>
                  <CTableHeaderCell>Attivita</CTableHeaderCell>
                  <CTableHeaderCell>Operatore</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((job) => {
                    const progressValue = Number(job.percentuale_avanzamento) || 0
                    return (
                      <CTableRow
                        key={job.id_lavorazione || job.codice}
                        className={classNames('align-middle', 'cursor-pointer')}
                        style={{ cursor: 'pointer' }}
                        onClick={() => job.id_lavorazione && navigate(`/lavorazioni/dettaglio?id=${job.id_lavorazione}`)}
                      >
                        <CTableDataCell>
                          <div className="fw-semibold">{job.titolo || job.codice}</div>
                          <div className="text-body-secondary small">{job.codice || `JOB-${job.id_lavorazione}`}</div>
                          {job.ritardo_giorni > 0 ? (
                            <CBadge color="danger" className="mt-1">
                              Ritardo {job.ritardo_giorni}g
                            </CBadge>
                          ) : null}
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-semibold">{job.cliente || '-'}</div>
                          <div className="text-body-secondary small">
                            {job.numero_preventivo ? `Preventivo ${job.numero_preventivo}` : '—'}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{renderStatoBadge(job)}</CTableDataCell>
                        <CTableDataCell>{renderPrioritaBadge(job.priorita)}</CTableDataCell>
                        <CTableDataCell style={{ minWidth: '180px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <CProgress
                              thin
                              color={progressValue >= 100 ? 'success' : 'primary'}
                              value={Math.min(100, Math.max(0, progressValue))}
                              className="flex-grow-1"
                            />
                            <span className="text-nowrap small">{formatPercent(progressValue)}</span>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{job.reparto_label || job.reparto || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <div>{formatDate(job.data_inizio_prevista)}</div>
                          <div className="text-body-secondary small">{formatDate(job.data_fine_prevista)}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-semibold">
                            {job.attivita_aperte ?? job.attivita_in_corso ?? '-'} / {job.attivita_totali ?? '-'}
                          </div>
                          <div className="text-body-secondary small">aperte / totali</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-semibold">{job.operatore_principale || '—'}</div>
                          <div className="text-body-secondary small">+ altri</div>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center py-5 text-body-secondary">
                      Nessuna lavorazione disponibile per i filtri selezionati.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default LavorazioniList
