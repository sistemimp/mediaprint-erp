import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CAlert,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilDescription, cilEnvelopeClosed, cilPlus, cilPrint } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchLatestPreventivi, fetchPreventiviArchivio, reactivatePreventivo, archivePreventivo } from '../../services/preventivi'

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : String(value)
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

const PreventiviList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const perPageOptions = [10, 25, 50, 100]
  const [sorts, setSorts] = useState([{ field: 'data', dir: 'desc' }])
  const [groupBy, setGroupBy] = useState('none') // none | giorno | mese | stato | cliente
  const [viewMode, setViewMode] = useState('attivi') // attivi | archiviati
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (viewMode === 'archiviati') {
          const first = await fetchPreventiviArchivio({
            token,
            signal: controller.signal,
            page: 1,
            pageSize: 100,
            sortBy: 'data_preventivo',
            sortDirection: 'desc',
          })
          let all = Array.isArray(first.items) ? [...first.items] : []
          const totalPages = Math.max(first?.meta?.pages ?? first?.meta?.last_page ?? 1, 1)
          const perPage = first?.meta?.per_page ?? (all.length || 100)
          if (totalPages > 1) {
            for (let p = 2; p <= totalPages; p += 1) {
              if (controller.signal.aborted) break
              const pageRes = await fetchPreventiviArchivio({
                token,
                signal: controller.signal,
                page: p,
                pageSize: perPage,
                sortBy: 'data_preventivo',
                sortDirection: 'desc',
              })
              if (Array.isArray(pageRes.items) && pageRes.items.length > 0) {
                all = all.concat(pageRes.items)
              }
            }
          }
          setItems(all)
        } else {
          const { items: data = [] } = await fetchLatestPreventivi({
            token,
            signal: controller.signal,
          })
          setItems(Array.isArray(data) ? data : [])
        }
        setPage(0)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, logout, viewMode, refreshIndex])

  const total = items.length
  const totalPages = Math.max(Math.ceil(total / rowsPerPage), 1)

  const sortedItems = useMemo(() => {
    const out = [...items]
    const getter = (row, field) => {
      if (field === 'cliente') return String(row.ragione_sociale || '')
      if (field === 'documento') return `${row.anno_preventivo ?? ''}/${row.numero_documento ?? ''}`
      if (field === 'data') return String(row.data_preventivo || row.created_at || '')
      if (field === 'riferimento') return String(row.riferimento_cliente || '')
      if (field === 'totale') return Number(row.totale || 0)
      if (field === 'stato') return String(row.stato_label || row.stato_code || '')
      return ''
    }
    out.sort((a, b) => {
      for (const s of sorts) {
        const av = getter(a, s.field)
        const bv = getter(b, s.field)
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? (av - bv)
          : String(av).toLocaleLowerCase().localeCompare(String(bv).toLocaleLowerCase())
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return out
  }, [items, sorts])

  const groupedFlat = useMemo(() => {
    if (groupBy === 'none') return sortedItems.map((it) => ({ type: 'item', data: it }))

    const groups = []
    const index = new Map()
    const getDate = (v) => {
      const d = new Date(v)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const keyAndLabel = (row) => {
      if (groupBy === 'cliente') {
        const label = row.ragione_sociale || '-'
        return { key: `cliente:${label}`, label }
      }
      if (groupBy === 'stato') {
        const label = row.stato_label || row.stato_code || '-'
        return { key: `stato:${label}`, label }
      }
      const base = row.data_preventivo || row.created_at
      const d = getDate(base)
      if (!d) return { key: 'data:-', label: '-' }
      if (groupBy === 'giorno') {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return { key: `day:${y}-${m}-${day}`, label: `${day}/${m}/${y}` }
      }
      if (groupBy === 'mese') {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        return { key: `month:${y}-${m}`, label: `${m}/${y}` }
      }
      return { key: 'data:-', label: '-' }
    }

    for (const row of sortedItems) {
      const { key, label } = keyAndLabel(row)
      let g = index.get(key)
      if (!g) {
        g = { type: 'group', key, label, count: 0, rows: [] }
        index.set(key, g)
        groups.push(g)
      }
      g.count += 1
      g.rows.push({ type: 'item', data: row })
    }
    // Flatten preserving group order from sortedItems
    const flat = []
    for (const g of groups) {
      flat.push({ type: 'group', label: g.label, count: g.count })
      flat.push(...g.rows)
    }
    return flat
  }, [sortedItems, groupBy])

  const pageItems = useMemo(() => {
    const start = page * rowsPerPage
    return groupedFlat.slice(start, start + rowsPerPage)
  }, [groupedFlat, page, rowsPerPage])

  const toggleSort = (field, shiftKey = false) => {
    setSorts((prev) => {
      if (!shiftKey) {
        const existing = prev.find((s) => s.field === field)
        if (existing && prev.length === 1) {
          return [{ field, dir: existing.dir === 'asc' ? 'desc' : 'asc' }]
        }
        return [{ field, dir: 'asc' }]
      }
      const idx = prev.findIndex((s) => s.field === field)
      if (idx === -1) return [...prev, { field, dir: 'asc' }]
      const copy = [...prev]
      copy[idx] = { field, dir: copy[idx].dir === 'asc' ? 'desc' : 'asc' }
      return copy
    })
  }

  const sortIndicator = (field) => {
    const idx = sorts.findIndex((s) => s.field === field)
    if (idx === -1) return ''
    const dir = sorts[idx].dir === 'asc' ? '▲' : '▼'
    return ` ${dir}(${idx + 1})`
  }

  const paginationItems = useMemo(() => {
    const current = page + 1
    const pages = []
    for (let p = 1; p <= totalPages; p += 1) pages.push(p)
    return pages
  }, [page, totalPages])

  const handleView = (id) => {
    if (!id) return
    navigate(`/preventivi/dettagli?id=${id}`)
  }

  const handleRestore = async (id) => {
    if (!id || !token) return
    const confirmed = window.confirm(`Confermi il ripristino del preventivo archiviato ${id}?\nVerrà assegnata una nuova numerazione.`)
    if (!confirmed) return
    try {
      const res = await reactivatePreventivo({ token, id })
      // Dopo ripristino, torna alla vista attivi e mostra il nuovo record
      setViewMode('attivi')
      setRefreshIndex((v) => v + 1)
      const newId = res?.id_preventivo
      if (newId) {
        navigate(`/preventivi/dettagli?id=${newId}`)
      }
    } catch (e) {
      if (e?.status === 401 && logout) {
        logout()
        return
      }
      alert(e?.payload?.message || e?.message || 'Ripristino non riuscito')
    }
  }

  const handleArchive = async (id) => {
    if (!id || !token) return
    const confirmed = window.confirm(`Confermi l'archiviazione del preventivo ${id}?`)
    if (!confirmed) return
    try {
      await archivePreventivo({ token, id })
      setRefreshIndex((v) => v + 1)
    } catch (e) {
      if (e?.status === 401 && logout) {
        logout()
        return
      }
      alert(e?.payload?.message || e?.message || 'Archiviazione non riuscita')
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Preventivi - Elenco {viewMode === 'archiviati' ? '(archiviati)' : ''}</h5>
            <small className="text-body-secondary">
              {viewMode === 'archiviati' ? 'Archivio preventivi, ordinati per data decrescente' : 'Ordinati per data decrescente'}
            </small>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <div className="btn-group" role="group" aria-label="Seleziona elenco">
              <CButton
                color={viewMode === 'attivi' ? 'primary' : 'secondary'}
                variant={viewMode === 'attivi' ? 'solid' : 'outline'}
                onClick={() => setViewMode('attivi')}
                disabled={loading || viewMode === 'attivi'}
              >
                Attivi
              </CButton>
              <CButton
                color={viewMode === 'archiviati' ? 'primary' : 'secondary'}
                variant={viewMode === 'archiviati' ? 'solid' : 'outline'}
                onClick={() => setViewMode('archiviati')}
                disabled={loading || viewMode === 'archiviati'}
              >
                Archivio
              </CButton>
            </div>
            <div className="d-flex align-items-center">
              <span className="me-2 text-body-secondary">Raggruppa per</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 150 }}
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); setPage(0) }}
              >
                <option value="none">Nessuno</option>
                <option value="giorno">Giorno</option>
                <option value="mese">Mese</option>
                <option value="stato">Stato</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div className="d-flex align-items-center">
              <span className="me-2 text-body-secondary">Righe per pagina</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 100 }}
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
              >
                {perPageOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <CButton color="primary" variant="outline" onClick={() => navigate('/preventivi/crea')}>
              <CIcon icon={cilPlus} className="me-2" />
              Nuovo preventivo
            </CButton>
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare i preventivi.'}</CAlert>
        )}

        {!loading && !error && total === 0 && (
          <CAlert color="warning">Nessun preventivo disponibile.</CAlert>
        )}

        {!loading && !error && total > 0 && (
          <>
            <CTable hover responsive>
              <CTableHead color="light">
                <CTableRow className="align-middle">
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('cliente', e.shiftKey)} className="text-nowrap">
                    Cliente{sortIndicator('cliente')}
                  </CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('documento', e.shiftKey)} className="text-nowrap">
                    Documento{sortIndicator('documento')}
                  </CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('data', e.shiftKey)} className="text-nowrap">
                    Data{sortIndicator('data')}
                  </CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('riferimento', e.shiftKey)} className="text-nowrap">
                    Rif. cliente{sortIndicator('riferimento')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-nowrap">Imponibile</CTableHeaderCell>
                  <CTableHeaderCell className="text-nowrap">IVA</CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('totale', e.shiftKey)} className="text-nowrap">
                    Totale{sortIndicator('totale')}
                  </CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('stato', e.shiftKey)} className="text-center text-nowrap">
                    Stato{sortIndicator('stato')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {pageItems.map((row, idx) => {
                  if (row.type === 'group') {
                    return (
                      <CTableRow key={`g-${idx}`} className="table-secondary">
                        <CTableDataCell colSpan={9} className="fw-semibold">
                          {row.label} — {row.count} elementi
                        </CTableDataCell>
                      </CTableRow>
                    )
                  }
                  const r = row.data
                  return (
                    <CTableRow key={r.id_preventivo ?? idx}>
                      <CTableDataCell>
                        {r.ragione_sociale || '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {(r.anno_preventivo ?? '-')}/{r.numero_documento ?? '-'}
                      </CTableDataCell>
                      <CTableDataCell>{formatDate(r.data_preventivo)}</CTableDataCell>
                      <CTableDataCell>{r.riferimento_cliente || '-'}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(r.totale_imponibile)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(r.totale_iva)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(r.totale)}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        {r.stato_label ? (
                          <CBadge color="secondary">{r.stato_label}</CBadge>
                        ) : (
                          <span className="text-body-secondary">-</span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        {viewMode === 'archiviati' ? (
                          <CButton color="primary" variant="outline" size="sm" onClick={() => handleRestore(r.id_preventivo)}>
                            Ripristina
                          </CButton>
                        ) : (
                          <div className="d-inline-flex gap-2">
                            <CButton color="link" size="sm" className="p-0" onClick={() => handleView(r.id_preventivo)}>
                              <CIcon icon={cilDescription} />
                            </CButton>
                            <CButton color="secondary" variant="outline" size="sm" onClick={() => handleArchive(r.id_preventivo)}>
                              Archivia
                            </CButton>
                          </div>
                        )}
                      </CTableDataCell>
                  </CTableRow>
                )
              })}
              </CTableBody>
            </CTable>

            <CRow className="mt-3 align-items-center">
              <CCol className="text-body-secondary">
                Mostrando {Math.min(total, page * rowsPerPage + 1)} -
                {' '}
                {Math.min(total, (page + 1) * rowsPerPage)} di {total} risultati
              </CCol>
              <CCol className="d-flex justify-content-end">
                <CPagination className="mb-0" size="sm">
                  <CPaginationItem
                    aria-label="Pagina precedente"
                    disabled={page <= 0}
                    onClick={() => page > 0 && setPage(page - 1)}
                  >
                    &laquo;
                  </CPaginationItem>
                  {paginationItems.map((p) => (
                    <CPaginationItem key={p} active={p === page + 1} onClick={() => setPage(p - 1)}>
                      {p}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    aria-label="Pagina successiva"
                    disabled={page >= totalPages - 1}
                    onClick={() => page < totalPages - 1 && setPage(page + 1)}
                  >
                    &raquo;
                  </CPaginationItem>
                </CPagination>
              </CCol>
            </CRow>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PreventiviList
