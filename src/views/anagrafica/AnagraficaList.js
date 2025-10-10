import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilPlus, cilReload, cilSearch } from '@coreui/icons'

import {
  fetchAnagrafiche,
  fetchAnagraficheArchiviate,
  reactivateAnagrafica,
} from '../../services/anagrafiche'
import { useAuth } from '../../context/AuthContext'

const DEFAULT_FETCH_PAGE_SIZE = 100
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50]

const columns = [
  { key: 'id_anagrafica', label: 'ID', sortable: true },
  { key: 'ragione_sociale', label: 'Ragione sociale', sortable: true },
  { key: 'piva', label: 'P. IVA', sortable: true },
  { key: 'indirizzo', label: 'Indirizzo', sortable: true },
  { key: 'cap', label: 'Cap', sortable: true },
  { key: 'citta', label: 'Comune', sortable: true },
  { key: 'provincia', label: 'Provincia', sortable: true },
  { key: 'stato', label: 'Stato', sortable: true },
]

const formatIndirizzo = (anagrafica) => {
  if (!anagrafica || typeof anagrafica !== 'object') return '-'
  const addr = [anagrafica.indirizzo].filter(Boolean).join(' ')
  const loc = [anagrafica.cap, anagrafica.citta, anagrafica.provincia].filter(Boolean).join(' ')
  const parts = []
  if (addr) parts.push(addr)
  if (loc) parts.push(loc)
  return parts.length > 0 ? parts.join(', ') : '-'
}

const renderCell = (anagrafica, column) => {
  if (column.key === 'id_anagrafica') {
    return anagrafica.id_anagrafica ?? anagrafica.id ?? '-'
  }

  if (column.key === 'stato') {
    const value = anagrafica[column.key]
    if (!value) {
      return '-'
    }

    const normalized = String(value).toLowerCase()
    const badgeColor =
      normalized === 'attiva' ? 'success' : normalized === 'disattiva' ? 'secondary' : 'primary'

    return (
      <CBadge color={badgeColor} className="text-uppercase">
        {normalized}
      </CBadge>
    )
  }

  const value = anagrafica[column.key]
  if (!value) {
    return '-'
  }

  return value
}

const getAnagraficaIdValue = (anagrafica) => {
  const rawId = anagrafica?.id_anagrafica ?? anagrafica?.id

  if (rawId === undefined || rawId === null) {
    return {
      hasId: false,
      numeric: Number.MAX_SAFE_INTEGER,
      text: '',
    }
  }

  const numeric = Number(rawId)
  if (Number.isFinite(numeric)) {
    return {
      hasId: true,
      numeric,
      text: '',
    }
  }

  return {
    hasId: true,
    numeric: Number.MAX_SAFE_INTEGER,
    text: String(rawId).toLowerCase(),
  }
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

const getSortableValue = (anagrafica, key) => {
  if (key === 'indirizzo') {
    const formatted = formatIndirizzo(anagrafica)
    return formatted === '-' ? '' : formatted
  }

  const value = anagrafica?.[key]
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
}

const compareByColumn = (a, b, key) => {
  if (key === 'id_anagrafica') {
    const valueA = getAnagraficaIdValue(a)
    const valueB = getAnagraficaIdValue(b)

    if (valueA.hasId && !valueB.hasId) {
      return -1
    }
    if (!valueA.hasId && valueB.hasId) {
      return 1
    }

    if (valueA.numeric !== valueB.numeric) {
      return valueA.numeric - valueB.numeric
    }

    return valueA.text.localeCompare(valueB.text)
  }

  const valueA = getSortableValue(a, key).trim()
  const valueB = getSortableValue(b, key).trim()

  if (!valueA && valueB) {
    return 1
  }
  if (valueA && !valueB) {
    return -1
  }

  return collator.compare(valueA, valueB)
}

const getPageItems = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = new Set([1, total, current])
  for (let offset = 1; offset <= 2; offset += 1) {
    const prev = current - offset
    const next = current + offset
    if (prev > 1) {
      pages.add(prev)
    }
    if (next < total) {
      pages.add(next)
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result = []

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]
    const prevPage = sorted[index - 1]

    if (index > 0 && page - prevPage > 1) {
      result.push('ellipsis')
    }

    result.push(page)
  }

  return result
}

