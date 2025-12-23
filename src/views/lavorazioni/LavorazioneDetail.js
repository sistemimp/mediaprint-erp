/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCallout,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CListGroup,
  CListGroupItem,
  CProgress,
  CRow,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormTextarea,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCheckCircle,
  cilDescription,
  cilMediaPause,
  cilMediaPlay,
  cilPeople,
  cilPen,
  cilReload,
  cilSend,
  cilSettings,
  cilXCircle,
} from '@coreui/icons'
import {
  fetchLavorazioneDetail,
  fetchLavorazioneActivityTemplates,
  fetchLavorazioneDocuments,
  fetchLavorazioneFiles,
  createLavorazioneActivity,
  fetchLavorazioniAssignmentsConfig,
  assignLavorazione,
  assignLavorazioneActivity,
  notifyLavorazioneOperators,
  updateLavorazioneInfo,
  updateLavorazioneActivityStatus,
  updateLavorazioneActivityReport,
  deleteLavorazioneActivity,
  updateLavorazioneActivity,
  uploadLavorazioneFile,
} from '../../services/lavorazioni'
import { useAuth } from '../../context/AuthContext'
import { buildApiUrl } from '../../services/apiClient'

const statoBadgeMap = {
  todo: 'warning',
  aperta: 'secondary',
  pianificata: 'info',
  in_produzione: 'primary',
  completata: 'success',
  annullata: 'danger',
  sospesa: 'danger',
  done: 'success',
}

const jobStateLabels = {
  in_produzione: 'In lavorazione',
  aperta: 'Aperta',
  pianificata: 'Pianificata',
  completata: 'Completata',
  annullata: 'Annullata',
  sospesa: 'Sospesa',
}

const jobStateOptions = [
  { value: 'aperta', label: 'Aperta' },
  { value: 'pianificata', label: 'Pianificata' },
  { value: 'in_produzione', label: 'In lavorazione' },
  { value: 'sospesa', label: 'Sospesa' },
  { value: 'completata', label: 'Completata' },
  { value: 'annullata', label: 'Annullata' },
]

