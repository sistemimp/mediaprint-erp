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
  updateProdotto,
  fetchProdottoPrezziCombinati,
  upsertProdottoPrezzoCombinato,
  deleteProdottoPrezzoCombinato,
  fetchIvaList,
  fetchNatureIva,
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
  const [form, setForm] = useState({ id_prodotto: id, codice: '', nome: '', id_categoria: '', prezzo_listino: '', id_iva: '', id_sdi_natura_iva: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [ivaOptions, setIvaOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])

  const [variazioni, setVariazioni] = useState([])
  const [assegnate, setAssegnate] = useState([])
  const [selectedVar, setSelectedVar] = useState('')
  // Prezzi combinati (multi-variazione)
  const [comboPrezzi, setComboPrezzi] = useState([])
  const [comboSelIds, setComboSelIds] = useState([])
  const [comboPrezzoVal, setComboPrezzoVal] = useState('')
  const [comboEditing, setComboEditing] = useState(false)
  // Raggruppamento combinazioni
  const [groupCat1, setGroupCat1] = useState('')
  const [groupCat2, setGroupCat2] = useState('')
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
        const [{ items: cats }, detail, { items: vars }, { items: assigned }, { items: combos }, { items: ivas }, { items: nats }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchProdottoDetail({ token, id_prodotto: id, signal: controller.signal }),
          fetchVariazioni({ token, signal: controller.signal }),
          fetchProdottoVariazioni({ token, id_prodotto: id, signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: id, signal: controller.signal }),
          fetchIvaList({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
        ])
        setCategories(cats)
        setIvaOptions(ivas)
        setNaturaOptions(nats)
        if (detail?.item) {
          const p = detail.item
          setForm({
            id_prodotto: p.id_prodotto,
            codice: p.codice || '',
            nome: p.nome || '',
            id_categoria: p.id_categoria || '',
            prezzo_listino: p.prezzo_listino ?? '',
            id_iva: p.id_iva || '',
            id_sdi_natura_iva: p.id_sdi_natura_iva || '',
          })
        }
        setVariazioni(vars)
        setAssegnate(assigned)
        setComboPrezzi(Array.isArray(combos) ? combos : [])
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
        id_iva: form.id_iva ? Number(form.id_iva) : null,
        id_sdi_natura_iva: form.id_sdi_natura_iva ? Number(form.id_sdi_natura_iva) : null,
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
      await linkProdottoVariazione({ token, id_prodotto: id, id_variazione: Number(selectedVar) })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
      setSelectedVar('')
      showToast('Variazione aggiunta', 'success')
    } catch (e) { setError(e); showToast(e.message || 'Errore aggiunta variazione', 'error') }
  }

  const handleUnlink = async (id_variazione) => {
    try {
      await unlinkProdottoVariazione({ token, id_prodotto: id, id_variazione })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
    } catch (e) { setError(e); showToast(e.message || 'Errore rimozione variazione', 'error') }
  }

  const handleComboAdd = async () => {
    if (!Array.isArray(comboSelIds) || comboSelIds.length === 0) return
    try {
      const prezzo = Number(comboPrezzoVal)
      await upsertProdottoPrezzoCombinato({ token, id_prodotto: id, var_ids: comboSelIds, prezzo })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      setComboSelIds([])
      setComboPrezzoVal('')
      setComboEditing(false)
      showToast('Prezzo combinato salvato', 'success')
    } catch (e) { setError(e); showToast(e.message || 'Errore salvataggio prezzo combinato', 'error') }
  }

  const handleComboDelete = async (varIds) => {
    try {
      await deleteProdottoPrezzoCombinato({ token, id_prodotto: id, var_ids: varIds })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      showToast('Prezzo combinato rimosso', 'success')
    } catch (e) { setError(e); showToast(e.message || 'Errore rimozione prezzo combinato', 'error') }
  }

  const handleComboEdit = (row) => {
    if (!row) return
    const ids = Array.isArray(row.var_ids) ? row.var_ids.map(Number).filter((n) => n > 0) : []
    setComboSelIds(ids)
    setComboPrezzoVal(String(row.prezzo ?? ''))
    setComboEditing(true)
    showToast('Modifica selezionata: aggiorna prezzo e salva', 'success')
  }

  const handleComboCancel = () => {
    setComboSelIds([])
    setComboPrezzoVal('')
    setComboEditing(false)
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

  // Opzioni per i prezzi combinati: SOLO variazioni assegnate al prodotto
  const comboOptions = useMemo(() => {
    const allowed = new Set((assegnate || []).map((a) => Number(a.id_variazione)))
    return variazioniByCodice.filter((v) => allowed.has(Number(v.id_variazione)))
  }, [variazioniByCodice, assegnate])

  // Mappa id variazione -> dettaglio
  const varById = useMemo(() => {
    const map = {}
    for (const v of variazioni) { map[Number(v.id_variazione)] = v }
    for (const v of assegnate) { map[Number(v.id_variazione)] = { ...map[Number(v.id_variazione)], ...v } }
    return map
  }, [variazioni, assegnate])

  // Categorie presenti nelle combinazioni
  const comboCategories = useMemo(() => {
    const set = new Set()
    for (const r of comboPrezzi || []) {
      for (const idv of r.var_ids || []) {
        const vv = varById[Number(idv)]
        if (vv && vv.categoria) set.add(String(vv.categoria))
      }
    }
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))
  }, [comboPrezzi, varById])

  // Struttura raggruppata fino a 2 livelli
  const groupedCombos = useMemo(() => {
    if (!groupCat1) return null
    const top = new Map()
    const labelFor = (list, cat) => {
      const f = list.find((d) => String(d?.categoria || '') === String(cat))
      return f ? f.nome : ''
    }
    for (const r of comboPrezzi || []) {
      const details = (r.var_ids || []).map((id) => varById[Number(id)]).filter(Boolean)
      const k1 = `${groupCat1} - ${labelFor(details, groupCat1) || '-'}`
      const rest = details.filter((d) => String(d.categoria || '') !== String(groupCat1) && (!groupCat2 || String(d.categoria || '') !== String(groupCat2)))
      const restLabel = rest.length > 0 ? rest.map((d) => (d.categoria ? `${d.categoria} - ${d.nome}` : d.nome)).join(', ') : '-'
      if (groupCat2) {
        const k2 = `${groupCat2} - ${labelFor(details, groupCat2) || '-'}`
        if (!top.has(k1)) top.set(k1, new Map())
        const sub = top.get(k1)
        if (!sub.has(k2)) sub.set(k2, [])
        sub.get(k2).push({ r, restLabel })
      } else {
        if (!top.has(k1)) top.set(k1, [])
        top.get(k1).push({ r, restLabel })
      }
    }
    return top
  }, [comboPrezzi, varById, groupCat1, groupCat2])

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
              <CRow className="g-3 mt-1">
                <CCol md={4}>
                  <CFormLabel>IVA predefinita</CFormLabel>
                  <CFormSelect name="id_iva" value={form.id_iva} onChange={(e) => {
                    const val = e.target.value
                    setForm((prev) => ({ ...prev, id_iva: val }))
                    const sel = ivaOptions.find((i) => String(i.id_iva) === String(val))
                    if (!sel || Number(sel.percento) !== 0) {
                      setForm((prev) => ({ ...prev, id_sdi_natura_iva: '' }))
                    }
                  }}>
                    <option value="">--</option>
                    {ivaOptions.map((i) => (
                      <option key={i.id_iva} value={i.id_iva}>{i.percento}%{i.descrizione ? ` - ${i.descrizione}` : ''}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Natura (se IVA 0%)</CFormLabel>
                  <CFormSelect name="id_sdi_natura_iva" value={form.id_sdi_natura_iva}
                    onChange={(e) => setForm((prev) => ({ ...prev, id_sdi_natura_iva: e.target.value }))}
                    disabled={!form.id_iva || Number((ivaOptions.find((i) => String(i.id_iva) === String(form.id_iva)) || {}).percento) !== 0}
                  >
                    <option value="">--</option>
                    {naturaOptions.map((n) => (
                      <option key={n.id_natura} value={n.id_natura}>{n.code} - {n.label}</option>
                    ))}
                  </CFormSelect>
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
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sortedAssegnate.map((v) => (
                  <CTableRow key={v.id_variazione}>
                    <CTableDataCell>{v.categoria || '-'}</CTableDataCell>
                    <CTableDataCell>{v.nome}</CTableDataCell>
                    <CTableDataCell>{v.codice || '-'}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CButton color="danger" size="sm" variant="outline" onClick={() => handleUnlink(v.id_variazione)}>Rimuovi</CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            <hr className="my-4" />
            <h6 className="mb-3">Prezzi combinati (multi-variazione)</h6>
            <CRow className="g-2 align-items-end mb-2">
              <CCol md={6}>
                <CFormLabel>Variazioni</CFormLabel>
                <CFormSelect multiple value={comboSelIds.map(String)} onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                  setComboSelIds(vals)
                }}>
                  {comboOptions.map((v) => (
                    <option key={v.id_variazione} value={v.id_variazione}>
                      {v.categoria ? `${v.categoria} - ` : ''}{v.nome}{v.codice ? ` [${v.codice}]` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Prezzo</CFormLabel>
                <CFormInput type="number" step="0.01" value={comboPrezzoVal} onChange={(e) => setComboPrezzoVal(e.target.value)} placeholder="Es. 0.65" />
              </CCol>
              <CCol md="auto" className="d-flex gap-2">
                <CButton color="primary" variant="outline" onClick={handleComboAdd} disabled={comboSelIds.length === 0}>{comboEditing ? 'Salva' : 'Aggiungi'}</CButton>
                {comboEditing && (
                  <CButton color="secondary" variant="outline" onClick={handleComboCancel}>Annulla</CButton>
                )}
              </CCol>
            </CRow>

            <div className="d-flex gap-2 align-items-end mb-2">
              <div style={{ minWidth: 240 }}>
                <CFormLabel className="mb-1">Raggruppa per (livello 1)</CFormLabel>
                <CFormSelect value={groupCat1} onChange={(e) => { setGroupCat1(e.target.value); if (e.target.value === '') setGroupCat2('') }}>
                  <option value="">-- Nessun raggruppamento --</option>
                  {comboCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
                </CFormSelect>
              </div>
              <div style={{ minWidth: 240 }}>
                <CFormLabel className="mb-1">Sottogruppo (livello 2)</CFormLabel>
                <CFormSelect value={groupCat2} onChange={(e) => setGroupCat2(e.target.value)} disabled={!groupCat1}>
                  <option value="">-- Nessuno --</option>
                  {comboCategories.filter((c) => c !== groupCat1).map((c) => (<option key={c} value={c}>{c}</option>))}
                </CFormSelect>
              </div>
            </div>

            <CTable small responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Combinazione</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: 160 }}>Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {(!comboPrezzi || comboPrezzi.length === 0) && (
                  <CTableRow><CTableDataCell colSpan={3} className="text-center text-body-secondary">Nessun prezzo combinato</CTableDataCell></CTableRow>
                )}
                {groupCat1 && groupedCombos && (
                  Array.from(groupedCombos.keys()).sort((a, b) => String(a).localeCompare(String(b))).map((k1) => {
                    const sub = groupedCombos.get(k1)
                    const rows = Array.isArray(sub) ? sub : null
                    const subs = rows ? null : sub
                    return (
                      <React.Fragment key={k1}>
                        <CTableRow className="table-secondary"><CTableDataCell colSpan={3} className="fw-semibold">{k1}</CTableDataCell></CTableRow>
                        {rows && rows.map(({ r, restLabel }, idx) => (
                          <CTableRow key={(r.id ?? idx) + '-flat'}>
                            <CTableDataCell>{restLabel}</CTableDataCell>
                            <CTableDataCell className="text-end">{Number(r.prezzo) ?? 0}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <CButton color="primary" size="sm" variant="outline" onClick={() => handleComboEdit(r)}>Modifica</CButton>
                                <CButton color="danger" size="sm" variant="outline" onClick={() => handleComboDelete(r.var_ids)}>Rimuovi</CButton>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                        {subs && Array.from(subs.keys()).sort((a, b) => String(a).localeCompare(String(b))).map((k2) => (
                          <React.Fragment key={k1 + '>' + k2}>
                            <CTableRow className="table-light"><CTableDataCell colSpan={3}>{k2}</CTableDataCell></CTableRow>
                            {subs.get(k2).map(({ r, restLabel }, idx) => (
                              <CTableRow key={(r.id ?? idx) + '-nested'}>
                                <CTableDataCell>{restLabel}</CTableDataCell>
                                <CTableDataCell className="text-end">{Number(r.prezzo) ?? 0}</CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <div className="d-flex justify-content-center gap-2">
                                    <CButton color="primary" size="sm" variant="outline" onClick={() => handleComboEdit(r)}>Modifica</CButton>
                                    <CButton color="danger" size="sm" variant="outline" onClick={() => handleComboDelete(r.var_ids)}>Rimuovi</CButton>
                                  </div>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    )
                  })
                )}
                {!groupCat1 && comboPrezzi && comboPrezzi.map((r, idx) => {
                  const labels = Array.isArray(r.var_ids)
                    ? r.var_ids.map((idv) => {
                        const vv = assegnate.find((x) => Number(x.id_variazione) === Number(idv))
                          || variazioni.find((x) => Number(x.id_variazione) === Number(idv))
                        return vv ? (vv.categoria ? `${vv.categoria} - ${vv.nome}` : vv.nome) : String(idv)
                      })
                    : []
                  return (
                    <CTableRow key={r.id ?? idx}>
                      <CTableDataCell>{labels.join(', ')}</CTableDataCell>
                      <CTableDataCell className="text-end">{Number(r.prezzo) ?? 0}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <CButton color="primary" size="sm" variant="outline" onClick={() => handleComboEdit(r)}>Modifica</CButton>
                          <CButton color="danger" size="sm" variant="outline" onClick={() => handleComboDelete(r.var_ids)}>Rimuovi</CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
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
