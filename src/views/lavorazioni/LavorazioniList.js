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
import { cilCalendar, cilChevronLeft, cilChevronRight, cilFilter, cilList, cilReload, cilViewColumn } from '@coreui/icons'
import classNames from 'classnames'
import { fetchLavorazioniDashboard, fetchLavorazioniList, updateLavorazioneStatus } from '../../services/lavorazioni'
import { useAuth } from '../../context/AuthContext'

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

const statoLabelLookup = statoOptions.reduce((acc, option) => {
  if (option.value) {
    acc[option.value] = option.label
  }
  return acc
}, {})

const knownStati = statoOptions.map((option) => option.value).filter(Boolean)
const monthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const parseDate = (value) => {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  date.setHours(0, 0, 0, 0)
  return date
}

const formatISODate = (date) => {
  if (!(date instanceof Date)) {
    return ''
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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

const emptyTotals = Object.freeze({
  aperte: 0,
  in_produzione: 0,
  completate: 0,
  ritardo: 0,
})

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
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [serverPagination, setServerPagination] = useState(defaultPagination)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [statusUpdatingJobId, setStatusUpdatingJobId] = useState(null)
  const [draggedJobId, setDraggedJobId] = useState(null)
  const [activeDropColumn, setActiveDropColumn] = useState(null)
  const [kanbanStatusError, setKanbanStatusError] = useState(null)
  const todayIso = useMemo(() => formatISODate(new Date()), [])

  const repartoOptions = useMemo(() => {
    const unique = new Map()
    const source = Array.isArray(stats?.reparti) ? stats.reparti : []
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
        setStats((prev) => (prev ? prev : null))
        setItems((prev) => (prev.length > 0 ? prev : []))
        setServerPagination((prev) =>
          prev?.total_items > 0
            ? prev
            : {
                ...defaultPagination,
                page: 1,
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
    const totals = stats?.totali || emptyTotals
    return [
      {
        key: 'aperte',
        label: 'Lavorazioni attive',
        value: totals?.aperte ?? 0,
      },
      {
        key: 'in_produzione',
        label: 'In produzione',
        value: totals?.in_produzione ?? 0,
      },
      {
        key: 'completate',
        label: 'Completate (mese)',
        value: totals?.completate ?? 0,
      },
      {
        key: 'ritardo',
        label: 'Attivita in ritardo',
        value: totals?.ritardo ?? 0,
      },
    ]
  }, [stats?.totali])

  const kanbanConfig = useMemo(() => {
    const base = statoOptions
      .filter((option) => option.value)
      .map((option) => ({
        key: option.value,
        label: option.label,
      }))
    const hasOtherStates = items.some((job) => job?.stato && !knownStati.includes(job.stato))
    return hasOtherStates ? [...base, { key: 'altre', label: 'Altre lavorazioni' }] : base
  }, [items])

  const kanbanGroups = useMemo(() => {
    const groups = {}
    kanbanConfig.forEach((column) => {
      groups[column.key] = []
    })
    items.forEach((job) => {
      const fallbackState = job?.stato || 'aperta'
      const targetKey = groups[fallbackState]
        ? fallbackState
        : job?.stato && groups.altre
          ? 'altre'
          : 'aperta'
      groups[targetKey] = groups[targetKey] || []
      groups[targetKey].push(job)
    })
    return groups
  }, [items, kanbanConfig])

  const unscheduledJobs = useMemo(
    () => items.filter((job) => !job.data_inizio_prevista && !job.data_fine_prevista),
    [items],
  )

  const activeCalendarMonth = useMemo(() => {
    if (calendarDate instanceof Date && !Number.isNaN(calendarDate.getTime())) {
      return new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [calendarDate])

  const calendarLabel = useMemo(() => monthFormatter.format(activeCalendarMonth), [activeCalendarMonth])

  const jobEventsByDay = useMemo(() => {
    const map = new Map()
    items.forEach((job) => {
      const start = parseDate(job.data_inizio_prevista) || parseDate(job.data_fine_prevista)
      const end = parseDate(job.data_fine_prevista) || start
      if (!start && !end) {
        return
      }
      let from = start || end
      let to = end || start
      if (!from) {
        return
      }
      if (to && from > to) {
        const tmp = from
        from = to
        to = tmp
      }
      const cursor = new Date(from)
      const limit = new Date(to || from)
      while (cursor <= limit) {
        const key = formatISODate(cursor)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key).push(job)
        cursor.setDate(cursor.getDate() + 1)
      }
    })
    return map
  }, [items])

  const calendarWeeks = useMemo(() => {
    const weeks = []
    const cursor = new Date(activeCalendarMonth)
    const startOffset = (cursor.getDay() + 6) % 7
    cursor.setDate(cursor.getDate() - startOffset)
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      const days = []
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const dayDate = new Date(cursor)
        const isoKey = formatISODate(dayDate)
        days.push({
          date: dayDate,
          isoKey,
          inMonth: dayDate.getMonth() === activeCalendarMonth.getMonth(),
          isToday: isoKey === todayIso,
          jobs: jobEventsByDay.get(isoKey) || [],
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(days)
    }
    return weeks
  }, [activeCalendarMonth, jobEventsByDay, todayIso])

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

  const handleCalendarPrev = () => {
    setCalendarDate((current) => {
      const base = current instanceof Date && !Number.isNaN(current.getTime()) ? current : new Date()
      return new Date(base.getFullYear(), base.getMonth() - 1, 1)
    })
  }

  const handleCalendarNext = () => {
    setCalendarDate((current) => {
      const base = current instanceof Date && !Number.isNaN(current.getTime()) ? current : new Date()
      return new Date(base.getFullYear(), base.getMonth() + 1, 1)
    })
  }

  const handleCalendarToday = () => {
    setCalendarDate(new Date())
  }

  const handleKanbanCardDragStart = (job) => (event) => {
    const jobId = Number(job?.id_lavorazione)
    if (!Number.isFinite(jobId) || jobId <= 0) {
      event.preventDefault()
      return
    }
    setDraggedJobId(jobId)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(jobId))
    }
  }

  const handleKanbanCardDragEnd = () => {
    setDraggedJobId(null)
    setActiveDropColumn(null)
  }

  const handleKanbanDragOver = (columnKey) => (event) => {
    if (!columnKey || columnKey === 'altre' || statusUpdatingJobId !== null) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    if (activeDropColumn !== columnKey) {
      setActiveDropColumn(columnKey)
    }
  }

  const handleKanbanDrop = (columnKey) => async (event) => {
    if (!columnKey || columnKey === 'altre' || !token) {
      return
    }
    event.preventDefault()
    setActiveDropColumn(null)
    if (statusUpdatingJobId !== null) {
      return
    }

    const transferId = event.dataTransfer?.getData('text/plain')
    const resolvedId = transferId || (draggedJobId ? String(draggedJobId) : '')
    const jobId = Number(resolvedId)
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return
    }

    const targetJob = items.find((job) => Number(job?.id_lavorazione) === jobId)
    if (!targetJob || targetJob.stato === columnKey) {
      return
    }

    const previousItems = items
    setKanbanStatusError(null)
    setStatusUpdatingJobId(jobId)
    setItems((current) =>
      current.map((job) => {
        if (Number(job?.id_lavorazione) !== jobId) {
          return job
        }
        return {
          ...job,
          stato: columnKey,
          stato_label: statoLabelLookup[columnKey] || job.stato_label || columnKey,
        }
      }),
    )

    try {
      await updateLavorazioneStatus({
        token,
        id: jobId,
        stato: columnKey,
      })
      setRefreshIndex((value) => value + 1)
    } catch (updateError) {
      console.error('Impossibile aggiornare lo stato lavorazione:', updateError)
      setItems(previousItems)
      const message =
        updateError?.message || "Errore durante l'aggiornamento dello stato della lavorazione. Riprovare."
      setKanbanStatusError(message)
    } finally {
      setStatusUpdatingJobId(null)
      setDraggedJobId(null)
    }
  }

  const currentItems = items

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
        </CCardBody>
      </CCard>

      {viewMode === 'kanban' ? (
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between">
            <div>
              <strong>Board Kanban</strong>
              <div className="small text-body-secondary">Visualizza le lavorazioni nei diversi stati operativi.</div>
            </div>
            <div className="small text-body-secondary">Totale lavorazioni: {items.length}</div>
          </CCardHeader>
          <CCardBody>
            {error ? (
              <CAlert color="danger" className="mb-3">
                {error?.message || 'Errore durante il caricamento delle lavorazioni.'}
              </CAlert>
            ) : null}
            {kanbanStatusError ? (
              <CAlert color="warning" className="mb-3">
                {kanbanStatusError}
              </CAlert>
            ) : null}
            <div className="position-relative">
              {loading ? (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
                  <CSpinner color="primary" />
                </div>
              ) : null}
              <div className="d-flex flex-nowrap overflow-auto gap-3 pb-2">
                {kanbanConfig.map((column) => {
                  const columnItems = kanbanGroups[column.key] || []
                  const isDroppableColumn = column.key !== 'altre'
                  const isActiveColumn = isDroppableColumn && activeDropColumn === column.key
                  return (
                    <div
                      key={column.key}
                      className={classNames('border rounded-3 bg-body-tertiary flex-grow-1', {
                        'border-primary border-2 shadow-sm': isActiveColumn,
                      })}
                      style={{ minWidth: '280px' }}
                      onDragOver={isDroppableColumn ? handleKanbanDragOver(column.key) : undefined}
                      onDrop={isDroppableColumn ? handleKanbanDrop(column.key) : undefined}
                    >
                      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                        <span className="fw-semibold">{column.label}</span>
                        <CBadge color="secondary">{columnItems.length}</CBadge>
                      </div>
                      <div className="p-3 d-flex flex-column gap-3" style={{ minHeight: '160px' }}>
                        {columnItems.length > 0 ? (
                          columnItems.map((job) => (
                            <div
                              key={job.id_lavorazione || job.codice}
                              role="button"
                              tabIndex={0}
                              className="bg-white border rounded-3 shadow-sm p-3 position-relative"
                              onClick={() => job.id_lavorazione && navigate(`/lavorazioni/dettaglio?id=${job.id_lavorazione}`)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  job.id_lavorazione && navigate(`/lavorazioni/dettaglio?id=${job.id_lavorazione}`)
                                }
                              }}
                              draggable={Boolean(job.id_lavorazione) && statusUpdatingJobId === null}
                              onDragStart={handleKanbanCardDragStart(job)}
                              onDragEnd={handleKanbanCardDragEnd}
                              aria-grabbed={draggedJobId === Number(job.id_lavorazione)}
                              style={{
                                cursor:
                                  Boolean(job.id_lavorazione) && statusUpdatingJobId === null ? 'grab' : 'pointer',
                              }}
                            >
                              {statusUpdatingJobId === Number(job.id_lavorazione) ? (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 rounded-3">
                                  <CSpinner size="sm" color="primary" />
                                </div>
                              ) : null}
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                  <div className="fw-semibold text-truncate">{job.titolo || job.codice}</div>
                                  <div className="text-body-secondary small text-truncate">{job.cliente || '-'}</div>
                                </div>
                                {renderPrioritaBadge(job.priorita)}
                              </div>
                              <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                                {renderStatoBadge(job)}
                                <CBadge color="light" textColor="dark">
                                  {formatPercent(job.percentuale_avanzamento)}
                                </CBadge>
                              </div>
                              <div className="small text-body-secondary d-flex flex-column gap-1">
                                <span>
                                  Inizio: {formatDate(job.data_inizio_prevista)} - Fine: {formatDate(job.data_fine_prevista)}
                                </span>
                                <span>Reparto: {job.reparto_label || job.reparto || 'n/d'}</span>
                                <span>Attivita: {job.attivita_totali ?? '-'} totali</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-body-secondary small py-4">Nessuna lavorazione in questa colonna.</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CCardBody>
        </CCard>
      ) : null}

      {viewMode === 'calendario' ? (
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between">
            <div>
              <strong>Calendario pianificazione</strong>
              <div className="small text-body-secondary">Analizza le finestre temporali delle lavorazioni.</div>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <CButtonGroup size="sm">
                <CButton color="outline-primary" onClick={handleCalendarPrev}>
                  <CIcon icon={cilChevronLeft} />
                </CButton>
                <CButton color="outline-primary" onClick={handleCalendarNext}>
                  <CIcon icon={cilChevronRight} />
                </CButton>
              </CButtonGroup>
              <CButton color="light" size="sm" onClick={handleCalendarToday}>
                Oggi
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div className="fw-semibold text-capitalize">{calendarLabel}</div>
              <div className="small text-body-secondary">
                Lavorazioni pianificate: {items.length - unscheduledJobs.length}
                {unscheduledJobs.length > 0 ? ` - Senza date: ${unscheduledJobs.length}` : ''}
              </div>
            </div>
            {unscheduledJobs.length > 0 ? (
              <CAlert color="info">
                {unscheduledJobs.length === 1
                  ? 'Una lavorazione non ha ancora date previste e non e mostrata nel calendario.'
                  : `${unscheduledJobs.length} lavorazioni non hanno date previste e non sono mostrate nel calendario.`}
              </CAlert>
            ) : null}
            {error ? (
              <CAlert color="danger" className="mb-3">
                {error?.message || 'Errore durante il caricamento delle lavorazioni.'}
              </CAlert>
            ) : null}
            <div className="table-responsive position-relative">
              {loading ? (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
                  <CSpinner color="primary" />
                </div>
              ) : null}
              <table className="table table-bordered align-middle calendar-table mb-0">
                <thead className="table-light text-center">
                  <tr>
                    {weekdayLabels.map((day) => (
                      <th key={day} className="text-uppercase small">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map((week, index) => (
                    <tr key={`week-${index}`}>
                      {week.map((day) => (
                        <td
                          key={day.isoKey}
                          className={classNames('align-top', {
                            'bg-body-tertiary': !day.inMonth,
                            'border-primary border-2': day.isToday,
                          })}
                          style={{ minWidth: '140px', minHeight: '140px' }}
                        >
                          <div className={classNames('fw-semibold mb-2 small', { 'text-body-secondary': !day.inMonth })}>
                            {day.date.getDate()}
                          </div>
                          <div className="d-flex flex-column gap-2">
                            {day.jobs.slice(0, 3).map((job) => (
                              <div
                                key={`${day.isoKey}-${job.id_lavorazione || job.codice}`}
                                className={classNames(
                                  'border rounded-2 px-2 py-1 small cursor-pointer',
                                  `border-${statoBadgeMap[job.stato] || 'secondary'}`,
                                )}
                                onClick={() =>
                                  job.id_lavorazione && navigate(`/lavorazioni/dettaglio?id=${job.id_lavorazione}`)
                                }
                              >
                                <div className="fw-semibold text-truncate">{job.titolo || job.codice}</div>
                                <div className="text-body-secondary text-truncate">{job.cliente || '-'}</div>
                              </div>
                            ))}
                            {day.jobs.length > 3 ? (
                              <div className="text-body-secondary small">
                                +{day.jobs.length - 3} altre lavorazioni
                              </div>
                            ) : null}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CCardBody>
        </CCard>
      ) : null}

      {viewMode === 'lista' ? (
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
                  <CIcon icon={cilChevronLeft} />
                </CButton>
                <CButton
                  color="outline-primary"
                  disabled={page >= (serverPagination?.total_pages || 1)}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <CIcon icon={cilChevronRight} />
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
                            {job.numero_preventivo ? `Preventivo ${job.numero_preventivo}` : '-'}
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
                          <div className="fw-semibold">{job.operatore_principale || '-'}</div>
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
      ) : null}
    </>
  )
}

export default LavorazioniList
