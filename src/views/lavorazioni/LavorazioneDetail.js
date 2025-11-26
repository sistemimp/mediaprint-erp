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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPen, cilReload, cilSend } from '@coreui/icons'
import { fetchLavorazioneDetail } from '../../services/lavorazioni'
import { useAuth } from '../../context/AuthContext'

const fallbackDetail = {
  id_lavorazione: 1001,
  codice: 'JOB-2025-001',
  titolo: 'Campagna tesseramento 2025',
  stato: 'in_produzione',
  stato_label: 'In produzione',
  priorita: 'high',
  reparto_label: 'Stampa',
  percentuale_avanzamento: 45,
  cliente: 'Comune di Milano',
  numero_preventivo: '2025/021',
  id_preventivo: 21,
  oggetto: 'Stampa e spedizione mailing cartaceo',
  note: 'Lavorazione generata automaticamente dal preventivo 2025/021.',
  data_inizio_prevista: '2025-11-15',
  data_fine_prevista: '2025-11-25',
  data_avvio_reale: '2025-11-16T08:30:00Z',
  data_chiusura: null,
  attivita: [
    {
      id_attivita: 7001,
      titolo: 'Impaginazione grafica',
      stato: 'done',
      priorita: 'medium',
      data_scadenza: '2025-11-17',
      data_completamento: '2025-11-16',
      assegnatari: ['Giulia Riva'],
      reparto_label: 'Stampa',
      percentuale: 100,
    },
    {
      id_attivita: 7002,
      titolo: 'Stampa documenti',
      stato: 'in_progress',
      priorita: 'high',
      data_scadenza: '2025-11-20',
      assegnatari: ['Luca Bianchi'],
      reparto_label: 'Stampa',
      percentuale: 60,
    },
    {
      id_attivita: 7003,
      titolo: 'Imbustamento e postalizzazione',
      stato: 'todo',
      priorita: 'high',
      data_scadenza: '2025-11-24',
      assegnatari: ['Team Produzione'],
      reparto_label: 'Imbustamento',
      percentuale: 0,
    },
  ],
  timeline: [
    {
      id_evento: 1,
      evento: 'Lavorazione creata',
      autore: 'Admin',
      data: '2025-11-10T09:40:00Z',
      nota: 'Generata automaticamente dal preventivo 2025/021',
    },
    {
      id_evento: 2,
      evento: 'Stato aggiornato a pianificata',
      autore: 'Sara Conti',
      data: '2025-11-12T11:10:00Z',
      nota: 'Definite le tempistiche con produzione',
    },
    {
      id_evento: 3,
      evento: 'Stato aggiornato a in produzione',
      autore: 'Luca Bianchi',
      data: '2025-11-16T08:30:00Z',
      nota: 'Avvio stampa massiva',
    },
  ],
  assegnazioni: [
    { id_account: 5, nome: 'Luca Bianchi', ruolo: 'Responsabile reparto', carico_attivita: 3 },
    { id_account: 7, nome: 'Giulia Riva', ruolo: 'Operatore grafica', carico_attivita: 2 },
  ],
}

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
        setDetail(payload || fallbackDetail)
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('Errore nel caricamento della lavorazione:', err)
        setError(err)
        setDetail((prev) => prev || fallbackDetail)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, recordId, refreshIndex])

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

  const currentDetail = detail || fallbackDetail

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
        <CAlert color="warning">
          {error?.message || 'Non e stato possibile recuperare il dettaglio completo, vengono mostrati dati di esempio.'}
        </CAlert>
      ) : null}

      <CRow className="mb-4">
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div>
                <strong>Informazioni principali</strong>
                <div className="text-body-secondary small">Stato operativo e dati cliente</div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {renderStateBadge(currentDetail)}
                {renderPriorityBadge(currentDetail.priorita)}
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
              <CButton color="primary" size="sm" variant="ghost">
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
                          <div className="fw-semibold">{Array.isArray(task.assegnatari) ? task.assegnatari.join(', ') : task.assegnatari || '-'}</div>
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
            <CCardHeader>
              <strong>Squadra e assegnazioni</strong>
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
              <CButton color="primary" variant="outline" size="sm" className="w-100">
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
    </div>
  )
}

export default LavorazioneDetail
