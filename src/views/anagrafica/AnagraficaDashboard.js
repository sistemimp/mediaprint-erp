import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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

import { fetchAnagraficheDashboard } from '../../services/anagrafiche'
import { useAuth } from '../../context/AuthContext'

// Formatta interi con separatori locali.
const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toLocaleString('it-IT')
}

// Formatta percentuale con una cifra decimale.
const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return `${Number(value).toFixed(1)}%`
}

// Placeholder comune per tabella vuota/loading.
const renderTablePlaceholder = (text) => (
  <div className="text-center text-body-secondary small py-3">{text}</div>
)

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly', label: 'Annuale' },
]

const AnagraficaDashboard = () => {
  const { token } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('monthly')

  // Carica KPI dashboard anagrafiche per periodo selezionato.
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAnagraficheDashboard({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard anagrafica.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token, period])

  const kpi = payload?.kpi ?? {}
  const statusCounts = payload?.status_counts ?? []
  const latest = payload?.latest ?? []

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Mensile',
    [period],
  )

  // Prepara card riepilogo con label dipendenti dal periodo.
  const summaryCards = useMemo(
    () => [
      { key: 'totale_generale', label: 'Totale anagrafiche', value: kpi.totale_generale },
      { key: 'nuovi_mese_corrente', label: `Nuove anagrafiche (${periodLabel})`, value: kpi.nuovi_mese_corrente },
      {
        key: 'nuovi_mese_precedente',
        label: `Nuove anagrafiche (${periodLabel} prec.)`,
        value: kpi.nuovi_mese_precedente,
      },
      { key: 'perc_change_mom', label: 'Variazione periodo su periodo', value: formatPercent(kpi.perc_change_mom) },
    ],
    [kpi, periodLabel],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Dashboard anagrafica</h2>
          <p className="text-body-secondary mb-0">Andamento clienti e riepilogo stati.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard anagrafica"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      {error ? (
        <CAlert color="danger" className="text-small">
          {error}
        </CAlert>
      ) : null}

      <CRow className="mb-4">
        {summaryCards.map((card) => (
          <CCol key={card.key} sm={6} lg={3} className="mb-3">
            <CCard className="h-100 border-0 shadow-sm">
              <CCardBody>
                <div className="text-body-secondary text-uppercase small fw-semibold">{card.label}</div>
                <div className="fs-3 fw-semibold mt-2">
                  {loading
                    ? <CSpinner size="sm" />
                    : card.key === 'perc_change_mom'
                      ? card.value
                      : formatInteger(card.value)}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardHeader>Stato anagrafiche</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : statusCounts.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Stato</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {statusCounts.map((row) => (
                          <CTableRow key={row.stato}>
                            <CTableDataCell>{row.stato || '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatInteger(row.totale)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={7}>
          <CCard className="h-100">
            <CCardHeader>Nuove anagrafiche</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell>Partita IVA</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Creato il</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => (
                          <CTableRow key={row.id_anagrafica}>
                            <CTableDataCell>
                              {row.id_anagrafica ? (
                                <Link
                                  to={`/anagrafica/dettagli?id=${row.id_anagrafica}`}
                                  className="text-decoration-none"
                                >
                                  {row.ragione_sociale || `Cliente #${row.id_anagrafica}`}
                                </Link>
                              ) : (
                                row.ragione_sociale || '-'
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{row.piva || '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{row.created_at || '-'}</CTableDataCell>
                          </CTableRow>
                        ))}
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

export default AnagraficaDashboard



