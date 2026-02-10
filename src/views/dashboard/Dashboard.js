import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CWidgetStatsA,
} from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'

import { fetchDashboardSales, fetchNewClientsList } from '../../services/dashboard'

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

const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toLocaleString('it-IT')
}

const barOptions = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: { display: false },
  },
}

const formatBarSeries = ({ source, labelKey, valueKey, limit = 6, color }) => {
  if (!Array.isArray(source) || source.length === 0) {
    return null
  }
  const slice = source.slice(-limit)
  const labels = slice.map((item) => item[labelKey] ?? '')
  const values = slice.map((item) => Number(item[valueKey] ?? 0))
  if (labels.length === 0) {
    return null
  }
  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: color || 'rgba(15,98,254,0.35)',
        borderRadius: 4,
        maxBarThickness: 18,
      },
    ],
  }
}

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'yearly', label: 'Annuale' },
]
const NEW_CLIENTS_PAGE_SIZE = 5

const parsePeriodLabel = (label) => {
  const match = String(label || '').match(/^(\d{4})[-/](\d{1,2})/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return null
  }
  return { year, month }
}

const resolveGroupLabel = (label, period) => {
  const parsed = parsePeriodLabel(label)
  if (!parsed) {
    return { key: label, label: label }
  }
  const { year, month } = parsed
  if (period === 'quarterly') {
    const quarter = Math.floor((month - 1) / 3) + 1
    return { key: `${year}-Q${quarter}`, label: `${year} Q${quarter}` }
  }
  if (period === 'semiannual') {
    const semester = month <= 6 ? 1 : 2
    return { key: `${year}-S${semester}`, label: `${year} S${semester}` }
  }
  if (period === 'yearly') {
    return { key: `${year}`, label: `${year}` }
  }
  const paddedMonth = String(month).padStart(2, '0')
  return { key: `${year}-${paddedMonth}`, label: `${year}-${paddedMonth}` }
}

const aggregateNumericSeries = (source, labelKey, valueKey, period) => {
  if (!Array.isArray(source) || source.length === 0) {
    return []
  }
  const grouped = new Map()
  const order = []
  source.forEach((item) => {
    const label = item?.[labelKey]
    if (!label) {
      return
    }
    const group = resolveGroupLabel(label, period)
    if (!group.key) {
      return
    }
    if (!grouped.has(group.key)) {
      grouped.set(group.key, { label: group.label, value: 0 })
      order.push(group.key)
    }
    const value = Number(item?.[valueKey] ?? 0)
    if (!Number.isNaN(value)) {
      grouped.get(group.key).value += value
    }
  })
  return order.map((key) => grouped.get(key))
}

const aggregateConversionSeries = (source, period) => {
  if (!Array.isArray(source) || source.length === 0) {
    return []
  }
  const grouped = new Map()
  const order = []
  source.forEach((item) => {
    const label = item?.periodo
    if (!label) {
      return
    }
    const group = resolveGroupLabel(label, period)
    if (!group.key) {
      return
    }
    if (!grouped.has(group.key)) {
      grouped.set(group.key, {
        label: group.label,
        weight: 0,
        sumWeighted: 0,
        sumRate: 0,
        count: 0,
        total: 0,
        accepted: 0,
      })
      order.push(group.key)
    }
    const entry = grouped.get(group.key)
    const rate = Number(item?.tasso ?? 0)
    const total = Number(item?.totale ?? 0)
    const acceptedRaw = Number(item?.accettati ?? item?.accepted ?? NaN)
    const accepted =
      Number.isNaN(acceptedRaw)
        ? Number.isNaN(rate)
          ? 0
          : (total * rate) / 100
        : acceptedRaw

    if (!Number.isNaN(total)) {
      entry.total += total
    }
    if (!Number.isNaN(accepted)) {
      entry.accepted += accepted
    }
    if (!Number.isNaN(rate)) {
      if (!Number.isNaN(total) && total > 0) {
        entry.sumWeighted += rate * total
        entry.weight += total
      } else {
        entry.sumRate += rate
        entry.count += 1
      }
    }
  })
  return order.map((key) => {
    const entry = grouped.get(key)
    const value =
      entry.weight > 0
        ? entry.sumWeighted / entry.weight
        : entry.count > 0
        ? entry.sumRate / entry.count
        : 0
    return {
      label: entry.label,
      value,
      total: entry.total,
      accepted: entry.accepted,
    }
  })
}

const getSmartPaginationItems = (totalPages, currentPage, neighbors = 2) => {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return []
  }
  const pages = new Set()
  pages.add(0)
  pages.add(Math.max(totalPages - 1, 0))
  for (let offset = -neighbors; offset <= neighbors; offset += 1) {
    const candidate = currentPage + offset
    if (candidate >= 0 && candidate < totalPages) {
      pages.add(candidate)
    }
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result = []
  let last = -1
  sorted.forEach((page) => {
    if (last !== -1 && page - last > 1) {
      result.push({
        type: 'ellipsis',
        key: `ellipsis-${last}-${page}`,
      })
    }
    result.push({
      type: 'page',
      page,
      key: `page-${page}`,
    })
    last = page
  })
  return result
}

const getTrendFromSeries = (series, key) => {
  if (!Array.isArray(series) || series.length < 2) {
    return null
  }
  const last = Number(series[series.length - 1]?.[key])
  const prev = Number(series[series.length - 2]?.[key])
  if (Number.isNaN(last) || Number.isNaN(prev)) {
    return null
  }
  if (last > prev) {
    return { symbol: '↑', className: 'text-success' }
  }
  if (last < prev) {
    return { symbol: '↓', className: 'text-danger' }
  }
  return { symbol: '-', className: 'text-body-secondary' }
}

