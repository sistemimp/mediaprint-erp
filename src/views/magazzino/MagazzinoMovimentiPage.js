import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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
import { cilReload } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchCategorieProdotti } from '../../services/prodotti'
import { fetchMagazzinoMovements } from '../../services/magazzino'

// Tipologie movimento disponibili nel filtro.
const MOVEMENT_TYPES = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'carico', label: 'Carico' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'rettifica', label: 'Rettifica' },
]

// Mappa colore badge per tipo movimento.
const TYPE_COLORS = {
  carico: 'success',
  scarico: 'danger',
  rettifica: 'warning',
}

// Formatta data/ora in locale italiano.
const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

// Formatta quantità con massimo 3 decimali.
const formatQty = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

// Pagina storico movimenti di magazzino.
const MagazzinoMovimentiPage = () => {
  const { token, logout } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    id_categoria: '',
    tipo_movimento: '',
    date_from: '',
    date_to: '',
    limit: 200,
  })

  // Carica movimenti applicando i filtri correnti.
  const loadItems = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const { items: rows } = await fetchMagazzinoMovements({
        token,
        q: filters.q,
        id_categoria: filters.id_categoria ? Number(filters.id_categoria) : undefined,
        tipo_movimento: filters.tipo_movimento || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        limit: Number(filters.limit) || 200,
      })
      setItems(Array.isArray(rows) ? rows : [])
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [token, logout, filters.q, filters.id_categoria, filters.tipo_movimento, filters.date_from, filters.date_to, filters.limit])

  // Carica categorie prodotti per filtro categoria.
  useEffect(() => {
    if (!token) return
    const loadCategories = async () => {
      try {
        const { items } = await fetchCategorieProdotti({ token })
        setCategories(Array.isArray(items) ? items : [])
      } catch (err) {
        if (err?.status === 401 && logout) {
          logout()
        }
      }
    }
    loadCategories()
  }, [token, logout])

  // Trigger caricamento movimenti.
  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Movimenti magazzino</h5>
          <small className="text-body-secondary">Storico carichi, scarichi e rettifiche</small>
        </div>
        <CButton color="secondary" variant="outline" onClick={loadItems} disabled={loading}>
          <CIcon icon={cilReload} className="me-2" />
          Aggiorna
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-2 mb-3">
          <CCol md={4}>
            <CFormInput
              value={filters.q}
              placeholder="Cerca per articolo, codice o nota"
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            />
          </CCol>
          <CCol md={2}>
            <CFormSelect
              value={filters.id_categoria}
              onChange={(event) => setFilters((prev) => ({ ...prev, id_categoria: event.target.value }))}
            >
              <option value="">Tutte le categorie</option>
              {categories.map((category) => (
                <option key={category.id_categoria} value={category.id_categoria}>
                  {category.nome}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={2}>
            <CFormSelect
              value={filters.tipo_movimento}
              onChange={(event) => setFilters((prev) => ({ ...prev, tipo_movimento: event.target.value }))}
            >
              {MOVEMENT_TYPES.map((entry) => (
                <option key={entry.value || 'all'} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={2}>
            <CFormInput
              type="date"
              value={filters.date_from}
              onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
            />
          </CCol>
          <CCol md={2}>
            <CFormInput
              type="date"
              value={filters.date_to}
              onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
            />
          </CCol>
        </CRow>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner />
          </div>
        )}

        {!loading && error && <CAlert color="danger">{error?.message || 'Errore caricamento movimenti.'}</CAlert>}

        {!loading && !error && (
          <CTable responsive hover>
            <CTableHead className="mp-table-head">
              <CTableRow>
                <CTableHeaderCell>Data</CTableHeaderCell>
                <CTableHeaderCell>Tipo</CTableHeaderCell>
                <CTableHeaderCell>Articolo</CTableHeaderCell>
                <CTableHeaderCell>Categoria</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Delta</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Pre</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Post</CTableHeaderCell>
                <CTableHeaderCell>Operatore</CTableHeaderCell>
                <CTableHeaderCell>Note</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={9} className="text-center text-body-secondary py-4">
                    Nessun movimento trovato.
                  </CTableDataCell>
                </CTableRow>
              )}
              {items.map((item) => (
                <CTableRow key={item.id_movimento}>
                  <CTableDataCell>{formatDateTime(item.created_at)}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={TYPE_COLORS[item.tipo_movimento] || 'secondary'}>
                      {item.tipo_movimento || '-'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-semibold">{item.prodotto_nome || '-'}</div>
                    <small className="text-body-secondary">{item.prodotto_codice || '-'}</small>
                  </CTableDataCell>
                  <CTableDataCell>{item.categoria_nome || '-'}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatQty(item.quantita_delta)}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatQty(item.giacenza_pre)}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatQty(item.giacenza_post)}</CTableDataCell>
                  <CTableDataCell>{item.created_by_username || item.created_by_email || '-'}</CTableDataCell>
                  <CTableDataCell>{item.note || '-'}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MagazzinoMovimentiPage
