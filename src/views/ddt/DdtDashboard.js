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

import { fetchDdtDashboard } from '../../services/ddt'
import { useAuth } from '../../context/AuthContext'

const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toLocaleString('it-IT')
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

const DdtDashboard = () => {
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
        const data = await fetchDdtDashboard({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard DDT.')
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
  const topCausali = payload?.top_causali ?? []
  const latest = payload?.latest ?? []

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Mensile',
    [period],
  )

  const summaryCards = useMemo(
    () => [
      { key: 'totale', label: 'Totale DDT', value: kpi.totale },
      { key: 'totale_mese', label: `DDT ${periodLabel.toLowerCase()}`, value: kpi.totale_mese },
      { key: 'bozze', label: 'DDT bozza', value: kpi.bozze },
      { key: 'emessi', label: 'DDT emessi', value: kpi.emessi },
      { key: 'pezzi_mese', label: `Totale pezzi (${periodLabel.toLowerCase()})`, value: kpi.pezzi_mese },
    ],
    [kpi, periodLabel],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Dashboard DDT</h2>
          <p className="text-body-secondary mb-0">Riepilogo documenti di trasporto e causali.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard DDT"
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
          <CCol key={card.key} sm={6} lg={4} className="mb-3">
            <CCard className="h-100 border-0 shadow-sm">
              <CCardBody>
                <div className="text-body-secondary text-uppercase small fw-semibold">{card.label}</div>
                <div className="fs-3 fw-semibold mt-2">
                  {loading ? <CSpinner size="sm" /> : formatInteger(card.value)}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardHeader>Top causali ({periodLabel.toLowerCase()})</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : topCausali.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Causale</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {topCausali.map((row) => (
                          <CTableRow key={row.id_causale}>
                            <CTableDataCell>{row.label || '-'}</CTableDataCell>
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
            <CCardHeader>Ultimi DDT</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>DDT</CTableHeaderCell>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Stato</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => {
                          const numero = row.numero_documento ? `${row.anno}/${row.numero_documento}` : '-'
                          return (
                            <CTableRow key={row.id_ddt}>
                              <CTableDataCell>
                                {row.id_ddt ? (
                                  <Link to={`/ddt/dettagli?id=${row.id_ddt}`} className="text-decoration-none">
                                    {numero}
                                  </Link>
                                ) : (
                                  numero
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderClientLink(row.cliente_ragione_sociale, row.id_anagrafica)}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                {row.stato_documento === 2 ? 'Emesso' : 'Bozza'}
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
      </CRow>
    </>
  )
}

export default DdtDashboard
