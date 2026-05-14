import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCloudUpload, cilPrint, cilReload } from '@coreui/icons'
import { CSmartPagination } from '@coreui/react-pro'

import { useAuth } from '../../context/AuthContext'
import { buildFatturaPdfUrl, fetchFattureList, importFatturaXml } from '../../services/fatture'
import PermissionButton from '../../components/PermissionButton'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// Formatta data in locale italiano.
const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

// Formatta importi in EUR con fallback testuale.
const formatCurrency = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value === null || value === undefined || value === '' ? '-' : String(value)
  }
  return currencyFormatter.format(numeric)
}

const ROWS_PER_PAGE = 10
const FETCH_LIMIT = 0
const CREDIT_NOTE_TYPE_CODE = 'nota_credito'
const isCreditNoteRow = (row) => {
  const code = String(row?.tipo_code || '').toLowerCase().trim()
  if (code === CREDIT_NOTE_TYPE_CODE) {
    return true
  }
  const label = String(row?.tipo_label || '').toLowerCase()
  return label.includes('nota') && label.includes('credit')
}
const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.')
    const numeric = Number(normalized)
    return Number.isFinite(numeric) ? numeric : null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
const getSignedAmount = (row, value) => {
  const numeric = parseAmount(value)
  if (numeric === null) {
    return null
  }
  return isCreditNoteRow(row) ? -Math.abs(numeric) : numeric
}