const Dashboard = () => {
  const [sales, setSales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clientSeries, setClientSeries] = useState([])
  const [revenueSeries, setRevenueSeries] = useState([])
  const [conversionSeries, setConversionSeries] = useState([])
  const [topClients, setTopClients] = useState({ conversion: [], revenue: [], balance: [] })
  const [newClients, setNewClients] = useState([])
  const [newClientsLoading, setNewClientsLoading] = useState(false)
  const [newClientsError, setNewClientsError] = useState(null)
  const [newClientsPage, setNewClientsPage] = useState(0)
  const [period, setPeriod] = useState('monthly')

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const loadDashboard = async () => {
      setLoading(true)
      try {
        const payload = await fetchDashboardSales({ signal: controller.signal, period })
        if (!isMounted) {
          return
        }
        setSales(payload.sales ?? null)
        setClientSeries(payload.series ?? [])
        setRevenueSeries(payload.fatture_series ?? [])
        setConversionSeries(payload.conversion_series ?? [])
        setTopClients(payload.top_clients ?? { conversion: [], revenue: [], balance: [] })
        setError(null)
      } catch (err) {
        if (!isMounted) {
          return
        }
        setError(err?.message || 'Errore durante il caricamento della dashboard')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [period])

  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const loadNewClients = async () => {
      setNewClientsLoading(true)
      setNewClientsError(null)
      try {
        const payload = await fetchNewClientsList({
          limit: 100,
          signal: controller.signal,
          period,
        })
        if (!isMounted) {
          return
        }
        setNewClients(payload.data ?? [])
      } catch (err) {
        if (!isMounted) {
          return
        }
        setNewClientsError(err?.message || 'Errore durante il caricamento dei nuovi clienti')
      } finally {
        if (isMounted) {
          setNewClientsLoading(false)
        }
      }
    }

    loadNewClients()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [period])

  const aggregatedRevenueSeries = useMemo(
    () => aggregateNumericSeries(revenueSeries, 'mese', 'totale', period),
    [revenueSeries, period],
  )
  const aggregatedClientsSeries = useMemo(
    () => aggregateNumericSeries(clientSeries, 'mese', 'tot', period),
    [clientSeries, period],
  )
  const aggregatedConversionSeries = useMemo(
    () => aggregateConversionSeries(conversionSeries, period),
    [conversionSeries, period],
  )

  const currentPeriodLabel =
    aggregatedRevenueSeries[aggregatedRevenueSeries.length - 1]?.label ||
    aggregatedClientsSeries[aggregatedClientsSeries.length - 1]?.label ||
    sales?.period ||
    '-'

  const currentRevenueValue =
    sales?.fatturato ?? (aggregatedRevenueSeries.length > 0
      ? aggregatedRevenueSeries[aggregatedRevenueSeries.length - 1].value
      : 0)
  const currentClientsValue =
    sales?.nuovi_clienti ?? (aggregatedClientsSeries.length > 0
      ? aggregatedClientsSeries[aggregatedClientsSeries.length - 1].value
      : 0)
  const currentConversionEntry = aggregatedConversionSeries[aggregatedConversionSeries.length - 1]
  const currentConversionRate = currentConversionEntry?.value ?? sales?.tasso_conversione ?? 0
  const totalPreventivi = currentConversionEntry?.total ?? sales?.preventivi_totali ?? 0
  const confirmedPreventivi = currentConversionEntry?.accepted ?? sales?.preventivi_confermati ?? 0

  const revenueChartData = useMemo(
    () =>
      formatBarSeries({
        source: aggregatedRevenueSeries,
        labelKey: 'label',
        valueKey: 'value',
        color: 'rgba(15,98,254,0.45)',
      }),
    [aggregatedRevenueSeries],
  )

  const clientsChartData = useMemo(
    () =>
      formatBarSeries({
        source: aggregatedClientsSeries,
        labelKey: 'label',
        valueKey: 'value',
        color: 'rgba(25,135,84,0.45)',
      }),
    [aggregatedClientsSeries],
  )

  const conversionChartData = useMemo(
    () =>
      formatBarSeries({
        source: aggregatedConversionSeries,
        labelKey: 'label',
        valueKey: 'value',
        color: 'rgba(247,103,7,0.45)',
      }),
    [aggregatedConversionSeries],
  )

  const revenueTrend = useMemo(
    () => getTrendFromSeries(aggregatedRevenueSeries, 'value'),
    [aggregatedRevenueSeries],
  )
  const clientsTrend = useMemo(
    () => getTrendFromSeries(aggregatedClientsSeries, 'value'),
    [aggregatedClientsSeries],
  )
  const conversionTrend = useMemo(
    () => getTrendFromSeries(aggregatedConversionSeries, 'value'),
    [aggregatedConversionSeries],
  )

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? 'Mensile',
    [period],
  )

  useEffect(() => {
    setNewClientsPage(0)
  }, [newClients.length])

  const newClientsPageCount = Math.max(1, Math.ceil(newClients.length / NEW_CLIENTS_PAGE_SIZE))
  const newClientsPageIndex = Math.min(newClientsPage, newClientsPageCount - 1)
  const newClientsPaged = useMemo(() => {
    const start = newClientsPageIndex * NEW_CLIENTS_PAGE_SIZE
    return newClients.slice(start, start + NEW_CLIENTS_PAGE_SIZE)
  }, [newClients, newClientsPageIndex])
  const newClientsPaginationItems = useMemo(
    () => getSmartPaginationItems(newClientsPageCount, newClientsPageIndex, 2),
    [newClientsPageCount, newClientsPageIndex],
  )

  const renderValueWithTrend = (value, trend) => (
    <span className="d-inline-flex align-items-center gap-2">
      <span>{value}</span>
      {trend ? <span className={trend.className}>{trend.symbol}</span> : null}
    </span>
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

  const renderTablePlaceholder = (text) => (
    <div className="text-center text-body-secondary small py-3">{text}</div>
  )

  const conversionRows = topClients?.conversion ?? []
  const revenueRows = topClients?.revenue ?? []
  const balanceRows = topClients?.balance ?? []

  return (
    <>
      {error && (
        <CAlert color="danger" className="text-small">
          <strong>Errore:</strong> {error}
        </CAlert>
      )}

      <CRow className="mb-4 align-items-end">
        <CCol>
          <h1 className="h4 mb-1">KPI Vendite</h1>
          <p className="text-body-secondary mb-0">
            Fatturato, nuovi clienti e tasso di conversione dei preventivi.
          </p>
        </CCol>
        <CCol xs="auto">
          <CFormSelect
            size="sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Selettore periodo KPI"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      <CRow className="g-4 mb-3 align-items-start">
        <CCol md={4}>
          <CWidgetStatsA
            className="mb-3"
            color="primary"
            title="Fatturato"
            value={
              loading
                ? <CSpinner size="sm" />
                : renderValueWithTrend(formatCurrency(currentRevenueValue), revenueTrend)
            }
            description={<div className="text-body-secondary small">Periodo: {currentPeriodLabel}</div>}
            chart={
              revenueChartData ? (
                <CChartBar data={revenueChartData} options={barOptions} style={{ height: '70px' }} />
              ) : null
            }
          />
          <CCard>
            <CCardHeader>
              Top 5 per fatturato
              <div className="text-body-secondary small">Periodo: {periodLabel}</div>
            </CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : revenueRows.length === 0
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
                        {revenueRows.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-rev`}>
                            <CTableDataCell>
                              {renderClientLink(row.ragione_sociale, row.id_anagrafica)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(row.fatturato)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CWidgetStatsA
            className="mb-3"
            color="success"
            title="Numero di nuovi clienti"
            value={
              loading
                ? <CSpinner size="sm" />
                : renderValueWithTrend(formatInteger(currentClientsValue), clientsTrend)
            }
            description={<div className="text-body-secondary small">Periodo: {currentPeriodLabel}</div>}
            chart={
              clientsChartData ? (
                <CChartBar data={clientsChartData} options={barOptions} style={{ height: '70px' }} />
              ) : null
            }
          />
          <CCard className="mb-3">
            <CCardHeader>
              Nuovi clienti
              <div className="text-body-secondary small">Periodo: {periodLabel}</div>
            </CCardHeader>
            <CCardBody>
              {newClientsLoading
                ? renderTablePlaceholder('Caricamento...')
                : newClientsError
                  ? renderTablePlaceholder(newClientsError)
                  : newClients.length === 0
                    ? renderTablePlaceholder('Nessun cliente registrato.')
                    : (
                      <>
                        <CTable data-testid="table" small hover responsive className="mb-0">
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell>Cliente</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Creato il</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {newClientsPaged.map((client, index) => (
                              <CTableRow key={`${client.id_anagrafica ?? index}-new`}>
                                <CTableDataCell>
                                  {renderClientLink(client.ragione_sociale, client.id_anagrafica)}
                                </CTableDataCell>
                                <CTableDataCell className="text-end">{client.created_at || '-'}</CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                        {newClients.length > NEW_CLIENTS_PAGE_SIZE && (
                          <CPagination size="sm" className="mt-2 mb-0">
                            <CPaginationItem
                              disabled={newClientsPageIndex === 0}
                              onClick={() => setNewClientsPage(Math.max(0, newClientsPageIndex - 1))}
                            >
                              ‹
                            </CPaginationItem>
                            {newClientsPaginationItems.map((item) =>
                              item.type === 'page' ? (
                                <CPaginationItem
                                  key={item.key}
                                  active={item.page === newClientsPageIndex}
                                  onClick={() => setNewClientsPage(item.page)}
                                >
                                  {item.page + 1}
                                </CPaginationItem>
                              ) : (
                                <CPaginationItem key={item.key} disabled className="pointer-events-none">
                                  ...
                                </CPaginationItem>
                              ),
                            )}
                            <CPaginationItem
                              disabled={newClientsPageIndex >= newClientsPageCount - 1}
                              onClick={() =>
                                setNewClientsPage(Math.min(newClientsPageCount - 1, newClientsPageIndex + 1))
                              }
                            >
                              ›
                            </CPaginationItem>
                          </CPagination>
                        )}
                      </>
                    )}
            </CCardBody>
          </CCard>
          <CCard className="mt-3">
            <CCardHeader>
              Top 5 per tasso di conversione
              <div className="text-body-secondary small">Periodo: {periodLabel}</div>
            </CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : conversionRows.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Tasso</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Preventivi</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {conversionRows.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-conv`}>
                            <CTableDataCell>
                              {renderClientLink(row.ragione_sociale, row.id_anagrafica)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{formatPercent(row.tasso)}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formatInteger(row.confermati)} / {formatInteger(row.totale)}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CWidgetStatsA
            className="mb-3"
            color="warning"
            title="Tasso di conversione"
            value={
              loading
                ? <CSpinner size="sm" />
                : renderValueWithTrend(formatPercent(currentConversionRate), conversionTrend)
            }
            description={
              <div className="text-body-secondary small">
                {loading
                  ? 'Calcolo in corso...'
                  : `${formatInteger(confirmedPreventivi)} accettati su ${formatInteger(
                      totalPreventivi,
                    )} preventivi`}
              </div>
            }
            chart={
              conversionChartData ? (
                <CChartBar data={conversionChartData} options={barOptions} style={{ height: '70px' }} />
              ) : null
            }
          />
          <CCard className="mt-3">
            <CCardHeader>
              Top 5 per saldo
              <div className="text-body-secondary small">Saldo residuo</div>
            </CCardHeader>
            <CCardBody>
              {loading
                ? renderTablePlaceholder('Caricamento...')
                : balanceRows.length === 0
                  ? renderTablePlaceholder('Nessun dato disponibile.')
                  : (
                    <CTable data-testid="table" small hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {balanceRows.map((row, index) => (
                          <CTableRow key={`${row.id_anagrafica ?? index}-bal`}>
                            <CTableDataCell>
                              {renderClientLink(row.ragione_sociale, row.id_anagrafica)}
                            </CTableDataCell>
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

export default Dashboard



