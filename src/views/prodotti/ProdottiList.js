import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import CIcon from '@coreui/icons-react'
import { cilDescription, cilPlus } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchCategorieProdotti, fetchProdotti } from '../../services/prodotti'

const ProdottiList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ id_categoria: '', q: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sorts, setSorts] = useState([{ field: 'codice', dir: 'asc' }])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ items: cats }, { items: prods }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchProdotti({ token, signal: controller.signal }),
        ])
        setCategories(cats)
        setItems(prods)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) { logout(); return }
        setError(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, logout])

  const filtered = useMemo(() => {
    let out = items
    if (filters.id_categoria) {
      out = out.filter((x) => String(x.id_categoria || '') === String(filters.id_categoria))
    }
    if (filters.q && String(filters.q).trim() !== '') {
      const q = String(filters.q).trim().toLowerCase()
      out = out.filter((x) => `${x.nome} ${x.codice ?? ''}`.toLowerCase().includes(q))
    }
    return out
  }, [items, filters])

  const categoryMap = useMemo(() => {
    const m = {}
    categories.forEach((c) => { m[String(c.id_categoria)] = c.nome })
    return m
  }, [categories])

  const withCategoryName = useMemo(() => (
    filtered.map((p) => ({
      ...p,
      categoria_nome: p.id_categoria ? (categoryMap[String(p.id_categoria)] || '-') : '-',
    }))
  ), [filtered, categoryMap])

  const sorted = useMemo(() => {
    const out = [...withCategoryName]
    const getterByField = (row, field) => {
      if (field === 'codice') return String(row.codice || '')
      if (field === 'categoria') return String(row.categoria_nome || '')
      return String(row.nome || '')
    }
    out.sort((a, b) => {
      for (const s of sorts) {
        const av = getterByField(a, s.field).toLocaleLowerCase()
        const bv = getterByField(b, s.field).toLocaleLowerCase()
        const cmp = av.localeCompare(bv)
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return out
  }, [withCategoryName, sorts])

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

  const handleView = (id) => {
    if (!id) return
    navigate(`/prodotti/dettagli?id=${id}`)
  }

  const onChangeFilter = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Prodotti - Lista</h5>
            <small className="text-body-secondary">Ricerca e filtro per categoria</small><br />
            <small className="text-body-secondary">Premi shift+click sulla colonna per ordinare più colonne insieme</small>
          </div>
          <CButton color="primary" variant="outline" onClick={() => navigate('/prodotti/crea')}>
            <CIcon icon={cilPlus} className="me-2" />
            Nuovo prodotto
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CForm className="mb-3">
          <CRow className="g-2">
            <CCol md={4}>
              <CFormSelect name="id_categoria" value={filters.id_categoria} onChange={onChangeFilter}>
                <option value="">Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={8}>
              <CFormInput
                name="q"
                value={filters.q}
                onChange={onChangeFilter}
                placeholder="Cerca per nome o codice..."
              />
            </CCol>
          </CRow>
        </CForm>

        {loading && (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare i prodotti.'}</CAlert>
        )}

        {!loading && !error && (
          <CTable hover responsive>
            <CTableHead color="light">
              <CTableRow className="align-middle">
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('categoria', e.shiftKey)} className="text-nowrap">
                  Categoria{sortIndicator('categoria')}
                </CTableHeaderCell>
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('codice', e.shiftKey)} className="text-nowrap">
                  Codice{sortIndicator('codice')}
                </CTableHeaderCell>
                <CTableHeaderCell role="button" onClick={(e) => toggleSort('nome', e.shiftKey)} className="text-nowrap">
                  Nome{sortIndicator('nome')}
                </CTableHeaderCell>
                <CTableHeaderCell>Prezzo listino</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {sorted.map((row) => (
                <CTableRow key={row.id_prodotto}>
                  <CTableDataCell>{row.categoria_nome || '-'}</CTableDataCell>
                  <CTableDataCell>{row.codice || '-'}</CTableDataCell>
                  <CTableDataCell>{row.nome}</CTableDataCell>
                  <CTableDataCell>{row.prezzo_listino ?? '-'}</CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CButton color="link" size="sm" className="p-0" onClick={() => handleView(row.id_prodotto)}>
                      <CIcon icon={cilDescription} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProdottiList
