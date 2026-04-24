import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useAuth } from '../../context/AuthContext'
import { fetchLavorazioniList } from '../../services/lavorazioni'

// Parsing data robusto con fallback null.
const parseDateValue = (value) => {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

// Formatta una data breve in locale italiano.
const formatDate = (value) => {
  const date = parseDateValue(value)
  if (!date) {
    return '-'
  }
  return date.toLocaleDateString('it-IT')
}

// Forza una percentuale nel range 0..100.
const percentValue = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return Math.max(0, Math.min(100, numeric))
}

// Mappa lo stato lavorazione in colore badge.
const statusColor = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('complet')) return 'success'
  if (normalized.includes('produzione') || normalized.includes('progress')) return 'primary'
  if (normalized.includes('pianificat')) return 'info'
  if (normalized.includes('annull')) return 'danger'
  return 'secondary'
}

// Vista CRM focalizzata su avanzamento e stato delle lavorazioni in corso.
const CrmPlusStatiLavorazione = () => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [jobs, setJobs] = useState([])

  // Carica l'elenco lavorazioni da usare per riepiloghi e ultime attivita.
  useEffect(() => {
    if (!token) {
      setError('Sessione non valida. Effettua nuovamente il login.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchLavorazioniList({
          token,
          page: 1,
          pageSize: 200,
          signal: controller.signal,
        })
        if (!active) {
          return
        }
        setJobs(Array.isArray(response?.items) ? response.items : [])
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) {
          return
        }
        setError(loadError?.message || 'Errore durante il caricamento stati lavorazione.')
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
  }, [token])

  // Raggruppa le lavorazioni per stato e calcola avanzamento medio per gruppo.
  const groupedStatuses = useMemo(() => {
    const map = new Map()
    jobs.forEach((job) => {
      const key = job?.stato_label || job?.stato || 'Non definito'
      const current = map.get(key) || { status: key, count: 0, avgProgress: 0 }
      current.count += 1
      current.avgProgress += percentValue(job?.percentuale_avanzamento)
      map.set(key, current)
    })
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        avgProgress: row.count > 0 ? row.avgProgress / row.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [jobs])

  // KPI globali: totale, ritardi, avanzamento medio.
  const totals = useMemo(() => {
    const total = jobs.length
    const delayed = jobs.filter((job) => Number(job?.ritardo_giorni) > 0).length
    const avgProgress =
      total > 0
        ? jobs.reduce((sum, job) => sum + percentValue(job?.percentuale_avanzamento), 0) / total
        : 0
    return { total, delayed, avgProgress }
  }, [jobs])

  // Seleziona le 10 lavorazioni aggiornate piu di recente.
  const latestJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => {
        const first = parseDateValue(a?.updated_at)?.getTime() ?? 0
        const second = parseDateValue(b?.updated_at)?.getTime() ?? 0
        return second - first
      })
      .slice(0, 10)
  }, [jobs])

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Stati di lavorazione</h2>
          <p className="text-body-secondary mb-0">
            Controllo operativo degli stati di avanzamento produzione.
          </p>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow className="g-3 mb-4">
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Lavorazioni
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : totals.total}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">In ritardo</div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : totals.delayed}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Avanzamento medio
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : `${totals.avgProgress.toFixed(0)}%`}
              </div>
              <div className="small text-body-secondary mt-2">
                <Link to="/lavorazioni/lista">Apri planner lavorazioni</Link>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4">
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardHeader>Distribuzione stati</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : (
                <CTable small responsive hover className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">N.</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Avanz. medio</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {groupedStatuses.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-body-secondary">
                          Nessun dato disponibile.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      groupedStatuses.map((row) => (
                        <CTableRow key={row.status}>
                          <CTableDataCell>
                            <CBadge color={statusColor(row.status)}>{row.status}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-end">{row.count}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {row.avgProgress.toFixed(0)}%
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={7}>
          <CCard className="h-100">
            <CCardHeader>Ultimi aggiornamenti</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : (
                <CTable small responsive hover className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Lavorazione</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Avanzamento</CTableHeaderCell>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {latestJobs.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={5} className="text-body-secondary">
                          Nessuna lavorazione disponibile.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      latestJobs.map((job) => (
                        <CTableRow key={job.id_lavorazione}>
                          <CTableDataCell>
                            <Link to={`/lavorazioni/dettaglio?id=${job.id_lavorazione}`}>
                              {job.codice || `#${job.id_lavorazione}`}
                            </Link>
                          </CTableDataCell>
                          <CTableDataCell>{job.cliente || '-'}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={statusColor(job.stato_label || job.stato)}>
                              {job.stato_label || job.stato || '-'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {percentValue(job.percentuale_avanzamento).toFixed(0)}%
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDate(job.updated_at || job.data_fine_prevista)}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusStatiLavorazione
