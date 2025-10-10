import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
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
import BottomToast from '../../components/BottomToast'
import {
  fetchCategorieProdotti,
  fetchProdottoDetail,
  fetchVariazioni,
  fetchProdottoVariazioni,
  linkProdottoVariazione,
  unlinkProdottoVariazione,
  saveProdottoVariazioneDelta,
  updateProdotto,
} from '../../services/prodotti'

const useQuery = () => new URLSearchParams(useLocation().search)

const ProdottiDetail = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const query = useQuery()
  const id = useMemo(() => Number(query.get('id')), [query])

  // Se l'ID non è presente/valido reindirizza alla lista
  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate('/prodotti/lista', { replace: true })
    }
  }, [id, navigate])

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ id_prodotto: id, codice: '', nome: '', id_categoria: '', prezzo_listino: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [variazioni, setVariazioni] = useState([])
  const [assegnate, setAssegnate] = useState([])
  const [selectedVar, setSelectedVar] = useState('')
  const [selectedDelta, setSelectedDelta] = useState('0')
  const [deltaEdits, setDeltaEdits] = useState({})
  const [sorts, setSorts] = useState([
    { field: 'codice', dir: 'asc' },
    { field: 'categoria', dir: 'asc' },
    { field: 'nome', dir: 'asc' },
  ])
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ items: cats }, detail, { items: vars }, { items: assigned }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchProdottoDetail({ token, id_prodotto: id, signal: controller.signal }),
          fetchVariazioni({ token, signal: controller.signal }),
          fetchProdottoVariazioni({ token, id_prodotto: id, signal: controller.signal }),
        ])
        setCategories(cats)
        if (detail?.item) {
          const p = detail.item
          setForm({
            id_prodotto: p.id_prodotto,
            codice: p.codice || '',
            nome: p.nome || '',
            id_categoria: p.id_categoria || '',
            prezzo_listino: p.prezzo_listino ?? '',
          })
        }
        setVariazioni(vars)
        setAssegnate(assigned)
        const initial = {}
        assigned.forEach((v) => { initial[v.id_variazione] = v.delta_prezzo ?? 0 })
        setDeltaEdits(initial)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) { logout(); return }
        setError(e)
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        id_prodotto: form.id_prodotto,
        codice: form.codice || null,
        nome: String(form.nome || '').trim(),
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        prezzo_listino: form.prezzo_listino !== '' ? Number(form.prezzo_listino) : null,
      }
      await updateProdotto({ token, body })
      showToast('Prodotto salvato', 'success')
    } catch (e) {
      if (e.status === 401 && logout) { logout(); return }
      setError(e)
      showToast(e.message || 'Errore salvataggio', 'error')
    } finally { setSaving(false) }
  }

  const handleLink = async () => {
    if (!selectedVar) return
    try {
      const delta = Number(selectedDelta || 0)
      await linkProdottoVariazione({ token, id_prodotto: id, id_variazione: Number(selectedVar), delta })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
      const updated = {}
      items.forEach((v) => { updated[v.id_variazione] = v.delta_prezzo ?? 0 })
      setDeltaEdits(updated)
      setSelectedVar('')
      setSelectedDelta('0')
      showToast('Variazione aggiunta', 'success')
    } catch (e) { setError(e); showToast(e.message || 'Errore aggiunta variazione', 'error') }
  }

  const handleUnlink = async (id_variazione) => {
    try {
      await unlinkProdottoVariazione({ token, id_prodotto: id, id_variazione })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
      const updated = {}
      items.forEach((v) => { updated[v.id_variazione] = v.delta_prezzo ?? 0 })
      setDeltaEdits(updated)
    } catch (e) { setError(e); showToast(e.message || 'Errore rimozione variazione', 'error') }
  }

  const handleDeltaChange = (idVar, value) => {
    setDeltaEdits((prev) => ({ ...prev, [idVar]: value }))
  }

  const handleDeltaSave = async (idVar) => {
    try {
      const delta = Number(deltaEdits[idVar] || 0)
      await saveProdottoVariazioneDelta({ token, id_prodotto: id, id_variazione: idVar, delta })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
      const updated = {}
      items.forEach((v) => { updated[v.id_variazione] = v.delta_prezzo ?? 0 })
      setDeltaEdits(updated)
    } catch (e) { setError(e); showToast(e.message || 'Errore salvataggio delta', 'error') }
  }

  const variazioniByCodice = useMemo(() => {
    const arr = Array.isArray(variazioni) ? [...variazioni] : []
    arr.sort((a, b) => {
      const ac = String(a?.codice || '').toLocaleLowerCase()
      const bc = String(b?.codice || '').toLocaleLowerCase()
      const cmp = ac.localeCompare(bc)
      if (cmp !== 0) return cmp
      const an = String(a?.nome || '').toLocaleLowerCase()
      const bn = String(b?.nome || '').toLocaleLowerCase()
      return an.localeCompare(bn)
    })
    return arr
  }, [variazioni])

  const sortedAssegnate = useMemo(() => {
    const arr = [...assegnate]
    const getter = (row, field) => {
      if (field === 'categoria') return String(row.categoria || '')
      if (field === 'nome') return String(row.nome || '')
      if (field === 'codice') return String(row.codice || '')
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
  }, [assegnate, sorts])

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

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Prodotti - Dettagli</h5>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/prodotti/lista')}>Torna alla lista</CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (<div className="d-flex justify-content-center py-5"><CSpinner /></div>)}
        {!loading && (
          <>
            {error && <CAlert color="danger">{error.message || 'Errore'}</CAlert>}
            <CForm onSubmit={handleSave} className="mb-4">
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Codice</CFormLabel>
                  <CFormInput name="codice" value={form.codice} onChange={onChange} />
                </CCol>
                <CCol md={8}>
                  <CFormLabel>Nome</CFormLabel>
                  <CFormInput name="nome" value={form.nome} onChange={onChange} required />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Categoria</CFormLabel>
                  <CFormSelect name="id_categoria" value={form.id_categoria} onChange={onChange}>
                    <option value="">Seleziona...</option>
                    {categories.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Prezzo listino</CFormLabel>
                  <CFormInput type="number" step="0.01" name="prezzo_listino" value={form.prezzo_listino} onChange={onChange} />
                </CCol>
              </CRow>
              <div className="mt-3 d-flex gap-2">
                <CButton type="submit" color="primary" disabled={saving}>Salva</CButton>
              </div>
            </CForm>

            <h6 className="mb-3">Variazioni</h6>
            <CRow className="g-2 align-items-end mb-3">
              <CCol md={6}>
                <CFormSelect value={selectedVar} onChange={(e) => setSelectedVar(e.target.value)}>
                  <option value="">Seleziona variazione da aggiungere...</option>
                  {variazioniByCodice.map((v) => (
                    <option key={v.id_variazione} value={v.id_variazione}>
                      {v.nome}
                      {v.categoria ? ` - ${v.categoria}` : ''}
                      {v.codice ? ` [${v.codice}]` : ''}
                      {typeof v.prezzo === 'number' ? ` (base ${v.prezzo})` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={selectedDelta}
                  onChange={(e) => setSelectedDelta(e.target.value)}
                  placeholder="Delta prezzo (es. 10 o -5)"
                />
              </CCol>
              <CCol md="auto">
                <CButton color="primary" onClick={handleLink} disabled={!selectedVar}>Aggiungi</CButton>
              </CCol>
            </CRow>

            <CTable hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('categoria', e.shiftKey)} className="text-nowrap">Categoria{sortIndicator('categoria')}</CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('nome', e.shiftKey)} className="text-nowrap">Variazione{sortIndicator('nome')}</CTableHeaderCell>
                  <CTableHeaderCell role="button" onClick={(e) => toggleSort('codice', e.shiftKey)} className="text-nowrap">Codice{sortIndicator('codice')}</CTableHeaderCell>
                  <CTableHeaderCell className="text-nowrap">Delta prezzo</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sortedAssegnate.map((v) => (
                  <CTableRow key={v.id_variazione}>
                    <CTableDataCell>{v.categoria || '-'}</CTableDataCell>
                    <CTableDataCell>{v.nome}</CTableDataCell>
                    <CTableDataCell>{v.codice || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-2">
                        <CFormInput
                          type="number"
                          step="0.01"
                          value={deltaEdits[v.id_variazione] ?? 0}
                          onChange={(e) => handleDeltaChange(v.id_variazione, e.target.value)}
                          style={{ maxWidth: 140 }}
                        />
                        <CButton size="sm" color="primary" variant="outline" onClick={() => handleDeltaSave(v.id_variazione)}>Salva</CButton>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CButton color="danger" size="sm" variant="outline" onClick={() => handleUnlink(v.id_variazione)}>Rimuovi</CButton>
                    </CTableDataCell>
                  </CTableRow>
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

export default ProdottiDetail
