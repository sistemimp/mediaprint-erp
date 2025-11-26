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
  CCol,
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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPen, cilReload, cilSend } from '@coreui/icons'
import {
  fetchLavorazioneDetail,
  fetchLavorazioneActivityTemplates,
  createLavorazioneActivity,
  fetchLavorazioniAssignmentsConfig,
  assignLavorazione,
  assignLavorazioneActivity,
  notifyLavorazioneOperators,
} from '../../services/lavorazioni'
import { useAuth } from '../../context/AuthContext'

const statoBadgeMap = {
  aperta: 'secondary',
  pianificata: 'info',
  in_produzione: 'primary',
  completata: 'success',
  annullata: 'danger',
}

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

const renderStateBadge = (detail) => {
  const code = detail?.stato || 'aperta'
  const color = statoBadgeMap[code] || 'secondary'
  const label = detail?.stato_label || code
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

const LavorazioneDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
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
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div>
                <strong>Informazioni principali</strong>
                <div className="text-body-secondary small">Stato operativo e dati cliente</div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {hasDetail ? (
                  <>
                    {renderStateBadge(currentDetail)}
                    {renderPriorityBadge(currentDetail.priorita)}
                  </>
                ) : (
                  <CBadge color="secondary">Dati non disponibili</CBadge>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={6}>
                  <InfoField label="Cliente" value={currentDetail.cliente || '-'} />
                  <InfoField
                    label="Preventivo collegato"
                    value={
                      currentDetail.numero_preventivo ? (
                        <CButton
                          size="sm"
                          color="link"
                          className="px-0"
                          onClick={() => navigate(`/preventivi/dettagli?id=${currentDetail.id_preventivo}`)}
                        >
                          {currentDetail.numero_preventivo}
                        </CButton>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <InfoField label="Reparto principale" value={currentDetail.reparto_label || '-'} />
                </CCol>
                <CCol md={6}>
                  <InfoField label="Periodo previsto" value={`${formatDate(currentDetail.data_inizio_prevista)} → ${formatDate(currentDetail.data_fine_prevista)}`} />
                  <InfoField label="Avvio effettivo" value={formatDate(currentDetail.data_avvio_reale, true)} />
                  <InfoField label="Note" value={currentDetail.note || <span className="text-body-secondary">Nessuna nota</span>} />
                </CCol>
              </CRow>
              <div className="mt-4">
                <div className="text-body-secondary text-uppercase small fw-semibold mb-2">Avanzamento complessivo</div>
                <div className="d-flex align-items-center gap-3">
                  <div className="flex-grow-1">
                    <CProgress
                      thin
                      color={currentDetail.percentuale_avanzamento >= 100 ? 'success' : 'primary'}
                      value={Math.min(100, Math.max(0, Number(currentDetail.percentuale_avanzamento) || 0))}
                      className="mb-1"
                    />
                    <div className="text-body-secondary small">
                      In corso — {formatPercent(currentDetail.percentuale_avanzamento)} completato
                    </div>
                  </div>
                  <CBadge color="primary" className="px-3 py-2">
                    {formatPercent(currentDetail.percentuale_avanzamento)}
                  </CBadge>
                </div>
              </div>
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <strong>Attivita collegate</strong>
              <CButton color="primary" size="sm" variant="ghost" onClick={handleOpenActivityModal}>
                <CIcon icon={cilPen} className="me-2" />
                Nuova attivita
              </CButton>
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable hover responsive className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Attivita</CTableHeaderCell>
                    <CTableHeaderCell>Stato</CTableHeaderCell>
                    <CTableHeaderCell>Reparto</CTableHeaderCell>
                    <CTableHeaderCell>Scadenza</CTableHeaderCell>
                    <CTableHeaderCell>Assegnatari</CTableHeaderCell>
                    <CTableHeaderCell>Progresso</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {Array.isArray(currentDetail.attivita) && currentDetail.attivita.length > 0 ? (
                    currentDetail.attivita.map((task) => (
                      <CTableRow key={task.id_attivita || task.titolo}>
                        <CTableDataCell>
                          <div className="fw-semibold">{task.titolo}</div>
                          <div className="text-body-secondary small">ID {task.id_attivita}</div>
                        </CTableDataCell>
                        <CTableDataCell>{renderStateBadge({ stato: task.stato, stato_label: task.stato_label || task.stato })}</CTableDataCell>
                        <CTableDataCell>{task.reparto_label || '-'}</CTableDataCell>
                        <CTableDataCell>{formatDate(task.data_scadenza)}</CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-semibold">
                            {Array.isArray(task.assegnatari) ? task.assegnatari.join(', ') : task.assegnatari || '-'}
                          </div>
                          <div className="d-flex flex-column gap-2 mt-2">
                            <CButton
                              size="sm"
                              color="light"
                              onClick={() => handleOpenActivityAssignmentModal(task)}
                              disabled={!task?.id_attivita}
                            >
                              Aggiorna
                            </CButton>
                            <CButton
                              size="sm"
                              color="primary"
                              variant="ghost"
                              onClick={() => handleOpenNotificationModal('activity', task)}
                              disabled={!task?.id_attivita}
                            >
                              Notifica
                            </CButton>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CProgress
                            thin
                            value={Math.min(100, Math.max(0, Number(task.percentuale) || 0))}
                            color={Number(task.percentuale) >= 100 ? 'success' : 'primary'}
                            className="mb-1"
                          />
                          <div className="text-body-secondary small">{formatPercent(task.percentuale)}</div>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center py-4 text-body-secondary">
                        Nessuna attivita registrata.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
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

          <CCard>
            <CCardHeader>
              <strong>Cronologia</strong>
            </CCardHeader>
            <CCardBody>
              {Array.isArray(currentDetail.timeline) && currentDetail.timeline.length > 0 ? (
                <CListGroup>
                  {currentDetail.timeline.map((event) => (
                    <CListGroupItem key={event.id_evento || event.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold">{event.evento}</div>
                          <div className="text-body-secondary small">{event.autore || '-'}</div>
                        </div>
                        <small className="text-body-secondary">{formatDate(event.data, true)}</small>
                      </div>
                      {event.nota ? <div className="text-body-secondary small mt-2">{event.nota}</div> : null}
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <CAlert color="light" className="mb-0">
                  Nessun evento registrato.
                </CAlert>
              )}
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
              <CCol md={4}>
                <CFormLabel>Note interne</CFormLabel>
                <CFormInput
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
