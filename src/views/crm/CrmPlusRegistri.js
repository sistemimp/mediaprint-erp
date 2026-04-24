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
import { fetchFattureList } from '../../services/fatture'
import { fetchLavorazioniList } from '../../services/lavorazioni'
import { fetchLatestPreventivi } from '../../services/preventivi'

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

// Formatta data e ora nel formato italiano.
const formatDateTime = (value) => {
  const date = parseDateValue(value)
  if (!date) {
    return '-'
  }
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Mappa il tipo registro su un colore badge.
const typeColor = (type) => {
  if (type === 'Preventivo') return 'secondary'
  if (type === 'Fattura') return 'info'
  if (type === 'Lavorazione') return 'primary'
  return 'dark'
}

// Registro cronologico CRM che unifica eventi da preventivi, fatture e lavorazioni.
const CrmPlusRegistri = () => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])

  // Carica preventivi/fatture/lavorazioni e li unifica in un unico registro eventi.
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
        const [preventiviResult, fattureResult, lavorazioniResult] = await Promise.allSettled([
          fetchLatestPreventivi({ token, limit: 50, signal: controller.signal }),
          fetchFattureList({ token, limit: 50, signal: controller.signal }),
          fetchLavorazioniList({ token, page: 1, pageSize: 50, signal: controller.signal }),
        ])

        if (!active) {
          return
        }

        const preventiviItems =
          preventiviResult.status === 'fulfilled' && Array.isArray(preventiviResult.value?.items)
            ? preventiviResult.value.items
            : []
        const fattureItems =
          fattureResult.status === 'fulfilled' && Array.isArray(fattureResult.value?.items)
            ? fattureResult.value.items
            : []
        const lavorazioniItems =
          lavorazioniResult.status === 'fulfilled' && Array.isArray(lavorazioniResult.value?.items)
            ? lavorazioniResult.value.items
            : []

        const merged = [
          ...preventiviItems.map((row) => ({
            key: `prev-${row.id_preventivo}`,
            type: 'Preventivo',
            title: `${row.numero_preventivo || `#${row.id_preventivo || '-'}`} - ${row.ragione_sociale || '-'}`,
            status: row.stato_label || row.stato_code || '-',
            date: row.updated_at || row.data_preventivo || row.created_at,
            link: `/preventivi/dettagli?id=${row.id_preventivo}`,
          })),
          ...fattureItems.map((row) => ({
            key: `fatt-${row.id_fattura}`,
            type: 'Fattura',
            title: `${row.numero_fattura || `#${row.id_fattura || '-'}`} - ${row.cliente_ragione_sociale || '-'}`,
            status: row.stato_label || 'Registrata',
            date: row.updated_at || row.data_fattura || row.created_at,
            link: `/fatture/dettagli?id=${row.id_fattura}`,
          })),
          ...lavorazioniItems.map((row) => ({
            key: `lav-${row.id_lavorazione}`,
            type: 'Lavorazione',
            title: `${row.codice || `#${row.id_lavorazione || '-'}`} - ${row.cliente || '-'}`,
            status: row.stato_label || row.stato || '-',
            date: row.updated_at || row.data_fine_prevista || row.data_inizio_prevista,
            link: `/lavorazioni/dettaglio?id=${row.id_lavorazione}`,
          })),
        ]

        merged.sort((a, b) => {
          const first = parseDateValue(a.date)?.getTime() ?? 0
          const second = parseDateValue(b.date)?.getTime() ?? 0
          return second - first
        })

        setEntries(merged.slice(0, 30))

        if (
          preventiviResult.status === 'rejected' &&
          fattureResult.status === 'rejected' &&
          lavorazioniResult.status === 'rejected'
        ) {
          setError('Impossibile caricare i registri CRM')
        }
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) {
          return
        }
        setError(loadError?.message || 'Errore durante il caricamento dei registri.')
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

  // Calcola i contatori per tipo da mostrare nei KPI.
  const counters = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.total += 1
        if (entry.type === 'Preventivo') acc.preventivi += 1
        if (entry.type === 'Fattura') acc.fatture += 1
        if (entry.type === 'Lavorazione') acc.lavorazioni += 1
        return acc
      },
      { total: 0, preventivi: 0, fatture: 0, lavorazioni: 0 },
    )
  }, [entries])

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Registri</h2>
          <p className="text-body-secondary mb-0">
            Registro operativo unificato di preventivi, fatture e lavorazioni.
          </p>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow className="g-3 mb-4">
        <CCol md={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Eventi totali
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : counters.total}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">Preventivi</div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : counters.preventivi}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">Fatture</div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : counters.fatture}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Lavorazioni
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : counters.lavorazioni}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>Registro eventi</span>
          <div className="small d-flex gap-3">
            <Link to="/preventivi/lista">Preventivi</Link>
            <Link to="/fatture/lista">Fatture</Link>
            <Link to="/lavorazioni/lista">Lavorazioni</Link>
          </div>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-3">
              <CSpinner size="sm" />
            </div>
          ) : (
            <CTable small hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Data</CTableHeaderCell>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>Riferimento</CTableHeaderCell>
                  <CTableHeaderCell>Stato</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {entries.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={4} className="text-body-secondary">
                      Nessun evento disponibile.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  entries.map((entry) => (
                    <CTableRow key={entry.key}>
                      <CTableDataCell>{formatDateTime(entry.date)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={typeColor(entry.type)}>{entry.type}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <Link to={entry.link} className="text-decoration-none">
                          {entry.title}
                        </Link>
                      </CTableDataCell>
                      <CTableDataCell>{entry.status}</CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default CrmPlusRegistri
