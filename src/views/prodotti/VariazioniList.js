import React, { useCallback, useEffect, useState } from 'react'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
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
import {
  fetchMagazzinoProductConsumptions,
  saveMagazzinoProductConsumptions,
} from '../../services/magazzino'
import BottomToast from '../../components/BottomToast'
import PermissionButton from '../../components/PermissionButton'

const VariazioniList = () => {
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [code, setCode] = useState('')
  const [price, setPrice] = useState('')
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
  const [stockArticles, setStockArticles] = useState([])
  const [variationInlineEditById, setVariationInlineEditById] = useState({})
  const [variationInlineSavingById, setVariationInlineSavingById] = useState({})
  const [variationConsumptionRowsByVarProduct, setVariationConsumptionRowsByVarProduct] = useState(
    {},
  )
  const [variationConsumptionLoadingById, setVariationConsumptionLoadingById] = useState({})
  const [variationConsumptionSavingById, setVariationConsumptionSavingById] = useState({})
  const [variationProductOptionsById, setVariationProductOptionsById] = useState({})
  const [variationSelectedProductById, setVariationSelectedProductById] = useState({})

  const categoryOptions = React.useMemo(() => {
    const list = items.map((i) => String(i.categoria || '').trim()).filter(Boolean)
    return Array.from(new Set(list)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
  }, [items])

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  const load = useCallback(
    async (signal) => {
      setLoading(true)
      setError(null)
      try {
        const { items } = await fetchVariazioni({ token, signal })
        setItems(items)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
      } finally {
        setLoading(false)
      }
    },
    [token, logout],
  )

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
    const q = String(search || '')
      .trim()
      .toLocaleLowerCase()
    const cat = String(filterCategory || '')
      .trim()
      .toLocaleLowerCase()
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
  }, [token, load])

  const startCreate = () => {
    setName('')
    setCategory('')
    setCode('')
    setPrice('')
    setFormVisible(true)
  }
  const cancel = () => {
    setName('')
    setCategory('')
    setCode('')
    setPrice('')
    setFormVisible(false)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const cleaned = String(name).trim()
      await saveVariazione({
        token,
        id_variazione: null,
        nome: cleaned,
        prezzo: price !== '' ? Number(price) : null,
        categoria: String(category).trim() || null,
        codice: String(code).trim() || null,
      })
      await load()
      cancel()
      showToast('Variazione salvata', 'success')
    } catch (e2) {
      setError(e2)
      showToast(e2.message || 'Errore salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  const createEmptyConsumptionRow = () => ({
    id_articolo: '',
    quantita_per_unita: '1',
    scarto_percento: '0',
    attivo: 1,
  })

  const mapConsumptionItemsToRows = (rows) => {
    const mapped = (Array.isArray(rows) ? rows : []).map((row) => ({
      id_articolo: row?.id_articolo ? String(row.id_articolo) : '',
      quantita_per_unita:
        row?.quantita_per_unita !== null && row?.quantita_per_unita !== undefined
          ? String(row.quantita_per_unita)
          : '1',
      scarto_percento:
        row?.scarto_percento !== null && row?.scarto_percento !== undefined
          ? String(row.scarto_percento)
          : '0',
      attivo: Number(row?.attivo) === 0 ? 0 : 1,
    }))
    return mapped.length > 0 ? mapped : [createEmptyConsumptionRow()]
  }

  const ensureVariationInlineEdit = (variation) => {
    const idVariazione = Number(variation?.id_variazione || 0)
    if (!idVariazione) return
    setVariationInlineEditById((prev) => {
      if (prev[idVariazione]) return prev
      return {
        ...prev,
        [idVariazione]: {
          nome: String(variation?.nome || ''),
          codice: String(variation?.codice || ''),
          categoria: String(variation?.categoria || ''),
          prezzo:
            variation?.prezzo !== null &&
            variation?.prezzo !== undefined &&
            variation?.prezzo !== ''
              ? String(variation.prezzo)
              : '',
        },
      }
    })
  }

  const loadVariationConsumptions = async (variation) => {
    const idVariazione = Number(variation?.id_variazione || 0)
    if (!idVariazione || variationConsumptionLoadingById[idVariazione]) return
    ensureVariationInlineEdit(variation)
    setVariationConsumptionLoadingById((prev) => ({ ...prev, [idVariazione]: true }))
    try {
      const {
        items: consumptionItems,
        articoli,
        prodotti,
        productVariations,
      } = await fetchMagazzinoProductConsumptions({
        token,
        id_variazione: idVariazione,
      })

      if (Array.isArray(articoli) && articoli.length > 0) {
        setStockArticles(articoli)
      }

      const productsById = {}
      for (const p of Array.isArray(prodotti) ? prodotti : []) {
        const pid = Number(p?.id_prodotto || 0)
        if (pid > 0) productsById[pid] = p
      }
      const linkedProducts = (Array.isArray(productVariations) ? productVariations : [])
        .filter((link) => Number(link?.id_variazione || 0) === idVariazione)
        .map((link) => Number(link?.id_prodotto || 0))
        .filter((pid) => pid > 0)
      const optionIds = Array.from(new Set(linkedProducts)).sort((a, b) => a - b)
      const options = optionIds.map((pid) => {
        const p = productsById[pid] || {}
        return {
          id_prodotto: pid,
          label: p.codice ? `${p.codice} - ${p.nome || ''}` : p.nome || `Prodotto #${pid}`,
        }
      })
      setVariationProductOptionsById((prev) => ({ ...prev, [idVariazione]: options }))

      const groupedRows = {}
      for (const row of Array.isArray(consumptionItems) ? consumptionItems : []) {
        const pid = Number(row?.id_prodotto || 0)
        if (pid <= 0) continue
        if (!groupedRows[pid]) groupedRows[pid] = []
        groupedRows[pid].push(row)
      }
      const mappedByProduct = {}
      for (const pid of optionIds) {
        mappedByProduct[pid] = mapConsumptionItemsToRows(groupedRows[pid] || [])
      }
      setVariationConsumptionRowsByVarProduct((prev) => ({
        ...prev,
        [idVariazione]: mappedByProduct,
      }))

      setVariationSelectedProductById((prev) => {
        const current = Number(prev[idVariazione] || 0)
        if (current > 0 && optionIds.includes(current)) return prev
        const first = optionIds[0] || 0
        return { ...prev, [idVariazione]: first > 0 ? String(first) : '' }
      })
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore caricamento articoli magazzino', 'error')
    } finally {
      setVariationConsumptionLoadingById((prev) => ({ ...prev, [idVariazione]: false }))
    }
  }

  const updateVariationInlineField = (idVariazione, field, value) => {
    setVariationInlineEditById((prev) => ({
      ...prev,
      [idVariazione]: {
        ...(prev[idVariazione] || { nome: '', codice: '', categoria: '', prezzo: '' }),
        [field]: value,
      },
    }))
  }

  const saveVariationInline = async (variation) => {
    const idVariazione = Number(variation?.id_variazione || 0)
    if (!idVariazione) return
    const edit = variationInlineEditById[idVariazione] || {}
    const nome = String(edit.nome || '').trim()
    if (!nome) {
      showToast('Nome variazione obbligatorio', 'error')
      return
    }
    setVariationInlineSavingById((prev) => ({ ...prev, [idVariazione]: true }))
    setError(null)
    try {
      await saveVariazione({
        token,
        id_variazione: idVariazione,
        nome,
        prezzo: edit.prezzo !== '' ? Number(edit.prezzo) : null,
        categoria: String(edit.categoria || '').trim() || null,
        codice: String(edit.codice || '').trim() || null,
      })
      await load()
      showToast('Variazione aggiornata', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio variazione', 'error')
    } finally {
      setVariationInlineSavingById((prev) => ({ ...prev, [idVariazione]: false }))
    }
  }

  const updateVariationConsumptionRow = (idVariazione, idProdotto, index, field, value) => {
    setVariationConsumptionRowsByVarProduct((prev) => {
      const byVar = prev[idVariazione] || {}
      const rows = Array.isArray(byVar[idProdotto])
        ? byVar[idProdotto]
        : [createEmptyConsumptionRow()]
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      )
      return {
        ...prev,
        [idVariazione]: {
          ...byVar,
          [idProdotto]: nextRows,
        },
      }
    })
  }

  const addVariationConsumptionRow = (idVariazione, idProdotto) => {
    setVariationConsumptionRowsByVarProduct((prev) => {
      const byVar = prev[idVariazione] || {}
      const rows = Array.isArray(byVar[idProdotto]) ? byVar[idProdotto] : []
      return {
        ...prev,
        [idVariazione]: {
          ...byVar,
          [idProdotto]: [...rows, createEmptyConsumptionRow()],
        },
      }
    })
  }

  const removeVariationConsumptionRow = (idVariazione, idProdotto, index) => {
    setVariationConsumptionRowsByVarProduct((prev) => {
      const byVar = prev[idVariazione] || {}
      const rows = Array.isArray(byVar[idProdotto]) ? byVar[idProdotto] : []
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
      return {
        ...prev,
        [idVariazione]: {
          ...byVar,
          [idProdotto]: nextRows.length > 0 ? nextRows : [createEmptyConsumptionRow()],
        },
      }
    })
  }

  const saveVariationConsumptions = async (variation) => {
    const idVariazione = Number(variation?.id_variazione || 0)
    const idProdotto = Number(variationSelectedProductById[idVariazione] || 0)
    if (!idVariazione || idProdotto <= 0) {
      showToast('Seleziona un prodotto collegato', 'error')
      return
    }

    const rows = variationConsumptionRowsByVarProduct[idVariazione]?.[idProdotto] || [
      createEmptyConsumptionRow(),
    ]

    setVariationConsumptionSavingById((prev) => ({ ...prev, [idVariazione]: true }))
    setError(null)
    try {
      await saveMagazzinoProductConsumptions({
        token,
        body: {
          id_prodotto: idProdotto,
          id_variazione: idVariazione,
          rows: rows.map((row) => ({
            id_articolo: row.id_articolo ? Number(row.id_articolo) : null,
            quantita_per_unita: row.quantita_per_unita,
            scarto_percento: row.scarto_percento,
            attivo: Number(row.attivo) === 0 ? 0 : 1,
          })),
        },
      })
      await Promise.all([load(), loadVariationConsumptions(variation)])
      showToast('Articoli magazzino salvati', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio articoli magazzino', 'error')
    } finally {
      setVariationConsumptionSavingById((prev) => ({ ...prev, [idVariazione]: false }))
    }
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
            data-testid="create"
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
                    <option key={c} value={c}>
                      {c}
                    </option>
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
              <CCol md={3}>
                <CFormInput
                  placeholder="Nome variazione"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  placeholder="Codice variazione (unico)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="number"
                  step="0.01"
                  placeholder="Prezzo"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </CCol>
              <CCol md="auto">
                <PermissionButton
                  type="submit"
                  color="primary"
                  disabled={saving || String(name).trim() === ''}
                  permission="prod.write"
                  data-testid="save"
                >
                  Salva
                </PermissionButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={cancel}>
                  Annulla
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        )}
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner />
          </div>
        )}
        {!loading && (
          <>
            <CRow className="g-2 mb-3">
              <CCol md={4}>
                <CFormInput
                  placeholder="Cerca per nome, codice o categoria"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="search"
                />
              </CCol>
              <CCol md={3}>
                <CFormSelect
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Tutte le categorie</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__none__">Senza categoria</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setFilterCategory('')
                  }}
                  disabled={!search && !filterCategory}
                  data-testid="filters-reset"
                >
                  Reset filtri
                </CButton>
              </CCol>
            </CRow>
            <CRow className="g-2 align-items-center mb-2">
              <CCol md="auto">
                <small className="text-body-secondary">Ordina per:</small>
              </CCol>
              <CCol md="auto" className="d-flex gap-2 flex-wrap">
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={(e) => toggleSort('categoria', e.shiftKey)}
                >
                  Categoria{sortIndicator('categoria')}
                </CButton>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={(e) => toggleSort('nome', e.shiftKey)}
                >
                  Nome{sortIndicator('nome')}
                </CButton>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={(e) => toggleSort('codice', e.shiftKey)}
                >
                  Codice{sortIndicator('codice')}
                </CButton>
              </CCol>
            </CRow>

            {groupedItems.length === 0 && (
              <CAlert color="light" className="mb-0">
                Nessuna variazione trovata
              </CAlert>
            )}

            {groupedItems.map(([cat, list]) => (
              <div key={cat} className="mb-3">
                <div className="fw-semibold mb-2">{cat}</div>
                <CAccordion alwaysOpen>
                  {list.map((r) => {
                    const idVariazione = Number(r.id_variazione || 0)
                    const edit = variationInlineEditById[idVariazione] || {
                      nome: String(r.nome || ''),
                      codice: String(r.codice || ''),
                      categoria: String(r.categoria || ''),
                      prezzo: r.prezzo !== null && r.prezzo !== undefined ? String(r.prezzo) : '',
                    }
                    const loadingConsumptions =
                      variationConsumptionLoadingById[idVariazione] === true
                    const savingConsumptions = variationConsumptionSavingById[idVariazione] === true
                    const savingVariation = variationInlineSavingById[idVariazione] === true
                    const productOptions = Array.isArray(variationProductOptionsById[idVariazione])
                      ? variationProductOptionsById[idVariazione]
                      : []
                    const selectedProductId = Number(
                      variationSelectedProductById[idVariazione] || 0,
                    )
                    const rows =
                      selectedProductId > 0
                        ? variationConsumptionRowsByVarProduct[idVariazione]?.[
                            selectedProductId
                          ] || [createEmptyConsumptionRow()]
                        : []

                    return (
                      <CAccordionItem key={idVariazione} itemKey={`var-${idVariazione}`}>
                        <CAccordionHeader onClick={() => loadVariationConsumptions(r)}>
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-1 w-100 pe-2">
                            <span>
                              {r.codice ? `${r.codice} - ` : ''}
                              {r.nome}
                            </span>
                            <span className="d-flex align-items-center gap-2">
                              <CBadge color="info" shape="rounded-pill">
                                {Number(r.articoli_count) || 0} articoli
                              </CBadge>
                              <span className="text-body-secondary">
                                Prezzo: <strong>{Number(r.prezzo) || 0}</strong>
                              </span>
                            </span>
                          </div>
                        </CAccordionHeader>
                        <CAccordionBody>
                          <CRow className="g-2 align-items-end mb-3">
                            <CCol md={3}>
                              <CFormLabel className="mb-1">Categoria</CFormLabel>
                              <CFormInput
                                value={edit.categoria}
                                onChange={(e) =>
                                  updateVariationInlineField(
                                    idVariazione,
                                    'categoria',
                                    e.target.value,
                                  )
                                }
                              />
                            </CCol>
                            <CCol md={3}>
                              <CFormLabel className="mb-1">Nome</CFormLabel>
                              <CFormInput
                                value={edit.nome}
                                onChange={(e) =>
                                  updateVariationInlineField(idVariazione, 'nome', e.target.value)
                                }
                              />
                            </CCol>
                            <CCol md={2}>
                              <CFormLabel className="mb-1">Codice</CFormLabel>
                              <CFormInput
                                value={edit.codice}
                                onChange={(e) =>
                                  updateVariationInlineField(idVariazione, 'codice', e.target.value)
                                }
                              />
                            </CCol>
                            <CCol md={2}>
                              <CFormLabel className="mb-1">Prezzo</CFormLabel>
                              <CFormInput
                                type="number"
                                step="0.01"
                                value={edit.prezzo}
                                onChange={(e) =>
                                  updateVariationInlineField(idVariazione, 'prezzo', e.target.value)
                                }
                              />
                            </CCol>
                            <CCol md="auto" className="d-flex gap-2">
                              <PermissionButton
                                color="primary"
                                size="sm"
                                onClick={() => saveVariationInline(r)}
                                disabled={savingVariation}
                                permission="prod.write"
                              >
                                {savingVariation ? 'Salvataggio...' : 'Salva variazione'}
                              </PermissionButton>
                              <PermissionButton
                                size="sm"
                                color="danger"
                                variant="outline"
                                onClick={() => handleDelete(r)}
                                permission="prod.delete"
                                data-testid="delete"
                              >
                                Elimina
                              </PermissionButton>
                            </CCol>
                          </CRow>

                          <h6 className="mb-2">Articoli da scalare a magazzino</h6>
                          {loadingConsumptions ? (
                            <div className="d-flex justify-content-center py-3">
                              <CSpinner size="sm" />
                            </div>
                          ) : (
                            <>
                              {productOptions.length === 0 ? (
                                <CAlert color="light" className="mb-2">
                                  Nessun prodotto collegato a questa variazione.
                                </CAlert>
                              ) : (
                                <>
                                  <CRow className="g-2 mb-2">
                                    <CCol md={5}>
                                      <CFormLabel className="mb-1">Prodotto collegato</CFormLabel>
                                      <CFormSelect
                                        value={variationSelectedProductById[idVariazione] || ''}
                                        onChange={(e) =>
                                          setVariationSelectedProductById((prev) => ({
                                            ...prev,
                                            [idVariazione]: e.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">Seleziona prodotto</option>
                                        {productOptions.map((opt) => (
                                          <option key={opt.id_prodotto} value={opt.id_prodotto}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </CFormSelect>
                                    </CCol>
                                  </CRow>

                                  {selectedProductId > 0 && (
                                    <>
                                      <CTable small responsive>
                                        <CTableHead className="mp-table-head">
                                          <CTableRow>
                                            <CTableHeaderCell>Articolo</CTableHeaderCell>
                                            <CTableHeaderCell className="text-end">
                                              Q.ta per unita
                                            </CTableHeaderCell>
                                            <CTableHeaderCell className="text-end">
                                              Scarto %
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>Attivo</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">
                                              Azioni
                                            </CTableHeaderCell>
                                          </CTableRow>
                                        </CTableHead>
                                        <CTableBody>
                                          {rows.map((row, index) => (
                                            <CTableRow
                                              key={`var-${idVariazione}-prod-${selectedProductId}-row-${index}`}
                                            >
                                              <CTableDataCell>
                                                <CFormSelect
                                                  value={row.id_articolo}
                                                  onChange={(event) =>
                                                    updateVariationConsumptionRow(
                                                      idVariazione,
                                                      selectedProductId,
                                                      index,
                                                      'id_articolo',
                                                      event.target.value,
                                                    )
                                                  }
                                                >
                                                  <option value="">Seleziona articolo</option>
                                                  {stockArticles.map((article) => (
                                                    <option
                                                      key={
                                                        article.id_articolo || article.id_prodotto
                                                      }
                                                      value={
                                                        article.id_articolo || article.id_prodotto
                                                      }
                                                    >
                                                      {article.codice || '-'} - {article.nome || ''}
                                                    </option>
                                                  ))}
                                                </CFormSelect>
                                              </CTableDataCell>
                                              <CTableDataCell>
                                                <CFormInput
                                                  type="number"
                                                  min="0"
                                                  step="0.001"
                                                  value={row.quantita_per_unita}
                                                  onChange={(event) =>
                                                    updateVariationConsumptionRow(
                                                      idVariazione,
                                                      selectedProductId,
                                                      index,
                                                      'quantita_per_unita',
                                                      event.target.value,
                                                    )
                                                  }
                                                />
                                              </CTableDataCell>
                                              <CTableDataCell>
                                                <CFormInput
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={row.scarto_percento}
                                                  onChange={(event) =>
                                                    updateVariationConsumptionRow(
                                                      idVariazione,
                                                      selectedProductId,
                                                      index,
                                                      'scarto_percento',
                                                      event.target.value,
                                                    )
                                                  }
                                                />
                                              </CTableDataCell>
                                              <CTableDataCell>
                                                <CFormSelect
                                                  value={row.attivo}
                                                  onChange={(event) =>
                                                    updateVariationConsumptionRow(
                                                      idVariazione,
                                                      selectedProductId,
                                                      index,
                                                      'attivo',
                                                      Number(event.target.value) === 1 ? 1 : 0,
                                                    )
                                                  }
                                                >
                                                  <option value={1}>Si</option>
                                                  <option value={0}>No</option>
                                                </CFormSelect>
                                              </CTableDataCell>
                                              <CTableDataCell className="text-center">
                                                <CButton
                                                  color="danger"
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    removeVariationConsumptionRow(
                                                      idVariazione,
                                                      selectedProductId,
                                                      index,
                                                    )
                                                  }
                                                >
                                                  Rimuovi
                                                </CButton>
                                              </CTableDataCell>
                                            </CTableRow>
                                          ))}
                                        </CTableBody>
                                      </CTable>
                                      <div className="d-flex flex-wrap justify-content-between gap-2">
                                        <CButton
                                          color="secondary"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            addVariationConsumptionRow(
                                              idVariazione,
                                              selectedProductId,
                                            )
                                          }
                                        >
                                          Aggiungi articolo
                                        </CButton>
                                        <PermissionButton
                                          color="primary"
                                          size="sm"
                                          onClick={() => saveVariationConsumptions(r)}
                                          disabled={savingConsumptions}
                                          permission="prod.write"
                                        >
                                          {savingConsumptions ? 'Salvataggio...' : 'Salva articoli'}
                                        </PermissionButton>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </CAccordionBody>
                      </CAccordionItem>
                    )
                  })}
                </CAccordion>
              </div>
            ))}
            <BottomToast open={toast.open} type={toast.type} message={toast.message} />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default VariazioniList