const AnagraficaList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [anagrafiche, setAnagrafiche] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[1])
  const [sortKey, setSortKey] = useState('id_anagrafica')
  const [sortDirection, setSortDirection] = useState('asc')
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [groupBy, setGroupBy] = useState('none') // none | comune | provincia
  const [exporting, setExporting] = useState(false)
  const [viewMode, setViewMode] = useState('attive') // attive | archiviate

  useEffect(() => {
    if (!token) {
      return
    }

    const controller = new AbortController()

    const loadAnagrafiche = async () => {
      setLoading(true)
      setError(null)

      try {
        const fetcher = viewMode === 'archiviate' ? fetchAnagraficheArchiviate : fetchAnagrafiche
        const { items: firstItems = [], meta } = await fetcher({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: DEFAULT_FETCH_PAGE_SIZE,
        })

        let allItems = Array.isArray(firstItems) ? [...firstItems] : []
        const totalPages = Math.max(meta?.last_page ?? 1, 1)
        const fallbackPerPage =
          Array.isArray(firstItems) && firstItems.length > 0
            ? firstItems.length
            : DEFAULT_FETCH_PAGE_SIZE
        const perPage = meta?.per_page ?? fallbackPerPage

        if (totalPages > 1) {
          for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
            if (controller.signal.aborted) return
            const { items: pageItems = [] } = await fetcher({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
            })
            if (Array.isArray(pageItems) && pageItems.length > 0) {
              allItems = allItems.concat(pageItems)
            }
          }
        } else {
          // Fallback robusto: se meta non indica più pagine ma sembra esserci ancora paginazione,
          // continua a richiamare finché arrivano risultati (< perPage) o max 100 pagine
          let nextPage = 2
          let safety = 0
          // Se la prima pagina è piena, prova a continuare
          while (firstItems.length === perPage && safety < 100) {
            if (controller.signal.aborted) break
            const { items: pageItems = [] } = await fetcher({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
            })
            if (!Array.isArray(pageItems) || pageItems.length === 0) break
            allItems = allItems.concat(pageItems)
            nextPage += 1
            safety += 1
            if (pageItems.length < perPage) break
          }
        }

        setAnagrafiche(allItems)
        setPage(0)
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return
        }

        if (fetchError.status === 401 && logout) {
          logout()
          return
        }

        setError(fetchError)
        setAnagrafiche([])
      } finally {
        setLoading(false)
      }
    }

    loadAnagrafiche()

    return () => {
      controller.abort()
    }
  }, [token, logout, refreshIndex, viewMode])

  const filteredAnagrafiche = useMemo(() => {
    const term = search.trim().toLowerCase()

    const matches = anagrafiche.filter((anagrafica) => {
      if (!term) {
        return true
      }

      const indirizzo = formatIndirizzo(anagrafica)
      const searchableFields = [
        anagrafica.id_anagrafica,
        anagrafica.id,
        anagrafica.ragione_sociale,
        anagrafica.piva,
        anagrafica.cap,
        anagrafica.citta,
        anagrafica.provincia,
        anagrafica.stato,
        indirizzo !== '-' ? indirizzo : '',
      ]

      return searchableFields.some((field) => {
        if (field === undefined || field === null) {
          return false
        }

        return String(field).toLowerCase().includes(term)
      })
    })

    const sortedMatches = [...matches].sort((a, b) => {
      const comparison = compareByColumn(a, b, sortKey)
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sortedMatches
  }, [anagrafiche, search, sortKey, sortDirection])

  const totalFiltered = filteredAnagrafiche.length

  useEffect(() => {
    setPage((currentPage) => {
      const maxPageIndex = Math.max(0, Math.ceil(totalFiltered / rowsPerPage) - 1)
      return currentPage > maxPageIndex ? maxPageIndex : currentPage
    })
  }, [totalFiltered, rowsPerPage])

  // Raggruppamento
  const groupedFlat = useMemo(() => {
    if (groupBy === 'none') return filteredAnagrafiche.map((d) => ({ type: 'item', data: d }))
    const groups = []
    const index = new Map()
    const getKey = (row) => {
      if (groupBy === 'comune') return String(row.citta || '-').trim() || '-'
      if (groupBy === 'provincia') return String(row.provincia || '-').trim() || '-'
      return '-'
    }
    for (const row of filteredAnagrafiche) {
      const key = getKey(row)
      let g = index.get(key)
      if (!g) {
        g = { label: key, rows: [] }
        index.set(key, g)
        groups.push(g)
      }
      g.rows.push({ type: 'item', data: row })
    }
    const flat = []
    for (const g of groups) {
      flat.push({ type: 'group', label: g.label, count: g.rows.length })
      flat.push(...g.rows)
    }
    return flat
  }, [filteredAnagrafiche, groupBy])

  const pageItems = useMemo(() => {
    if (rowsPerPage === 0) return groupedFlat
    const start = page * rowsPerPage
    return groupedFlat.slice(start, start + rowsPerPage)
  }, [groupedFlat, page, rowsPerPage])

  const totalFlat = groupedFlat.length
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(totalFlat / rowsPerPage) || 1)
  const paginationItems = useMemo(() => getPageItems(page + 1, totalPages), [page, totalPages])
  // Calcolo range visualizzato considerando solo righe item
  const itemsBefore = useMemo(
    () => groupedFlat.slice(0, page * rowsPerPage).filter((x) => x.type === 'item').length,
    [groupedFlat, page, rowsPerPage],
  )
  const visibleItems = pageItems.filter((x) => x.type === 'item').length
  const pageFrom = totalFiltered === 0 ? 0 : visibleItems > 0 ? itemsBefore + 1 : 0
  const pageTo = totalFiltered === 0 ? 0 : itemsBefore + visibleItems

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setPage(0)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
  }

  const handleRowsPerPageChange = (event) => {
    const val = event.target.value
    if (val === 'all') {
      setRowsPerPage(0)
      setPage(0)
    } else {
      setRowsPerPage(Number(val))
      setPage(0)
    }
  }

  const handleSort = (columnKey) => {
    if (sortKey === columnKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(columnKey)
      setSortDirection('asc')
    }

    setPage(0)
  }

  const getExportValue = (row, key) => {
    if (key === 'id_anagrafica') return row.id_anagrafica ?? row.id ?? ''
    if (key === 'stato') return row.stato ?? ''
    if (key === 'indirizzo') return row.indirizzo ?? ''
    return row?.[key] ?? ''
  }

  const toCSV = (rows, cols, delimiter = ';') => {
    const escape = (val) => {
      const s = String(val ?? '')
      if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }
    const header = cols.map((c) => escape(c.label)).join(delimiter)
    const body = rows
      .map((r) => cols.map((c) => escape(getExportValue(r, c.key))).join(delimiter))
      .join('\n')
    return header + '\n' + body
  }

  const downloadBlob = (content, mime, filename) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = (type) => {
    if (filteredAnagrafiche.length === 0) return
    if (type === 'csv') {
      const csv = toCSV(filteredAnagrafiche, columns)
      downloadBlob(csv, 'text/csv;charset=utf-8;', 'anagrafiche.csv')
      return
    }
    if (type === 'excel') {
      const csv = toCSV(filteredAnagrafiche, columns, '\t')
      downloadBlob(csv, 'application/vnd.ms-excel;charset=utf-8;', 'anagrafiche.xls')
      return
    }
    if (type === 'pdf') {
      const htmlRows = filteredAnagrafiche
        .map(
          (r) =>
            '<tr>' +
            columns
              .map(
                (c) =>
                  `<td style="padding:4px 8px;border:1px solid #ddd;">${String(getExportValue(r, c.key) ?? '')}</td>`,
              )
              .join('') +
            '</tr>',
        )
        .join('')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Anagrafiche</title>
        <style>table{border-collapse:collapse;width:100%;font:12px Arial;} th{background:#f0f0f0;border:1px solid #ddd;padding:6px 8px;text-align:left;} td{border:1px solid #ddd;padding:4px 8px;}</style>
        </head><body>
        <h3>Anagrafiche</h3>
        <table><thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table>
        <script>window.onload=()=>{window.print();}</script>
        </body></html>`
      const win = window.open('', '_blank')
      if (win) {
        win.document.open()
        win.document.write(html)
        win.document.close()
        win.focus()
      }
    }
  }

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
  }

  const handleRefresh = () => {
    setRefreshIndex((value) => value + 1)
  }

  const handleViewDetails = (anagrafica) => {
    const recordId = anagrafica.id_anagrafica ?? anagrafica.id
    if (!recordId) {
      return
    }

    navigate(`/anagrafica/dettagli?id=${recordId}`, { state: { id: recordId } })
  }

  const handleRestore = async (anagrafica) => {
    const recordId = anagrafica.id_anagrafica ?? anagrafica.id
    if (!recordId || !token) return
    const confirmed = window.confirm(`Confermi il ripristino dell'anagrafica ${recordId}?`)
    if (!confirmed) return
    try {
      await reactivateAnagrafica({ token, id: recordId })
      // Torna su elenco attive e aggiorna
      setViewMode('attive')
      setRefreshIndex((v) => v + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      alert(err?.payload?.message || err?.message || 'Ripristino non riuscito')
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
        <div>
          <h2 className="h5 mb-1">Anagrafiche {viewMode === 'archiviate' ? '(archiviate)' : ''}</h2>
          <p className="text-body-secondary mb-0">
            Visualizza, cerca e consulta i dettagli delle anagrafiche {viewMode === 'archiviate' ? 'archiviate' : 'attive'} nel sistema.
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
          <div className="btn-group" role="group" aria-label="Seleziona elenco">
            <CButton
              color={viewMode === 'attive' ? 'primary' : 'secondary'}
              variant={viewMode === 'attive' ? 'solid' : 'outline'}
              onClick={() => setViewMode('attive')}
              disabled={loading || viewMode === 'attive'}
            >
              Attive
            </CButton>
            <CButton
              color={viewMode === 'archiviate' ? 'primary' : 'secondary'}
              variant={viewMode === 'archiviate' ? 'solid' : 'outline'}
              onClick={() => setViewMode('archiviate')}
              disabled={loading || viewMode === 'archiviate'}
            >
              Archiviate
            </CButton>
          </div>
          <CButton color="primary" component={Link} to="/anagrafica/crea" disabled={loading}>
            <CIcon icon={cilPlus} className="me-2" /> Nuova anagrafica
          </CButton>
          <CButton color="secondary" variant="outline" onClick={handleRefresh} disabled={loading}>
            <CIcon icon={cilReload} className="me-2" /> Aggiorna
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleSearchSubmit} className="mb-4">
          <CRow className="g-2 align-items-center">
            <CCol xs={12} md={6} lg={5}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  type="search"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Cerca in tutte le colonne"
                  disabled={loading}
                />
              </CInputGroup>
            </CCol>
          </CRow>
        </CForm>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">
            {error.message || 'Impossibile caricare i dati delle anagrafiche.'}
          </CAlert>
        )}

        {!loading && !error && anagrafiche.length === 0 && (
          <CAlert color="warning">Nessuna anagrafica disponibile.</CAlert>
        )}

        {!loading && !error && anagrafiche.length > 0 && filteredAnagrafiche.length === 0 && (
          <CAlert color="warning">Nessuna anagrafica corrisponde ai criteri di ricerca.</CAlert>
        )}

        {!loading && !error && filteredAnagrafiche.length > 0 && (
          <>
            <div className="d-flex justify-content-end mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary">Raggruppa per</span>
                <CFormSelect
                  size="sm"
                  value={groupBy}
                  onChange={(e) => {
                    setGroupBy(e.target.value)
                    setPage(0)
                  }}
                  style={{ width: 180 }}
                >
                  <option value="none">Nessuno</option>
                  <option value="comune">Comune</option>
                  <option value="provincia">Provincia</option>
                </CFormSelect>
              </div>
            </div>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary">Raggruppa per</span>
                <CFormSelect
                  size="sm"
                  value={groupBy}
                  onChange={(e) => {
                    setGroupBy(e.target.value)
                    setPage(0)
                  }}
                  style={{ width: 180 }}
                >
                  <option value="none">Nessuno</option>
                  <option value="comune">Comune</option>
                  <option value="provincia">Provincia</option>
                </CFormSelect>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary">Esporta</span>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={exporting || filteredAnagrafiche.length === 0}
                  onClick={() => handleExport('csv')}
                >
                  CSV
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={exporting || filteredAnagrafiche.length === 0}
                  onClick={() => handleExport('excel')}
                >
                  Excel
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={filteredAnagrafiche.length === 0}
                  onClick={() => handleExport('pdf')}
                >
                  PDF
                </CButton>
              </div>
            </div>
            <CTable hover responsive>
              <CTableHead color="light">
                <CTableRow className="align-middle">
                  {columns.map((column) => {
                    const isSorted = sortKey === column.key
                    const directionIcon = sortDirection === 'asc' ? cilArrowTop : cilArrowBottom

                    return (
                      <CTableHeaderCell
                        scope="col"
                        key={column.key}
                        className="align-middle text-nowrap"
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm px-0 text-reset text-decoration-none fw-semibold d-inline-flex align-items-center gap-2"
                            onClick={() => handleSort(column.key)}
                          >
                            <span>{column.label}</span>
                            <span
                              className="d-inline-flex align-items-center"
                              style={{
                                color: isSorted ? 'var(--bs-primary)' : 'var(--bs-tertiary-color)',
                                opacity: isSorted ? 1 : 0.65,
                              }}
                              aria-hidden="true"
                            >
                              <CIcon icon={directionIcon} size="sm" />
                            </span>
                          </button>
                        ) : (
                          <span className="fw-semibold text-body-secondary">{column.label}</span>
                        )}
                      </CTableHeaderCell>
                    )
                  })}
                  <CTableHeaderCell
                    scope="col"
                    className="align-middle text-center text-body-secondary fw-semibold"
                  >
                    Azioni
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {pageItems.map((row, index) => {
                  if (row.type === 'group') {
                    return (
                      <CTableRow key={`g-${index}`} className="table-secondary">
                        <CTableDataCell colSpan={columns.length + 1} className="fw-semibold">
                          {row.label} — {row.count} elementi
                        </CTableDataCell>
                      </CTableRow>
                    )
                  }
                  const anagrafica = row.data
                  const rowKey = anagrafica.id_anagrafica ?? anagrafica.id ?? index
                  return (
                    <CTableRow key={rowKey}>
                      {columns.map((column) => (
                        <CTableDataCell key={column.key}>
                          {renderCell(anagrafica, column)}
                        </CTableDataCell>
                      ))}
                      <CTableDataCell className="text-center">
                        {viewMode === 'archiviate' ? (
                          <CButton
                            color="primary"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(anagrafica)}
                            disabled={loading}
                          >
                            Ripristina
                          </CButton>
                        ) : (
                          <CButton
                            color="link"
                            size="sm"
                            className="p-0"
                            onClick={() => handleViewDetails(anagrafica)}
                          >
                            <CIcon icon={cilSearch} />
                          </CButton>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
              <div className="text-body-secondary">
                {`Mostrando ${pageFrom} - ${pageTo} di ${totalFiltered} risultati`}
              </div>
              <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-body-secondary">Esporta</span>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={filteredAnagrafiche.length === 0}
                    onClick={() => handleExport('csv')}
                  >
                    CSV
                  </CButton>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={filteredAnagrafiche.length === 0}
                    onClick={() => handleExport('excel')}
                  >
                    Excel
                  </CButton>
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    disabled={filteredAnagrafiche.length === 0}
                    onClick={() => handleExport('pdf')}
                  >
                    PDF
                  </CButton>
                </div>
                <CInputGroup size="sm" style={{ width: 'auto' }}>
                  <CInputGroupText>Righe per pagina</CInputGroupText>
                  <CFormSelect
                    value={rowsPerPage === 0 ? 'all' : String(rowsPerPage)}
                    onChange={handleRowsPerPageChange}
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                    <option value="all">Tutti</option>
                  </CFormSelect>
                </CInputGroup>
                <CPagination className="mb-0" size="sm">
                  <CPaginationItem
                    aria-label="Pagina precedente"
                    disabled={page <= 0 || rowsPerPage === 0}
                    onClick={() => {
                      if (page > 0) {
                        handlePageChange(page - 1)
                      }
                    }}
                  >
                    &laquo;
                  </CPaginationItem>
                  {rowsPerPage !== 0 && paginationItems.map((item, index) =>
                    item === 'ellipsis' ? (
                      <CPaginationItem key={`ellipsis-${index}`} disabled>
                        &hellip;
                      </CPaginationItem>
                    ) : (
                      <CPaginationItem
                        key={item}
                        active={item === page + 1}
                        onClick={() => handlePageChange(item - 1)}
                      >
                        {item}
                      </CPaginationItem>
                    ),
                  )}
                  <CPaginationItem
                    aria-label="Pagina successiva"
                    disabled={rowsPerPage === 0 || page >= totalPages - 1 || totalFiltered === 0}
                    onClick={() => {
                      if (page < totalPages - 1) {
                        handlePageChange(page + 1)
                      }
                    }}
                  >
                    &raquo;
                  </CPaginationItem>
                </CPagination>
              </div>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AnagraficaList
