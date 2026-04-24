/* eslint-disable prettier/prettier */
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
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
  CCollapse,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCalendar, cilChevronBottom, cilChevronLeft, cilChevronRight, cilChevronTop, cilFilter, cilList, cilReload, cilViewColumn } from '@coreui/icons'
import classNames from 'classnames'
import {
  fetchLavorazioniDashboard,
  fetchLavorazioniList,
  fetchLavorazioneDetail,
  updateLavorazioneStatus,
  updateLavorazioneActivity,
  updateLavorazioneActivityReport,
} from '../../services/lavorazioni'
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
  { value: 'gantt', label: 'Gantt', icon: cilCalendar },
]
const ganttGroupByOptions = [
  { value: 'job', label: 'Per lavorazione' },
  { value: 'operator', label: 'Per utente' },
]
const ganttPeriodOptions = [
  { value: 'day', label: 'Giorno' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
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
const dayFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})
const ganttDayFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
})
const ganttMonthFormatter = new Intl.DateTimeFormat('it-IT', {
  month: 'long',
  year: 'numeric',
})
const WORKDAY_START_MINUTES = 8 * 60 + 30
const WORKDAY_END_MINUTES = 18 * 60 + 30
const SLOT_MINUTES = 30
const CALENDAR_RANGE_DAYS = 3
const SLOT_ROW_HEIGHT = 46
const GANTT_DAY_WIDTH_WEEK = 74
const GANTT_DAY_WIDTH_MONTH = 44
const GANTT_TIME_SLOT_WIDTH = 52
const GANTT_LABEL_WIDTH = 360
const GANTT_BAR_HEIGHT = 26
const GANTT_BAR_ROW_STEP = 32
const GANTT_BAR_TOP_OFFSET = 6

// Utility date/time per viste calendario e gantt.
const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const addDays = (value, days) => {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

const getWeekStart = (value) => {
  const date = startOfDay(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

const formatMinutesLabel = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
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

const formatDateTimeForApi = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:00`
}

const buildDateFromDayKey = (dayKey, minutes) => {
  if (!dayKey) {
    return null
  }
  const parts = dayKey.split('-').map((value) => Number(value))
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value) || value <= 0)) {
    return null
  }
  const [year, month, day] = parts
  const date = new Date(year, month - 1, day, 0, 0, 0, 0)
  date.setMinutes(minutes)
  return date
}

const parseDateTime = (value) => {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

const hasTimePart = (value) => {
  if (!value) {
    return false
  }
  return /\d{2}:\d{2}/.test(value)
}

const getMinutesOfDay = (date) => date.getHours() * 60 + date.getMinutes()

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

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0%'
  }
  const numeric = Math.min(100, Math.max(0, Number(value)))
  return `${numeric.toFixed(0)}%`
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const HIDE_ANNULLED_DAYS = 15

// Nasconde in kanban annullate/completate troppo vecchie.
const shouldShowKanbanJob = (job) => {
  const state = (job?.stato || '').toLowerCase()
  if (!['annullata', 'completata'].includes(state)) {
    return true
  }
  const raw = job?.updated_at
  if (!raw) {
    return true
  }
  const timestamp = Date.parse(raw)
  if (Number.isNaN(timestamp)) {
    return true
  }
  const diffDays = (Date.now() - timestamp) / MS_PER_DAY
  return diffDays <= HIDE_ANNULLED_DAYS
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

const activityStatoBadgeMap = {
  todo: 'secondary',
  in_progress: 'primary',
  done: 'success',
  sospesa: 'warning',
  cancelled: 'danger',
  annullata: 'danger',
  default: 'secondary',
}

const renderActivityStatoBadge = (status) => {
  const code = (status || '').toString().toLowerCase()
  const color = activityStatoBadgeMap[code] || activityStatoBadgeMap.default
  const label = code ? code.replace('_', ' ') : 'n/d'
  return (
    <CBadge color={color} className="text-capitalize">
      {label}
    </CBadge>
  )
}

const activityCardBaseStyle = {
  backgroundColor: 'var(--cui-card-bg, var(--cui-body-bg, #fff))',
  color: 'var(--cui-body-color, #000)',
  borderColor: 'var(--cui-border-color, rgba(0, 0, 0, 0.125))',
}

const buildJobLabelInfo = (job) => {
  const jobId = job?.id_lavorazione
  const fallbackCode = jobId ? `JOB-${jobId}` : job?.codice || 'N/A'
  return {
    referenceTitle: job.preventivo_riferimento || job.codice || job.titolo || fallbackCode,
    objectDescription: job.preventivo_oggetto || job.titolo || job.codice || '',
    codeLabel: job.codice || fallbackCode,
  }
}

const formatJobReferenceLabel = (job) => {
  const jobId = job?.id_lavorazione
  const code = job?.codice || (jobId ? `JOB-${jobId}` : 'JOB-0000')
  const reference = (job?.preventivo_riferimento || '').trim()
  return reference ? `${code} - ${reference}` : code
}

const formatActivityOperatorLabel = (activity) => {
  if (Array.isArray(activity?.assegnatari) && activity.assegnatari.length > 0) {
    return activity.assegnatari.join(', ')
  }
  if (typeof activity?.report_operatore_nome === 'string' && activity.report_operatore_nome.trim() !== '') {
    return activity.report_operatore_nome.trim()
  }
  return ''
}

const formatCustomerReferenceLabel = (job) => {
  const reference = (job?.preventivo_riferimento || '').trim()
  if (reference) {
    return reference
  }
  return job?.cliente || '-'
}

const kanbanCardStyle = {
  backgroundColor: 'var(--cui-card-bg, var(--cui-body-bg, #fff))',
  color: 'var(--cui-body-color, #000)',
  borderColor: 'var(--cui-border-color, rgba(0, 0, 0, 0.125))',
  boxShadow: 'var(--cui-card-box-shadow, 0 0.35rem 0.75rem rgba(0, 0, 0, 0.15))',
}

const LavorazioniList = () => {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [filters, setFilters] = useState(defaultFilters)
  const [viewMode, setViewMode] = useState('lista')
  const [items, setItems] = useState([])
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [ganttGroupBy, setGanttGroupBy] = useState('job')
  const [ganttPeriod, setGanttPeriod] = useState('week')
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
  const [expandedJobs, setExpandedJobs] = useState([])
  const [activitiesByJob, setActivitiesByJob] = useState({})
  const [activitiesLoading, setActivitiesLoading] = useState({})
  const [activitiesError, setActivitiesError] = useState({})
  const [calendarScheduleError, setCalendarScheduleError] = useState(null)
  const [calendarScheduleLoading, setCalendarScheduleLoading] = useState(false)
  const [draggedActivity, setDraggedActivity] = useState(null)
  const [activeDropSlot, setActiveDropSlot] = useState(null)
  const [isUnscheduledDropActive, setIsUnscheduledDropActive] = useState(false)
  const [hoveredActivityCardKey, setHoveredActivityCardKey] = useState(null)
  const [resizeState, setResizeState] = useState(null)
  const dayColumnRefs = useRef({})
  

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

  // Reset pagina quando cambiano i filtri principali server-side.
  useEffect(() => {
    setPage(1)
  }, [filters.stato, filters.reparto, filters.periodo])

  // Caricamento principale dashboard + lista lavorazioni.
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

  // Reset cache attività espanse dopo refresh generale.
  useEffect(() => {
    setExpandedJobs([])
    setActivitiesByJob({})
    setActivitiesLoading({})
    setActivitiesError({})
  }, [refreshIndex])

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

  const kanbanItems = useMemo(() => {
    return items.filter((job) => shouldShowKanbanJob(job))
  }, [items])

  // Configurazione colonne kanban (incluse eventuali "altre").
  const kanbanConfig = useMemo(() => {
    const base = statoOptions
      .filter((option) => option.value)
      .map((option) => ({
        key: option.value,
        label: option.label,
      }))
    const hasOtherStates = kanbanItems.some((job) => job?.stato && !knownStati.includes(job.stato))
    return hasOtherStates ? [...base, { key: 'altre', label: 'Altre lavorazioni' }] : base
  }, [kanbanItems])

  // Raggruppa le lavorazioni per colonna kanban.
  const kanbanGroups = useMemo(() => {
    const groups = {}
    kanbanConfig.forEach((column) => {
      groups[column.key] = []
    })
    kanbanItems.forEach((job) => {
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
  }, [kanbanItems, kanbanConfig])

  const activeCalendarDay = useMemo(() => {
    if (calendarDate instanceof Date && !Number.isNaN(calendarDate.getTime())) {
      const day = new Date(calendarDate)
      day.setHours(0, 0, 0, 0)
      return day
    }
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [calendarDate])

  const daysRange = useMemo(() => {
    const base = new Date(activeCalendarDay)
    const output = []
    for (let i = 0; i < CALENDAR_RANGE_DAYS; i += 1) {
      const day = new Date(base)
      day.setDate(base.getDate() + i)
      output.push({
        date: day,
        isoKey: formatISODate(day),
        label: dayFormatter.format(day),
      })
    }
    return output
  }, [activeCalendarDay])

  const calendarLabel = useMemo(() => {
    if (daysRange.length === 0) {
      return dayFormatter.format(activeCalendarDay)
    }
    const startLabel = dayFormatter.format(daysRange[0].date)
    const endLabel = dayFormatter.format(daysRange[daysRange.length - 1].date)
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`
  }, [activeCalendarDay, daysRange])

  const timeSlots = useMemo(() => {
    const slots = []
    for (let minutes = WORKDAY_START_MINUTES; minutes < WORKDAY_END_MINUTES; minutes += SLOT_MINUTES) {
      slots.push({
        minutes,
        label: formatMinutesLabel(minutes),
      })
    }
    return slots
  }, [])

  // Carica le attività di dettaglio per una singola lavorazione.
  const loadJobActivities = useCallback(
    async (jobId) => {
      if (!token) {
        return
      }
      setActivitiesLoading((prev) => ({ ...prev, [jobId]: true }))
      setActivitiesError((prev) => ({ ...prev, [jobId]: null }))
      try {
        const detail = await fetchLavorazioneDetail({ token, id: jobId })
        const activities = Array.isArray(detail?.attivita) ? detail.attivita : []
        setActivitiesByJob((prev) => ({ ...prev, [jobId]: activities }))
      } catch (err) {
        console.error('Impossibile caricare le attività della lavorazione:', err)
        setActivitiesError((prev) => ({ ...prev, [jobId]: err }))
      } finally {
        setActivitiesLoading((prev) => ({ ...prev, [jobId]: false }))
      }
    },
    [token],
  )

  // Precarica attività quando la vista richiede scheduling (calendario/gantt).
  useEffect(() => {
    if (!['calendario', 'gantt'].includes(viewMode) || !token) {
      return
    }
    const ids = items
      .map((job) => Number(job?.id_lavorazione))
      .filter((id) => Number.isFinite(id) && id > 0)
    ids.forEach((jobId) => {
      if (!activitiesByJob[jobId] && !activitiesLoading[jobId]) {
        loadJobActivities(jobId)
      }
    })
  }, [viewMode, token, items, activitiesByJob, activitiesLoading, loadJobActivities])

  // Normalizza le attività in eventi visualizzabili nel calendario operativo.
  const calendarActivities = useMemo(() => {
    if (daysRange.length === 0) {
      return []
    }

    return items.flatMap((job) => {
      const jobId = Number(job?.id_lavorazione)
      if (!Number.isFinite(jobId) || jobId <= 0) {
        return []
      }
      const activities = Array.isArray(activitiesByJob[jobId]) ? activitiesByJob[jobId] : []
      return activities.flatMap((activity) => {
        const startRaw = activity?.data_avvio || activity?.data_scadenza || activity?.data_fine
        const endRaw = activity?.data_fine || activity?.data_scadenza || activity?.data_avvio
        const startDate = parseDateTime(startRaw)
        const endDate = parseDateTime(endRaw)

        if (!startDate && !endDate) {
          return []
        }

        let start = startDate || endDate
        let end = endDate || startDate

        if (!start) {
          return []
        }

        if (end && start > end) {
          const tmp = start
          start = end
          end = tmp
        }

        const hasTime = hasTimePart(startRaw) || hasTimePart(endRaw)

        return daysRange.flatMap((day) => {
          const dayStart = new Date(day.date)
          const dayEnd = new Date(day.date)
          dayStart.setHours(0, 0, 0, 0)
          dayEnd.setHours(23, 59, 59, 999)

          if (start > dayEnd || (end && end < dayStart)) {
            return []
          }

          if (!hasTime) {
            return [
              {
                dayKey: day.isoKey,
                job,
                activity,
                startMinutes: WORKDAY_START_MINUTES,
                endMinutes: WORKDAY_END_MINUTES,
                startLabel: formatMinutesLabel(WORKDAY_START_MINUTES),
                endLabel: formatMinutesLabel(WORKDAY_END_MINUTES),
              },
            ]
          }

          const withinStart = start < dayStart ? dayStart : start
          const withinEnd = end > dayEnd ? dayEnd : end
          const rawStartMinutes = getMinutesOfDay(withinStart)
          const rawEndMinutes = getMinutesOfDay(withinEnd)

          if (rawEndMinutes <= WORKDAY_START_MINUTES || rawStartMinutes >= WORKDAY_END_MINUTES) {
            return []
          }

          const clampedStartMinutes = Math.max(WORKDAY_START_MINUTES, rawStartMinutes)
          const clampedEndMinutes = Math.min(WORKDAY_END_MINUTES, rawEndMinutes)

          if (clampedEndMinutes <= clampedStartMinutes) {
            return []
          }

          return [
            {
              dayKey: day.isoKey,
              job,
              activity,
              startMinutes: clampedStartMinutes,
              endMinutes: clampedEndMinutes,
              startLabel: formatMinutesLabel(clampedStartMinutes),
              endLabel: formatMinutesLabel(clampedEndMinutes),
            },
          ]
        })
      })
    })
  }, [daysRange, items, activitiesByJob])

  const calendarGrid = useMemo(() => {
    const map = new Map()
    daysRange.forEach((day) => {
      map.set(day.isoKey, [])
    })

    calendarActivities.forEach((entry, index) => {
      const dayKey = entry.dayKey
      if (!map.has(dayKey)) {
        return
      }
      const list = map.get(dayKey)
      list.push({
        ...entry,
        layoutId: `${dayKey}-${index}`,
      })
    })

    map.forEach((entries, dayKey) => {
      const sorted = [...entries].sort(
        (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
      )
      const active = []
      sorted.forEach((entry) => {
        for (let i = active.length - 1; i >= 0; i -= 1) {
          if (active[i].endMinutes <= entry.startMinutes) {
            active.splice(i, 1)
          }
        }
        const used = new Set(active.map((item) => item.column))
        let col = 0
        while (used.has(col)) {
          col += 1
        }
        entry.column = col
        active.push(entry)
      })

      sorted.forEach((entry) => {
        const overlaps = sorted.filter(
          (other) =>
            other !== entry &&
            other.startMinutes < entry.endMinutes &&
            other.endMinutes > entry.startMinutes,
        )
        const maxColumn = overlaps.reduce(
          (maxValue, current) => Math.max(maxValue, current.column ?? 0),
          entry.column ?? 0,
        )
        entry.columnCount = Math.max(1, maxColumn + 1)
      })

      map.set(dayKey, sorted)
    })

    return map
  }, [calendarActivities, daysRange])

  const allActivities = useMemo(
    () =>
      items.flatMap((job) => {
        const jobId = Number(job?.id_lavorazione)
        if (!Number.isFinite(jobId) || jobId <= 0) {
          return []
        }
        return Array.isArray(activitiesByJob[jobId]) ? activitiesByJob[jobId] : []
      }),
    [items, activitiesByJob],
  )

  // Definisce l'intervallo temporale mostrato in gantt.
  const ganttRange = useMemo(() => {
    const anchor = calendarDate instanceof Date && !Number.isNaN(calendarDate.getTime()) ? calendarDate : new Date()
    if (ganttPeriod === 'day') {
      const start = startOfDay(anchor)
      return {
        start,
        end: start,
        label: dayFormatter.format(start),
      }
    }
    if (ganttPeriod === 'month') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
      return {
        start: startOfDay(start),
        end: startOfDay(end),
        label: ganttMonthFormatter.format(start),
      }
    }
    const start = getWeekStart(anchor)
    const end = addDays(start, 6)
    return {
      start,
      end,
      label: `${formatDate(start)} - ${formatDate(end)}`,
    }
  }, [calendarDate, ganttPeriod])

  // Costruisce modello timeline + barre per rendering gantt.
  const ganttModel = useMemo(() => {
    const rangeStart = startOfDay(ganttRange.start)
    const rangeEnd = startOfDay(ganttRange.end)
    const hourlyScale = ganttPeriod === 'day'
    const unitWidth = hourlyScale
      ? GANTT_TIME_SLOT_WIDTH
      : (ganttPeriod === 'week' ? GANTT_DAY_WIDTH_WEEK : GANTT_DAY_WIDTH_MONTH)
    const unitMs = hourlyScale ? SLOT_MINUTES * 60 * 1000 : MS_PER_DAY
    const columns = []
    const dayRangeStart = buildDateFromDayKey(formatISODate(rangeStart), WORKDAY_START_MINUTES)
    const dayRangeEnd = buildDateFromDayKey(formatISODate(rangeStart), WORKDAY_END_MINUTES)
    if (hourlyScale) {
      for (let minutes = WORKDAY_START_MINUTES; minutes < WORKDAY_END_MINUTES; minutes += SLOT_MINUTES) {
        columns.push({
          key: `m-${minutes}`,
          label: formatMinutesLabel(minutes),
          weekend: false,
        })
      }
    } else {
      const daysCount = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY) + 1)
      for (let index = 0; index < daysCount; index += 1) {
        const day = addDays(rangeStart, index)
        columns.push({
          key: formatISODate(day),
          label: ganttDayFormatter.format(day),
          weekend: day.getDay() === 0 || day.getDay() === 6,
        })
      }
    }

    const groupsMap = new Map()
    const upsertGroup = (key, label) => {
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { key, label, rows: [] })
      }
      return groupsMap.get(key)
    }
    const rangeStartTs = hourlyScale && dayRangeStart ? dayRangeStart.getTime() : rangeStart.getTime()
    const rangeEndTsExclusive = hourlyScale && dayRangeEnd ? dayRangeEnd.getTime() : addDays(rangeEnd, 1).getTime()

    items.forEach((job) => {
      const jobId = Number(job?.id_lavorazione)
      if (!Number.isFinite(jobId) || jobId <= 0) {
        return
      }
      const activities = Array.isArray(activitiesByJob[jobId]) ? activitiesByJob[jobId] : []
      activities.forEach((activity) => {
        const startRaw = activity?.data_avvio || activity?.data_scadenza || activity?.data_fine
        const endRaw = activity?.data_fine || activity?.data_scadenza || activity?.data_avvio
        const parsedStart = parseDateTime(startRaw)
        const parsedEnd = parseDateTime(endRaw)
        if (!parsedStart && !parsedEnd) {
          return
        }

        const startDate = parsedStart && parsedEnd ? (parsedStart <= parsedEnd ? parsedStart : parsedEnd) : (parsedStart || parsedEnd)
        const endDate = parsedStart && parsedEnd ? (parsedStart <= parsedEnd ? parsedEnd : parsedStart) : (parsedEnd || parsedStart)
        if (!startDate || !endDate) {
          return
        }

        const hasExplicitTime = hasTimePart(startRaw) || hasTimePart(endRaw)
        let startTs = startDate.getTime()
        let endTs = endDate.getTime()
        if (!hasExplicitTime) {
          if (hourlyScale) {
            startTs = rangeStartTs
            endTs = rangeEndTsExclusive
          } else {
            startTs = startOfDay(startDate).getTime()
            endTs = addDays(startOfDay(endDate), 1).getTime()
          }
        } else if (endTs <= startTs) {
          endTs = startTs + (1000 * 60 * 60)
        }

        if (endTs <= rangeStartTs || startTs >= rangeEndTsExclusive) {
          return
        }

        const clippedStartTs = Math.max(startTs, rangeStartTs)
        const clippedEndTs = Math.min(endTs, rangeEndTsExclusive)
        let startOffset = 0
        let spanUnits = 1
        if (hourlyScale) {
          startOffset = (clippedStartTs - rangeStartTs) / unitMs
          spanUnits = Math.max(1, (clippedEndTs - clippedStartTs) / unitMs)
        } else {
          // In settimana/mese usa bucket giornalieri interi per evitare sbordi visivi.
          const clippedStartDayTs = startOfDay(new Date(clippedStartTs)).getTime()
          const clippedEndInclusiveDayTs = startOfDay(new Date(Math.max(clippedStartTs, clippedEndTs - 1))).getTime()
          startOffset = Math.max(0, Math.floor((clippedStartDayTs - rangeStartTs) / MS_PER_DAY))
          spanUnits = Math.max(
            1,
            Math.floor((clippedEndInclusiveDayTs - clippedStartDayTs) / MS_PER_DAY) + 1,
          )
        }
        const rowBase = {
          activity,
          job,
          start: startDate,
          end: endDate,
          startOffset,
          spanUnits,
        }

        if (ganttGroupBy === 'operator') {
          const rawAssignees = Array.isArray(activity?.assegnatari) ? activity.assegnatari : []
          const normalized = rawAssignees
            .map((item) => String(item || '').trim())
            .filter((item) => item !== '')
          const fallback = formatActivityOperatorLabel(activity)
          const assignees = normalized.length > 0 ? normalized : [fallback || 'Non assegnato']
          Array.from(new Set(assignees)).forEach((name) => {
            const group = upsertGroup(`operator-${name.toLowerCase()}`, name)
            group.rows.push(rowBase)
          })
          return
        }

        const jobLabel = formatJobReferenceLabel(job)
        const group = upsertGroup(`job-${jobId}`, jobLabel)
        group.rows.push(rowBase)
      })
    })

    let groups = []
    if (ganttGroupBy === 'operator') {
      groups = Array.from(groupsMap.values())
        .map((group) => ({
          ...group,
          rows: group.rows.sort((a, b) => a.start.getTime() - b.start.getTime()),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))
    } else {
      groups = Array.from(groupsMap.values())
        .map((group) => ({
          ...group,
          rows: group.rows.sort((a, b) => a.start.getTime() - b.start.getTime()),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))
    }

    return {
      columns,
      unitWidth,
      hourlyScale,
      groups,
      rowsCount: groups.reduce((acc, group) => acc + group.rows.length, 0),
    }
  }, [ganttRange, ganttGroupBy, ganttPeriod, items, activitiesByJob])

  const activityJobMap = useMemo(() => {
    const map = new Map()
    items.forEach((job) => {
      const jobId = Number(job?.id_lavorazione)
      if (!Number.isFinite(jobId) || jobId <= 0) {
        return
      }
      const activities = Array.isArray(activitiesByJob[jobId]) ? activitiesByJob[jobId] : []
      activities.forEach((activity) => {
        const activityId = Number(activity?.id_attivita)
        if (Number.isFinite(activityId) && activityId > 0) {
          map.set(activityId, job)
        }
      })
    })
    return map
  }, [items, activitiesByJob])

  const unscheduledActivities = useMemo(
    () =>
      allActivities.filter(
        (activity) => !activity?.data_avvio && !activity?.data_fine && !activity?.data_scadenza,
      ),
    [allActivities],
  )

  const handleFilterChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Applica ricerca testuale riportando la paginazione alla prima pagina.
  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setRefreshIndex((value) => value + 1)
  }

  // Trigger manuale refresh dati.
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
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1)
    })
  }

  const handleCalendarNext = () => {
    setCalendarDate((current) => {
      const base = current instanceof Date && !Number.isNaN(current.getTime()) ? current : new Date()
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
    })
  }

  const handleCalendarToday = () => {
    setCalendarDate(new Date())
  }

  const handleGanttPrev = () => {
    setCalendarDate((current) => {
      const base = current instanceof Date && !Number.isNaN(current.getTime()) ? current : new Date()
      if (ganttPeriod === 'day') {
        return addDays(base, -1)
      }
      if (ganttPeriod === 'month') {
        return new Date(base.getFullYear(), base.getMonth() - 1, 1)
      }
      return addDays(base, -7)
    })
  }

  const handleGanttNext = () => {
    setCalendarDate((current) => {
      const base = current instanceof Date && !Number.isNaN(current.getTime()) ? current : new Date()
      if (ganttPeriod === 'day') {
        return addDays(base, 1)
      }
      if (ganttPeriod === 'month') {
        return new Date(base.getFullYear(), base.getMonth() + 1, 1)
      }
      return addDays(base, 7)
    })
  }

  const handleGanttToday = () => {
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

  // Espande/collassa il pannello attività di una lavorazione.
  const handleToggleJobActivities = (jobId) => {
    const resolvedId = Number(jobId)
    if (!Number.isFinite(resolvedId) || resolvedId <= 0) {
      return
    }
    const isCurrentlyExpanded = expandedJobs.includes(resolvedId)
    setExpandedJobs((current) =>
      isCurrentlyExpanded ? current.filter((id) => id !== resolvedId) : [...current, resolvedId],
    )
    if (!isCurrentlyExpanded && !activitiesByJob[resolvedId] && !activitiesLoading[resolvedId]) {
      loadJobActivities(resolvedId)
    }
  }

  const handleActivityDragStart = (activity, jobId) => (event) => {
    const activityId = Number(activity?.id_attivita)
    if (!Number.isFinite(activityId) || activityId <= 0) {
      event.preventDefault()
      return
    }
    const payload = { activityId, jobId: Number(jobId) || null }
    setDraggedActivity(payload)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify(payload))
    }
  }

  const handleActivityDragEnd = () => {
    setDraggedActivity(null)
    setActiveDropSlot(null)
  }

  const resolveDraggedActivity = (event) => {
    const raw = event?.dataTransfer?.getData('text/plain')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const activityId = Number(parsed?.activityId)
        const jobId = Number(parsed?.jobId)
        if (Number.isFinite(activityId) && activityId > 0) {
          return {
            activityId,
            jobId: Number.isFinite(jobId) && jobId > 0 ? jobId : null,
          }
        }
      } catch (_error) {
        // ignore
      }
    }
    if (draggedActivity?.activityId) {
      return {
        activityId: draggedActivity.activityId,
        jobId: draggedActivity.jobId || null,
      }
    }
    return null
  }

  const handleSlotDragOver = (dayKey) => (event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    const index = getSlotIndexFromClientY(dayKey, event.clientY)
    if (index === null) {
      return
    }
    const slotMinutes = WORKDAY_START_MINUTES + index * SLOT_MINUTES
    setActiveDropSlot(`${dayKey}-${slotMinutes}`)
  }

  const handleSlotDragLeave = () => () => {
    setActiveDropSlot(null)
  }

  const handleSlotDrop = (dayKey) => async (event) => {
    event.preventDefault()
    setActiveDropSlot(null)
    if (!token || calendarScheduleLoading) {
      return
    }
    const dragged = resolveDraggedActivity(event)
    if (!dragged) {
      return
    }

    const index = getSlotIndexFromClientY(dayKey, event.clientY)
    if (index === null) {
      return
    }
    const slotMinutes = WORKDAY_START_MINUTES + index * SLOT_MINUTES
    const startDate = buildDateFromDayKey(dayKey, slotMinutes)
    if (!startDate) {
      return
    }
    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + SLOT_MINUTES)

    const dataAvvio = formatDateTimeForApi(startDate)
    const dataFine = formatDateTimeForApi(endDate)
    if (!dataAvvio || !dataFine) {
      return
    }

    setCalendarScheduleError(null)
    setCalendarScheduleLoading(true)
    try {
      await updateLavorazioneActivityReport({
        token,
        idAttivita: dragged.activityId,
        dataAvvio,
        dataFine,
      })

      setActivitiesByJob((prev) => {
        const next = { ...prev }
        const updateForJob = (jobId) => {
          if (!jobId || !Array.isArray(next[jobId])) {
            return
          }
          next[jobId] = next[jobId].map((activity) => {
            if (Number(activity?.id_attivita) !== dragged.activityId) {
              return activity
            }
            return {
              ...activity,
              data_avvio: dataAvvio,
              data_fine: dataFine,
            }
          })
        }

        if (dragged.jobId) {
          updateForJob(dragged.jobId)
        } else {
          Object.keys(next).forEach((key) => updateForJob(Number(key)))
        }

        return next
      })
    } catch (err) {
      console.error('Impossibile pianificare attivita:', err)
      setCalendarScheduleError(
        err?.message || "Errore durante la pianificazione dell'attivita. Riprovare.",
      )
    } finally {
      setCalendarScheduleLoading(false)
    }
  }

  const handleUnscheduledDragOver = (event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    setIsUnscheduledDropActive(true)
  }

  const handleUnscheduledDragLeave = () => {
    setIsUnscheduledDropActive(false)
  }

  const handleUnscheduledDrop = async (event) => {
    event.preventDefault()
    setIsUnscheduledDropActive(false)
    setActiveDropSlot(null)
    if (!token || calendarScheduleLoading) {
      return
    }
    const dragged = resolveDraggedActivity(event)
    if (!dragged) {
      return
    }

    setCalendarScheduleError(null)
    setCalendarScheduleLoading(true)
    try {
      await updateLavorazioneActivityReport({
        token,
        idAttivita: dragged.activityId,
        dataAvvio: '',
        dataFine: '',
      })
      await updateLavorazioneActivity({
        token,
        idAttivita: dragged.activityId,
        dataScadenza: '',
      })

      setActivitiesByJob((prev) => {
        const next = { ...prev }
        const updateForJob = (jobId) => {
          if (!jobId || !Array.isArray(next[jobId])) {
            return
          }
          next[jobId] = next[jobId].map((activity) => {
            if (Number(activity?.id_attivita) !== dragged.activityId) {
              return activity
            }
            return {
              ...activity,
              data_avvio: null,
              data_fine: null,
              data_scadenza: null,
            }
          })
        }

        if (dragged.jobId) {
          updateForJob(dragged.jobId)
        } else {
          Object.keys(next).forEach((key) => updateForJob(Number(key)))
        }

        return next
      })
    } catch (err) {
      console.error('Impossibile spostare attività in senza date:', err)
      setCalendarScheduleError(
        err?.message || "Errore durante lo spostamento dell'attivita in senza date. Riprovare.",
      )
    } finally {
      setCalendarScheduleLoading(false)
    }
  }

  const getSlotIndexFromClientY = (dayKey, clientY) => {
    const column = dayColumnRefs.current[dayKey]
    if (!column) {
      return null
    }
    const rect = column.getBoundingClientRect()
    const offset = clientY - rect.top
    const index = Math.floor(offset / SLOT_ROW_HEIGHT)
    if (Number.isNaN(index) || index < 0 || index >= timeSlots.length) {
      return null
    }
    return index
  }

  // Avvia resize orizzontale di una barra attività in gantt.
  const handleResizeStart = (entry) => (event) => {
    event.preventDefault()
    event.stopPropagation()
    const activityId = Number(entry?.activity?.id_attivita)
    if (!Number.isFinite(activityId) || activityId <= 0) {
      return
    }
    setResizeState({
      activityId,
      jobId: entry?.job?.id_lavorazione || null,
      dayKey: entry?.dayKey,
      startMinutes: entry?.startMinutes,
      endMinutes: entry?.endMinutes,
    })
  }

  // Gestisce resize gantt globale (mousemove/mouseup) con persistenza server.
  useEffect(() => {
    if (!resizeState) {
      return undefined
    }

    const handleMove = (event) => {
      const index = getSlotIndexFromClientY(resizeState.dayKey, event.clientY)
      if (index === null) {
        return
      }
      const newEndMinutes = WORKDAY_START_MINUTES + (index + 1) * SLOT_MINUTES
      if (newEndMinutes <= resizeState.startMinutes) {
        setResizeState((prev) =>
          prev ? { ...prev, endMinutes: prev.startMinutes + SLOT_MINUTES } : prev,
        )
        return
      }
      if (newEndMinutes > WORKDAY_END_MINUTES) {
        setResizeState((prev) => (prev ? { ...prev, endMinutes: WORKDAY_END_MINUTES } : prev))
        return
      }
      setResizeState((prev) => (prev ? { ...prev, endMinutes: newEndMinutes } : prev))
    }

    const handleUp = async () => {
      const current = resizeState
      setResizeState(null)
      if (!current || !token) {
        return
      }

      const startDate = buildDateFromDayKey(current.dayKey, current.startMinutes)
      const endDate = buildDateFromDayKey(current.dayKey, current.endMinutes)
      if (!startDate || !endDate) {
        return
      }

      const dataAvvio = formatDateTimeForApi(startDate)
      const dataFine = formatDateTimeForApi(endDate)
      if (!dataAvvio || !dataFine) {
        return
      }

      setCalendarScheduleError(null)
      setCalendarScheduleLoading(true)
      try {
        await updateLavorazioneActivityReport({
          token,
          idAttivita: current.activityId,
          dataAvvio,
          dataFine,
        })

        setActivitiesByJob((prev) => {
          const next = { ...prev }
          const updateForJob = (jobId) => {
            if (!jobId || !Array.isArray(next[jobId])) {
              return
            }
            next[jobId] = next[jobId].map((activity) => {
              if (Number(activity?.id_attivita) !== current.activityId) {
                return activity
              }
              return {
                ...activity,
                data_avvio: dataAvvio,
                data_fine: dataFine,
              }
            })
          }

          if (current.jobId) {
            updateForJob(current.jobId)
          } else {
            Object.keys(next).forEach((key) => updateForJob(Number(key)))
          }

          return next
        })
      } catch (err) {
        console.error('Impossibile aggiornare la durata attivita:', err)
        setCalendarScheduleError(
          err?.message || "Errore durante l'aggiornamento della durata dell'attivita. Riprovare.",
        )
      } finally {
        setCalendarScheduleLoading(false)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp, { once: true })

    return () => {
      window.removeEventListener('mousemove', handleMove)
    }
  }, [resizeState, token])

  const currentItems = items

  const pageInfo = `Pagina ${serverPagination.page || page} di ${serverPagination.total_pages || 1}`
  const ganttColumnsCount = Math.max(1, ganttModel.columns.length)
  const ganttTimelineMinWidth = ganttModel.columns.length * ganttModel.unitWidth
  const ganttStretchToAvailable = viewMode === 'gantt' && ganttPeriod === 'week'
  const ganttTimelineWidth = ganttStretchToAvailable
    ? `calc(100% - ${GANTT_LABEL_WIDTH}px)`
    : `${ganttTimelineMinWidth}px`
  const ganttColumnWidth = ganttStretchToAvailable
    ? `calc(100% / ${ganttColumnsCount})`
    : `${ganttModel.unitWidth}px`
  const ganttColumnMinWidth = ganttStretchToAvailable ? '0px' : `${ganttModel.unitWidth}px`
  const ganttGridBackgroundSize = ganttStretchToAvailable
    ? `calc(100% / ${ganttColumnsCount}) 100%`
    : `${ganttModel.unitWidth}px 100%`
  const ganttCanvasMinWidth = ganttStretchToAvailable ? '0px' : `${ganttTimelineMinWidth}px`
  const ganttOuterMinWidth = ganttStretchToAvailable
    ? '100%'
    : `${GANTT_LABEL_WIDTH + ganttTimelineMinWidth}px`

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
                  data-testid="search"
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
              <CButton
                color="light"
                type="button"
                onClick={() => setFilters(defaultFilters)}
                data-testid="filters-reset"
              >
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
            <div className="small text-body-secondary">Totale lavorazioni: {kanbanItems.length}</div>
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
                          <CAccordion alwaysOpen flush className="gap-3">
                            {columnItems.map((job, jobIndex) => {
                              const jobId = Number(job.id_lavorazione)
                              const hasValidId = Number.isFinite(jobId) && jobId > 0
                              const jobKey = job.id_lavorazione
                                ? `kanban-${job.id_lavorazione}`
                                : job.codice || `kanban-${column.key}-${jobIndex}`
                              const progressValue = Number(job.percentuale_avanzamento) || 0
                      const { referenceTitle, objectDescription, codeLabel } = buildJobLabelInfo(job)
                      const activitySummary = `${job.attivita_aperte ?? job.attivita_in_corso ?? '-'} / ${job.attivita_totali ?? '-'}`
                      const headerLabel = codeLabel
                              const customerName =
                                job.cliente || job.cliente_ragione_sociale || job.ragione_sociale || job.anagrafica_ragione_sociale || ''
                              const isUpdating = statusUpdatingJobId === jobId
                              const isDraggable = hasValidId && statusUpdatingJobId === null
                              const preventivoLabel = job.numero_preventivo ? `Preventivo ${job.numero_preventivo}` : null
                              return (
                                <CAccordionItem key={jobKey} itemKey={jobKey} className="border-0 p-0">
                                  <div className="position-relative rounded-3" style={kanbanCardStyle}>
                                    {isUpdating ? (
                                      <div
                                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-3"
                                        style={{
                                          backgroundColor: 'var(--cui-card-bg, var(--cui-body-bg, #fff))',
                                          opacity: 0.75,
                                        }}
                                      >
                                        <CSpinner size="sm" color="primary" />
                                      </div>
                                    ) : null}
                            <CAccordionHeader
                              className="px-3 py-3 d-flex justify-content-between align-items-start gap-3"
                              draggable={isDraggable}
                              onDragStart={isDraggable ? handleKanbanCardDragStart(job) : undefined}
                              onDragEnd={isDraggable ? handleKanbanCardDragEnd : undefined}
                              aria-grabbed={draggedJobId === jobId}
                              style={{ cursor: isDraggable ? 'grab' : 'pointer' }}
                            >
                              <div className="flex-grow-1 pe-3">
                                <div className="fw-semibold text-truncate">{headerLabel}</div>
                                {preventivoLabel ? (
                                  <div className="text-body-secondary small text-truncate">{preventivoLabel}</div>
                                ) : null}
                                {referenceTitle ? (
                                  <div className="text-body-secondary small text-truncate">{referenceTitle}</div>
                                ) : null}
                                {customerName ? (
                                  <div className="text-body-secondary small text-truncate">{customerName}</div>
                                ) : null}
                              </div>
                              <div className="d-flex flex-column align-items-end gap-2">
                                {renderPrioritaBadge(job.priorita)}
                              </div>
                            </CAccordionHeader>
                                    <CAccordionBody className="px-3 pb-3 pt-0">
                                      {objectDescription ? (
                                        <div className="text-body-secondary small mb-2">{objectDescription}</div>
                                      ) : null}
                                      <div className="d-flex flex-wrap gap-3 mb-2 small text-body-secondary">
                                        <span>Cliente: {job.cliente || '-'}</span>
                                        <span>Operatore: {job.operatore_principale || 'n/d'}</span>
                                        <span>Reparto: {job.reparto_label || job.reparto || 'n/d'}</span>
                                        <span>Preventivo: {job.numero_preventivo || '-'}</span>
                                      </div>
                                      <div className="d-flex align-items-center gap-2 mb-2">
                                        <CProgress
                                          thin
                                          value={Math.min(100, Math.max(0, progressValue))}
                                          color={progressValue >= 100 ? 'success' : 'primary'}
                                          className="flex-grow-1"
                                        />
                                        <span className="small text-nowrap">{formatPercent(progressValue)}</span>
                                      </div>
                                      <div className="small text-body-secondary d-flex flex-wrap gap-3 align-items-center mb-3">
                                        <span>Inizio: {formatDate(job.data_inizio_prevista)}</span>
                                        <span>Fine: {formatDate(job.data_fine_prevista)}</span>
                                        <span>Attività: {activitySummary}</span>
                                        {job.ritardo_giorni > 0 ? (
                                          <CBadge color="danger">Ritardo {job.ritardo_giorni}g</CBadge>
                                        ) : null}
                                      </div>
                                      <div className="d-flex justify-content-end">
                                        <CButton
                                          color="primary"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (!hasValidId) {
                                              return
                                            }
                                            navigate(`/lavorazioni/dettaglio?id=${jobId}`)
                                          }}
                                          aria-label="Apri lavorazione"
                                        >
                                          <CIcon icon={cilArrowRight} />
                                        </CButton>
                                      </div>
                                    </CAccordionBody>
                                  </div>
                                </CAccordionItem>
                              )
                            })}
                          </CAccordion>
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
                Attivita pianificate: {calendarActivities.length}
                {unscheduledActivities.length > 0 ? ` - Senza date: ${unscheduledActivities.length}` : ''}
              </div>
            </div>
            {unscheduledActivities.length > 0 ? (
              <CAlert color="info">
                {unscheduledActivities.length === 1
                  ? 'Una attivita non ha ancora date previste. Trascinala nel calendario per pianificarla.'
                  : `${unscheduledActivities.length} attivita non hanno date previste. Trascinale nel calendario per pianificarle.`}
              </CAlert>
            ) : null}
            {calendarScheduleError ? (
              <CAlert color="danger" className="mb-3">
                {calendarScheduleError}
              </CAlert>
            ) : null}
            {error ? (
              <CAlert color="danger" className="mb-3">
                {error?.message || 'Errore durante il caricamento delle lavorazioni.'}
              </CAlert>
            ) : null}
            <CRow className="g-3">
              <CCol xs={12} lg={3}>
                <div
                  className={classNames('border rounded-3 p-3 h-100', {
                    'bg-body-tertiary': isUnscheduledDropActive,
                  })}
                  onDragOver={handleUnscheduledDragOver}
                  onDragLeave={handleUnscheduledDragLeave}
                  onDrop={handleUnscheduledDrop}
                >
                  <div className="fw-semibold mb-2">Attivita senza date</div>
                  {unscheduledActivities.length === 0 ? (
                    <div className="text-body-secondary small">Nessuna attivita da pianificare.</div>
                  ) : (
                    <div className="d-flex flex-row flex-wrap gap-2">
                      {unscheduledActivities.map((activity, index) => {
                        const activityId = Number(activity?.id_attivita)
                        const activityKey = activityId > 0 ? activityId : `unscheduled-${index}`
                        const job = activityId > 0 ? activityJobMap.get(activityId) : null
                        const jobId = job?.id_lavorazione || null
                        const jobLabel = job ? formatJobReferenceLabel(job) : 'JOB'
                        const operatorLabel = formatActivityOperatorLabel(activity)
                        const customerReferenceLabel = formatCustomerReferenceLabel(job)
                        const isHovered = hoveredActivityCardKey === `unscheduled-${activityKey}`
                        return (
                          <div
                            key={activityKey}
                            className="border rounded-2 px-2 py-2 small cursor-pointer"
                            style={{
                              minWidth: '220px',
                              backgroundColor: 'var(--cui-card-bg, var(--cui-body-bg, #1f2633))',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                              maxWidth: isHovered ? '420px' : '260px',
                              zIndex: isHovered ? 20 : 1,
                              position: 'relative',
                            }}
                            onMouseEnter={() => setHoveredActivityCardKey(`unscheduled-${activityKey}`)}
                            onMouseLeave={() => setHoveredActivityCardKey(null)}
                            draggable
                            onDragStart={handleActivityDragStart(activity, jobId)}
                            onDragEnd={handleActivityDragEnd}
                          >
                            <div className={classNames('fw-semibold mb-1', { 'text-truncate': !isHovered })}>
                              {activity?.titolo || 'Attivita'}
                            </div>
                            <div className={classNames('text-body-secondary small', { 'text-truncate': !isHovered })}>
                              {jobLabel}
                            </div>
                            {operatorLabel ? (
                              <div
                                className={classNames('text-body-secondary small', {
                                  'text-truncate': !isHovered,
                                })}
                              >
                                {operatorLabel}
                              </div>
                            ) : null}
                            <div
                              className={classNames('text-body-secondary small', {
                                'text-truncate': !isHovered,
                              })}
                            >
                              {customerReferenceLabel}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CCol>
              <CCol xs={12} lg={9}>
                <div className="table-responsive position-relative">
                  {loading ? (
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
                      <CSpinner color="primary" />
                    </div>
                  ) : null}
                  <table className="table table-bordered align-middle calendar-table mb-0" data-testid="table">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '92px' }} className="text-uppercase small text-center">
                          Ora
                        </th>
                        {daysRange.map((day) => (
                          <th key={day.isoKey} className="text-uppercase small">
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, slotIndex) => (
                        <tr key={`slot-${slot.minutes}`} style={{ height: `${SLOT_ROW_HEIGHT}px` }}>
                          <td className="small text-body-secondary text-center align-middle">{slot.label}</td>
                          {daysRange.map((day) => {
                            if (slotIndex !== 0) {
                              return null
                            }
                            const entries = calendarGrid.get(day.isoKey) || []
                            const isActive = activeDropSlot?.startsWith(`${day.isoKey}-`)
                            return (
                              <td
                                key={`${day.isoKey}-timeline`}
                                rowSpan={timeSlots.length}
                                onDragOver={handleSlotDragOver(day.isoKey)}
                                onDragLeave={handleSlotDragLeave()}
                                onDrop={handleSlotDrop(day.isoKey)}
                                className={classNames('p-0 align-top', { 'bg-body-tertiary': isActive })}
                              >
                                <div
                                  ref={(node) => {
                                    if (node) {
                                      dayColumnRefs.current[day.isoKey] = node
                                    }
                                  }}
                                  className="position-relative"
                                  style={{
                                    height: `${timeSlots.length * SLOT_ROW_HEIGHT}px`,
                                    padding: '4px',
                                    overflow: 'hidden',
                                    backgroundImage:
                                      'linear-gradient(to bottom, rgba(128, 128, 128, 0.18) 1px, transparent 1px)',
                                    backgroundSize: `100% ${SLOT_ROW_HEIGHT}px`,
                                  }}
                                >
                                  {entries.length === 0 ? (
                                    <div className="text-body-tertiary small position-absolute top-0 start-0 p-2">
                                      -
                                    </div>
                                  ) : null}
                                  {entries.map((entry) => {
                                    const job = entry.job
                                    const activity = entry.activity
                                    const jobLabel = formatJobReferenceLabel(job)
                                    const activityLabel = activity?.titolo || 'Attivita'
                                    const operatorLabel = formatActivityOperatorLabel(activity)
                                    const customerReferenceLabel = formatCustomerReferenceLabel(job)
                                    const isHovered = hoveredActivityCardKey === `calendar-${entry.layoutId}`
                                    const isResizing =
                                      resizeState?.activityId === Number(activity?.id_attivita) &&
                                      resizeState?.dayKey === entry.dayKey
                                    const endMinutes = isResizing ? resizeState.endMinutes : entry.endMinutes
                                    const top =
                                      ((entry.startMinutes - WORKDAY_START_MINUTES) / SLOT_MINUTES) *
                                      SLOT_ROW_HEIGHT
                                    const height =
                                      ((endMinutes - entry.startMinutes) / SLOT_MINUTES) * SLOT_ROW_HEIGHT
                                    const widthPercent = 100 / (entry.columnCount || 1)
                                    const leftPercent = (entry.column || 0) * widthPercent
                                    return (
                                      <div
                                        key={entry.layoutId}
                                        className={classNames(
                                          'border rounded-2 px-2 py-1 small position-absolute',
                                          `border-${statoBadgeMap[job.stato] || 'secondary'}`,
                                        )}
                                        style={{
                                          top: `${top + 2}px`,
                                          height: isHovered
                                            ? 'auto'
                                            : `${Math.max(height - 4, SLOT_ROW_HEIGHT)}px`,
                                          minHeight: `${Math.max(height - 4, SLOT_ROW_HEIGHT)}px`,
                                          left: `calc(${leftPercent}% + 3px)`,
                                          width: isHovered
                                            ? `min(420px, calc(${widthPercent}% + 140px))`
                                            : `calc(${widthPercent}% - 6px)`,
                                          minWidth: '140px',
                                          backgroundColor: 'var(--cui-card-bg, var(--cui-body-bg, #1f2633))',
                                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                          paddingBottom: '10px',
                                          overflow: isHovered ? 'visible' : 'hidden',
                                          zIndex: isHovered ? 30 : 2,
                                        }}
                                        onMouseEnter={() => setHoveredActivityCardKey(`calendar-${entry.layoutId}`)}
                                        onMouseLeave={() => setHoveredActivityCardKey(null)}
                                        draggable
                                        onDragStart={handleActivityDragStart(activity, job.id_lavorazione)}
                                        onDragEnd={handleActivityDragEnd}
                                      >
                                        <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                                          <div
                                            className={classNames('fw-semibold', {
                                              'text-truncate': !isHovered,
                                            })}
                                          >
                                            {activityLabel}
                                          </div>
                                          <CButton
                                            color="primary"
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 d-inline-flex align-items-center justify-content-center"
                                            style={{ width: '1.4rem', height: '1.4rem' }}
                                            onClick={(event) => {
                                              event.preventDefault()
                                              event.stopPropagation()
                                              if (job.id_lavorazione) {
                                                navigate(`/lavorazioni/dettaglio?id=${job.id_lavorazione}`)
                                              }
                                            }}
                                            aria-label="Apri lavorazione"
                                            title="Apri lavorazione"
                                          >
                                            <CIcon icon={cilArrowRight} size="sm" />
                                          </CButton>
                                        </div>
                                        <div
                                          className={classNames('text-body-secondary small', {
                                            'text-truncate': !isHovered,
                                          })}
                                        >
                                          {jobLabel}
                                        </div>
                                        {operatorLabel ? (
                                          <div
                                            className={classNames('text-body-secondary small', {
                                              'text-truncate': !isHovered,
                                            })}
                                          >
                                            {operatorLabel}
                                          </div>
                                        ) : null}
                                        <div
                                          className={classNames('text-body-secondary small', {
                                            'text-truncate': !isHovered,
                                          })}
                                        >
                                          {customerReferenceLabel}
                                        </div>
                                        <div
                                          className="position-absolute start-0 bottom-0 w-100"
                                          style={{ padding: '2px 8px 3px 8px' }}
                                        >
                                          <div
                                            className="w-100"
                                            style={{
                                              cursor: 'ns-resize',
                                              height: '4px',
                                              borderRadius: '999px',
                                              backgroundColor: 'rgba(130, 140, 170, 0.6)',
                                            }}
                                            onMouseDown={handleResizeStart(entry)}
                                            title="Trascina per estendere durata"
                                          />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
              </table>
            </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      ) : null}

      {viewMode === 'gantt' ? (
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between">
            <div>
              <strong>Gantt attivita</strong>
              <div className="small text-body-secondary">
                Vista per lavorazione o utente sulle attivita nel periodo selezionato.
              </div>
            </div>
            <div className="small text-body-secondary text-lg-end">
              Attivita pianificate: {ganttModel.rowsCount}
              {ganttModel.columns.length > 0
                ? ` - ${ganttModel.hourlyScale ? 'Ore' : 'Giorni'} visualizzati: ${ganttModel.columns.length}`
                : ''}
              <div>{ganttRange.label}</div>
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex flex-column flex-lg-row gap-3 align-items-lg-end mb-3">
              <div style={{ minWidth: '220px' }}>
                <CFormLabel htmlFor="gantt-group-by" className="mb-1">Raggruppa per</CFormLabel>
                <CFormSelect
                  id="gantt-group-by"
                  value={ganttGroupBy}
                  onChange={(event) => setGanttGroupBy(event.target.value)}
                >
                  {ganttGroupByOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div style={{ minWidth: '180px' }}>
                <CFormLabel htmlFor="gantt-period" className="mb-1">Periodo</CFormLabel>
                <CFormSelect
                  id="gantt-period"
                  value={ganttPeriod}
                  onChange={(event) => setGanttPeriod(event.target.value)}
                >
                  {ganttPeriodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <CButtonGroup size="sm">
                  <CButton color="outline-primary" onClick={handleGanttPrev}>
                    <CIcon icon={cilChevronLeft} />
                  </CButton>
                  <CButton color="outline-primary" onClick={handleGanttNext}>
                    <CIcon icon={cilChevronRight} />
                  </CButton>
                </CButtonGroup>
                <CButton color="outline-primary" size="sm" onClick={handleGanttToday}>
                  Oggi
                </CButton>
              </div>
            </div>
            {error ? (
              <CAlert color="danger" className="mb-3">
                {error?.message || 'Errore durante il caricamento delle lavorazioni.'}
              </CAlert>
            ) : null}
            {ganttModel.rowsCount === 0 ? (
              <CAlert color="info" className="mb-0">
                Nessuna attivita con date disponibili per costruire il GANTT.
              </CAlert>
            ) : (
              <div className="position-relative">
                {loading ? (
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
                  >
                    <CSpinner color="primary" />
                  </div>
                ) : null}
                <div className="overflow-auto border rounded-3">
                  <div style={{ minWidth: ganttOuterMinWidth, width: '100%' }}>
                    <div className="d-flex border-bottom bg-body-tertiary">
                      <div
                        className="px-3 py-2 fw-semibold border-end"
                        style={{ width: `${GANTT_LABEL_WIDTH}px`, minWidth: `${GANTT_LABEL_WIDTH}px` }}
                      >
                        {ganttGroupBy === 'operator' ? 'Utente / Attivita' : 'Lavorazione / Attivita'}
                      </div>
                      <div className="d-flex" style={{ width: ganttTimelineWidth, minWidth: ganttCanvasMinWidth }}>
                        {ganttModel.columns.map((day) => (
                          <div
                            key={`gantt-head-${day.key}`}
                            className="small text-uppercase text-center px-1 py-2 border-end"
                            style={{
                              width: ganttColumnWidth,
                              minWidth: ganttColumnMinWidth,
                              boxSizing: 'border-box',
                              backgroundColor: day.weekend
                                ? 'rgba(130, 140, 170, 0.18)'
                                : 'rgba(32, 42, 62, 0.72)',
                            }}
                          >
                            {day.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      {ganttModel.groups.map((group) => {
                        const firstRow = Array.isArray(group.rows) && group.rows.length > 0 ? group.rows[0] : null
                        const groupJob = firstRow?.job ?? null
                        const groupJobId = Number(groupJob?.id_lavorazione)
                        const groupCanOpen = Number.isFinite(groupJobId) && groupJobId > 0
                        const groupStarts = group.rows.map((row) => row.start?.getTime?.() ?? Number.POSITIVE_INFINITY)
                        const groupEnds = group.rows.map((row) => row.end?.getTime?.() ?? Number.NEGATIVE_INFINITY)
                        const groupStartTs = Math.min(...groupStarts)
                        const groupEndTs = Math.max(...groupEnds)
                        const groupStart = Number.isFinite(groupStartTs) ? new Date(groupStartTs) : null
                        const groupEnd = Number.isFinite(groupEndTs) ? new Date(groupEndTs) : null
                        const uniqueJobIds = new Set(
                          group.rows
                            .map((row) => Number(row?.job?.id_lavorazione))
                            .filter((id) => Number.isFinite(id) && id > 0),
                        )
                        const isJobTimelineLayout = ganttGroupBy === 'job'
                        return (
                        <div key={group.key} className="border-bottom">
                          {isJobTimelineLayout ? (
                            <div className="d-flex border-bottom">
                              <div
                                className="px-3 py-3 border-end"
                                style={{ width: `${GANTT_LABEL_WIDTH}px`, minWidth: `${GANTT_LABEL_WIDTH}px` }}
                              >
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                  <div className="text-truncate fs-5 fw-semibold">{group.label}</div>
                                  {groupJob ? renderStatoBadge(groupJob) : null}
                                </div>
                                <div className="small text-body-secondary text-truncate">
                                  {`${formatCustomerReferenceLabel(groupJob)} - ${groupJob?.cliente || '-'}`}
                                </div>
                                <div className="small text-body-secondary text-truncate">
                                  {groupStart && groupEnd
                                    ? (ganttModel.hourlyScale
                                      ? `${formatDateTime(groupStart)} - ${formatDateTime(groupEnd)}`
                                      : `${formatDate(groupStart)} - ${formatDate(groupEnd)}`)
                                    : '-'}
                                </div>
                                {groupCanOpen ? (
                                  <CButton
                                    size="sm"
                                    color="primary"
                                    variant="ghost"
                                    className="mt-2 p-0"
                                    onClick={() => navigate(`/lavorazioni/dettaglio?id=${groupJobId}`)}
                                  >
                                    Apri lavorazione
                                  </CButton>
                                ) : null}
                              </div>
                              <div
                                className="position-relative"
                                style={{
                                  width: ganttTimelineWidth,
                                  minWidth: ganttCanvasMinWidth,
                                  height: `${Math.max(52, group.rows.length * GANTT_BAR_ROW_STEP + 8)}px`,
                                  backgroundImage:
                                    'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px)',
                                  backgroundSize: ganttGridBackgroundSize,
                                }}
                              >
                                {group.rows.map((entry, index) => {
                                  const activityStatus = String(entry?.activity?.stato || '').toLowerCase()
                                  const barColor =
                                    activityStatus === 'done'
                                      ? '#2eb85c'
                                      : activityStatus === 'in_progress'
                                        ? '#321fdb'
                                        : activityStatus === 'sospesa'
                                          ? '#f9b115'
                                          : activityStatus === 'annullata' || activityStatus === 'cancelled'
                                            ? '#e55353'
                                            : '#6c757d'
                                  const totalColumns = Math.max(1, ganttModel.columns.length)
                                  const leftPercentRaw = (entry.startOffset / totalColumns) * 100
                                  const widthPercentRaw = (entry.spanUnits / totalColumns) * 100
                                  const leftPercent = Math.max(0, Math.min(100, leftPercentRaw))
                                  const maxWidthPercent = Math.max(0, 100 - leftPercent)
                                  const widthPercent = Math.max(0, Math.min(widthPercentRaw, maxWidthPercent))
                                  const left = `${leftPercent}%`
                                  const width = `${widthPercent}%`
                                  return (
                                    <div
                                      key={`job-bar-${group.key}-${entry?.activity?.id_attivita ?? index}`}
                                      className="position-absolute rounded-2 px-2 text-white small text-truncate"
                                      style={{
                                        left,
                                        width,
                                        top: `${GANTT_BAR_TOP_OFFSET + index * GANTT_BAR_ROW_STEP}px`,
                                        height: `${GANTT_BAR_HEIGHT}px`,
                                        lineHeight: `${GANTT_BAR_HEIGHT}px`,
                                        backgroundColor: barColor,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                      }}
                                      title={`${entry?.activity?.titolo || 'Attivita'} (${formatDate(entry.start)} - ${formatDate(entry.end)})`}
                                    >
                                      {entry?.activity?.titolo || 'Attivita'}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                          <div className="d-flex border-bottom bg-body-tertiary">
                            <div
                              className="px-3 py-2 fw-semibold border-end"
                              style={{ width: `${GANTT_LABEL_WIDTH}px`, minWidth: `${GANTT_LABEL_WIDTH}px` }}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <div className="text-truncate">{group.label}</div>
                                {ganttGroupBy === 'job' && groupJob ? renderStatoBadge(groupJob) : null}
                              </div>
                              <div className="small text-body-secondary text-truncate">
                                {ganttGroupBy === 'job'
                                  ? `${formatCustomerReferenceLabel(groupJob)} - ${groupJob?.cliente || '-'}`
                                  : `Attivita: ${group.rows.length} - Lavorazioni: ${uniqueJobIds.size}`}
                              </div>
                              <div className="small text-body-secondary text-truncate">
                                {groupStart && groupEnd
                                  ? (ganttModel.hourlyScale
                                    ? `${formatDateTime(groupStart)} - ${formatDateTime(groupEnd)}`
                                    : `${formatDate(groupStart)} - ${formatDate(groupEnd)}`)
                                  : '-'}
                              </div>
                              {ganttGroupBy === 'job' && groupCanOpen ? (
                                <CButton
                                  size="sm"
                                  color="primary"
                                  variant="ghost"
                                  className="mt-1 p-0"
                                  onClick={() => navigate(`/lavorazioni/dettaglio?id=${groupJobId}`)}
                                >
                                  Apri lavorazione
                                </CButton>
                              ) : null}
                            </div>
                            <div
                              style={{
                                width: ganttTimelineWidth,
                                minWidth: ganttCanvasMinWidth,
                              }}
                            />
                          </div>
                          )}
                          {!isJobTimelineLayout
                            ? group.rows.map((entry, index) => {
                              const activityId = Number(entry?.activity?.id_attivita)
                              const rowKey = Number.isFinite(activityId) && activityId > 0
                                ? `${group.key}-${activityId}`
                                : `${group.key}-row-${index}`
                              const activityStatus = String(
                                entry?.activity?.stato || '',
                              ).toLowerCase()
                              const barColor =
                                activityStatus === 'done'
                                  ? '#2eb85c'
                                  : activityStatus === 'in_progress'
                                    ? '#321fdb'
                                    : activityStatus === 'sospesa'
                                      ? '#f9b115'
                                      : activityStatus === 'annullata' || activityStatus === 'cancelled'
                                        ? '#e55353'
                                        : '#6c757d'
                              const totalColumns = Math.max(1, ganttModel.columns.length)
                              const leftPercentRaw = (entry.startOffset / totalColumns) * 100
                              const widthPercentRaw = (entry.spanUnits / totalColumns) * 100
                              const leftPercent = Math.max(0, Math.min(100, leftPercentRaw))
                              const maxWidthPercent = Math.max(0, 100 - leftPercent)
                              const widthPercent = Math.max(0, Math.min(widthPercentRaw, maxWidthPercent))
                              const left = `${leftPercent}%`
                              const width = `${widthPercent}%`
                              const rowJobId = Number(entry?.job?.id_lavorazione)
                              const canOpenRowJob = Number.isFinite(rowJobId) && rowJobId > 0
                              return (
                                <div key={rowKey} className="d-flex border-bottom">
                                  <div
                                    className="px-3 py-2 border-end"
                                    style={{ width: `${GANTT_LABEL_WIDTH}px`, minWidth: `${GANTT_LABEL_WIDTH}px` }}
                                  >
                                    {ganttGroupBy === 'operator' ? (
                                      <>
                                        {canOpenRowJob ? (
                                          <CButton
                                            color="link"
                                            className="p-0 fw-semibold text-truncate d-block text-start"
                                            onClick={() => navigate(`/lavorazioni/dettaglio?id=${rowJobId}`)}
                                          >
                                            {buildJobLabelInfo(entry?.job).codeLabel}
                                          </CButton>
                                        ) : (
                                          <div className="fw-semibold text-truncate">
                                            {buildJobLabelInfo(entry?.job).codeLabel}
                                          </div>
                                        )}
                                        <div className="small text-body-secondary text-truncate">
                                          {formatCustomerReferenceLabel(entry?.job)}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="small text-body-secondary">&nbsp;</div>
                                    )}
                                  </div>
                                  <div
                                    className="position-relative"
                                    style={{
                                      width: ganttTimelineWidth,
                                      minWidth: ganttCanvasMinWidth,
                                      height: '44px',
                                      backgroundImage:
                                        'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px)',
                                      backgroundSize: ganttGridBackgroundSize,
                                    }}
                                  >
                                    <div
                                      className="position-absolute rounded-2 px-2 text-white small text-truncate"
                                      style={{
                                        left,
                                        width,
                                        top: '9px',
                                        height: `${GANTT_BAR_HEIGHT}px`,
                                        lineHeight: `${GANTT_BAR_HEIGHT}px`,
                                        backgroundColor: barColor,
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                      }}
                                    title={`${entry?.activity?.titolo || 'Attivita'} (${formatDate(entry.start)} - ${formatDate(entry.end)})`}
                                  >
                                    {entry?.activity?.titolo || 'Attivita'}
                                  </div>
                                  </div>
                                </div>
                              )
                            })
                            : null}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      ) : null}

      {viewMode === 'lista' ? (
        <CCard className="w-100">
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
            <div className="position-relative w-100" style={{ minWidth: 0 }}>
              {loading ? (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
                  <CSpinner color="primary" />
                </div>
              ) : null}
              <div className="d-none d-md-block">
                <CTable hover responsive className="mb-0 w-100" data-testid="table">
                  <CTableHead className="mp-table-head">
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
                      <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {currentItems.length > 0 ? (
                      currentItems.map((job, index) => {
                    const progressValue = Number(job.percentuale_avanzamento) || 0
                    const jobId = Number(job.id_lavorazione)
                    const hasValidId = Number.isFinite(jobId) && jobId > 0
                    const isExpanded = hasValidId && expandedJobs.includes(jobId)
                    const jobActivities = hasValidId ? activitiesByJob[jobId] ?? [] : []
                    const activityLoadError = hasValidId ? activitiesError[jobId] : null
                    const isActivitiesLoading = hasValidId ? Boolean(activitiesLoading[jobId]) : false
                    const fragmentKey = job.id_lavorazione || job.codice || `row-${index}`
                    const { referenceTitle, objectDescription, codeLabel } = buildJobLabelInfo(job)
                    return (
                      <Fragment key={fragmentKey}>
                        <CTableRow
                          className="align-middle"
                          data-testid={`row-${hasValidId ? jobId : index}`}
                        >
                          <CTableDataCell>
                            <div className="d-flex align-items-start gap-3">
                              <CButton
                                color="light"
                                size="sm"
                                variant="ghost"
                                className="border border-1 rounded-circle p-1"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (hasValidId) {
                                    handleToggleJobActivities(jobId)
                                  }
                                }}
                                aria-label={isExpanded ? 'Chiudi attività' : 'Apri attività'}
                              >
                                <CIcon icon={isExpanded ? cilChevronTop : cilChevronBottom} />
                              </CButton>
                              <div className="flex-grow-1">
                                <div className="fw-semibold text-truncate">{referenceTitle}</div>
                                {objectDescription ? (
                                  <p className="text-body-secondary small mb-1 text-truncate">
                                    {objectDescription}
                                  </p>
                                ) : null}
                                <div className="text-body-secondary small text-truncate">{codeLabel}</div>
                                {job.ritardo_giorni > 0 ? (
                                  <CBadge color="danger" className="mt-1">
                                    Ritardo {job.ritardo_giorni}g
                                  </CBadge>
                                ) : null}
                              </div>
                            </div>
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
                          <CTableDataCell className="text-end">
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                if (hasValidId) {
                                  navigate(`/lavorazioni/dettaglio?id=${jobId}`)
                                }
                              }}
                              aria-label="Apri lavorazione"
                            >
                              <CIcon icon={cilArrowRight} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                        {isExpanded ? (
                          <CTableRow>
                            <CTableDataCell colSpan={10} className="py-0 border-0">
                              <CCollapse visible>
                                <div
                                  className="border rounded-3 p-3 mt-1"
                                  style={activityCardBaseStyle}
                                >
                                  {activityLoadError ? (
                                    <CAlert color="danger" className="mb-0">
                                      {activityLoadError?.message || 'Errore durante il caricamento delle attività.'}
                                    </CAlert>
                                  ) : isActivitiesLoading ? (
                                    <div className="d-flex align-items-center gap-2 text-body-secondary">
                                      <CSpinner size="sm" />
                                      <span>Caricamento attività...</span>
                                    </div>
                                  ) : jobActivities.length === 0 ? (
                                    <div className="text-body-secondary small">
                                      Nessuna attività registrata per questa lavorazione.
                                    </div>
                                  ) : (
                                    <div className="d-flex flex-column gap-3">
                                      {jobActivities.map((task, taskIndex) => {
                                        const activityKey = task?.id_attivita
                                          ? `activity-${task.id_attivita}`
                                          : `activity-${jobId}-${taskIndex}`
                                        return (
                                        <div
                                          key={activityKey}
                                          className="border rounded-3 p-3"
                                          style={activityCardBaseStyle}
                                        >
                                            <div className="d-flex justify-content-between align-items-start gap-3">
                                              <div>
                                                <div className="d-flex gap-2 align-items-center flex-wrap">
                                                  {renderPrioritaBadge(task.priorita)}
                                                  <span className="fw-semibold">{task.titolo || 'Attivita'}</span>
                                                </div>
                                                <div className="text-body-secondary small">
                                                  ID {task.id_attivita || '-'} • {task.reparto_label || '-'}
                                                </div>
                                              </div>
                                              <div className="text-end">
                                                {renderActivityStatoBadge(task.stato)}
                                                {task.report_operatore_nome ? (
                                                  <div className="text-body-secondary small mt-1">
                                                    Report: {task.report_operatore_nome}
                                                  </div>
                                                ) : null}
                                              </div>
                                            </div>
                                            <div className="d-flex flex-wrap gap-3 mt-2 small text-body-secondary">
                                              <span>Scadenza: {formatDate(task.data_scadenza)}</span>
                                              <span>Avanzamento: {formatPercent(task.percentuale)}</span>
                                              <span>
                                                Assegnatari:{' '}
                                                {Array.isArray(task.assegnatari) && task.assegnatari.length > 0
                                                  ? task.assegnatari.join(', ')
                                                  : 'n/d'}
                                              </span>
                                            </div>
                                            {task.descrizione ? (
                                              <div className="mt-2 text-body-secondary small">{task.descrizione}</div>
                                            ) : null}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </CCollapse>
                            </CTableDataCell>
                          </CTableRow>
                        ) : null}
                      </Fragment>
                    )
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={10} className="text-center py-5 text-body-secondary">
                      Nessuna lavorazione disponibile per i filtri selezionati.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
            <div className="d-md-none mt-3 w-100">
                {currentItems.length > 0 ? (
                  currentItems.map((job, index) => {
                    const progressValue = Number(job.percentuale_avanzamento) || 0
                    const jobId = Number(job.id_lavorazione)
                    const hasValidId = Number.isFinite(jobId) && jobId > 0
                    const { referenceTitle, objectDescription, codeLabel } = buildJobLabelInfo(job)
                    return (
                      <CCard key={job.id_lavorazione || job.codice || `mobile-${index}`} className="mb-3 shadow-sm">
                        <CCardBody>
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                            <div>
                              <div className="fw-semibold text-truncate">{referenceTitle}</div>
                              {objectDescription ? (
                                <p className="text-body-secondary small mb-1 text-truncate">{objectDescription}</p>
                              ) : null}
                              <div className="text-body-secondary small text-truncate">{codeLabel}</div>
                            </div>
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!hasValidId) return
                                navigate(`/lavorazioni/dettaglio?id=${jobId}`)
                              }}
                              aria-label="Apri lavorazione"
                            >
                              <CIcon icon={cilArrowRight} />
                            </CButton>
                          </div>
                          <div className="d-flex flex-wrap gap-3 mb-2 small text-body-secondary">
                            <span>{job.cliente || '-'}</span>
                            <span>{job.operatore_principale || '-'}</span>
                            <span>Reparto: {job.reparto_label || job.reparto || 'n/d'}</span>
                          </div>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <CProgress
                              thin
                              value={Math.min(100, Math.max(0, progressValue))}
                              color={progressValue >= 100 ? 'success' : 'primary'}
                              className="flex-grow-1"
                            />
                            <span className="small">{formatPercent(progressValue)}</span>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {renderStatoBadge(job)}
                            {renderPrioritaBadge(job.priorita)}
                          </div>
                        </CCardBody>
                      </CCard>
                    )
                  })
                ) : (
                  <div className="text-center text-body-secondary">
                    Nessuna lavorazione disponibile per i filtri selezionati.
                  </div>
                )}
              </div>
            </div>
        </CCardBody>
      </CCard>
      ) : null}
    </>
  )
}

export default LavorazioniList