const FattureList = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, logout } = useAuth()
  const isAcquisto = location.pathname.includes('/acquisti/')
  const basePath = isAcquisto ? '/acquisti/fatture' : '/fatture'
  const counterpartyLabel = isAcquisto ? 'Fornitore' : 'Cliente'
  const showStatus = !isAcquisto

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sezionaleFilter, setSezionaleFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [sortKey, setSortKey] = useState('data_fattura')
  const [sortOrder, setSortOrder] = useState('desc')
  const importInputRef = useRef(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importMessage, setImportMessage] = useState(null)
  const [importResults, setImportResults] = useState([])

  // Carica l'elenco fatture dal backend con filtri data e contesto acquisto/vendita.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items: data = [] } = await fetchFattureList({
          token,
          signal: controller.signal,
          limit: FETCH_LIMIT,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          is_acquisto: isAcquisto ? 1 : 0,
        })
        const normalized = Array.isArray(data) ? data : []
        setItems(normalized)
        setCurrentPage(0)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setItems([])
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout, refreshIndex, dateFrom, dateTo, isAcquisto])

  // Reset pagina quando cambiano i filtri principali.
  useEffect(() => {
    setCurrentPage(0)
  }, [search, yearFilter, statusFilter, sezionaleFilter, dateFrom, dateTo])

  const years = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.anno) values.add(row.anno)
    })
    return Array.from(values).sort((a, b) => b - a)
  }, [items])

  const statuses = useMemo(() => {
    const values = new Set()
    items.forEach((row) => {
      if (row.stato_label) values.add(row.stato_label)
    })
    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)))
  }, [items])

  const sezionali = useMemo(() => {
    const map = new Map()
    items.forEach((row) => {
      if (row.id_sezionale == null) {
        return
      }
      const key = String(row.id_sezionale)
      if (map.has(key)) {
        return
      }
      const parts = []
      if (row.sezionale_code) {
        parts.push(row.sezionale_code)
      }
      if (row.sezionale_label && row.sezionale_label !== row.sezionale_code) {
        parts.push(row.sezionale_label)
      }
      map.set(key, {
        id: key,
        label: parts.length > 0 ? parts.join(' - ') : `Sezionale ${key}`,
      })
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const sortRow = (a, b) => {
    const key = sortKey
    const valueA = (a[key] ?? '') ?? ''
    const valueB = (b[key] ?? '') ?? ''
    if (
      key === 'cliente_ragione_sociale' ||
      key === 'numero_documento' ||
      key === 'sezionale_label' ||
      key === 'stato_label' ||
      key === 'tipo_label'
    ) {
      const cmp = String(valueA).localeCompare(String(valueB))
      return cmp
    }
    if (['totale_imponibile', 'totale_iva', 'totale', 'saldo'].includes(key)) {
      const numA = getSignedAmount(a, valueA)
      const numB = getSignedAmount(b, valueB)
      return numA - numB
    }
    if (key === 'data_fattura') {
      const dateA = valueA ? new Date(valueA).getTime() : 0
      const dateB = valueB ? new Date(valueB).getTime() : 0
      return dateA - dateB
    }
    return 0
  }

  // Filtra lato client per testo, anno, stato e sezionale.
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((row) => {
      if (yearFilter !== 'all' && row.anno && String(row.anno) !== String(yearFilter)) {
        return false
      }
      if (showStatus && statusFilter !== 'all') {
        if ((row.stato_label || '-') !== statusFilter) {
          return false
        }
      }
      if (sezionaleFilter !== 'all') {
        if (row.id_sezionale == null || String(row.id_sezionale) !== sezionaleFilter) {
          return false
        }
      }
      if (term !== '') {
        const haystack = [
          row.cliente_ragione_sociale,
          row.numero_documento,
          row.tipo_label,
          row.anno,
          row.stato_label,
          row.note,
          row.sezionale_code,
          row.sezionale_label,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(' ')
        if (!haystack.includes(term)) {
          return false
        }
      }
      return true
    })
  }, [items, search, yearFilter, statusFilter, sezionaleFilter, showStatus])

  // Applica ordinamento lato client.
  const sortedItems = useMemo(() => {
    const copy = [...filteredItems]
    copy.sort((a, b) => {
      const delta = sortRow(a, b)
      return sortOrder === 'asc' ? delta : -delta
    })
    return copy
  }, [filteredItems, sortKey, sortOrder])

  const totalPages = Math.max(Math.ceil(sortedItems.length / ROWS_PER_PAGE), 1)
  const totalItems = sortedItems.length
  const totalsLeadingColSpan = isAcquisto ? 4 : 5
  const totals = useMemo(() => {
    return sortedItems.reduce(
      (acc, row) => {
        acc.imponibile += getSignedAmount(row, row.totale_imponibile) ?? 0
        acc.iva += getSignedAmount(row, row.totale_iva) ?? 0
        acc.totale += getSignedAmount(row, row.totale) ?? 0
        acc.saldo += getSignedAmount(row, row.saldo) ?? 0
        return acc
      },
      { imponibile: 0, iva: 0, totale: 0, saldo: 0 },
    )
  }, [sortedItems])
  const paginatedItems = useMemo(() => {
    const start = currentPage * ROWS_PER_PAGE
    return sortedItems.slice(start, start + ROWS_PER_PAGE)
  }, [sortedItems, currentPage])
  const startIndex = totalItems === 0 ? 0 : currentPage * ROWS_PER_PAGE + 1
  const endIndex = Math.min(totalItems, (currentPage + 1) * ROWS_PER_PAGE)

  // Mantiene pagina valida se il totale cambia.
  useEffect(() => {
    setCurrentPage(0)
  }, [search, yearFilter, statusFilter, sezionaleFilter, dateFrom, dateTo])

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(totalPages - 1, 0))
    }
  }, [currentPage, totalPages])

  // Gestisce ordinamento click sulle intestazioni tabella.
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      setCurrentPage(0)
      return
    }
    setSortKey(key)
    setSortOrder('desc')
    setCurrentPage(0)
  }

  const renderSortIndicator = (key) => {
    if (sortKey !== key) {
      return ''
    }
    return sortOrder === 'asc' ? ' ▲' : ' ▼'
  }

  const handleView = (id) => {
    if (!id) return
    navigate(`${basePath}/dettagli?id=${id}`)
  }

  // Apre PDF fattura in nuova scheda.
  const handlePrintPdf = (id) => {
    if (typeof window === 'undefined') return
    const url = buildFatturaPdfUrl(id)
    if (!url) return
    window.open(url, '_blank', 'noopener')
  }

  // Apre file picker per import XML.
  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  // Importa XML SdI e aggiorna la lista fatture.
  const handleImportChange = async (event) => {
    const fileList = event.target?.files
    if (!fileList || fileList.length === 0) {
      return
    }
    setImportMessage(null)
    setImportError(null)
    setImportResults([])
    setImportLoading(true)
    try {
      const result = await importFatturaXml({
        token,
        files: Array.from(fileList),
        is_acquisto: isAcquisto ? 1 : 0,
      })
      setImportResults(result?.results ?? [])
      setImportMessage('Importazione completata.')
      setRefreshIndex((v) => v + 1)
    } catch (err) {
      setImportError(err)
    } finally {
      setImportLoading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <h5 className="mb-0">{isAcquisto ? 'Fatture acquisto' : 'Fatture'}</h5>
            <small className="text-body-secondary">
              Elenco ultimi {items.length} documenti fattura con importi principali.
            </small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              color="secondary"
              variant="ghost"
              disabled={loading}
              onClick={() => setRefreshIndex((v) => v + 1)}
            >
              <CIcon icon={cilReload} className="me-2" />
              Aggiorna
            </CButton>
            <PermissionButton
              color="primary"
              permission="fatt.create"
              onClick={() => navigate(`${basePath}/crea`)}
              data-testid="create"
            >
              {isAcquisto ? 'Nuova fattura acquisto' : 'Nuova fattura'}
            </PermissionButton>
            <PermissionButton
              color="outline-primary"
              permission="fatt.create"
              onClick={handleImportClick}
              disabled={importLoading}
            >
              <CIcon icon={cilCloudUpload} className="me-2" />
              {importLoading ? 'Importazione...' : 'Importa XML SdI'}
            </PermissionButton>
            <input
              type="file"
              accept=".xml,.zip,.p7m"
              multiple
              ref={importInputRef}
              style={{ display: 'none' }}
              onChange={handleImportChange}
            />
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {importMessage && (
          <CAlert color="success" className="mb-3">
            {importMessage}
          </CAlert>
        )}
        {importError && (
          <CAlert color="danger" className="mb-3">
            {importError.message || 'Errore durante l\'importazione.'}
          </CAlert>
        )}
        {importResults.length > 0 && (
          <ul className="mb-3">
            {importResults.map((item, index) => (
              <li key={`${item.file ?? index}`} className="mb-2">
                <strong>{item.file || `File ${index + 1}`}</strong> —{' '}
                {item.ok
                  ? 'importata'
                  : 'errore: ' + (item.message || 'n/d')}
                {item.ok && (
                  <div className="text-body-secondary small">
                    Documento originale salvato nel log: {item.numero_documento ?? 'sconosciuto'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <CRow className="g-3 mb-4">
          <CCol xs={12} md={4}>
            <CFormInput
              placeholder={`Cerca per ${counterpartyLabel.toLowerCase()}, numero o note...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search"
            />
          </CCol>
          <CCol xs={6} md={2} lg={2}>
            <CFormSelect value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">Tutti gli anni</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {showStatus && (
            <CCol xs={6} md={3} lg={3}>
              <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tutti gli stati</option>
                {statuses.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          )}
          {!isAcquisto && (
            <CCol xs={6} md={3} lg={3}>
              <CFormSelect
                value={sezionaleFilter}
                onChange={(e) => setSezionaleFilter(e.target.value)}
                disabled={sezionali.length === 0}
              >
                <option value="all">Tutti i sezionali</option>
                {sezionali.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          )}
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel className="text-body-secondary small">Dal</CFormLabel>
            <CFormInput
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel className="text-body-secondary small">Al</CFormLabel>
            <CFormInput
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </CCol>
        </CRow>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare le fatture.'}</CAlert>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <CAlert color="warning">Nessuna fattura trovata.</CAlert>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <>
            <CTable hover responsive data-testid="table">
              <CTableHead className="mp-table-head">
                <CTableRow className="align-middle">
                  <CTableHeaderCell
                    className="cursor-pointer"
                    onClick={() => handleSort('numero_documento')}
                  >
                    Numero{renderSortIndicator('numero_documento')}
                  </CTableHeaderCell>
                  <CTableHeaderCell
                    className="cursor-pointer"
                    onClick={() => handleSort('tipo_label')}
                  >
                    Tipo{renderSortIndicator('tipo_label')}
                  </CTableHeaderCell>
                  {!isAcquisto && (
                    <CTableHeaderCell
                      className="cursor-pointer"
                      onClick={() => handleSort('sezionale_label')}
                    >
                      Sezionale{renderSortIndicator('sezionale_label')}
                    </CTableHeaderCell>
                  )}
                  <CTableHeaderCell
                    className="cursor-pointer"
                    onClick={() => handleSort('data_fattura')}
                  >
                    Data{renderSortIndicator('data_fattura')}
                  </CTableHeaderCell>
                  <CTableHeaderCell
                    className="cursor-pointer"
                    onClick={() => handleSort('cliente_ragione_sociale')}
                  >
                    {counterpartyLabel}
                    {renderSortIndicator('cliente_ragione_sociale')}
                  </CTableHeaderCell>
                  <CTableHeaderCell
                    className="text-end cursor-pointer"
                    onClick={() => handleSort('totale_imponibile')}
                  >
                    Imponibile{renderSortIndicator('totale_imponibile')}
                  </CTableHeaderCell>
                  <CTableHeaderCell
                    className="text-end cursor-pointer"
                    onClick={() => handleSort('totale_iva')}
                  >
                    IVA{renderSortIndicator('totale_iva')}
                  </CTableHeaderCell>
                  <CTableHeaderCell
                    className="text-end cursor-pointer"
                    onClick={() => handleSort('totale')}
                  >
                    Totale{renderSortIndicator('totale')}
                  </CTableHeaderCell>
                  {!isAcquisto && (
                    <CTableHeaderCell
                      className="text-end cursor-pointer"
                      onClick={() => handleSort('saldo')}
                    >
                      Saldo{renderSortIndicator('saldo')}
                    </CTableHeaderCell>
                  )}
                  {showStatus && (
                    <CTableHeaderCell
                      className="cursor-pointer"
                      onClick={() => handleSort('stato_label')}
                    >
                      Stato{renderSortIndicator('stato_label')}
                    </CTableHeaderCell>
                  )}
                  <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedItems.map((row) => (
                  <CTableRow key={row.id_fattura} data-testid={`row-${row.id_fattura}`}>
                    <CTableDataCell className="text-nowrap">
                      {row.anno ?? '-'}/{row.numero_documento ?? '-'}
                      {row.numero_documento_originale && (
                        <small className="text-body-secondary d-block">
                          Origine: {row.numero_documento_originale}
                        </small>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {row.tipo_label || row.tipo_code ? (
                        <div className="fw-semibold">
                          {row.tipo_label || row.tipo_code}
                        </div>
                      ) : (
                        <span className="text-body-secondary">-</span>
                      )}
                    </CTableDataCell>
                    {!isAcquisto && (
                      <CTableDataCell>
                        {row.id_sezionale || row.sezionale_code || row.sezionale_label ? (
                          <>
                            <div className="fw-semibold">{row.sezionale_code || row.sezionale_label || '-'}</div>
                            {row.sezionale_label && row.sezionale_code && row.sezionale_label !== row.sezionale_code && (
                              <small className="text-body-secondary">{row.sezionale_label}</small>
                            )}
                          </>
                        ) : (
                          <span className="text-body-secondary">-</span>
                        )}
                      </CTableDataCell>
                    )}
                    <CTableDataCell>{formatDate(row.data_fattura)}</CTableDataCell>
                    <CTableDataCell>{row.cliente_ragione_sociale || '-'}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(getSignedAmount(row, row.totale_imponibile))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(getSignedAmount(row, row.totale_iva))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(getSignedAmount(row, row.totale))}
                    </CTableDataCell>
                    {!isAcquisto && (
                      <CTableDataCell className="text-end">
                        {formatCurrency(getSignedAmount(row, row.saldo))}
                      </CTableDataCell>
                    )}
                    {showStatus && (
                      <CTableDataCell>
                        {row.stato_label ? (
                          <CBadge color="secondary">{row.stato_label}</CBadge>
                        ) : (
                          <span className="text-body-secondary">-</span>
                        )}
                      </CTableDataCell>
                    )}
                    <CTableDataCell className="text-center">
                      <div className="d-inline-flex gap-2 flex-wrap justify-content-center">
                        <PermissionButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handleView(row.id_fattura)}
                          title="Apri dettaglio"
                          permission="fatt.read"
                        >
                          <CIcon icon={cilArrowRight} />
                        </PermissionButton>
                        <PermissionButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handlePrintPdf(row.id_fattura)}
                          title="Stampa PDF"
                          permission="fatt.read"
                        >
                          <CIcon icon={cilPrint} />
                        </PermissionButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
              <CTableFoot>
                <CTableRow className="fw-semibold">
                  <CTableDataCell colSpan={totalsLeadingColSpan}>Totali</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(totals.imponibile)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{formatCurrency(totals.iva)}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatCurrency(totals.totale)}</CTableDataCell>
                  {!isAcquisto && (
                    <CTableDataCell className="text-end">{formatCurrency(totals.saldo)}</CTableDataCell>
                  )}
                  {showStatus && <CTableDataCell />}
                  <CTableDataCell />
                </CTableRow>
              </CTableFoot>
            </CTable>
            <div className="d-flex flex-column flex-lg-row gap-3 align-items-center justify-content-between mt-3">
              <div className="small text-body-secondary">
                {totalItems > 0
                  ? `Risultati ${startIndex}-${endIndex} di ${totalItems}`
                  : 'Nessun risultato disponibile'}
              </div>
              {totalPages > 1 && (
                <CSmartPagination
                  size="sm"
                  align="end"
                  pages={totalPages}
                  activePage={currentPage + 1}
                  onActivePageChange={(page) => setCurrentPage(Math.max(page - 1, 0))}
                />
              )}
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default FattureList


