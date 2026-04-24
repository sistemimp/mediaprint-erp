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

import { fetchProdottiDashboard } from '../../services/prodotti'
import { useAuth } from '../../context/AuthContext'
import ProdottiFatturazione from './ProdottiFatturazione'

// Formatta interi con separatori locali.
const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toLocaleString('it-IT')
}

// Placeholder comune per stati loading/empty delle tabelle.
const renderTablePlaceholder = (text) => (
  <div className="text-center text-body-secondary small py-3">{text}</div>
)

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly', label: 'Annuale' },
]

// Dashboard KPI prodotti + riepiloghi categorie/ultimi inserimenti.
const ProdottiDashboard = () => {
  const { token } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('monthly')

  // Carica payload dashboard in base al periodo selezionato.
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProdottiDashboard({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della dashboard prodotti.')
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
  const topCategorie = payload?.top_categorie ?? []
  const latest = payload?.latest ?? []

  // Prepara elenco card KPI visualizzate in testata.
  const summaryCards = useMemo(
    () => [
      { key: 'totale_prodotti', label: 'Totale prodotti', value: kpi.totale_prodotti },
      { key: 'prodotti_attivi', label: 'Prodotti attivi', value: kpi.prodotti_attivi },
      { key: 'prodotti_disattivi', label: 'Prodotti disattivi', value: kpi.prodotti_disattivi },
      { key: 'categorie', label: 'Categorie', value: kpi.categorie },
      { key: 'variazioni', label: 'Variazioni', value: kpi.variazioni },
      { key: 'prezzi_combinati', label: 'Prezzi combinati', value: kpi.prezzi_combinati },
    ],
    [kpi],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Dashboard prodotti</h2>
          <p className="text-body-secondary mb-0">Sintesi catalogo, categorie e variazioni.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo dashboard prodotti"
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
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Top categorie per numero prodotti</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : topCategorie.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Categoria</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {topCategorie.map((row) => (
                          <CTableRow key={row.id_categoria}>
                            <CTableDataCell>{row.nome || '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatInteger(row.totale)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Ultimi prodotti</CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : latest.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Prodotto</CTableHeaderCell>
                          <CTableHeaderCell>Categoria</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Stato</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {latest.map((row) => (
                          <CTableRow key={row.id_prodotto}>
                            <CTableDataCell>
                              {row.id_prodotto ? (
                                <Link to={`/prodotti/dettagli?id=${row.id_prodotto}`} className="text-decoration-none">
                                  {row.nome || row.codice || `Prodotto #${row.id_prodotto}`}
                                </Link>
                              ) : (
                                row.nome || row.codice || '-'
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{row.categoria || '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              {row.attivo === 1 ? 'Attivo' : 'Disattivo'}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      <div className="mt-5">
        <ProdottiFatturazione />
      </div>
    </>
  )
}

export default ProdottiDashboard



