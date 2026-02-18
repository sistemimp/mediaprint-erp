import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
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
import { useNavigate } from 'react-router-dom'
import { fetchLavorazioneDetail, fetchLavorazioniList } from '../../services/lavorazioni'

const viewOptions = [
  { value: 'lista', label: 'Lista' },
  { value: 'kanban', label: 'Kanban' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'gantt', label: 'Gantt' },
]

const periodOptions = [
  { value: 'day', label: 'Giorno' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
]

const WORKDAY_START_MINUTES = 8 * 60 + 30
const WORKDAY_END_MINUTES = 18 * 60 + 30
const GANTT_LABEL_WIDTH = 340

const parseDateTime = (value) => {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const addDays = (value, amount) => {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

const getWeekStart = (value) => {
  const date = startOfDay(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }
  return parsed.toLocaleDateString('it-IT')
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }
  return parsed.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatShortDay = (value) =>
  value.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })

const formatMinutesLabel = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const statusColorMap = {
  todo: 'secondary',
  in_progress: 'primary',
  done: 'success',
  completata: 'success',
  completed: 'success',
}

const normalizeActivityStatus = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'todo') {
    return 'todo'
  }
  if (normalized === 'in_progress') {
    return 'in_progress'
  }
  if (['done', 'completata', 'completed'].includes(normalized)) {
    return 'done'
  }
  return 'other'
}

const buildRange = (anchorDate, period) => {
  if (period === 'day') {
    const start = startOfDay(anchorDate)
    return {
      start,
      end: addDays(start, 1),
      days: [start],
      label: formatDate(start),
    }
  }

  if (period === 'month') {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
    const days = []
    for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
      days.push(new Date(cursor))
    }
    return {
      start,
      end,
      days,
      label: anchorDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    }
  }

  const start = getWeekStart(anchorDate)
  const end = addDays(start, 7)
  const days = []
  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor))
  }
  return {
    start,
    end,
    days,
    label: `${formatDate(start)} - ${formatDate(addDays(end, -1))}`,
  }
}

const toTimestamp = (value) => (value instanceof Date ? value.getTime() : null)

const overlapRange = (start, end, rangeStart, rangeEnd) => {
  const startTs = toTimestamp(start)
  const endTs = toTimestamp(end)
  const rangeStartTs = rangeStart.getTime()
  const rangeEndTs = rangeEnd.getTime()

  if (startTs === null || endTs === null) {
    return false
  }

  return startTs < rangeEndTs && endTs > rangeStartTs
}

const resolveStepDays = (period) => {
  if (period === 'day') {
    return 1
  }
  if (period === 'month') {
    return 30
  }
  return 7
}

const previousAnchor = (anchorDate, period) => {
  if (period === 'month') {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1)
  }
  return addDays(anchorDate, -resolveStepDays(period))
}

const nextAnchor = (anchorDate, period) => {
  if (period === 'month') {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
  }
  return addDays(anchorDate, resolveStepDays(period))
}

const normalizeAssigneeIds = (activity) => {
  if (Array.isArray(activity?.assegnatari_ids)) {
    return activity.assegnatari_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
  }
  if (typeof activity?.assegnatari_ids === 'string' && activity.assegnatari_ids.trim() !== '') {
    return activity.assegnatari_ids
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
  }
  return []
}

