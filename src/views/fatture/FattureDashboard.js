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

import { fetchFattureDashboard } from '../../services/fatture'
import { useAuth } from '../../context/AuthContext'

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

const FattureDashboard = () => {
  const { token } = useAuth()
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
        const data = await fetchFattureDashboard({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard fatture.')
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
  const latest = payload?.latest ?? []
  const topClients = payload?.top_clients ?? []

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Mensile',
    [period],
  )

  const summaryCards = useMemo(
    () => [
      { key: 'fatturato_mese', label: `Fatturato ${periodLabel.toLowerCase()}`, value: formatCurrency(kpi.fatturato_mese) },
      { key: 'fatture_mese', label: `Fatture ${periodLabel.toLowerCase()}`, value: formatInteger(kpi.fatture_mese) },
      { key: 'fatture_aperte', label: 'Fatture aperte', value: formatInteger(kpi.fatture_aperte) },
      { key: 'saldo_aperto', label: 'Saldo aperto', value: formatCurrency(kpi.saldo_aperto) },
    ],
    [kpi, periodLabel],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Dashboard fatture</h2>
          <p className="text-body-secondary mb-0">Fatturato, insoluti e clienti principali.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard fatture"
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
                <div className="fs-3 fw-semibold mt-2">{loading ? <CSpinner size="sm" /> : card.value}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        <CCol lg={7}>
          <CCard className="h-100">
            <CCardHeader>Ultime fatture</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Fattura</CTableHeaderCell>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => {
                          const numero = row.numero_documento ? `${row.anno}/${row.numero_documento}` : '-'
                          return (
                            <CTableRow key={row.id_fattura}>
                              <CTableDataCell>
                                {row.id_fattura ? (
                                  <Link
                                    to={`/fatture/dettagli?id=${row.id_fattura}`}
                                    className="text-decoration-none"
                                  >
                                    {numero}
                                  </Link>
                                ) : (
                                  numero
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderClientLink(row.cliente_ragione_sociale, row.id_anagrafica)}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">{formatCurrency(row.totale)}</CTableDataCell>
                              <CTableDataCell className="text-end">{formatCurrency(row.saldo)}</CTableDataCell>
                            </CTableRow>
                          )
                        })}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardHeader>Top clienti per fatturato ({periodLabel.toLowerCase()})</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : topClients.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Fatturato</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {topClients.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-rev`}>
                            <CTableDataCell>{renderClientLink(row.ragione_sociale, row.id_anagrafica)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(row.fatturato)}</CTableDataCell>
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

export default FattureDashboard



