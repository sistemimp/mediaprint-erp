import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
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

import { fetchProdottiFatturazione } from '../../services/prodotti'
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

const isDefaultCombo = (comboKey) => {
  const ids = String(comboKey ?? '')
    .split('+')
    .map((val) => Number(val))
    .filter((val) => Number.isFinite(val) && val > 0)
  return ids.length === 0
}

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly', label: 'Annuale' },
]

const ProdottiFatturazione = () => {
  const { token } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('monthly')
  const [search, setSearch] = useState('')
  const [onlyBilled, setOnlyBilled] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProdottiFatturazione({ token, period, signal: controller.signal })
        if (!isMounted) return
        setPayload(data)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Errore durante il caricamento della fatturazione prodotti.')
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

  const items = payload?.items ?? []
  const kpi = payload?.kpi ?? {}

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (onlyBilled && !(Number(item?.fatturato) > 0)) {
        return false
      }
      if (!query) {
        return true
      }
      const name = String(item?.nome ?? '').toLowerCase()
      const code = String(item?.codice ?? '').toLowerCase()
      return name.includes(query) || code.includes(query)
    })
  }, [items, search, onlyBilled])

  const enrichedItems = useMemo(
    () =>
      filteredItems.map((row) => {
        const comboList = (Array.isArray(row.combinazioni) ? row.combinazioni : []).filter(
          (combo) => !isDefaultCombo(combo?.combo_key),
        )
        const comboCount = comboList.length
        const productLabel = row.nome || row.codice || `Prodotto #${row.id_prodotto}`
        const productCode = row.nome && row.codice ? ` - ${row.codice}` : ''
        return {
          row,
          comboList,
          comboCount,
          productLabel,
          productCode,
          hasCombos: comboCount > 0,
        }
      }),
    [filteredItems],
  )

  return (
    <>
      <CRow className="mb-4 align-items-end">
        <CCol>
          <h2 className="h4 mb-1">Fatturazione prodotti</h2>
          <p className="text-body-secondary mb-0">Statistiche di fatturazione per prodotto e combinazioni.</p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo fatturazione prodotti"
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

      <CCard className="mb-4">
        <CCardHeader>Filtri</CCardHeader>
        <CCardBody>
          <CRow className="g-3 align-items-center">
            <CCol md={6}>
              <CFormInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca prodotto per nome o codice"
                aria-label="Cerca prodotto"
              />
            </CCol>
            <CCol xs="auto">
              <CFormCheck
                id="only-billed-products"
                label="Mostra solo prodotti fatturati"
                checked={onlyBilled}
                onChange={(event) => setOnlyBilled(event.target.checked)}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>Riepilogo prodotti</CCardHeader>
        <CCardBody>
          {loading
            ? renderTablePlaceholder('Caricamento...')
            : filteredItems.length === 0
              ? renderTablePlaceholder('Nessun dato disponibile.')
              : (
                <CAccordion alwaysOpen>
                  {enrichedItems.map(({ row, comboList, comboCount, productLabel, productCode, hasCombos }) => (
                    <CAccordionItem itemKey={row.id_prodotto || productLabel} key={row.id_prodotto || productLabel}>
                      <CAccordionHeader>
                        <div className="d-flex flex-wrap align-items-center w-100 gap-2">
                          <div className="d-flex align-items-center gap-2">
                            {row.id_prodotto ? (
                              <Link to={`/prodotti/dettagli?id=${row.id_prodotto}`} className="text-decoration-none">
                                {productLabel}
                                {productCode}
                              </Link>
                            ) : (
                              `${productLabel}${productCode}`
                            )}
                            <CBadge color="info">{comboCount} comb.</CBadge>
                            <span className="text-body-secondary small">Categoria: {row.categoria || '-'}</span>
                          </div>
                          <div className="ms-auto d-flex flex-wrap gap-3 text-body-secondary small">
                            <span>Fatture: {formatInteger(row.fatture)}</span>
                            <span>Quantita: {formatInteger(row.quantita)}</span>
                            <span>Fatturato: {formatCurrency(row.fatturato)}</span>
                          </div>
                        </div>
                      </CAccordionHeader>
                      <CAccordionBody>
                        {hasCombos ? (
                          <CTable small responsive className="mb-0" data-testid="table">
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>Combinazione</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">Listino</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">Fatture</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">Quantita</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">Fatturato</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {comboList.map((combo, index) => {
                                const comboLabel = combo.combo_label || combo.combo_key || 'Combinazione'
                                const listinoValue = combo.prezzo_listino
                                const showListino =
                                  listinoValue !== null &&
                                  listinoValue !== undefined &&
                                  !Number.isNaN(Number(listinoValue))
                                return (
                                  <CTableRow
                                    key={`${row.id_prodotto}-${combo.combo_key || index}`}
                                    data-testid={`row-${row.id_prodotto}`}
                                  >
                                    <CTableDataCell>{comboLabel}</CTableDataCell>
                                    <CTableDataCell className="text-end">
                                      {showListino ? formatCurrency(listinoValue) : '-'}
                                    </CTableDataCell>
                                    <CTableDataCell className="text-end">{formatInteger(combo.fatture)}</CTableDataCell>
                                    <CTableDataCell className="text-end">{formatInteger(combo.quantita)}</CTableDataCell>
                                    <CTableDataCell className="text-end">{formatCurrency(combo.fatturato)}</CTableDataCell>
                                  </CTableRow>
                                )
                              })}
                            </CTableBody>
                          </CTable>
                        ) : (
                          <div className="text-body-secondary small">Nessuna combinazione.</div>
                        )}
                      </CAccordionBody>
                    </CAccordionItem>
                  ))}
                </CAccordion>
              )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default ProdottiFatturazione


