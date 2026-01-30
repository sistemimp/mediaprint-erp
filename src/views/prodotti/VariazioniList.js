import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
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
import { useAuth } from '../../context/AuthContext'
import { fetchVariazioni, saveVariazione, deleteVariazione } from '../../services/prodotti'
import BottomToast from '../../components/BottomToast'
import PermissionButton from '../../components/PermissionButton'

const VariazioniList = () => {
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [editRow, setEditRow] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState([
    { field: 'codice', dir: 'asc' },
    { field: 'categoria', dir: 'asc' },
    { field: 'nome', dir: 'asc' },
  ])

  const categoryOptions = React.useMemo(() => {
    const list = items
      .map((i) => String(i.categoria || '').trim())
      .filter(Boolean)
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [items])

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  const load = async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await fetchVariazioni({ token, signal })
      setItems(items)
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401 && logout) { logout(); return }
      setError(e)
    } finally { setLoading(false) }
  }

  const sortedItems = React.useMemo(() => {
    const arr = [...items]
    const getter = (row, field) => {
      if (field === 'codice') return String(row.codice || '')
      if (field === 'categoria') return String(row.categoria || '')
      if (field === 'nome') return String(row.nome || '')
      return ''
    }
    arr.sort((a, b) => {
      for (const s of sorts) {
        const av = getter(a, s.field).toLocaleLowerCase()
        const bv = getter(b, s.field).toLocaleLowerCase()
        const cmp = av.localeCompare(bv)
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return arr
  }, [items, sorts])

  const filteredItems = React.useMemo(() => {
    const q = String(search || '').trim().toLocaleLowerCase()
    const cat = String(filterCategory || '').trim().toLocaleLowerCase()
    if (!q && !cat) return sortedItems
    return sortedItems.filter((r) => {
      const c = String(r.categoria || '').toLocaleLowerCase()
      if (cat) {
        if (filterCategory === '__none__') return c === ''
        if (c !== cat) return false
      }
      if (!q) return true
      const name = String(r.nome || '').toLocaleLowerCase()
      const code = String(r.codice || '').toLocaleLowerCase()
      return name.includes(q) || code.includes(q) || c.includes(q)
    })
  }, [sortedItems, search, filterCategory])

  const groupedItems = React.useMemo(() => {
    const map = new Map()
    for (const v of filteredItems) {
      const cat = String(v.categoria || 'Senza categoria')
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(v)
    }
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  }, [filteredItems])

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

  const handleDelete = async (row) => {
    if (!row?.id_variazione) return
    const ok = window.confirm(`Eliminare la variazione "${row.nome}"?`)
    if (!ok) return
    setError(null)
    try {
      await deleteVariazione({ token, id_variazione: row.id_variazione })
      if (editRow?.id_variazione === row.id_variazione) cancel()
      await load()
      showToast('Variazione eliminata', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore eliminazione', 'error')
    }
  }

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [token])

  const startCreate = () => { setEditRow(null); setName(''); setCategory(''); setCode(''); setFormVisible(true) }
  const startEdit = (row) => { setEditRow(row); setName(row.nome || ''); setCategory(row.categoria || ''); setCode(row.codice || ''); setFormVisible(true) }
  const cancel = () => { setEditRow(null); setName(''); setCategory(''); setCode(''); setFormVisible(false) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const cleaned = String(name).trim()
      await saveVariazione({
        token,
        id_variazione: editRow?.id_variazione,
        nome: cleaned,
        categoria: String(category).trim() || null,
        codice: String(code).trim() || null,
      })
      await load()
      cancel()
      showToast('Variazione salvata', 'success')
    } catch (e2) { setError(e2); showToast(e2.message || 'Errore salvataggio', 'error') } finally { setSaving(false) }
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Prodotti - Variazioni</h5>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={startCreate}
            permission="prod.create"
          >
            Nuova variazione
          </PermissionButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error.message || 'Errore'}</CAlert>}
        {formVisible && (
          <CForm onSubmit={save} className="mb-4">
            <CRow className="g-2 align-items-end">
              <CCol md={3}>
                <CFormSelect
                  value={categoryOptions.includes(String(category)) ? String(category) : ''}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Seleziona categoria esistente</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormInput
                  placeholder="Categoria (nuova o esistente)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormInput placeholder="Nome variazione" value={name} onChange={(e) => setName(e.target.value)} required />
              </CCol>
              <CCol md={2}>
                <CFormInput placeholder="Codice variazione (unico)" value={code} onChange={(e) => setCode(e.target.value)} />
              </CCol>
              <CCol md="auto">
                <PermissionButton
                  type="submit"
                  color="primary"
                  disabled={saving || String(name).trim() === ''}
                  permission="prod.write"
                >
                  Salva
                </PermissionButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={cancel}>Annulla</CButton>
              </CCol>
            </CRow>
          </CForm>
        )}
        {loading && (<div className="d-flex justify-content-center py-5"><CSpinner /></div>)}
        {!loading && (
          <>
            <CRow className="g-2 mb-3">
              <CCol md={4}>
                <CFormInput
                  placeholder="Cerca per nome, codice o categoria"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormSelect
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Tutte le categorie</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__none__">Senza categoria</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => { setSearch(''); setFilterCategory('') }}
                  disabled={!search && !filterCategory}
                >
                  Reset filtri
                </CButton>
              </CCol>
            </CRow>
            <CTable hover responsive>
            <CTableHead className="mp-table-head">
              <CTableRow>
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('categoria', e.shiftKey)} className="text-nowrap">
                  Categoria{sortIndicator('categoria')}
                </CTableHeaderCell>
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('nome', e.shiftKey)} className="text-nowrap">
                  Nome{sortIndicator('nome')}
                </CTableHeaderCell>
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('codice', e.shiftKey)} className="text-nowrap">
                  Codice{sortIndicator('codice')}
                </CTableHeaderCell>
                <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {groupedItems.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-muted py-4">
                    Nessuna variazione trovata
                  </CTableDataCell>
                </CTableRow>
              )}
              {groupedItems.map(([cat, list]) => (
                <React.Fragment key={cat}>
                  <CTableRow className="mp-group-row">
                    <CTableDataCell colSpan={4} className="fw-semibold">
                      {cat}
                    </CTableDataCell>
                  </CTableRow>
                  {list.map((r) => (
                    <CTableRow key={r.id_variazione} onClick={() => startEdit(r)} style={{ cursor: 'pointer' }}>
                      <CTableDataCell>{r.categoria || '-'}</CTableDataCell>
                      <CTableDataCell>{r.nome}</CTableDataCell>
                      <CTableDataCell>{r.codice || '-'}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <PermissionButton
                          size="sm"
                          color="danger"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleDelete(r) }}
                            permission="prod.delete"
                          >
                            Elimina
                          </PermissionButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                </React.Fragment>
              ))}
              </CTableBody>
            </CTable>
            <BottomToast open={toast.open} type={toast.type} message={toast.message} />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default VariazioniList
