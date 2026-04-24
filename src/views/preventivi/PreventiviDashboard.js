import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

import { fetchPreventiviDashboard } from '../../services/preventivi'
import { useAuth } from '../../context/AuthContext'

// Vista PreventiviDashboard: componente UI del modulo.
const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toLocaleString('it-IT')
}

const formatCurrency = (value) => {
  const amount = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(amount)) {
    return '-'
  }
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return `${Number(value).toFixed(1)}%`
}

  const renderTablePlaceholder = (text) => (
    <div className="text-center text-body-secondary small py-3">{text}</div>
  )

const renderClientLink = (name, id) => {
  const label = name || '-'
  if (!id) {
    return label
  }
  return (
    <Link to={`/anagrafica/dettagli?id=${id}`} className="text-decoration-none">
      {label}
    </Link>
  )
}

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly', label: 'Annuale' },
]

const PreventiviDashboard = () => {
  const { token } = useAuth()
  const location = useLocation()
  const isAcquisto = location.pathname.includes('/acquisti/')
  const basePath = isAcquisto ? '/acquisti/preventivi' : '/preventivi'
  const counterpartyLabel = isAcquisto ? 'Fornitore' : 'Cliente'
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('monthly')

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPreventiviDashboard({
          token,
          period,
          signal: controller.signal,
          is_acquisto: isAcquisto ? 1 : 0,
        })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard preventivi.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [token, period, isAcquisto])

  const conversion = payload?.conversion ?? {}
  const statusCounts = payload?.status_counts ?? []
  const latest = payload?.latest ?? []
  const topClients = payload?.top_clients ?? []

  const total = Number(conversion.total ?? 0)
  const accepted = Number(conversion.accepted ?? 0)
  const conversionRate = total > 0 ? (accepted / total) * 100 : 0

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Mensile',
    [period],
  )

  const summaryCards = useMemo(
    () => [
      { key: 'totale', label: `Preventivi (${periodLabel})`, value: total },
      { key: 'confermati', label: 'Preventivi confermati', value: accepted },
      { key: 'tasso', label: 'Tasso conversione', value: formatPercent(conversionRate) },
      { key: 'stati', label: 'Stati attivi', value: statusCounts.length },
    ],
    [total, accepted, conversionRate, statusCounts.length, periodLabel],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">
            {isAcquisto ? 'Dashboard preventivi acquisto' : 'Dashboard preventivi'}
          </h2>
          <p className="text-body-secondary mb-0">
            {isAcquisto ? 'Conversione e fornitori principali.' : 'Conversione, stati e clienti principali.'}
          </p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard preventivi"
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
                    : card.key === 'tasso'
                      ? card.value
                      : formatInteger(card.value)}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        <CCol lg={4}>
          <CCard className="h-100">
            <CCardHeader>Preventivi per stato ({periodLabel.toLowerCase()})</CCardHeader>
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
                          <CTableRow key={row.id_stato}>
                            <CTableDataCell>{row.label || row.code || '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatInteger(row.tot)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={8}>
          <CCard className="h-100">
            <CCardHeader>Ultimi preventivi</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Preventivo</CTableHeaderCell>
                          <CTableHeaderCell>{counterpartyLabel}</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Stato</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => {
                          const numero = row.numero_documento ? `${row.anno_preventivo}/${row.numero_documento}` : '-'
                          return (
                            <CTableRow key={row.id_preventivo}>
                              <CTableDataCell>
                                {row.id_preventivo ? (
                                  <Link
                                    to={`${basePath}/dettagli?id=${row.id_preventivo}`}
                                    className="text-decoration-none"
                                  >
                                    {numero}
                                  </Link>
                                ) : (
                                  numero
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderClientLink(row.ragione_sociale, row.id_anagrafica)}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">{formatCurrency(row.totale)}</CTableDataCell>
                              <CTableDataCell className="text-end">{row.stato_label || row.stato_code || '-'}</CTableDataCell>
                            </CTableRow>
                          )
                        })}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="mt-4">
        <CCol lg={6}>
          <CCard>
            <CCardHeader>
              {isAcquisto
                ? `Top fornitori (${periodLabel.toLowerCase()})`
                : `Top clienti (${periodLabel.toLowerCase()})`}
            </CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : topClients.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>{counterpartyLabel}</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Preventivi</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {topClients.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-top`}>
                            <CTableDataCell>{renderClientLink(row.ragione_sociale, row.id_anagrafica)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatInteger(row.num_preventivi)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(row.totale)}</CTableDataCell>
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

export default PreventiviDashboard



