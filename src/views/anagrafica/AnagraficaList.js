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

import { fetchAnagrafiche } from '../../services/anagrafiche'
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

  useEffect(() => {
    if (!token) {
      return
    }

    const controller = new AbortController()

    const loadAnagrafiche = async () => {
      setLoading(true)
      setError(null)

      try {
        const { items: firstItems = [], meta } = await fetchAnagrafiche({
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

        for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
          if (controller.signal.aborted) {
            return
          }

          const { items: pageItems = [] } = await fetchAnagrafiche({
            token,
            signal: controller.signal,
            page: nextPage,
            pageSize: perPage,
          })

          if (Array.isArray(pageItems) && pageItems.length > 0) {
            allItems = allItems.concat(pageItems)
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
  }, [token, logout, refreshIndex])

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

  const paginatedAnagrafiche = useMemo(() => {
    const start = page * rowsPerPage
    return filteredAnagrafiche.slice(start, start + rowsPerPage)
  }, [filteredAnagrafiche, page, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage) || 1)
  const paginationItems = useMemo(() => getPageItems(page + 1, totalPages), [page, totalPages])
  const pageFrom = totalFiltered === 0 ? 0 : page * rowsPerPage + 1
  const pageTo = totalFiltered === 0 ? 0 : page * rowsPerPage + paginatedAnagrafiche.length

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setPage(0)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
  }

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value))
    setPage(0)
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

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
        <div>
          <h2 className="h5 mb-1">Anagrafiche</h2>
          <p className="text-body-secondary mb-0">
            Visualizza, cerca e consulta i dettagli delle anagrafiche registrate nel sistema.
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
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
                {paginatedAnagrafiche.map((anagrafica, index) => {
                  const rowKey = anagrafica.id_anagrafica ?? anagrafica.id ?? index

                  return (
                    <CTableRow key={rowKey}>
                      {columns.map((column) => (
                        <CTableDataCell key={column.key}>
                          {renderCell(anagrafica, column)}
                        </CTableDataCell>
                      ))}
                      <CTableDataCell className="text-center">
                        <CButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handleViewDetails(anagrafica)}
                        >
                          <CIcon icon={cilSearch} />
                        </CButton>
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
                <CInputGroup size="sm" style={{ width: 'auto' }}>
                  <CInputGroupText>Righe per pagina</CInputGroupText>
                  <CFormSelect value={rowsPerPage} onChange={handleRowsPerPageChange}>
                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>
                <CPagination className="mb-0" size="sm">
                  <CPaginationItem
                    aria-label="Pagina precedente"
                    disabled={page <= 0}
                    onClick={() => {
                      if (page > 0) {
                        handlePageChange(page - 1)
                      }
                    }}
                  >
                    &laquo;
                  </CPaginationItem>
                  {paginationItems.map((item, index) =>
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
                    disabled={page >= totalPages - 1 || totalFiltered === 0}
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