const formatDate = (value, withTime = false) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (withTime) {
    return `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }
  return date.toLocaleDateString('it-IT')
}

const formatPreventivoLabel = (detail) => {
  if (!detail) return '-'
  const anno = detail.anno_preventivo ?? null
  const numero = detail.numero_preventivo ?? null
  if (anno && numero) {
    return `${anno}/${numero}`
  }
  return numero || anno || '-'
}

const formatPreventivoDisplay = (detail) => {
  const base = formatPreventivoLabel(detail)
  const date = formatDate(detail?.data_preventivo)
  if (base !== '-' && date !== '-') {
    return `${base} - ${date}`
  }
  return base !== '-' ? base : date
}

const getFirstActivityStart = (activities) => {
  if (!Array.isArray(activities)) return null
  let earliest = null
  activities.forEach((task) => {
    const value = task?.data_avvio
    if (!value) return
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return
    if (!earliest || date < earliest) {
      earliest = date
    }
  })
  return earliest ? earliest.toISOString() : null
}

const getEffectiveStart = (detail) => {
  const firstActivityStart = getFirstActivityStart(detail?.attivita)
  return firstActivityStart || detail?.data_avvio_reale || null
}

const toDateTimeLocal = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toDateInput = (value) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const renderStateBadge = (detail) => {
  const code = detail?.stato || 'aperta'
  const color = statoBadgeMap[code] || 'secondary'
  const label = detail?.stato_label || jobStateLabels[code] || code
  return <CBadge color={color}>{label}</CBadge>
}

const renderPriorityBadge = (priority) => {
  if (!priority) return <CBadge color="secondary">n/d</CBadge>
  const map = {
    low: ['secondary', 'Bassa'],
    medium: ['primary', 'Media'],
    high: ['warning', 'Alta'],
    critical: ['danger', 'Critica'],
  }
  const value = map[priority] || ['secondary', priority]
  return <CBadge color={value[0]}>{value[1]}</CBadge>
}

const priorityOptions = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
]

const activityStatusLabels = {
  todo: 'Da fare',
  in_progress: 'In esecuzione',
  done: 'Terminata',
  cancelled: 'Annullata',
  sospesa: 'Sospesa',
}

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0%'
  }
  const numeric = Math.min(100, Math.max(0, Number(value)))
  return `${numeric.toFixed(0)}%`
}

const InfoField = ({ label, value }) => (
  <div className="mb-3">
    <div className="text-body-secondary text-uppercase small fw-semibold">{label}</div>
    <div className="mt-1">{value ?? <span className="text-body-secondary">-</span>}</div>
  </div>
)

const buildInfoDraft = (detail) => ({
  titolo: detail?.titolo ?? '',
  descrizione: detail?.descrizione ?? '',
  stato: detail?.stato ?? 'aperta',
  priorita: detail?.priorita ?? 'medium',
  data_inizio_prevista: toDateInput(detail?.data_inizio_prevista),
  data_fine_prevista: toDateInput(detail?.data_fine_prevista),
  note: detail?.note ?? '',
})

const LavorazioneDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const recordId = query.get('id')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [activityModalVisible, setActivityModalVisible] = useState(false)
  const [activityTemplates, setActivityTemplates] = useState([])
  const [activityTemplatesLoading, setActivityTemplatesLoading] = useState(false)
  const [activityForm, setActivityForm] = useState({
    template_id: '',
    titolo: '',
    descrizione: '',
    priorita: 'medium',
    data_scadenza: '',
    note: '',
    id_reparto: '',
    operatori: [],
  })
  const [activitySubmitting, setActivitySubmitting] = useState(false)
  const [activityError, setActivityError] = useState(null)
  const [assignmentOptions, setAssignmentOptions] = useState({ reparti: [], operatori: [] })
  const [assignmentOptionsLoading, setAssignmentOptionsLoading] = useState(false)
  const [jobAssignmentModalVisible, setJobAssignmentModalVisible] = useState(false)
  const [jobAssignmentForm, setJobAssignmentForm] = useState({ reparto: '', operatori: [] })
  const [jobAssignmentSubmitting, setJobAssignmentSubmitting] = useState(false)
  const [jobAssignmentError, setJobAssignmentError] = useState(null)
  const [activityAssignmentModal, setActivityAssignmentModal] = useState({
    visible: false,
    reparto: '',
    operatori: [],
    titolo: '',
    id: null,
  })
  const [activityAssignmentSubmitting, setActivityAssignmentSubmitting] = useState(false)
  const [activityAssignmentError, setActivityAssignmentError] = useState(null)
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    titolo: '',
    messaggio: '',
    operatori: [],
    idAttivita: null,
    scope: 'job',
    contextLabel: '',
  })
  const [notificationSubmitting, setNotificationSubmitting] = useState(false)
  const [notificationError, setNotificationError] = useState(null)
  const [notificationSuccess, setNotificationSuccess] = useState(null)
  const [infoDraft, setInfoDraft] = useState(buildInfoDraft(null))
  const [infoEditing, setInfoEditing] = useState(false)
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoError, setInfoError] = useState(null)
  const [infoSuccess, setInfoSuccess] = useState(null)
  const [infoTab, setInfoTab] = useState('info')
  const [relatedDocs, setRelatedDocs] = useState({ preventivo: null, ddt: [], fatture: [], ordini: [] })
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState(null)
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileUploadError, setFileUploadError] = useState(null)
  const [fileUploadSuccess, setFileUploadSuccess] = useState(null)
  const [fileDownloadError, setFileDownloadError] = useState(null)
  const [fileForm, setFileForm] = useState({
    file: null,
    titolo: '',
    categoria: 'cliente',
    note: '',
  })
  const [fileDragOver, setFileDragOver] = useState(false)
  const [activityStatusLoading, setActivityStatusLoading] = useState({})
  const [activityStatusError, setActivityStatusError] = useState(null)
  const [activityStatusSuccess, setActivityStatusSuccess] = useState(null)
  const [activityReportModal, setActivityReportModal] = useState({
    visible: false,
    id: null,
    titolo: '',
    dataAvvio: '',
    dataFine: '',
    operatoreId: '',
    note: '',
    updatedAt: null,
  })
  const [activityEditModal, setActivityEditModal] = useState({
    visible: false,
    id: null,
    titolo: '',
    descrizione: '',
    priorita: 'medium',
    dataScadenza: '',
    note: '',
    idReparto: '',
  })
  const [activityEditSubmitting, setActivityEditSubmitting] = useState(false)
  const [activityEditError, setActivityEditError] = useState(null)
  const [activityReportSubmitting, setActivityReportSubmitting] = useState(false)
  const [activityReportError, setActivityReportError] = useState(null)
  const [activityReportSuccess, setActivityReportSuccess] = useState(null)
  const [activityDeleting, setActivityDeleting] = useState({})
  useEffect(() => {
    if (!activityStatusSuccess && !activityStatusError) {
      return undefined
    }
    const timer = setTimeout(() => {
      setActivityStatusError(null)
      setActivityStatusSuccess(null)
    }, 2000)
    return () => clearTimeout(timer)
  }, [activityStatusError, activityStatusSuccess])

  useEffect(() => {
    if (!activityReportSuccess && !activityReportError) {
      return undefined
    }
    const timer = setTimeout(() => {
      setActivityReportError(null)
      setActivityReportSuccess(null)
    }, 2000)
    return () => clearTimeout(timer)
  }, [activityReportError, activityReportSuccess])

  useEffect(() => {
    if (!token || !recordId) {
      return
    }
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = await fetchLavorazioneDetail({
          token,
          id: recordId,
          signal: controller.signal,
        })
        if (!payload) {
          throw new Error('Dettaglio lavorazione non disponibile.')
        }
        setDetail(payload)
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('Errore nel caricamento della lavorazione:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, recordId, refreshIndex])

  useEffect(() => {
    if (!token || !recordId) {
      return
    }
    if (infoTab !== 'docs' || docsLoaded) {
      return
    }
    const controller = new AbortController()
    setDocsLoading(true)
    setDocsError(null)
    fetchLavorazioneDocuments({
      token,
      idLavorazione: Number(recordId),
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return
        setRelatedDocs({
          preventivo: data?.preventivo ?? null,
          ddt: Array.isArray(data?.ddt) ? data.ddt : [],
          fatture: Array.isArray(data?.fatture) ? data.fatture : [],
          ordini: Array.isArray(data?.ordini) ? data.ordini : [],
        })
        setDocsLoaded(true)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare i documenti correlati:', err)
        setDocsError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDocsLoading(false)
        }
      })
    return () => controller.abort()
  }, [token, recordId, infoTab, docsLoaded])

  useEffect(() => {
    if (!token || !recordId) {
      return
    }
    if (infoTab !== 'files' || filesLoaded) {
      return
    }
    const controller = new AbortController()
    setFilesLoading(true)
    setFilesError(null)
    fetchLavorazioneFiles({
      token,
      idLavorazione: Number(recordId),
      signal: controller.signal,
    })
      .then((items) => {
        if (controller.signal.aborted) return
        setFiles(Array.isArray(items) ? items : [])
        setFilesLoaded(true)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare i file correlati:', err)
        setFilesError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFilesLoading(false)
        }
      })
    return () => controller.abort()
  }, [token, recordId, infoTab, filesLoaded])

  useEffect(() => {
    if (!token || !activityModalVisible) {
      return
    }
    if (activityTemplates.length > 0) {
      return
    }
    const controller = new AbortController()
    setActivityTemplatesLoading(true)
    fetchLavorazioneActivityTemplates({
      token,
      signal: controller.signal,
    })
      .then((items) => {
        if (controller.signal.aborted) return
        setActivityTemplates(Array.isArray(items) ? items : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare i template attività:', err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setActivityTemplatesLoading(false)
        }
      })
    return () => controller.abort()
  }, [token, activityModalVisible, activityTemplates.length])

  useEffect(() => {
    if (!token) {
      return
    }
    const controller = new AbortController()
    setAssignmentOptionsLoading(true)
    fetchLavorazioniAssignmentsConfig({
      token,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return
        setAssignmentOptions({
          reparti: Array.isArray(data?.reparti) ? data.reparti : [],
          operatori: Array.isArray(data?.operatori) ? data.operatori : [],
        })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare le opzioni di assegnazione:', err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAssignmentOptionsLoading(false)
        }
      })
    return () => controller.abort()
  }, [token])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/lavorazioni/lista')
  }

  if (!recordId) {
    return (
      <CAlert color="info">
        Nessuna lavorazione selezionata.{' '}
        <CButton color="primary" variant="ghost" size="sm" onClick={() => navigate('/lavorazioni/lista')}>
          Vai alla lista
        </CButton>
      </CAlert>
    )
  }

  const currentDetail = detail ?? {}
  const hasDetail = Boolean(detail)
  useEffect(() => {
    if (!hasDetail || infoEditing) {
      return
    }
    setInfoDraft(buildInfoDraft(currentDetail))
    setInfoError(null)
    setInfoSuccess(null)
  }, [currentDetail, hasDetail, infoEditing])
  const hasInfoChanges = useMemo(() => {
    if (!hasDetail) return false
    const baseline = buildInfoDraft(currentDetail)
    return Object.keys(baseline).some((key) => (infoDraft[key] ?? '') !== (baseline[key] ?? ''))
  }, [currentDetail, hasDetail, infoDraft])
  const hasSuspendedActivity = useMemo(
    () =>
      Array.isArray(currentDetail.attivita) &&
      currentDetail.attivita.some((task) => String(task?.stato || '').toLowerCase() === 'sospesa'),
    [currentDetail.attivita],
  )
  const overallProgressColor = hasSuspendedActivity
    ? 'danger'
    : currentDetail.percentuale_avanzamento >= 100
      ? 'success'
      : 'primary'
  const handleInfoFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setInfoDraft((prev) => ({
      ...prev,
      [field]: value,
    }))
    setInfoError(null)
    setInfoSuccess(null)
  }

  const handleInfoEdit = () => {
    if (!hasDetail) return
    setInfoDraft(buildInfoDraft(currentDetail))
    setInfoEditing(true)
    setInfoError(null)
    setInfoSuccess(null)
  }

  const handleInfoCancel = () => {
    setInfoDraft(buildInfoDraft(currentDetail))
    setInfoEditing(false)
    setInfoError(null)
    setInfoSuccess(null)
  }

  const handleInfoSave = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    if (!token || !recordId) return
    if (!hasInfoChanges) {
      return
    }
    setInfoSaving(true)
    setInfoError(null)
    setInfoSuccess(null)
    try {
      await updateLavorazioneInfo({
        token,
        idLavorazione: Number(recordId),
        titolo: infoDraft.titolo,
        descrizione: infoDraft.descrizione,
        stato: infoDraft.stato,
        priorita: infoDraft.priorita,
        dataInizioPrevista: infoDraft.data_inizio_prevista || null,
        dataFinePrevista: infoDraft.data_fine_prevista || null,
        note: infoDraft.note,
      })
      setInfoSuccess('Informazioni principali aggiornate correttamente.')
      setInfoEditing(false)
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error('Impossibile aggiornare le informazioni della lavorazione:', err)
      setInfoError(err)
    } finally {
      setInfoSaving(false)
    }
  }

  const setActivityStatusLoadingFor = (activityId, loading) => {
    setActivityStatusLoading((prev) => {
      const next = { ...(prev ?? {}) }
      if (loading) {
        next[activityId] = true
      } else {
        delete next[activityId]
      }
      return next
    })
  }

  const setActivityDeletingFor = (activityId, loading) => {
    setActivityDeleting((prev) => {
      const next = { ...(prev ?? {}) }
      if (loading) {
        next[activityId] = true
      } else {
        delete next[activityId]
      }
      return next
    })
  }

  const handleActivityStatusChange = async (activityId, targetStatus, percentOverride) => {
    if (!token || !activityId) return
    setActivityStatusError(null)
    setActivityStatusSuccess(null)
    setActivityStatusLoadingFor(activityId, true)
    try {
      await updateLavorazioneActivityStatus({
        token,
        idAttivita: Number(activityId),
        stato: targetStatus,
        percentuale: typeof percentOverride === 'number' ? percentOverride : undefined,
        createdBy: user?.id,
      })
      const label = activityStatusLabels[targetStatus] ?? targetStatus
      const suffix = typeof percentOverride === 'number' ? ` (${percentOverride}%)` : ''
      setActivityStatusSuccess(`Stato attività aggiornato: ${label}${suffix}.`)
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error('Impossibile aggiornare lo stato dell\'attività:', err)
      setActivityStatusError(err)
    } finally {
      setActivityStatusLoadingFor(activityId, false)
    }
  }

  const handleFileFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setFileForm((prev) => ({
      ...prev,
      [field]: value,
    }))
    setFileUploadError(null)
    setFileUploadSuccess(null)
  }

  const handleFileInputChange = (event) => {
    const file = event?.target?.files?.[0] ?? null
    setFileForm((prev) => ({
      ...prev,
      file,
    }))
    setFileUploadError(null)
    setFileUploadSuccess(null)
  }

  const handleFileDrop = (event) => {
    event.preventDefault()
    setFileDragOver(false)
    const file = event?.dataTransfer?.files?.[0] ?? null
    if (!file) return
    setFileForm((prev) => ({
      ...prev,
      file,
    }))
    setFileUploadError(null)
    setFileUploadSuccess(null)
  }

  const handleFileDragOver = (event) => {
    event.preventDefault()
    setFileDragOver(true)
  }

  const handleFileDragLeave = () => {
    setFileDragOver(false)
  }

  const handleFileUpload = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    if (!token || !recordId || !fileForm.file) {
      return
    }
    setFileUploading(true)
    setFileUploadError(null)
    setFileUploadSuccess(null)
    try {
      await uploadLavorazioneFile({
        token,
        idLavorazione: Number(recordId),
        file: fileForm.file,
        titolo: fileForm.titolo || undefined,
        categoria: fileForm.categoria,
        note: fileForm.note || undefined,
        createdBy: user?.id,
      })
      setFileUploadSuccess('File caricato correttamente.')
      setFileForm({ file: null, titolo: '', categoria: fileForm.categoria || 'cliente', note: '' })
      const items = await fetchLavorazioneFiles({
        token,
        idLavorazione: Number(recordId),
      })
      setFiles(Array.isArray(items) ? items : [])
      setFilesLoaded(true)
    } catch (err) {
      console.error('Impossibile caricare il file:', err)
      setFileUploadError(err)
    } finally {
      setFileUploading(false)
    }
  }

  const handleFileDownload = async (file) => {
    if (!token || !file?.id_file) {
      return
    }
    setFileDownloadError(null)
    try {
      const url = buildApiUrl('/lavorazioniFilesDownload.php', { id: file.id_file })
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Authorization': `Bearer ${token}`,
            'X-Access-Token': token,
          },
        })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.message || `Errore ${response.status}`
        throw new Error(message)
      }
      const blob = await response.blob()
      const header = response.headers.get('content-disposition') || ''
      const match = header.match(/filename=\"?([^\";]+)\"?/i)
      const name = match?.[1] || file.original_name || file.file_name || 'download'
      const urlBlob = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlBlob
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(urlBlob)

      const items = await fetchLavorazioneFiles({
        token,
        idLavorazione: Number(recordId),
      })
      setFiles(Array.isArray(items) ? items : [])
      setFilesLoaded(true)
    } catch (err) {
      console.error('Impossibile scaricare il file:', err)
      setFileDownloadError(err)
    }
  }

  const handleDeleteActivity = async (activityId) => {
    if (!token || !activityId) return
    if (!window.confirm('Sei sicuro di rimuovere questa attività?')) {
      return
    }
    setActivityStatusError(null)
    setActivityStatusSuccess(null)
    setActivityDeletingFor(activityId, true)
    try {
      await deleteLavorazioneActivity({
        token,
        idAttivita: Number(activityId),
      })
      setActivityStatusSuccess('Attività rimossa correttamente.')
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error('Impossibile rimuovere l\'attività:', err)
      setActivityStatusError(err)
    } finally {
      setActivityDeletingFor(activityId, false)
    }
  }

  const handleOpenActivityReportModal = (task) => {
    setActivityReportError(null)
    setActivityReportSuccess(null)
    setActivityReportModal({
      visible: true,
      id: task?.id_attivita ?? null,
      titolo: task?.titolo ?? '',
      dataAvvio: toDateTimeLocal(task?.data_avvio),
      dataFine: toDateTimeLocal(task?.data_fine),
      operatoreId: task?.id_operatore ? String(task.id_operatore) : '',
      note: task?.report_note ?? '',
      updatedAt: task?.report_updated_at ?? null,
    })
  }

  const handleOpenActivityEditModal = (task) => {
    setActivityEditError(null)
    setActivityEditModal({
      visible: true,
      id: task?.id_attivita ?? null,
      titolo: task?.titolo ?? '',
      descrizione: task?.descrizione ?? '',
      priorita: task?.priorita ?? 'medium',
      dataScadenza: toDateInput(task?.data_scadenza),
      note: task?.note ?? '',
      idReparto: task?.id_reparto ? String(task.id_reparto) : '',
    })
  }

  const handleCloseActivityEditModal = () => {
    if (activityEditSubmitting) return
    setActivityEditModal((prev) => ({
      ...prev,
      visible: false,
    }))
    setActivityEditError(null)
  }

  const handleActivityEditFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setActivityEditModal((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleActivityEditSubmit = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    if (!token || !activityEditModal.id) return
    setActivityEditSubmitting(true)
    setActivityEditError(null)
    try {
      await updateLavorazioneActivity({
        token,
        idAttivita: Number(activityEditModal.id),
        titolo: activityEditModal.titolo,
        descrizione: activityEditModal.descrizione,
        priorita: activityEditModal.priorita,
        dataScadenza: activityEditModal.dataScadenza || null,
        note: activityEditModal.note,
        repartoId: activityEditModal.idReparto ? Number(activityEditModal.idReparto) : null,
      })
      setActivityStatusSuccess('Attivita aggiornata correttamente.')
      setRefreshIndex((value) => value + 1)
      handleCloseActivityEditModal()
    } catch (err) {
      console.error("Impossibile aggiornare l'attivita:", err)
      setActivityEditError(err)
    } finally {
      setActivityEditSubmitting(false)
    }
  }

  const handleCloseActivityReportModal = () => {
    if (activityReportSubmitting) return
    setActivityReportModal((prev) => ({
      ...prev,
      visible: false,
    }))
    setActivityReportError(null)
  }

  const handleActivityReportChange = (event) => {
    const value = event?.target?.value ?? ''
    setActivityReportModal((prev) => ({
      ...prev,
      note: value,
    }))
  }

  const handleActivityReportFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setActivityReportModal((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleActivityReportSubmit = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    if (!token || !activityReportModal.id) return
    setActivityReportSubmitting(true)
    setActivityReportError(null)
    try {
      await updateLavorazioneActivityReport({
        token,
        idAttivita: Number(activityReportModal.id),
        dataAvvio: activityReportModal.dataAvvio || undefined,
        dataFine: activityReportModal.dataFine || undefined,
        operatoreId: activityReportModal.operatoreId ? Number(activityReportModal.operatoreId) : undefined,
        note: activityReportModal.note,
      })
      setActivityReportSuccess('Report attivita aggiornato correttamente.')
      setActivityReportModal((prev) => ({
        ...prev,
        visible: false,
      }))
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error("Impossibile aggiornare il report dell'attivita:", err)
      setActivityReportError(err)
    } finally {
      setActivityReportSubmitting(false)
    }
  }

  const isActivityStatusLoading = (activityId) => Boolean(activityStatusLoading[activityId])
  const isActivityDeleting = (activityId) => Boolean(activityDeleting[activityId])
  const jobAssignedOperators = useMemo(() => {
    const ids = new Set()
    if (Array.isArray(currentDetail?.assegnazioni)) {
      currentDetail.assegnazioni.forEach((ass) => {
        const value = Number(ass?.id_account)
        if (Number.isFinite(value) && value > 0) {
          ids.add(String(value))
        }
      })
    }
    if (Array.isArray(currentDetail?.lavorazione_operatori)) {
      currentDetail.lavorazione_operatori.forEach((ass) => {
        const value = Number(ass?.id_account)
        if (Number.isFinite(value) && value > 0) {
          ids.add(String(value))
        }
      })
    }
    return Array.from(ids)
  }, [currentDetail])

  const handleOpenActivityModal = () => {
    setActivityError(null)
    setActivityForm((prev) => ({
      ...prev,
      template_id: prev.template_id || '',
      titolo: '',
      descrizione: '',
      note: '',
      data_scadenza: '',
      id_reparto:
        currentDetail?.id_reparto && Number(currentDetail.id_reparto) > 0
          ? String(currentDetail.id_reparto)
          : '',
      operatori: [],
    }))
    setActivityModalVisible(true)
  }

  const handleCloseActivityModal = () => {
    if (activitySubmitting) return
    setActivityModalVisible(false)
    setActivityError(null)
  }

  const handleActivityTemplateChange = (event) => {
    const value = event.target.value
    setActivityForm((prev) => ({
      ...prev,
      template_id: value,
    }))
    const numericId = Number(value)
    if (Number.isFinite(numericId) && numericId > 0) {
      const template = activityTemplates.find((tpl) => Number(tpl?.id_template ?? tpl?.id) === numericId)
      if (template) {
        setActivityForm((prev) => ({
          ...prev,
          template_id: value,
          titolo: template.titolo || prev.titolo,
          descrizione: template.descrizione || prev.descrizione,
          priorita: template.priorita || prev.priorita || 'medium',
          id_reparto: template.id_reparto ? String(template.id_reparto) : prev.id_reparto,
        }))
      }
    }
  }

  const handleActivityFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleActivityOperatorsChange = (event) => {
    const selected = event?.target
      ? Array.from(event.target.selectedOptions || []).map((option) => option.value)
      : []
    setActivityForm((prev) => ({
      ...prev,
      operatori: selected,
    }))
  }

  const handleActivitySubmit = async (event) => {
    event.preventDefault()
    if (!token || !recordId) return
    const payload = {
      token,
      idLavorazione: Number(recordId),
      templateId: activityForm.template_id ? Number(activityForm.template_id) : undefined,
      titolo: activityForm.titolo,
      descrizione: activityForm.descrizione,
      priorita: activityForm.priorita,
      dataScadenza: activityForm.data_scadenza,
      note: activityForm.note,
      repartoId: activityForm.id_reparto ? Number(activityForm.id_reparto) : undefined,
      operatori: Array.isArray(activityForm.operatori)
        ? activityForm.operatori
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : undefined,
    }
    try {
      setActivitySubmitting(true)
      setActivityError(null)
      await createLavorazioneActivity(payload)
      setActivityModalVisible(false)
      setActivityForm({
        template_id: '',
        titolo: '',
        descrizione: '',
        priorita: 'medium',
        data_scadenza: '',
        note: '',
        id_reparto: '',
        operatori: [],
      })
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error('Impossibile creare attività:', err)
      setActivityError(err)
    } finally {
      setActivitySubmitting(false)
    }
  }

  const handleJobAssignmentFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setJobAssignmentForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleJobAssignmentOperatorsChange = (event) => {
    const selected = event?.target
      ? Array.from(event.target.selectedOptions || []).map((option) => option.value)
      : []
    setJobAssignmentForm((prev) => ({
      ...prev,
      operatori: selected,
    }))
  }

  const handleOpenJobAssignmentModal = () => {
    const repartoValue =
      currentDetail?.id_reparto && Number(currentDetail.id_reparto) > 0
        ? String(currentDetail.id_reparto)
        : ''
    const operatorValues = Array.isArray(currentDetail?.lavorazione_operatori)
      ? currentDetail.lavorazione_operatori
          .map((item) => (item?.id_account ? String(item.id_account) : null))
          .filter(Boolean)
      : []
    setJobAssignmentForm({
      reparto: repartoValue,
      operatori: operatorValues,
    })
    setJobAssignmentError(null)
    setJobAssignmentModalVisible(true)
  }

  const handleCloseJobAssignmentModal = () => {
    if (jobAssignmentSubmitting) return
    setJobAssignmentModalVisible(false)
    setJobAssignmentError(null)
  }

  const handleJobAssignmentSubmit = async (event) => {
    event.preventDefault()
    if (!token || !recordId) return
    const operatorIds = jobAssignmentForm.operatori
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    try {
      setJobAssignmentSubmitting(true)
      setJobAssignmentError(null)
      await assignLavorazione({
        token,
        idLavorazione: Number(recordId),
        repartoId: jobAssignmentForm.reparto ? Number(jobAssignmentForm.reparto) : null,
        operatori: operatorIds,
      })
      setJobAssignmentModalVisible(false)
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error('Impossibile aggiornare assegnazione lavorazione:', err)
      setJobAssignmentError(err)
    } finally {
      setJobAssignmentSubmitting(false)
    }
  }

  const handleActivityAssignmentFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setActivityAssignmentModal((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleActivityAssignmentOperatorsChange = (event) => {
    const selected = event?.target
      ? Array.from(event.target.selectedOptions || []).map((option) => option.value)
      : []
    setActivityAssignmentModal((prev) => ({
      ...prev,
      operatori: selected,
    }))
  }

  const handleOpenActivityAssignmentModal = (task) => {
    if (!task) return
    const repartoValue =
      task?.id_reparto && Number(task.id_reparto) > 0 ? String(task.id_reparto) : ''
    const operatorValues = Array.isArray(task?.assegnatari_ids)
      ? task.assegnatari_ids.map((id) => String(id))
      : []
    setActivityAssignmentModal({
      visible: true,
      reparto: repartoValue,
      operatori: operatorValues,
      titolo: task?.titolo || '',
      id: task?.id_attivita || null,
    })
    setActivityAssignmentError(null)
  }

  const handleCloseActivityAssignmentModal = () => {
    if (activityAssignmentSubmitting) return
    setActivityAssignmentModal({
      visible: false,
      reparto: '',
      operatori: [],
      titolo: '',
      id: null,
    })
    setActivityAssignmentError(null)
  }

  const handleActivityAssignmentSubmit = async (event) => {
    event.preventDefault()
    if (!token || !activityAssignmentModal.id) return
    const operatorIds = activityAssignmentModal.operatori
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    try {
      setActivityAssignmentSubmitting(true)
      setActivityAssignmentError(null)
      await assignLavorazioneActivity({
        token,
        idAttivita: Number(activityAssignmentModal.id),
        repartoId: activityAssignmentModal.reparto ? Number(activityAssignmentModal.reparto) : null,
        operatori: operatorIds,
      })
      setActivityAssignmentModal({
        visible: false,
        reparto: '',
        operatori: [],
        titolo: '',
        id: null,
      })
      setRefreshIndex((value) => value + 1)
    } catch (err) {
      console.error('Impossibile aggiornare attivit�:', err)
      setActivityAssignmentError(err)
    } finally {
      setActivityAssignmentSubmitting(false)
    }
  }

  const handleOpenNotificationModal = (scope = 'job', context = null) => {
    const defaultOperators =
      scope === 'activity'
        ? Array.isArray(context?.assegnatari_ids)
          ? context.assegnatari_ids.map((value) => String(value))
          : []
        : jobAssignedOperators
    const contextLabel =
      scope === 'activity'
        ? context?.titolo || (context?.id_attivita ? `ID ${context.id_attivita}` : '')
        : currentDetail.codice || ''
    const defaultTitle =
      scope === 'activity'
        ? `Aggiornamento attivita ${context?.titolo || ''}`.trim()
        : `Aggiornamento lavorazione ${currentDetail.codice || recordId}`
    setNotificationModal({
      visible: true,
      titolo: defaultTitle,
      messaggio: '',
      operatori: defaultOperators,
      idAttivita: scope === 'activity' && context?.id_attivita ? Number(context.id_attivita) : null,
      scope,
      contextLabel,
    })
    setNotificationError(null)
    setNotificationSuccess(null)
  }

  const handleCloseNotificationModal = () => {
    if (notificationSubmitting) return
    setNotificationModal((prev) => ({
      ...prev,
      visible: false,
    }))
    setNotificationError(null)
  }

  const handleNotificationFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setNotificationModal((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNotificationOperatorsChange = (event) => {
    const selected = event?.target
      ? Array.from(event.target.selectedOptions || []).map((option) => option.value)
      : []
    setNotificationModal((prev) => ({
      ...prev,
      operatori: selected,
    }))
  }

  const handleNotificationSubmit = async (event) => {
    event.preventDefault()
    if (!token || !recordId) return
    const operatorIds = notificationModal.operatori
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    try {
      setNotificationSubmitting(true)
      setNotificationError(null)
      const response = await notifyLavorazioneOperators({
        token,
        idLavorazione: Number(recordId),
        idAttivita: notificationModal.idAttivita ? Number(notificationModal.idAttivita) : undefined,
        createdBy: user?.id,
        titolo: notificationModal.titolo,
        messaggio: notificationModal.messaggio,
        operatori: operatorIds.length > 0 ? operatorIds : undefined,
      })
      const notified = response?.notifiche_inserite ?? (operatorIds.length > 0 ? operatorIds.length : 0)
      const scopeLabel = notificationModal.idAttivita ? 'attivita' : 'lavorazione'
      setNotificationSuccess(
        notified > 0
          ? `Notifica inviata a ${notified} operatori per la ${scopeLabel}.`
          : `Notifica registrata per la ${scopeLabel}.`,
      )
      setNotificationModal((prev) => ({
        ...prev,
        visible: false,
      }))
    } catch (err) {
      console.error('Impossibile inviare notifiche:', err)
      setNotificationError(err)
    } finally {
      setNotificationSubmitting(false)
    }
  }

  return (
    <div className="lavorazione-detail">
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-4">
        <div>
          <div className="text-body-secondary small">Lavorazione #{currentDetail.codice || recordId}</div>
          <h2 className="h4 mb-0">{currentDetail.titolo || 'Dettaglio lavorazione'}</h2>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={handleBack}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Indietro
          </CButton>
          <CButton color="primary" variant="outline" onClick={() => setRefreshIndex((value) => value + 1)}>
            <CIcon icon={cilReload} className="me-2" />
            Aggiorna
          </CButton>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <CSpinner color="primary" />
        </div>
      ) : null}

      {error ? (
        <CAlert color="warning">{error?.message || 'Non e stato possibile recuperare il dettaglio completo.'}</CAlert>
      ) : null}
      {!loading && !error && !hasDetail ? (
        <CAlert color="light">Dettaglio non disponibile oppure la lavorazione non contiene dati.</CAlert>
      ) : null}
      {notificationSuccess ? <CAlert color="success">{notificationSuccess}</CAlert> : null}

      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <strong>Informazioni principali</strong>
                <div className="text-body-secondary small">Stato operativo e dati cliente</div>
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                {hasDetail ? (
                  <>
                    {renderStateBadge(currentDetail)}
                    {renderPriorityBadge(currentDetail.priorita)}
                  </>
                ) : (
                  <CBadge color="secondary">Dati non disponibili</CBadge>
                )}
                {!infoEditing ? (
                  <CButton color="primary" variant="outline" size="sm" onClick={handleInfoEdit} disabled={!hasDetail}>
                    <CIcon icon={cilPen} className="me-2" />
                    Modifica
                  </CButton>
                ) : null}
              </div>
            </CCardHeader>
            <CCardBody>
              <CNav variant="tabs" role="tablist" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={infoTab === 'info'}
                    role="tab"
                    aria-selected={infoTab === 'info'}
                    onClick={() => setInfoTab('info')}
                  >
                    Informazioni principali
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={infoTab === 'timeline'}
                    role="tab"
                    aria-selected={infoTab === 'timeline'}
                    onClick={() => setInfoTab('timeline')}
                  >
                    Cronologia
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={infoTab === 'docs'}
                    role="tab"
                    aria-selected={infoTab === 'docs'}
                    onClick={() => setInfoTab('docs')}
                  >
                    Documenti
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={infoTab === 'files'}
                    role="tab"
                    aria-selected={infoTab === 'files'}
                    onClick={() => setInfoTab('files')}
                  >
                    File
                  </CNavLink>
                </CNavItem>
              </CNav>
              <CTabContent>
                <CTabPane visible={infoTab === 'info'} role="tabpanel">
              {infoError && (
                <CAlert color="danger">
                  {infoError?.payload?.message ||
                    infoError.message ||
                    "Errore durante l'aggiornamento delle informazioni principali."}
                </CAlert>
              )}
              {infoSuccess && (
                <CAlert color="success" className="mb-3">
                  {infoSuccess}
                </CAlert>
              )}
              {infoEditing ? (
                <CForm onSubmit={handleInfoSave}>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel>Titolo</CFormLabel>
                      <CFormInput
                        value={infoDraft.titolo}
                        onChange={handleInfoFieldChange('titolo')}
                        disabled={!hasDetail || infoSaving}
                        required
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Cliente</CFormLabel>
                      <CFormInput value={currentDetail.cliente || '-'} disabled />
                    </CCol>
                    <CCol md={12}>
                      <CFormLabel>Descrizione</CFormLabel>
                      <CFormTextarea
                        rows={3}
                        value={infoDraft.descrizione}
                        onChange={handleInfoFieldChange('descrizione')}
                        disabled={!hasDetail || infoSaving}
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Stato</CFormLabel>
                      <CFormSelect
                        value={infoDraft.stato}
                        onChange={handleInfoFieldChange('stato')}
                        disabled={!hasDetail || infoSaving}
                      >
                        {jobStateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Priorita</CFormLabel>
                      <CFormSelect
                        value={infoDraft.priorita}
                        onChange={handleInfoFieldChange('priorita')}
                        disabled={!hasDetail || infoSaving}
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Preventivo collegato</CFormLabel>
                      <CFormInput value={formatPreventivoDisplay(currentDetail)} disabled />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Periodo previsto</CFormLabel>
                      <div className="d-flex gap-2">
                        <CFormInput
                          type="date"
                          value={infoDraft.data_inizio_prevista}
                          onChange={handleInfoFieldChange('data_inizio_prevista')}
                          disabled={!hasDetail || infoSaving}
                        />
                        <CFormInput
                          type="date"
                          value={infoDraft.data_fine_prevista}
                          onChange={handleInfoFieldChange('data_fine_prevista')}
                          disabled={!hasDetail || infoSaving}
                        />
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Avvio effettivo</CFormLabel>
                      <CFormInput
                        type="datetime-local"
                        value={toDateTimeLocal(getEffectiveStart(currentDetail))}
                        disabled
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormLabel>Note</CFormLabel>
                      <CFormTextarea
                        rows={4}
                        value={infoDraft.note}
                        onChange={handleInfoFieldChange('note')}
                        disabled={!hasDetail || infoSaving}
                        placeholder="Inserisci le note della lavorazione"
                      />
                    </CCol>
                  </CRow>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <CButton type="submit" color="primary" disabled={!hasDetail || infoSaving || !hasInfoChanges}>
                      {infoSaving ? 'Salvataggio...' : 'Salva modifiche'}
                    </CButton>
                    <CButton type="button" color="secondary" disabled={!hasDetail || infoSaving} onClick={handleInfoCancel}>
                      Annulla
                    </CButton>
                  </div>
                </CForm>
              ) : (
                <>
                  <CRow>
                    <CCol md={6}>
                      <InfoField label="Cliente" value={currentDetail.cliente || '-'} />
                      <InfoField
                        label="Preventivo collegato"
                        value={
                          currentDetail.id_preventivo ? (
                            <CButton
                              size="sm"
                              color="link"
                              className="px-0"
                              onClick={() => navigate(`/preventivi/dettagli?id=${currentDetail.id_preventivo}`)}
                            >
                              {formatPreventivoDisplay(currentDetail)}
                            </CButton>
                          ) : (
                            '-'
                          )
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <InfoField
                        label="Periodo previsto"
                        value={`${formatDate(currentDetail.data_inizio_prevista)} → ${formatDate(currentDetail.data_fine_prevista)}`}
                      />
                      <InfoField
                        label="Avvio effettivo"
                        value={formatDate(getEffectiveStart(currentDetail), true)}
                      />
                    </CCol>
                  </CRow>
                  <div className="mt-3">
                    <CFormLabel>Note</CFormLabel>
                    <CFormTextarea rows={4} value={infoDraft.note} disabled placeholder="Nessuna nota disponibile" />
                  </div>
                </>
              )}
              <div className="mt-4">
                <div className="text-body-secondary text-uppercase small fw-semibold mb-2">Avanzamento complessivo</div>
                <div className="d-flex align-items-center gap-3">
                  <div className="flex-grow-1">
                    <CProgress
                      thin
                      color={overallProgressColor}
                      value={Math.min(100, Math.max(0, Number(currentDetail.percentuale_avanzamento) || 0))}
                      className="mb-1"
                    />
                    <div className="text-body-secondary small">
                      In corso — {formatPercent(currentDetail.percentuale_avanzamento)} completato
                    </div>
                  </div>
                  <CBadge color={overallProgressColor} className="px-3 py-2">
                    {formatPercent(currentDetail.percentuale_avanzamento)}
                  </CBadge>
                </div>
              </div>
                </CTabPane>
                <CTabPane visible={infoTab === 'timeline'} role="tabpanel">
                  {Array.isArray(currentDetail.timeline) && currentDetail.timeline.length > 0 ? (
                    <CListGroup>
                      {currentDetail.timeline.map((event) => (
                        <CListGroupItem key={event.id_evento || event.id}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{event.note || '-'}</div>
                              <div className="text-body-secondary small">{event.autore || '-'}</div>
                            </div>
                            <small className="text-body-secondary">{formatDate(event.data, true)}</small>
                          </div>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  ) : (
                    <CAlert color="light" className="mb-0">
                      Nessun evento registrato.
                    </CAlert>
                  )}
                </CTabPane>
                <CTabPane visible={infoTab === 'docs'} role="tabpanel">
                  {docsError ? (
                    <CAlert color="danger">
                      {docsError?.payload?.message || docsError.message || 'Errore durante il caricamento dei documenti.'}
                    </CAlert>
                  ) : null}
                  {docsLoading ? (
                    <div className="d-flex justify-content-center py-4">
                      <CSpinner />
                    </div>
                  ) : (
                    <>
                      <h6 className="text-body-secondary mb-3">Preventivo</h6>
                      {relatedDocs.preventivo ? (
                        <CTable hover responsive size="sm" className="mb-4">
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell>Numero</CTableHeaderCell>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            <CTableRow>
                              <CTableDataCell>
                                {relatedDocs.preventivo.anno_preventivo ?? '-'} / {relatedDocs.preventivo.numero_documento ?? '-'}
                              </CTableDataCell>
                              <CTableDataCell>{formatDate(relatedDocs.preventivo.data_preventivo)}</CTableDataCell>
                              <CTableDataCell className="text-end">{relatedDocs.preventivo.totale ?? '-'}</CTableDataCell>
                              <CTableDataCell className="text-center">
                                <CButton
                                  color="link"
                                  size="sm"
                                  className="p-0"
                                  onClick={() => navigate(`/preventivi/dettagli?id=${relatedDocs.preventivo.id_preventivo}`)}
                                >
                                  Dettagli
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          </CTableBody>
                        </CTable>
                      ) : (
                        <CAlert color="light" className="mb-4">Nessun preventivo collegato.</CAlert>
                      )}

                      <h6 className="text-body-secondary mb-3">DDT</h6>
                      {relatedDocs.ddt.length > 0 ? (
                        <CTable hover responsive size="sm" className="mb-4">
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell>Numero</CTableHeaderCell>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {relatedDocs.ddt.map((doc) => (
                              <CTableRow key={doc.id_ddt}>
                                <CTableDataCell>
                                  {doc.anno ?? '-'} / {doc.numero_documento ?? '-'}
                                </CTableDataCell>
                                <CTableDataCell>{formatDate(doc.data_ddt)}</CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => navigate(`/ddt/dettagli?id=${doc.id_ddt}`)}
                                  >
                                    Dettagli
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      ) : (
                        <CAlert color="light" className="mb-4">Nessun DDT collegato.</CAlert>
                      )}

                      <h6 className="text-body-secondary mb-3">Fatture</h6>
                      {relatedDocs.fatture.length > 0 ? (
                        <CTable hover responsive size="sm">
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell>Numero</CTableHeaderCell>
                              <CTableHeaderCell>Data</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {relatedDocs.fatture.map((doc) => (
                              <CTableRow key={doc.id_fattura}>
                                <CTableDataCell>
                                  {doc.anno ?? '-'} / {doc.numero_documento ?? '-'}
                                </CTableDataCell>
                                <CTableDataCell>{formatDate(doc.data_fattura)}</CTableDataCell>
                                <CTableDataCell className="text-end">{doc.totale ?? '-'}</CTableDataCell>
                                <CTableDataCell className="text-end">{doc.saldo ?? '-'}</CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => navigate(`/fatture/dettagli?id=${doc.id_fattura}`)}
                                  >
                                    Dettagli
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      ) : (
                        <CAlert color="light" className="mb-0">Nessuna fattura collegata.</CAlert>
                      )}
                    </>
                  )}
                </CTabPane>
                <CTabPane visible={infoTab === 'files'} role="tabpanel">
                  {fileUploadSuccess ? <CAlert color="success">{fileUploadSuccess}</CAlert> : null}
                  {fileUploadError ? (
                    <CAlert color="danger">
                      {fileUploadError?.payload?.message || fileUploadError.message || 'Errore durante il caricamento.'}
                    </CAlert>
                  ) : null}
                  {fileDownloadError ? (
                    <CAlert color="danger">
                      {fileDownloadError.message || 'Errore durante il download del file.'}
                    </CAlert>
                  ) : null}
                  <CForm onSubmit={handleFileUpload} className="mb-4">
                    <CRow className="g-3 align-items-end">
                      <CCol md={4}>
                        <CFormLabel>File</CFormLabel>
                        <div
                          className={`border rounded p-3 text-center ${fileDragOver ? 'bg-body-secondary' : 'bg-body-tertiary'}`}
                          onDragOver={handleFileDragOver}
                          onDragLeave={handleFileDragLeave}
                          onDrop={handleFileDrop}
                        >
                          <div className="fw-semibold">Trascina qui il file</div>
                          <div className="text-body-secondary small">oppure seleziona dal dispositivo</div>
                          <CFormInput
                            type="file"
                            onChange={handleFileInputChange}
                            disabled={fileUploading}
                            className="mt-2"
                            required
                          />
                          {fileForm.file ? (
                            <div className="text-body-secondary small mt-2">{fileForm.file.name}</div>
                          ) : null}
                        </div>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Titolo</CFormLabel>
                        <CFormInput
                          value={fileForm.titolo}
                          onChange={handleFileFieldChange('titolo')}
                          disabled={fileUploading}
                          placeholder="Nome file (opzionale)"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Categoria</CFormLabel>
                        <CFormSelect
                          value={fileForm.categoria}
                          onChange={handleFileFieldChange('categoria')}
                          disabled={fileUploading}
                        >
                          <option value="cliente">Dati cliente</option>
                          <option value="anteprima">Anteprima lavorazione</option>
                          <option value="altro">Altro</option>
                        </CFormSelect>
                      </CCol>
                      <CCol md={12}>
                        <CFormLabel>Note</CFormLabel>
                        <CFormTextarea
                          rows={3}
                          value={fileForm.note}
                          onChange={handleFileFieldChange('note')}
                          disabled={fileUploading}
                        />
                      </CCol>
                      <CCol md="auto">
                        <CButton color="primary" type="submit" disabled={fileUploading || !fileForm.file}>
                          {fileUploading ? 'Caricamento...' : 'Carica file'}
                        </CButton>
                      </CCol>
                    </CRow>
                  </CForm>

                  {filesError ? (
                    <CAlert color="danger">
                      {filesError?.payload?.message || filesError.message || 'Errore durante il caricamento dei file.'}
                    </CAlert>
                  ) : null}
                  {filesLoading ? (
                    <div className="d-flex justify-content-center py-4">
                      <CSpinner />
                    </div>
                  ) : (
                    <CTable hover responsive size="sm">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell>Titolo</CTableHeaderCell>
                          <CTableHeaderCell>Categoria</CTableHeaderCell>
                          <CTableHeaderCell>Note</CTableHeaderCell>
                          <CTableHeaderCell>Ultimo download</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Dim.</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {files.length > 0 ? (
                          files.map((file) => (
                            <CTableRow key={file.id_file}>
                              <CTableDataCell>{file.titolo || file.original_name}</CTableDataCell>
                              <CTableDataCell>{file.categoria || '-'}</CTableDataCell>
                              <CTableDataCell>{file.note || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {file.last_download_at ? (
                                  <div>
                                    <div className="fw-semibold">{file.last_download_by || '-'}</div>
                                    <div className="text-body-secondary small">
                                      {formatDate(file.last_download_at, true)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-body-secondary">Mai</span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                {file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : '-'}
                              </CTableDataCell>
                              <CTableDataCell className="text-center">
                                <CButton color="link" size="sm" className="p-0" onClick={() => handleFileDownload(file)}>
                                  Scarica
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))
                        ) : (
                          <CTableRow>
                            <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                              Nessun file caricato.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
                  )}
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>

          <CRow className="mb-4">
            <CCol xs={12}>
              <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <strong>Squadra e assegnazioni</strong>
                  <CButton
                    color="light"
                    size="sm"
                    onClick={handleOpenJobAssignmentModal}
                    disabled={!hasDetail}
                  >
                    Gestisci
                  </CButton>
                </CCardHeader>
                <CCardBody>
                  {Array.isArray(currentDetail.assegnazioni) && currentDetail.assegnazioni.length > 0 ? (
                    <CListGroup className="mb-3">
                      {currentDetail.assegnazioni.map((ass) => (
                        <CListGroupItem key={ass.id_account}>
                          <div className="fw-semibold">{ass.nome}</div>
                          <div className="text-body-secondary small">{ass.ruolo}</div>
                          <CBadge color="secondary" size="sm" className="mt-2">
                            {ass.carico_attivita} attivita
                          </CBadge>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  ) : (
                    <CAlert color="info" className="mb-3">
                      Nessun operatore assegnato.
                    </CAlert>
                  )}
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    className="w-100"
                    onClick={() => handleOpenNotificationModal('job')}
                    disabled={!hasDetail}
                  >
                    <CIcon icon={cilSend} className="me-2" />
                    Notifica operatori
                  </CButton>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <strong>Attivita collegate</strong>
              <CButton color="primary" size="sm" variant="ghost" onClick={handleOpenActivityModal}>
                <CIcon icon={cilPen} className="me-2" />
                Nuova attivita
              </CButton>
            </CCardHeader>
            <CCardBody className="p-0">
              {(activityStatusError || activityStatusSuccess || activityReportError || activityReportSuccess) && (
                <div className="px-3 pt-3">
                  {activityStatusError && (
                    <CAlert color="danger" className="mb-3">
                      {activityStatusError?.payload?.message ||
                        activityStatusError.message ||
                        "Errore durante l'aggiornamento dello stato dell'attività."}
                    </CAlert>
                  )}
                  {activityStatusSuccess && (
                    <CAlert color="success" className="mb-3">
                      {activityStatusSuccess}
                    </CAlert>
                  )}
                  {activityReportError && (
                    <CAlert color="danger" className="mb-3">
                      {activityReportError?.payload?.message ||
                        activityReportError.message ||
                        "Errore durante l'aggiornamento del report dell'attivita."}
                    </CAlert>
                  )}
                  {activityReportSuccess && (
                    <CAlert color="success" className="mb-3">
                      {activityReportSuccess}
                    </CAlert>
                  )}
                </div>
              )}
              <CTable hover responsive className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Attivita</CTableHeaderCell>
                    <CTableHeaderCell>Reparto</CTableHeaderCell>
                    <CTableHeaderCell>Scadenza</CTableHeaderCell>
                    <CTableHeaderCell>Azioni</CTableHeaderCell>
                    <CTableHeaderCell>Stato Attivit&#224;</CTableHeaderCell>
                    <CTableHeaderCell>Progresso</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {Array.isArray(currentDetail.attivita) && currentDetail.attivita.length > 0 ? (
                    currentDetail.attivita.map((task) => {
                      const taskStatus = String(task.stato || '').toLowerCase()
                      const activityLoading = isActivityStatusLoading(task.id_attivita)
                      const disableStart =
                        activityLoading ||
                        taskStatus === 'in_progress' ||
                        taskStatus === 'done' ||
                        taskStatus === 'cancelled'
                      const disableSuspend = activityLoading || taskStatus !== 'in_progress'
                      const disableFinish =
                        activityLoading || taskStatus === 'done' || taskStatus === 'cancelled'
                      const disableReschedule = activityLoading
                      return (
                        <CTableRow key={task.id_attivita || task.titolo}>
                          <CTableDataCell>
                            <div className="fw-semibold">{task.titolo}</div>
                            <div className="text-body-secondary small">ID {task.id_attivita}</div>
                            {task.note ? (
                              <CCallout color="warning" className="mt-2 mb-0 py-2">
                                <div className="small">{task.note}</div>
                              </CCallout>
                            ) : null}
                            <div className="text-body-secondary small">
                              {task.data_avvio || task.data_fine || task.report_note ? (
                                <>
                                  {task.data_avvio ? `Avvio ${formatDate(task.data_avvio, true)}` : 'Avvio n/d'}
                                  {task.data_fine ? ` • Fine ${formatDate(task.data_fine, true)}` : ''}
                                  {task.report_operatore_nome ? ` • Operatore ${task.report_operatore_nome}` : ''}
                                </>
                              ) : (
                                'Report non compilato'
                              )}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="fw-semibold">{task.reparto_label || '-'}</div>
                            <div className="text-body-secondary small mt-1">
                              {Array.isArray(task.assegnatari)
                                ? task.assegnatari.join(', ')
                                : task.assegnatari || '-'}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>{formatDate(task.data_scadenza)}</CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              <CButton
                                size="sm"
                                color="secondary"
                                variant="outline"
                                className="p-1"
                                onClick={() => handleOpenActivityEditModal(task)}
                                disabled={!task?.id_attivita}
                                title="Modifica attivita"
                                aria-label="Modifica attivita"
                              >
                                <CIcon icon={cilSettings} size="sm" />
                              </CButton>
                              <CButton
                                size="sm"
                                color="light"
                                className="p-1"
                                onClick={() => handleOpenActivityAssignmentModal(task)}
                                disabled={!task?.id_attivita}
                                title="Aggiorna assegnazione"
                                aria-label="Aggiorna assegnazione"
                              >
                                <CIcon icon={cilPeople} size="sm" />
                              </CButton>
                              <CButton
                                size="sm"
                                color="primary"
                                variant="ghost"
                                className="p-1"
                                onClick={() => handleOpenNotificationModal('activity', task)}
                                disabled={!task?.id_attivita}
                                title="Notifica"
                                aria-label="Notifica"
                              >
                                <CIcon icon={cilSend} size="sm" />
                              </CButton>
                              <CButton
                                size="sm"
                                color="secondary"
                                variant="outline"
                                className="p-1"
                                onClick={() => handleOpenActivityReportModal(task)}
                                disabled={!task?.id_attivita}
                                title="Report"
                                aria-label="Report"
                              >
                                <CIcon icon={cilDescription} size="sm" />
                              </CButton>
                              <CButton
                                size="sm"
                                color="danger"
                                variant="outline"
                                className="p-1"
                                disabled={!task?.id_attivita || activityLoading || isActivityDeleting(task.id_attivita)}
                                onClick={() => handleDeleteActivity(task.id_attivita)}
                                title="Rimuovi attività"
                                aria-label="Rimuovi attività"
                              >
                                <CIcon icon={cilXCircle} size="sm" />
                              </CButton>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="fw-semibold mb-2">
                              {renderStateBadge({
                                stato: task.stato,
                                stato_label: task.stato_label || task.stato,
                              })}
                            </div>
                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex flex-wrap gap-2">
                                <CButton
                                  size="sm"
                                  color="primary"
                                  variant="outline"
                                  className="p-1"
                                  disabled={disableStart}
                                  onClick={() => handleActivityStatusChange(task.id_attivita, 'in_progress', 10)}
                                  title="Avvia attività"
                                  aria-label="Avvia attività"
                                >
                                  <CIcon icon={cilMediaPlay} size="sm" />
                                </CButton>
                                <CButton
                                  size="sm"
                                  color="warning"
                                  variant="outline"
                                  className="p-1"
                                  disabled={disableSuspend}
                                  onClick={() => handleActivityStatusChange(task.id_attivita, 'sospesa', 50)}
                                  title="Sospendi attività"
                                  aria-label="Sospendi attività"
                                >
                                  <CIcon icon={cilMediaPause} size="sm" />
                                </CButton>
                                <CButton
                                  size="sm"
                                  color="success"
                                  variant="outline"
                                  className="p-1"
                                  disabled={disableFinish}
                                  onClick={() => handleActivityStatusChange(task.id_attivita, 'done', 100)}
                                  title="Termina attività"
                                  aria-label="Termina attività"
                                >
                                  <CIcon icon={cilCheckCircle} size="sm" />
                                </CButton>
                                <CButton
                                  size="sm"
                                  color="info"
                                  variant="outline"
                                  className="p-1"
                                  disabled={disableReschedule}
                                  onClick={() => handleActivityStatusChange(task.id_attivita, 'todo', 0)}
                                  title="Rischedula attività"
                                  aria-label="Rischedula attività"
                                >
                                  <CIcon icon={cilReload} size="sm" />
                                </CButton>
                              </div>
                              {activityLoading ? (
                                <small className="text-body-secondary d-flex align-items-center gap-2">
                                  <CSpinner size="sm" />
                                  Aggiornamento in corso...
                                </small>
                              ) : null}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CProgress
                              thin
                              value={Math.min(100, Math.max(0, Number(task.percentuale) || 0))}
                              color={
                                taskStatus === 'sospesa'
                                  ? 'danger'
                                  : Number(task.percentuale) >= 100
                                    ? 'success'
                                    : 'primary'
                              }
                              className="mb-1"
                            />
                            <div className="text-body-secondary small">{formatPercent(task.percentuale)}</div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center py-4 text-body-secondary">
                        Nessuna attivita registrata.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={notificationModal.visible} onClose={handleCloseNotificationModal} backdrop="static">
        <CForm onSubmit={handleNotificationSubmit}>
          <CModalHeader>
            <CModalTitle>
              Notifica {notificationModal.scope === 'activity' ? 'attivita' : 'lavorazione'}
              {notificationModal.contextLabel ? ` ${notificationModal.contextLabel}` : ''}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            {notificationError && (
              <CAlert color="danger">
                {notificationError?.payload?.message ||
                  notificationError.message ||
                  'Errore durante la creazione della notifica.'}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel>Titolo</CFormLabel>
                <CFormInput
                  value={notificationModal.titolo}
                  onChange={handleNotificationFieldChange('titolo')}
                  disabled={notificationSubmitting}
                  placeholder="Oggetto della notifica"
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Messaggio</CFormLabel>
                <CFormTextarea
                  rows={4}
                  required
                  value={notificationModal.messaggio}
                  onChange={handleNotificationFieldChange('messaggio')}
                  disabled={notificationSubmitting}
                  placeholder="Testo da inviare agli operatori selezionati"
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Operatori destinatari</CFormLabel>
                <CFormSelect
                  multiple
                  value={notificationModal.operatori}
                  onChange={handleNotificationOperatorsChange}
                  disabled={notificationSubmitting || assignmentOptions.operatori.length === 0}
                  size={Math.min(6, Math.max(3, assignmentOptions.operatori.length || 3))}
                >
                  {assignmentOptions.operatori.length === 0 ? (
                    <option value="" disabled>
                      Nessun operatore disponibile
                    </option>
                  ) : (
                    assignmentOptions.operatori.map((operator) => (
                      <option key={operator.id_account} value={String(operator.id_account)}>
                        {operator.username || operator.email || `ID ${operator.id_account}`}
                      </option>
                    ))
                  )}
                </CFormSelect>
                <small className="text-body-secondary">
                  Se non selezioni nessun operatore verranno notificati automaticamente tutti gli assegnatari.
                </small>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="link" type="button" onClick={handleCloseNotificationModal} disabled={notificationSubmitting}>
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={notificationSubmitting}>
              {notificationSubmitting ? 'Invio in corso...' : 'Invia notifica'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={activityReportModal.visible} onClose={handleCloseActivityReportModal} backdrop="static">
        <CForm onSubmit={handleActivityReportSubmit}>
          <CModalHeader>
            <CModalTitle>Report attivita {activityReportModal.titolo || ''}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {activityReportError && (
              <CAlert color="danger">
                {activityReportError?.payload?.message ||
                  activityReportError.message ||
                  "Errore durante l'aggiornamento del report dell'attivita."}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Data avvio</CFormLabel>
                <CFormInput
                  type="datetime-local"
                  value={activityReportModal.dataAvvio}
                  onChange={handleActivityReportFieldChange('dataAvvio')}
                  disabled={activityReportSubmitting}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Data fine</CFormLabel>
                <CFormInput
                  type="datetime-local"
                  value={activityReportModal.dataFine}
                  onChange={handleActivityReportFieldChange('dataFine')}
                  disabled={activityReportSubmitting}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Operatore assegnato</CFormLabel>
                <CFormSelect
                  value={activityReportModal.operatoreId}
                  onChange={handleActivityReportFieldChange('operatoreId')}
                  disabled={activityReportSubmitting || assignmentOptions.operatori.length === 0}
                >
                  <option value="">Seleziona operatore</option>
                  {assignmentOptions.operatori.map((operator) => (
                    <option key={operator.id_account} value={String(operator.id_account)}>
                      {operator.username || operator.email || `ID ${operator.id_account}`}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Annotazioni</CFormLabel>
                <CFormTextarea
                  rows={5}
                  value={activityReportModal.note}
                  onChange={handleActivityReportChange}
                  disabled={activityReportSubmitting}
                  placeholder="Annotazioni sull'attivita"
                />
              </CCol>
            </CRow>
            {activityReportModal.updatedAt ? (
              <small className="text-body-secondary">
                Ultimo aggiornamento: {formatDate(activityReportModal.updatedAt, true)}
              </small>
            ) : null}
          </CModalBody>
          <CModalFooter>
            <CButton
              color="link"
              type="button"
              onClick={handleCloseActivityReportModal}
              disabled={activityReportSubmitting}
            >
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={activityReportSubmitting}>
              {activityReportSubmitting ? 'Salvataggio...' : 'Salva report'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={activityEditModal.visible} onClose={handleCloseActivityEditModal} size="lg" backdrop="static">
        <CForm onSubmit={handleActivityEditSubmit}>
          <CModalHeader>
            <CModalTitle>Modifica attivita {activityEditModal.titolo || ''}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {activityEditError && (
              <CAlert color="danger">
                {activityEditError?.payload?.message ||
                  activityEditError.message ||
                  "Errore durante l'aggiornamento dell'attivita."}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Titolo</CFormLabel>
                <CFormInput
                  value={activityEditModal.titolo}
                  onChange={handleActivityEditFieldChange('titolo')}
                  placeholder="Nome attivita"
                  required
                  disabled={activityEditSubmitting}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Priorita</CFormLabel>
                <CFormSelect
                  value={activityEditModal.priorita}
                  onChange={handleActivityEditFieldChange('priorita')}
                  disabled={activityEditSubmitting}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Descrizione</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={activityEditModal.descrizione}
                  onChange={handleActivityEditFieldChange('descrizione')}
                  disabled={activityEditSubmitting}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Reparto assegnatario</CFormLabel>
                <CFormSelect
                  value={activityEditModal.idReparto}
                  onChange={handleActivityEditFieldChange('idReparto')}
                  disabled={activityEditSubmitting}
                >
                  <option value="">Nessun reparto</option>
                  {assignmentOptions.reparti.map((rep, index) => {
                    const idValue = rep?.id ? String(rep.id) : ''
                    const keyValue = rep?.id ?? rep?.code ?? `${rep?.label || 'reparto'}-${index}`
                    return (
                      <option key={keyValue} value={idValue}>
                        {rep?.label || rep?.code || idValue || 'Reparto'}
                      </option>
                    )
                  })}
                </CFormSelect>
                {assignmentOptionsLoading ? (
                  <small className="text-body-secondary">Caricamento reparti...</small>
                ) : null}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Scadenza</CFormLabel>
                <CFormInput
                  type="date"
                  value={activityEditModal.dataScadenza}
                  onChange={handleActivityEditFieldChange('dataScadenza')}
                  disabled={activityEditSubmitting}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Note interne</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={activityEditModal.note}
                  onChange={handleActivityEditFieldChange('note')}
                  disabled={activityEditSubmitting}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="link" type="button" onClick={handleCloseActivityEditModal} disabled={activityEditSubmitting}>
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={activityEditSubmitting}>
              {activityEditSubmitting ? 'Salvataggio...' : 'Salva modifiche'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={jobAssignmentModalVisible} onClose={handleCloseJobAssignmentModal} backdrop="static">
        <CForm onSubmit={handleJobAssignmentSubmit}>
          <CModalHeader>
            <CModalTitle>Assegna lavorazione</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {jobAssignmentError && (
              <CAlert color="danger">
                {jobAssignmentError?.payload?.message ||
                  jobAssignmentError.message ||
                  "Errore durante l'aggiornamento dell'assegnazione."}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Reparto principale</CFormLabel>
                <CFormSelect
                  value={jobAssignmentForm.reparto}
                  onChange={handleJobAssignmentFieldChange('reparto')}
                  disabled={jobAssignmentSubmitting}
                >
                  <option value="">Nessun reparto</option>
                  {assignmentOptions.reparti.map((rep, index) => {
                    const idValue = rep?.id ? String(rep.id) : ''
                    const keyValue = rep?.id ?? rep?.code ?? `${rep?.label || 'reparto'}-${index}`
                    return (
                      <option key={keyValue} value={idValue}>
                        {rep?.label || rep?.code || idValue || 'Reparto'}
                      </option>
                    )
                  })}
                </CFormSelect>
                {assignmentOptionsLoading ? (
                  <small className="text-body-secondary">Caricamento reparti...</small>
                ) : null}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Operatori assegnati</CFormLabel>
                <CFormSelect
                  multiple
                  value={jobAssignmentForm.operatori}
                  onChange={handleJobAssignmentOperatorsChange}
                  disabled={jobAssignmentSubmitting || assignmentOptions.operatori.length === 0}
                  size={Math.min(6, Math.max(3, assignmentOptions.operatori.length))}
                >
                  {assignmentOptions.operatori.length === 0 ? (
                    <option value="" disabled>
                      Nessun operatore disponibile
                    </option>
                  ) : (
                    assignmentOptions.operatori.map((operator) => (
                      <option key={operator.id_account} value={String(operator.id_account)}>
                        {operator.username || operator.email || `ID ${operator.id_account}`}
                      </option>
                    ))
                  )}
                </CFormSelect>
                <small className="text-body-secondary">Seleziona gli operatori responsabili della lavorazione.</small>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="link" type="button" onClick={handleCloseJobAssignmentModal} disabled={jobAssignmentSubmitting}>
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={jobAssignmentSubmitting}>
              {jobAssignmentSubmitting ? 'Salvataggio...' : 'Salva assegnazione'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal
        visible={activityAssignmentModal.visible}
        onClose={handleCloseActivityAssignmentModal}
        backdrop="static"
      >
        <CForm onSubmit={handleActivityAssignmentSubmit}>
          <CModalHeader>
            <CModalTitle>Assegna attivita {activityAssignmentModal.titolo || ''}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {activityAssignmentError && (
              <CAlert color="danger">
                {activityAssignmentError?.payload?.message ||
                  activityAssignmentError.message ||
                  "Errore durante l'aggiornamento dell'attivita."}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Reparto</CFormLabel>
                <CFormSelect
                  value={activityAssignmentModal.reparto}
                  onChange={handleActivityAssignmentFieldChange('reparto')}
                  disabled={activityAssignmentSubmitting}
                >
                  <option value="">Nessun reparto</option>
                  {assignmentOptions.reparti.map((rep, index) => {
                    const idValue = rep?.id ? String(rep.id) : ''
                    const keyValue = rep?.id ?? rep?.code ?? `${rep?.label || 'reparto'}-${index}`
                    return (
                      <option key={keyValue} value={idValue}>
                        {rep?.label || rep?.code || idValue || 'Reparto'}
                      </option>
                    )
                  })}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Operatori</CFormLabel>
                <CFormSelect
                  multiple
                  value={activityAssignmentModal.operatori}
                  onChange={handleActivityAssignmentOperatorsChange}
                  disabled={activityAssignmentSubmitting || assignmentOptions.operatori.length === 0}
                  size={Math.min(6, Math.max(3, assignmentOptions.operatori.length))}
                >
                  {assignmentOptions.operatori.length === 0 ? (
                    <option value="" disabled>
                      Nessun operatore disponibile
                    </option>
                  ) : (
                    assignmentOptions.operatori.map((operator) => (
                      <option key={operator.id_account} value={String(operator.id_account)}>
                        {operator.username || operator.email || `ID ${operator.id_account}`}
                      </option>
                    ))
                  )}
                </CFormSelect>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="link"
              type="button"
              onClick={handleCloseActivityAssignmentModal}
              disabled={activityAssignmentSubmitting}
            >
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={activityAssignmentSubmitting}>
              {activityAssignmentSubmitting ? 'Salvataggio...' : 'Salva assegnazione'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={activityModalVisible} onClose={handleCloseActivityModal} size="lg" backdrop="static">
        <CForm onSubmit={handleActivitySubmit}>
          <CModalHeader>
            <CModalTitle>Nuova attivita</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {activityError && (
              <CAlert color="danger">
                {activityError?.payload?.message || activityError.message || 'Errore durante il salvataggio dell\'attivita.'}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Template attivita</CFormLabel>
                <CFormSelect
                  value={activityForm.template_id}
                  onChange={handleActivityTemplateChange}
                  disabled={activityTemplatesLoading || activitySubmitting}
                >
                  <option value="">Seleziona template</option>
                  {activityTemplates.map((tpl) => (
                    <option key={tpl.id_template ?? tpl.id} value={tpl.id_template ?? tpl.id}>
                      {tpl.titolo}
                    </option>
                  ))}
                </CFormSelect>
                {activityTemplatesLoading ? (
                  <small className="text-body-secondary">Caricamento...</small>
                ) : null}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Titolo</CFormLabel>
                <CFormInput
                  value={activityForm.titolo}
                  onChange={handleActivityFieldChange('titolo')}
                  placeholder="Nome attivita"
                  required
                  disabled={activitySubmitting}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Descrizione</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={activityForm.descrizione}
                  onChange={handleActivityFieldChange('descrizione')}
                  disabled={activitySubmitting}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Reparto assegnatario</CFormLabel>
                <CFormSelect
                  value={activityForm.id_reparto}
                  onChange={handleActivityFieldChange('id_reparto')}
                  disabled={activitySubmitting}
                >
                  <option value="">Nessun reparto</option>
                  {assignmentOptions.reparti.map((rep, index) => {
                    const idValue = rep?.id ? String(rep.id) : ''
                    const keyValue = rep?.id ?? rep?.code ?? `${rep?.label || 'reparto'}-${index}`
                    return (
                      <option key={keyValue} value={idValue}>
                        {rep?.label || rep?.code || idValue || 'Reparto'}
                      </option>
                    )
                  })}
                </CFormSelect>
                {assignmentOptionsLoading ? (
                  <small className="text-body-secondary">Caricamento reparti...</small>
                ) : null}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Operatori</CFormLabel>
                <CFormSelect
                  multiple
                  value={activityForm.operatori}
                  onChange={handleActivityOperatorsChange}
                  disabled={activitySubmitting || assignmentOptions.operatori.length === 0}
                  size={Math.min(5, Math.max(3, assignmentOptions.operatori.length))}
                >
                  {assignmentOptions.operatori.length === 0 ? (
                    <option value="" disabled>
                      Nessun operatore disponibile
                    </option>
                  ) : (
                    assignmentOptions.operatori.map((operator) => (
                      <option key={operator.id_account} value={String(operator.id_account)}>
                        {operator.username || operator.email || `ID ${operator.id_account}`}
                      </option>
                    ))
                  )}
                </CFormSelect>
                <small className="text-body-secondary">Seleziona uno o pi� operatori (opzionale).</small>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Priorita</CFormLabel>
                <CFormSelect
                  value={activityForm.priorita}
                  onChange={handleActivityFieldChange('priorita')}
                  disabled={activitySubmitting}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Scadenza</CFormLabel>
                <CFormInput
                  type="date"
                  value={activityForm.data_scadenza}
                  onChange={handleActivityFieldChange('data_scadenza')}
                  disabled={activitySubmitting}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Note interne</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={activityForm.note}
                  onChange={handleActivityFieldChange('note')}
                  disabled={activitySubmitting}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="link" type="button" onClick={handleCloseActivityModal} disabled={activitySubmitting}>
              Annulla
            </CButton>
            <CButton color="primary" type="submit" disabled={activitySubmitting}>
              {activitySubmitting ? 'Salvataggio...' : 'Salva attivita'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </div>
  )
}

export default LavorazioneDetail