const MyActivitiesSection = ({ token, userId }) => {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('lista')
  const [period, setPeriod] = useState('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activities, setActivities] = useState([])

  const range = useMemo(() => buildRange(anchorDate, period), [anchorDate, period])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const load = async () => {
      if (!token || !userId) {
        if (active) {
          setActivities([])
        }
        return
      }

      setLoading(true)
      setError(null)
      try {
        const listPayload = await fetchLavorazioniList({
          token,
          operatore: userId,
          page: 1,
          pageSize: 100,
          signal: controller.signal,
        })

        const listItems = Array.isArray(listPayload?.items) ? listPayload.items : []
        const detailItems = await Promise.all(
          listItems.map(async (job) => {
            const jobId = Number(job?.id_lavorazione)
            if (!Number.isFinite(jobId) || jobId <= 0) {
              return null
            }

            try {
              const detail = await fetchLavorazioneDetail({ token, id: jobId, signal: controller.signal })
              return { job, detail }
            } catch (_error) {
              return null
            }
          }),
        )

        const flattened = []
        detailItems.forEach((entry) => {
          if (!entry?.detail) {
            return
          }

          const jobId = Number(entry.job?.id_lavorazione || entry.detail?.id_lavorazione || 0)
          const jobCode = entry.job?.codice || entry.detail?.codice || '-'
          const customer = entry.job?.cliente || entry.detail?.cliente || '-'
          const jobTitle = entry.job?.titolo || entry.detail?.titolo || ''
          const jobStart = parseDateTime(entry.job?.data_inizio_prevista || entry.detail?.data_inizio_prevista)
          const jobEnd = parseDateTime(entry.job?.data_fine_prevista || entry.detail?.data_fine_prevista)
          const detailActivities = Array.isArray(entry.detail?.attivita) ? entry.detail.attivita : []

          detailActivities.forEach((activity) => {
            const assigneeIds = normalizeAssigneeIds(activity)
            const isMine = assigneeIds.includes(Number(userId)) || Number(activity?.id_operatore || 0) === Number(userId)
            if (!isMine) {
              return
            }

            const start = parseDateTime(activity?.data_avvio) || parseDateTime(activity?.data_scadenza) || jobStart
            const rawEnd = parseDateTime(activity?.data_fine) || parseDateTime(activity?.data_completamento) || parseDateTime(activity?.data_scadenza) || jobEnd || start
            const end = start && rawEnd && rawEnd < start ? new Date(start.getTime() + 30 * 60 * 1000) : rawEnd

            flattened.push({
              id: Number(activity?.id_attivita || 0),
              titolo: activity?.titolo || 'Attivita',
              stato: String(activity?.stato || '').toLowerCase() || 'todo',
              start,
              end,
              jobId,
              jobCode,
              jobTitle,
              customer,
            })
          })
        })

        if (!active) {
          return
        }

        flattened.sort((a, b) => {
          const aTime = a.start ? a.start.getTime() : Number.MAX_SAFE_INTEGER
          const bTime = b.start ? b.start.getTime() : Number.MAX_SAFE_INTEGER
          return aTime - bTime
        })

        setActivities(flattened)
      } catch (loadError) {
        if (loadError?.name === 'AbortError') {
          return
        }
        if (active) {
          setError(loadError)
          setActivities([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [token, userId])

  const visibleActivities = useMemo(
    () => activities.filter((activity) => overlapRange(activity.start, activity.end, range.start, range.end)),
    [activities, range],
  )

  const unscheduledCount = useMemo(
    () => activities.filter((activity) => !activity.start || !activity.end).length,
    [activities],
  )

  const kanbanColumns = useMemo(() => {
    const columns = {
      todo: [],
      in_progress: [],
      done: [],
      other: [],
    }
    visibleActivities.forEach((activity) => {
      columns[normalizeActivityStatus(activity.stato)].push(activity)
    })
    return columns
  }, [visibleActivities])

  const calendarMap = useMemo(() => {
    const map = new Map()
    range.days.forEach((day) => {
      map.set(day.toDateString(), [])
    })

    visibleActivities.forEach((activity) => {
      if (!activity.start) {
        return
      }
      const key = startOfDay(activity.start).toDateString()
      if (!map.has(key)) {
        return
      }
      map.get(key).push(activity)
    })

    map.forEach((entries) => {
      entries.sort((a, b) => {
        const aTime = a.start ? a.start.getTime() : Number.MAX_SAFE_INTEGER
        const bTime = b.start ? b.start.getTime() : Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })
    })

    return map
  }, [range.days, visibleActivities])

  const ganttColumns = useMemo(() => {
    if (period === 'day') {
      const minutes = []
      for (let cursor = WORKDAY_START_MINUTES; cursor <= WORKDAY_END_MINUTES; cursor += 30) {
        minutes.push({ key: cursor, label: formatMinutesLabel(cursor) })
      }
      return minutes
    }

    return range.days.map((day) => ({
      key: day.toISOString(),
      label: day.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase(),
      day,
    }))
  }, [period, range.days])

  const ganttRows = useMemo(
    () => visibleActivities.filter((activity) => activity.start && activity.end),
    [visibleActivities],
  )

  const timelineMinWidth = Math.max(1, ganttColumns.length) * (period === 'day' ? 66 : 128)

  return (
    <CCard className="mt-4">
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <strong>Le mie attivita</strong>
          <div className="small text-body-secondary">Calendario attivita dell&apos;utente loggato.</div>
        </div>
        <div className="small text-body-secondary text-end">
          <div>Attivita: {activities.length}</div>
          <div>Non pianificate: {unscheduledCount}</div>
        </div>
      </CCardHeader>
      <CCardBody className="d-flex flex-column gap-3">
        <CRow className="g-3 align-items-end">
          <CCol xs={12} md={6} xl={4}>
            <CFormLabel className="mb-1">Vista</CFormLabel>
            <CButtonGroup className="w-100">
              {viewOptions.map((option) => (
                <CButton
                  key={option.value}
                  color={viewMode === option.value ? 'primary' : 'secondary'}
                  variant={viewMode === option.value ? undefined : 'outline'}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </CButton>
              ))}
            </CButtonGroup>
          </CCol>
          <CCol xs={12} md={4} xl={2}>
            <CFormLabel htmlFor="my-activities-period" className="mb-1">Periodo</CFormLabel>
            <CFormSelect id="my-activities-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={8} xl={6}>
            <div className="d-flex justify-content-md-end gap-2">
              <CButton color="secondary" variant="outline" onClick={() => setAnchorDate((prev) => previousAnchor(prev, period))}>
                {'<'}
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setAnchorDate(new Date())}>
                Oggi
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setAnchorDate((prev) => nextAnchor(prev, period))}>
                {'>'}
              </CButton>
            </div>
            <div className="small text-body-secondary text-md-end mt-1">{range.label}</div>
          </CCol>
        </CRow>

        {loading ? (
          <div className="py-4 text-center"><CSpinner size="sm" /></div>
        ) : null}

        {error ? (
          <CAlert color="danger">{error.message || 'Errore durante il caricamento delle attivita.'}</CAlert>
        ) : null}

        {!loading && !error && viewMode === 'lista' ? (
          <CTable responsive hover align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Attivita</CTableHeaderCell>
                <CTableHeaderCell>Lavorazione</CTableHeaderCell>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell>Stato</CTableHeaderCell>
                <CTableHeaderCell>Inizio</CTableHeaderCell>
                <CTableHeaderCell>Fine</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {visibleActivities.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-body-secondary">Nessuna attivita nel periodo selezionato.</CTableDataCell>
                </CTableRow>
              ) : (
                visibleActivities.map((activity) => (
                  <CTableRow key={`my-list-${activity.id}-${activity.jobId}`}>
                    <CTableDataCell>{activity.titolo}</CTableDataCell>
                    <CTableDataCell>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => navigate(`/lavorazioni/dettaglio?id=${activity.jobId}`)}
                      >
                        {activity.jobCode}
                      </button>
                    </CTableDataCell>
                    <CTableDataCell>{activity.customer || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={statusColorMap[activity.stato] || 'secondary'}>{activity.stato || 'todo'}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{formatDateTime(activity.start)}</CTableDataCell>
                    <CTableDataCell>{formatDateTime(activity.end)}</CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        ) : null}

        {!loading && !error && viewMode === 'kanban' ? (
          <CRow className="g-3">
            {[
              ['todo', 'To do'],
              ['in_progress', 'In progress'],
              ['done', 'Completate'],
              ['other', 'Altre'],
            ].map(([key, title]) => (
              <CCol key={key} xs={12} md={6} xl={3}>
                <div className="border rounded-3 h-100" style={{ backgroundColor: 'rgba(44, 56, 74, 0.25)' }}>
                  <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
                    <strong>{title}</strong>
                    <CBadge color="secondary">{kanbanColumns[key].length}</CBadge>
                  </div>
                  <div className="p-2 d-flex flex-column gap-2">
                    {kanbanColumns[key].length === 0 ? (
                      <div className="small text-body-secondary px-2 py-1">Nessuna attivita</div>
                    ) : (
                      kanbanColumns[key].map((activity) => (
                        <div key={`my-kanban-${activity.id}-${activity.jobId}`} className="rounded-3 p-2 border">
                          <div className="fw-semibold">{activity.titolo}</div>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none small"
                            onClick={() => navigate(`/lavorazioni/dettaglio?id=${activity.jobId}`)}
                          >
                            {activity.jobCode}
                          </button>
                          <div className="small text-body-secondary">{activity.customer || '-'}</div>
                          <div className="small text-body-secondary">{formatDateTime(activity.start)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CCol>
            ))}
          </CRow>
        ) : null}

        {!loading && !error && viewMode === 'calendario' ? (
          <CRow className="g-3">
            {range.days.map((day) => {
              const key = day.toDateString()
              const entries = calendarMap.get(key) || []
              return (
                <CCol key={`my-calendar-${key}`} xs={12} md={period === 'day' ? 12 : 6} xl={period === 'month' ? 3 : 2}>
                  <div className="border rounded-3 h-100" style={{ minHeight: 180 }}>
                    <div className="px-2 py-2 border-bottom fw-semibold text-capitalize">{formatShortDay(day)}</div>
                    <div className="p-2 d-flex flex-column gap-2">
                      {entries.length === 0 ? (
                        <div className="small text-body-secondary">Nessuna attivita</div>
                      ) : (
                        entries.map((activity) => (
                          <div key={`my-calendar-item-${activity.id}-${activity.jobId}`} className="rounded-3 p-2 border">
                            <div className="fw-semibold text-truncate">{activity.titolo}</div>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none small"
                              onClick={() => navigate(`/lavorazioni/dettaglio?id=${activity.jobId}`)}
                            >
                              {activity.jobCode}
                            </button>
                            <div className="small text-body-secondary">{activity.customer || '-'}</div>
                            <div className="small text-body-secondary">{formatDateTime(activity.start)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CCol>
              )
            })}
          </CRow>
        ) : null}

        {!loading && !error && viewMode === 'gantt' ? (
          <div className="border rounded-3 overflow-auto">
            <div style={{ minWidth: GANTT_LABEL_WIDTH + timelineMinWidth }}>
              <div className="d-flex border-bottom">
                <div className="px-3 py-2 fw-semibold border-end" style={{ width: GANTT_LABEL_WIDTH, minWidth: GANTT_LABEL_WIDTH }}>
                  Attivita / Lavorazione
                </div>
                <div className="d-flex flex-grow-1" style={{ minWidth: timelineMinWidth }}>
                  {ganttColumns.map((column) => (
                    <div
                      key={`my-gantt-head-${column.key}`}
                      className="text-center small px-1 py-2 border-start"
                      style={{ width: `${100 / Math.max(1, ganttColumns.length)}%`, minWidth: period === 'day' ? 66 : 128 }}
                    >
                      {column.label}
                    </div>
                  ))}
                </div>
              </div>

              {ganttRows.length === 0 ? (
                <div className="p-3 text-body-secondary">Nessuna attivita nel periodo selezionato.</div>
              ) : (
                ganttRows.map((activity, index) => {
                  const rangeStart = range.start.getTime()
                  const rangeEnd = range.end.getTime()
                  const safeStart = Math.max(activity.start.getTime(), rangeStart)
                  const safeEnd = Math.min(activity.end.getTime(), rangeEnd)
                  const duration = Math.max(1, rangeEnd - rangeStart)
                  let leftPercent = 0
                  let widthPercent = 0

                  if (period === 'day') {
                    const startMinutes = activity.start.getHours() * 60 + activity.start.getMinutes()
                    const endMinutes = activity.end.getHours() * 60 + activity.end.getMinutes()
                    const boundedStart = Math.min(WORKDAY_END_MINUTES, Math.max(WORKDAY_START_MINUTES, startMinutes))
                    const boundedEnd = Math.min(WORKDAY_END_MINUTES, Math.max(WORKDAY_START_MINUTES, endMinutes))
                    const dayDuration = Math.max(1, WORKDAY_END_MINUTES - WORKDAY_START_MINUTES)
                    leftPercent = ((boundedStart - WORKDAY_START_MINUTES) / dayDuration) * 100
                    widthPercent = (Math.max(30, boundedEnd - boundedStart) / dayDuration) * 100
                  } else {
                    leftPercent = ((safeStart - rangeStart) / duration) * 100
                    widthPercent = (Math.max(30 * 60 * 1000, safeEnd - safeStart) / duration) * 100
                  }

                  leftPercent = Math.max(0, Math.min(100, leftPercent))
                  widthPercent = Math.max(2, Math.min(100 - leftPercent, widthPercent))

                  return (
                    <div key={`my-gantt-row-${activity.id}-${index}`} className="d-flex border-bottom" style={{ minHeight: 56 }}>
                      <div className="px-3 py-2 border-end" style={{ width: GANTT_LABEL_WIDTH, minWidth: GANTT_LABEL_WIDTH }}>
                        <div className="fw-semibold text-truncate">{activity.titolo}</div>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none small"
                          onClick={() => navigate(`/lavorazioni/dettaglio?id=${activity.jobId}`)}
                        >
                          {activity.jobCode}
                        </button>
                        <div className="small text-body-secondary text-truncate">{activity.customer || '-'}</div>
                      </div>
                      <div
                        className="position-relative flex-grow-1"
                        style={{
                          minWidth: timelineMinWidth,
                          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px)',
                          backgroundSize: `${100 / Math.max(1, ganttColumns.length)}% 100%`,
                        }}
                      >
                        <div
                          className="position-absolute px-2 text-truncate text-white rounded-2"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            top: 14,
                            height: 28,
                            lineHeight: '28px',
                            fontSize: 13,
                            background: activity.stato === 'in_progress' ? 'linear-gradient(90deg,#4f46e5,#312e81)' : '#6c7a89',
                          }}
                          title={`${activity.titolo} (${formatDateTime(activity.start)} - ${formatDateTime(activity.end)})`}
                        >
                          {activity.titolo}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </CCardBody>
    </CCard>
  )
}

export default MyActivitiesSection
