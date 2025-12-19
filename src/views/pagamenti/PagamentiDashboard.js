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

import { fetchPagamentiDashboard } from '../../services/pagamenti'
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

const PagamentiDashboard = () => {
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
        const data = await fetchPagamentiDashboard({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard pagamenti.')
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
      { key: 'pagamenti_mese', label: `Pagamenti ${periodLabel.toLowerCase()}`, value: formatInteger(kpi.pagamenti_mese) },
      { key: 'importo_mese', label: `Importo ${periodLabel.toLowerCase()}`, value: formatCurrency(kpi.importo_mese) },
      { key: 'pending_count', label: 'Pagamenti in sospeso', value: formatInteger(kpi.pending_count) },
      { key: 'pending_residuo', label: 'Residuo sospesi', value: formatCurrency(kpi.pending_residuo) },
    ],
    [kpi, periodLabel],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Dashboard pagamenti</h2>
          <p className="text-body-secondary mb-0">Monitoraggio incassi e sospesi.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard pagamenti"
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
            <CCardHeader>Ultimi movimenti</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell>Documento</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Tipo</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => {
                          const numero = row.anno ? `${row.anno}/${row.numero_documento}` : row.numero_documento || '-'
                          return (
                            <CTableRow key={`${row.source}-${row.id_pagamento}`}>
                              <CTableDataCell>{renderClientLink(row.cliente, row.id_anagrafica)}</CTableDataCell>
                              <CTableDataCell>
                                {row.source === 'assigned' && row.id_pagamento ? (
                                  <Link
                                    to={`/pagamenti/dettaglio?id=${row.id_pagamento}`}
                                    className="text-decoration-none"
                                  >
                                    {numero}
                                  </Link>
                                ) : (
                                  numero
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">{formatCurrency(row.importo)}</CTableDataCell>
                              <CTableDataCell className="text-end">
                                {row.source === 'pending' ? 'Sospeso' : 'Incasso'}
                              </CTableDataCell>
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
            <CCardHeader>Top clienti per saldo</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : topClients.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {topClients.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-bal`}>
                            <CTableDataCell>{renderClientLink(row.ragione_sociale, row.id_anagrafica)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(row.saldo_residuo)}</CTableDataCell>
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

export default PagamentiDashboard
