import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
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
import PermissionButton from '../../components/PermissionButton'
import {
  fetchCategorieProdotti,
  fetchProdottoDetail,
  fetchVariazioni,
  fetchProdottoVariazioni,
  linkProdottoVariazione,
  unlinkProdottoVariazione,
  saveVariazione,
  updateProdotto,
  createProdotto,
  fetchProdottoPrezziCombinati,
  upsertProdottoPrezzoCombinato,
  bulkUpsertProdottoPrezziCombinati,
  bulkDeleteProdottoPrezziCombinati,
  deleteProdottoPrezzoCombinato,
  fetchIvaList,
  fetchNatureIva,
} from '../../services/prodotti'
import {
  fetchMagazzinoProductConsumptions,
  saveMagazzinoProductConsumptions,
} from '../../services/magazzino'

// Helper per leggere querystring del dettaglio prodotto.
const useQuery = () => new URLSearchParams(useLocation().search)

// Dettaglio prodotto: anagrafica base, variazioni, combinazioni prezzo e consumi.
const ProdottiDetail = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const query = useQuery()
  const mode = query.get('mode') || 'edit'
  const isCreating = mode === 'new'
  const id = useMemo(() => {
    const value = Number(query.get('id'))
    return Number.isNaN(value) ? null : value
  }, [query])

  // Se l'ID non è presente/valido reindirizza alla lista (salvo la creazione).
  useEffect(() => {
    if (isCreating) return
    if (!id) {
      navigate('/prodotti/lista', { replace: true })
    }
  }, [id, isCreating, navigate])

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    id_prodotto: null,
    codice: '',
    nome: '',
    id_categoria: '',
    prezzo_listino: '',
    id_iva: '',
    id_sdi_natura_iva: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [ivaOptions, setIvaOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])

  const [variazioni, setVariazioni] = useState([])
  const [assegnate, setAssegnate] = useState([])
  const [selectedVar, setSelectedVar] = useState('')
  const [importingCategory, setImportingCategory] = useState(false)
  // Prezzi combinati (multi-variazione)
  const [comboPrezzi, setComboPrezzi] = useState([])
  const [comboSelIds, setComboSelIds] = useState([])
  const [comboPrezzoVal, setComboPrezzoVal] = useState('')
  const [comboEditing, setComboEditing] = useState(false)
  const [comboSelByCat, setComboSelByCat] = useState({})
  const [comboGenerating, setComboGenerating] = useState(false)
  const [priceDiffAlert, setPriceDiffAlert] = useState({ show: false, current: null, calc: null })
  const [comboInlineEditKey, setComboInlineEditKey] = useState('')
  const [comboInlinePriceVal, setComboInlinePriceVal] = useState('')
  const [comboInlineSaving, setComboInlineSaving] = useState(false)
  const [stockArticles, setStockArticles] = useState([])
  const [comboConsumptionCountByKey, setComboConsumptionCountByKey] = useState({})
  const [variationConsumptionCountById, setVariationConsumptionCountById] = useState({})
  const [comboConsumptionRowsByKey, setComboConsumptionRowsByKey] = useState({})
  const [comboConsumptionLoadingByKey, setComboConsumptionLoadingByKey] = useState({})
  const [comboConsumptionSavingByKey, setComboConsumptionSavingByKey] = useState({})
  const [variationInlineEditById, setVariationInlineEditById] = useState({})
  const [variationInlineSavingById, setVariationInlineSavingById] = useState({})
  const [variationConsumptionRowsById, setVariationConsumptionRowsById] = useState({})
  const [variationConsumptionLoadingById, setVariationConsumptionLoadingById] = useState({})
  const [variationConsumptionSavingById, setVariationConsumptionSavingById] = useState({})
  // Raggruppamento combinazioni
  const [groupCat1, setGroupCat1] = useState('')
  const [groupCat2, setGroupCat2] = useState('')
  const [sorts, setSorts] = useState([
    { field: 'codice', dir: 'asc' },
    { field: 'categoria', dir: 'asc' },
    { field: 'nome', dir: 'asc' },
  ])
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  // In modalità "new" resetta completamente lo stato del form e delle sezioni correlate.
  useEffect(() => {
    if (!isCreating) return
    setForm({
      id_prodotto: null,
      codice: '',
      nome: '',
      id_categoria: '',
      prezzo_listino: '',
      id_iva: '',
      id_sdi_natura_iva: '',
    })
    setVariazioni([])
    setAssegnate([])
    setSelectedVar('')
    setComboPrezzi([])
    setComboSelIds([])
    setComboPrezzoVal('')
    setComboEditing(false)
    setComboSelByCat({})
    setComboGenerating(false)
    setStockArticles([])
    setComboConsumptionCountByKey({})
    setVariationConsumptionCountById({})
    setComboConsumptionRowsByKey({})
    setComboConsumptionLoadingByKey({})
    setComboConsumptionSavingByKey({})
    setVariationInlineEditById({})
    setVariationInlineSavingById({})
    setVariationConsumptionRowsById({})
    setVariationConsumptionLoadingById({})
    setVariationConsumptionSavingById({})
    setGroupCat1('')
    setGroupCat2('')
  }, [isCreating])

  // Mostra un toast temporaneo per feedback operazioni.
  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  // Normalizza una combinazione variazioni in chiave "id+id+id" ordinata.
  const normalizeComboKeyString = (value) => {
    const parts = String(value || '')
      .split('+')
      .map((v) => Number(v))
      .filter((n) => n > 0)
      .sort((a, b) => a - b)
    return parts.join('+')
  }

  // Conta quanti articoli di consumo sono associati a ogni combinazione.
  const buildConsumptionCountMap = (items) => {
    const map = {}
    for (const item of Array.isArray(items) ? items : []) {
      const key = normalizeComboKeyString(item?.combo_key)
      if (!key) continue
      if (!map[key]) map[key] = 0
      if (Number(item?.id_articolo) > 0) {
        map[key] += 1
      }
    }
    return map
  }

  // Conta quanti articoli di consumo sono associati a ogni singola variazione.
  const buildVariationConsumptionCountMap = (items) => {
    const map = {}
    for (const item of Array.isArray(items) ? items : []) {
      const idVariazione = Number(item?.id_variazione || 0)
      if (idVariazione <= 0) continue
      if (Number(item?.id_articolo) <= 0) continue
      if (!map[idVariazione]) map[idVariazione] = 0
      map[idVariazione] += 1
    }
    return map
  }

  // Ricarica i riepiloghi consumi da magazzino dopo salvataggi/mutazioni.
  const refreshConsumptionSummaries = async () => {
    const { items, articoli } = await fetchMagazzinoProductConsumptions({
      token,
      id_prodotto: id,
    })
    if (Array.isArray(articoli) && articoli.length > 0) {
      setStockArticles(articoli)
    }
    setComboConsumptionCountByKey(buildConsumptionCountMap(items))
    setVariationConsumptionCountById(buildVariationConsumptionCountMap(items))
  }

  // Carica dataset iniziali (prodotto, categorie, variazioni, combinazioni, IVA/nature).
  useEffect(() => {
    if (!token) return
    if (!isCreating && !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (isCreating) {
          const [{ items: cats }, { items: ivas }, { items: nats }] = await Promise.all([
            fetchCategorieProdotti({ token, signal: controller.signal }),
            fetchIvaList({ token, signal: controller.signal }),
            fetchNatureIva({ token, signal: controller.signal }),
          ])
          setCategories(cats)
          setIvaOptions(ivas)
          setNaturaOptions(nats)
          return
        }
        const [
          { items: cats },
          detail,
          { items: vars },
          { items: assigned },
          { items: combos },
          { items: ivas },
          { items: nats },
        ] = await Promise.all([
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
        // delta non più gestito: nessuna init
        setComboPrezzi(Array.isArray(combos) ? combos : [])
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
    }
    load()
    return () => controller.abort()
  }, [token, id, isCreating, logout])

  // Carica metadati consumi prodotto per badge/contatori nel dettaglio.
  useEffect(() => {
    if (!token || isCreating || !id) return
    let mounted = true
    const loadArticles = async () => {
      try {
        const { items, articoli } = await fetchMagazzinoProductConsumptions({
          token,
          id_prodotto: id,
        })
        if (!mounted) return
        setStockArticles(Array.isArray(articoli) ? articoli : [])
        setComboConsumptionCountByKey(buildConsumptionCountMap(items))
        setVariationConsumptionCountById(buildVariationConsumptionCountMap(items))
      } catch (_) {
        // no-op: la UI resta utilizzabile anche senza metadati articoli
      }
    }
    loadArticles()
    return () => {
      mounted = false
    }
  }, [token, isCreating, id])

  // Aggiorna i campi base del form prodotto.
  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Salva creazione/modifica anagrafica prodotto.
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
      if (isCreating) {
        const newProduct = await createProdotto({ token, body })
        showToast('Prodotto creato', 'success')
        const newId = newProduct?.id_prodotto
        if (newId) {
          navigate(`/prodotti/dettagli?id=${newId}`)
        }
        return
      }
      await updateProdotto({ token, body })
      showToast('Prodotto salvato', 'success')
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
      showToast(e.message || 'Errore salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Collega una variazione esistente al prodotto corrente.
  const handleLink = async () => {
    if (!selectedVar) return
    try {
      await linkProdottoVariazione({ token, id_prodotto: id, id_variazione: Number(selectedVar) })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
      setSelectedVar('')

      showToast('Variazione aggiunta', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore aggiunta variazione', 'error')
    }
  }

  // Importa in massa le variazioni della stessa categoria della variazione selezionata.
  const handleImportCategory = async () => {
    if (!selectedVar) return
    const selected = variazioniByCodice.find((v) => Number(v.id_variazione) === Number(selectedVar))
    if (!selected) return
    const category = String(selected.categoria || 'Altro')
    const byCategory = variazioniByCodice.filter((v) => String(v.categoria || 'Altro') === category)
    if (!byCategory.length) return

    const assignedSet = new Set((assegnate || []).map((v) => Number(v.id_variazione)))
    const toImport = byCategory.filter((v) => !assignedSet.has(Number(v.id_variazione)))
    if (!toImport.length) {
      showToast(`Tutte le variazioni della categoria "${category}" sono gia assegnate`, 'success')
      return
    }

    setImportingCategory(true)
    setError(null)
    try {
      const results = await Promise.allSettled(
        toImport.map((v) =>
          linkProdottoVariazione({
            token,
            id_prodotto: id,
            id_variazione: Number(v.id_variazione),
          }),
        ),
      )
      const okCount = results.filter((r) => r.status === 'fulfilled').length
      const koCount = results.length - okCount

      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)

      if (koCount > 0) {
        showToast(
          `Import completato parzialmente: ${okCount}/${results.length} in "${category}"`,
          'error',
        )
      } else {
        showToast(`Importate ${okCount} variazioni della categoria "${category}"`, 'success')
      }
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore import categoria variazioni', 'error')
    } finally {
      setImportingCategory(false)
    }
  }

  // Scollega una variazione dal prodotto.
  const handleUnlink = async (id_variazione) => {
    try {
      await unlinkProdottoVariazione({ token, id_prodotto: id, id_variazione })
      const { items } = await fetchProdottoVariazioni({ token, id_prodotto: id })
      setAssegnate(items)
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore rimozione variazione', 'error')
    }
  }

  // Delta prezzo rimosso: gestione centralizzata su Prezzi combinati

  // Crea/aggiorna una combinazione prezzo dalle variazioni selezionate.
  const handleComboAdd = async () => {
    if (!Array.isArray(comboSelIds) || comboSelIds.length === 0) return
    try {
      const prezzo = Number(comboPrezzoVal)
      await upsertProdottoPrezzoCombinato({ token, id_prodotto: id, var_ids: comboSelIds, prezzo })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      await refreshConsumptionSummaries()
      setComboSelIds([])
      setComboSelByCat({})
      setComboPrezzoVal('')
      setComboEditing(false)
      showToast('Prezzo combinato salvato', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio prezzo combinato', 'error')
    }
  }

  // Elimina una singola combinazione prezzo.
  const handleComboDelete = async (varIds) => {
    const key = buildComboKey(varIds)
    try {
      await deleteProdottoPrezzoCombinato({ token, id_prodotto: id, var_ids: varIds })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      if (key) {
        setComboConsumptionCountByKey((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
      if (key && comboInlineEditKey === key) {
        setComboInlineEditKey('')
        setComboInlinePriceVal('')
      }
      showToast('Prezzo combinato rimosso', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore rimozione prezzo combinato', 'error')
    }
  }

  // Elimina tutte le combinazioni prezzo del prodotto.
  const handleComboDeleteAll = async () => {
    if (!Array.isArray(comboPrezzi) || comboPrezzi.length === 0) return
    const confirmed = window.confirm('Confermi la rimozione di tutte le combinazioni prezzo?')
    if (!confirmed) return
    try {
      const rows = comboPrezzi.map((row) => ({
        var_ids: Array.isArray(row?.var_ids) ? row.var_ids : [],
      }))
      await bulkDeleteProdottoPrezziCombinati({
        token,
        id_prodotto: id,
        rows,
      })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      setComboInlineEditKey('')
      setComboInlinePriceVal('')
      setComboConsumptionCountByKey({})
      setComboConsumptionRowsByKey({})
      setComboConsumptionLoadingByKey({})
      setComboConsumptionSavingByKey({})
      showToast('Tutte le combinazioni sono state rimosse', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore rimozione combinazioni', 'error')
    }
  }

  const handleComboInlineEdit = (row) => {
    if (!row) return
    const key = buildComboKey(row?.var_ids)
    if (!key) return
    setComboInlineEditKey(key)
    setComboInlinePriceVal(String(getRowPrice(row)))
  }

  const handleComboInlineCancel = () => {
    setComboInlineEditKey('')
    setComboInlinePriceVal('')
  }

  // Salva la modifica inline del prezzo di combinazione.
  const handleComboInlineSave = async (row) => {
    const key = buildComboKey(row?.var_ids)
    if (!key) return
    const prezzo = Number(comboInlinePriceVal)
    if (!Number.isFinite(prezzo)) {
      showToast('Prezzo non valido', 'error')
      return
    }
    setComboInlineSaving(true)
    try {
      await upsertProdottoPrezzoCombinato({
        token,
        id_prodotto: id,
        var_ids: row?.var_ids,
        prezzo,
      })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      setComboInlineEditKey('')
      setComboInlinePriceVal('')
      showToast('Prezzo combinato aggiornato', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore aggiornamento prezzo combinato', 'error')
    } finally {
      setComboInlineSaving(false)
    }
  }

  const handleComboEdit = (row) => {
    if (!row) return
    const ids = Array.isArray(row.var_ids) ? row.var_ids.map(Number).filter((n) => n > 0) : []
    setComboSelIds(ids)
    const fallback = calcComboPrice(ids)
    setComboPrezzoVal(String(row.prezzo ?? fallback))
    if (row.prezzo !== null && row.prezzo !== undefined && isDiff(row.prezzo, fallback)) {
      setPriceDiffAlert({ show: true, current: Number(row.prezzo), calc: fallback })
    } else {
      setPriceDiffAlert({ show: false, current: null, calc: null })
    }
    setComboEditing(true)
    const next = {}
    ids.forEach((idv) => {
      const vv =
        comboOptions.find((x) => Number(x.id_variazione) === Number(idv)) ||
        variazioni.find((x) => Number(x.id_variazione) === Number(idv))
      const cat = String(vv?.categoria || 'Altro')
      next[cat] = String(idv)
    })
    setComboSelByCat(next)
    showToast('Modifica selezionata: aggiorna prezzo e salva', 'success')
  }

  const handleComboCancel = () => {
    setComboSelIds([])
    setComboPrezzoVal('')
    setComboEditing(false)
    setComboSelByCat({})
    setPriceDiffAlert({ show: false, current: null, calc: null })
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

  const comboOptionsByCategory = useMemo(() => {
    const map = {}
    for (const v of comboOptions) {
      const cat = String(v.categoria || 'Altro')
      if (!map[cat]) map[cat] = []
      map[cat].push(v)
    }
    Object.keys(map).forEach((k) => {
      // Ordina per codice (fallback al nome)
      const acmp = (x) => String(x?.codice || '').toLowerCase()
      const ncmp = (x) => String(x?.nome || '').toLowerCase()
      map[k].sort((a, b) => {
        const c = acmp(a).localeCompare(acmp(b))
        if (c !== 0) return c
        return ncmp(a).localeCompare(ncmp(b))
      })
    })
    return map
  }, [comboOptions])

  // Mappa id variazione -> dettaglio
  const varById = useMemo(() => {
    const map = {}
    for (const v of variazioni) {
      map[Number(v.id_variazione)] = v
    }
    for (const v of assegnate) {
      map[Number(v.id_variazione)] = { ...map[Number(v.id_variazione)], ...v }
    }
    return map
  }, [variazioni, assegnate])

  const baseListino = useMemo(() => {
    const n = Number(form.prezzo_listino)
    return Number.isFinite(n) ? n : 0
  }, [form.prezzo_listino])

  const calcComboPrice = (ids) => {
    const list = Array.isArray(ids) ? ids : []
    let total = baseListino
    for (const idv of list) {
      const vv = varById[Number(idv)]
      const p = Number(vv?.prezzo)
      if (Number.isFinite(p)) total += p
    }
    return total
  }

  const getRowPrice = (row) => {
    if (row && row.prezzo !== null && row.prezzo !== undefined && row.prezzo !== '') {
      const n = Number(row.prezzo)
      return Number.isFinite(n) ? n : 0
    }
    return calcComboPrice(row?.var_ids)
  }

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

  const buildComboKey = (ids) => {
    const clean = (Array.isArray(ids) ? ids : []).map(Number).filter((n) => n > 0)
    if (clean.length === 0) return ''
    clean.sort((a, b) => a - b)
    return clean.join('+')
  }

  const createEmptyConsumptionRow = () => ({
    id_articolo: '',
    quantita_per_unita: '1',
    scarto_percento: '0',
    attivo: 1,
  })

  const mapConsumptionItemsToRows = (items) => {
    const mapped = (Array.isArray(items) ? items : []).map((item) => ({
      id_articolo: item?.id_articolo ? String(item.id_articolo) : '',
      quantita_per_unita:
        item?.quantita_per_unita !== null && item?.quantita_per_unita !== undefined
          ? String(item.quantita_per_unita)
          : '1',
      scarto_percento:
        item?.scarto_percento !== null && item?.scarto_percento !== undefined
          ? String(item.scarto_percento)
          : '0',
      attivo: Number(item?.attivo) === 0 ? 0 : 1,
    }))
    return mapped.length > 0 ? mapped : [createEmptyConsumptionRow()]
  }

  const loadComboConsumptions = async (row) => {
    const comboKey = buildComboKey(row?.var_ids)
    if (!comboKey || comboConsumptionLoadingByKey[comboKey]) return
    setComboConsumptionLoadingByKey((prev) => ({ ...prev, [comboKey]: true }))
    try {
      const { items, articoli } = await fetchMagazzinoProductConsumptions({
        token,
        id_prodotto: id,
        combo_key: comboKey,
      })
      setComboConsumptionRowsByKey((prev) => ({
        ...prev,
        [comboKey]: mapConsumptionItemsToRows(items),
      }))
      setComboConsumptionCountByKey((prev) => ({
        ...prev,
        [comboKey]: (Array.isArray(items) ? items : []).filter(
          (item) => Number(item?.id_articolo) > 0,
        ).length,
      }))
      if (Array.isArray(articoli) && articoli.length > 0) {
        setStockArticles(articoli)
      }
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore caricamento articoli da scalare', 'error')
    } finally {
      setComboConsumptionLoadingByKey((prev) => ({ ...prev, [comboKey]: false }))
    }
  }

  const updateComboConsumptionRow = (comboKey, index, field, value) => {
    setComboConsumptionRowsByKey((prev) => {
      const rows = Array.isArray(prev[comboKey]) ? prev[comboKey] : [createEmptyConsumptionRow()]
      const next = rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      )
      return { ...prev, [comboKey]: next }
    })
  }

  const addComboConsumptionRow = (comboKey) => {
    setComboConsumptionRowsByKey((prev) => {
      const rows = Array.isArray(prev[comboKey]) ? prev[comboKey] : []
      return { ...prev, [comboKey]: [...rows, createEmptyConsumptionRow()] }
    })
  }

  const removeComboConsumptionRow = (comboKey, index) => {
    setComboConsumptionRowsByKey((prev) => {
      const rows = Array.isArray(prev[comboKey]) ? prev[comboKey] : []
      const next = rows.filter((_, rowIndex) => rowIndex !== index)
      return { ...prev, [comboKey]: next.length > 0 ? next : [createEmptyConsumptionRow()] }
    })
  }

  const saveComboConsumptions = async (row) => {
    const comboKey = buildComboKey(row?.var_ids)
    if (!comboKey) return
    const rows = Array.isArray(comboConsumptionRowsByKey[comboKey])
      ? comboConsumptionRowsByKey[comboKey]
      : [createEmptyConsumptionRow()]

    setComboConsumptionSavingByKey((prev) => ({ ...prev, [comboKey]: true }))
    try {
      await saveMagazzinoProductConsumptions({
        token,
        body: {
          id_prodotto: id,
          combo_key: comboKey,
          rows: rows.map((consumptionRow) => ({
            id_articolo: consumptionRow.id_articolo ? Number(consumptionRow.id_articolo) : null,
            quantita_per_unita: consumptionRow.quantita_per_unita,
            scarto_percento: consumptionRow.scarto_percento,
            attivo: Number(consumptionRow.attivo) === 0 ? 0 : 1,
          })),
        },
      })

      const { items } = await fetchMagazzinoProductConsumptions({
        token,
        id_prodotto: id,
        combo_key: comboKey,
      })
      setComboConsumptionRowsByKey((prev) => ({
        ...prev,
        [comboKey]: mapConsumptionItemsToRows(items),
      }))
      setComboConsumptionCountByKey((prev) => ({
        ...prev,
        [comboKey]: (Array.isArray(items) ? items : []).filter(
          (item) => Number(item?.id_articolo) > 0,
        ).length,
      }))
      showToast('Articoli da scalare salvati', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio articoli da scalare', 'error')
    } finally {
      setComboConsumptionSavingByKey((prev) => ({ ...prev, [comboKey]: false }))
    }
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
    if (!idVariazione || !id || variationConsumptionLoadingById[idVariazione]) return
    ensureVariationInlineEdit(variation)
    setVariationConsumptionLoadingById((prev) => ({ ...prev, [idVariazione]: true }))
    try {
      const { items, articoli } = await fetchMagazzinoProductConsumptions({
        token,
        id_prodotto: id,
        id_variazione: idVariazione,
      })
      setVariationConsumptionRowsById((prev) => ({
        ...prev,
        [idVariazione]: mapConsumptionItemsToRows(items),
      }))
      setVariationConsumptionCountById((prev) => ({
        ...prev,
        [idVariazione]: (Array.isArray(items) ? items : []).filter(
          (item) => Number(item?.id_articolo) > 0,
        ).length,
      }))
      if (Array.isArray(articoli) && articoli.length > 0) {
        setStockArticles(articoli)
      }
    } catch (e) {
      setError(e)
      setVariationConsumptionRowsById((prev) => ({
        ...prev,
        [idVariazione]: [createEmptyConsumptionRow()],
      }))
      showToast(e.message || 'Errore caricamento consumi variazione', 'error')
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
    try {
      await saveVariazione({
        token,
        id_variazione: idVariazione,
        nome,
        codice: String(edit.codice || '').trim() || null,
        categoria: String(edit.categoria || '').trim() || null,
        prezzo: edit.prezzo !== '' ? Number(edit.prezzo) : null,
      })
      const [{ items: vars }, { items: assigned }] = await Promise.all([
        fetchVariazioni({ token }),
        fetchProdottoVariazioni({ token, id_prodotto: id }),
      ])
      setVariazioni(vars)
      setAssegnate(assigned)
      showToast('Variazione aggiornata', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio variazione', 'error')
    } finally {
      setVariationInlineSavingById((prev) => ({ ...prev, [idVariazione]: false }))
    }
  }

  const updateVariationConsumptionRow = (idVariazione, index, field, value) => {
    setVariationConsumptionRowsById((prev) => {
      const rows = Array.isArray(prev[idVariazione])
        ? prev[idVariazione]
        : [createEmptyConsumptionRow()]
      const next = rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      )
      return { ...prev, [idVariazione]: next }
    })
  }

  const addVariationConsumptionRow = (idVariazione) => {
    setVariationConsumptionRowsById((prev) => {
      const rows = Array.isArray(prev[idVariazione]) ? prev[idVariazione] : []
      return { ...prev, [idVariazione]: [...rows, createEmptyConsumptionRow()] }
    })
  }

  const removeVariationConsumptionRow = (idVariazione, index) => {
    setVariationConsumptionRowsById((prev) => {
      const rows = Array.isArray(prev[idVariazione]) ? prev[idVariazione] : []
      const next = rows.filter((_, rowIndex) => rowIndex !== index)
      return { ...prev, [idVariazione]: next.length > 0 ? next : [createEmptyConsumptionRow()] }
    })
  }

  const saveVariationConsumptions = async (idVariazione) => {
    const variationId = Number(idVariazione || 0)
    if (!variationId || !id) return
    const rows = Array.isArray(variationConsumptionRowsById[variationId])
      ? variationConsumptionRowsById[variationId]
      : [createEmptyConsumptionRow()]
    setVariationConsumptionSavingById((prev) => ({ ...prev, [variationId]: true }))
    try {
      await saveMagazzinoProductConsumptions({
        token,
        body: {
          id_prodotto: id,
          id_variazione: variationId,
          rows: rows.map((row) => ({
            id_articolo: row.id_articolo ? Number(row.id_articolo) : null,
            quantita_per_unita: row.quantita_per_unita,
            scarto_percento: row.scarto_percento,
            attivo: Number(row.attivo) === 0 ? 0 : 1,
          })),
        },
      })
      const { items } = await fetchMagazzinoProductConsumptions({
        token,
        id_prodotto: id,
        id_variazione: variationId,
      })
      setVariationConsumptionRowsById((prev) => ({
        ...prev,
        [variationId]: mapConsumptionItemsToRows(items),
      }))
      setVariationConsumptionCountById((prev) => ({
        ...prev,
        [variationId]: (Array.isArray(items) ? items : []).filter(
          (item) => Number(item?.id_articolo) > 0,
        ).length,
      }))
      showToast('Consumi variazione salvati', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio consumi variazione', 'error')
    } finally {
      setVariationConsumptionSavingById((prev) => ({ ...prev, [variationId]: false }))
    }
  }

  const comboExistingKeys = useMemo(() => {
    const set = new Set()
    for (const r of comboPrezzi || []) {
      const ids = Array.isArray(r.var_ids) ? r.var_ids.map(Number).filter((n) => n > 0) : []
      if (ids.length === 0) continue
      ids.sort((a, b) => a - b)
      set.add(ids.join('+'))
    }
    return set
  }, [comboPrezzi])

  const comboByKey = useMemo(() => {
    const map = new Map()
    for (const r of comboPrezzi || []) {
      const key = buildComboKey(r.var_ids)
      if (key) map.set(key, r)
    }
    return map
  }, [comboPrezzi])

  const isDiff = (a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return false
    return Math.abs(na - nb) > 0.0001
  }

  // Genera automaticamente tutte le combinazioni mancanti tra categorie selezionate.
  const handleGenerateAllCombos = async () => {
    if (comboGenerating) return
    const cats = Object.keys(comboOptionsByCategory).sort((a, b) =>
      String(a).localeCompare(String(b)),
    )
    if (cats.length === 0) {
      showToast('Nessuna variazione assegnata al prodotto', 'error')
      return
    }
    const lists = cats.map((cat) =>
      comboOptionsByCategory[cat].map((v) => Number(v.id_variazione)).filter((n) => n > 0),
    )
    if (lists.some((l) => l.length === 0)) {
      showToast('Verifica le variazioni: almeno una categoria è vuota', 'error')
      return
    }
    let combos = [[]]
    for (const list of lists) {
      const next = []
      for (const base of combos) {
        for (const idv of list) next.push([...base, idv])
      }
      combos = next
    }
    const toCreate = []
    const seen = new Set()
    for (const combo of combos) {
      const key = buildComboKey(combo)
      if (!key || comboExistingKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      toCreate.push(key.split('+').map((n) => Number(n)))
    }
    setComboGenerating(true)
    try {
      if (toCreate.length === 0) {
        const rowsToFix = []
        for (const r of comboPrezzi || []) {
          const calc = calcComboPrice(r.var_ids)
          if (
            r.prezzo !== null &&
            r.prezzo !== undefined &&
            r.prezzo !== '' &&
            isDiff(r.prezzo, calc)
          ) {
            rowsToFix.push({ var_ids: r.var_ids, prezzo: calc })
          }
        }
        const fixed = rowsToFix.length
        if (fixed > 0) {
          await bulkUpsertProdottoPrezziCombinati({ token, id_prodotto: id, rows: rowsToFix })
          const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
          setComboPrezzi(items)
          await refreshConsumptionSummaries()
          showToast(`Ricalcolati ${fixed} prezzi combinati`, 'success')
        } else {
          showToast('Nessuna combinazione nuova e prezzi già corretti', 'success')
        }
        return
      }
      const rowsToCreate = toCreate.map((ids) => ({ var_ids: ids, prezzo: calcComboPrice(ids) }))
      await bulkUpsertProdottoPrezziCombinati({ token, id_prodotto: id, rows: rowsToCreate })
      const { items } = await fetchProdottoPrezziCombinati({ token, id_prodotto: id })
      setComboPrezzi(items)
      await refreshConsumptionSummaries()
      showToast(`Generate ${toCreate.length} combinazioni`, 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore generazione combinazioni', 'error')
    } finally {
      setComboGenerating(false)
    }
  }

  // Struttura raggruppata fino a 2 livelli, ordinabile per codice variazione
  const groupedData = useMemo(() => {
    if (!groupCat1) return null
    const groups = new Map()
    const sort1 = new Map() // label k1 -> sortKey (codice o nome)
    const sort2 = new Map() // parent+'||'+k2 -> sortKey (codice o nome)

    const findByCat = (list, cat) => list.find((d) => String(d?.categoria || '') === String(cat))

    for (const r of comboPrezzi || []) {
      const details = (r.var_ids || []).map((id) => varById[Number(id)]).filter(Boolean)
      const v1 = findByCat(details, groupCat1)
      const name1 = v1?.nome || '-'
      const code1 = (v1?.codice || name1).toLowerCase()
      const k1 = `${groupCat1} - ${name1}`
      sort1.set(k1, code1)

      const rest = details.filter(
        (d) =>
          String(d.categoria || '') !== String(groupCat1) &&
          (!groupCat2 || String(d.categoria || '') !== String(groupCat2)),
      )
      const restLabel =
        rest.length > 0
          ? rest.map((d) => (d.categoria ? `${d.categoria} - ${d.nome}` : d.nome)).join(', ')
          : '-'

      if (groupCat2) {
        const v2 = findByCat(details, groupCat2)
        const name2 = v2?.nome || '-'
        const code2 = (v2?.codice || name2).toLowerCase()
        const k2 = `${groupCat2} - ${name2}`
        const key2 = `${k1}||${k2}`
        sort2.set(key2, code2)
        if (!groups.has(k1)) groups.set(k1, new Map())
        const sub = groups.get(k1)
        if (!sub.has(k2)) sub.set(k2, [])
        sub.get(k2).push({ r, restLabel })
      } else {
        if (!groups.has(k1)) groups.set(k1, [])
        groups.get(k1).push({ r, restLabel })
      }
    }
    return { groups, sort1, sort2 }
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

  // Raggruppa Variazioni assegnate per categoria (default)
  const groupedAssegnate = useMemo(() => {
    const map = new Map()
    for (const v of sortedAssegnate) {
      const cat = String(v.categoria || 'Altro')
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(v)
    }
    // Ordina ciascun gruppo per codice (fallback nome)
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => {
        const ac = String(a?.codice || '').toLowerCase()
        const bc = String(b?.codice || '').toLowerCase()
        const cmp = ac.localeCompare(bc)
        if (cmp !== 0) return cmp
        return String(a?.nome || '')
          .toLowerCase()
          .localeCompare(String(b?.nome || '').toLowerCase())
      })
    }
    // Ordina i gruppi per nome categoria
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  }, [sortedAssegnate])

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

  const pageTitle = isCreating ? 'Prodotti - Nuovo prodotto' : 'Prodotti - Dettagli'

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{pageTitle}</h5>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/prodotti/lista')}>
            Torna alla lista
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner />
          </div>
        )}
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
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Prezzo listino</CFormLabel>
                  <CFormInput
                    type="number"
                    step="0.01"
                    name="prezzo_listino"
                    value={form.prezzo_listino}
                    onChange={onChange}
                  />
                </CCol>
              </CRow>
              <CRow className="g-3 mt-1">
                <CCol md={4}>
                  <CFormLabel>IVA predefinita</CFormLabel>
                  <CFormSelect
                    name="id_iva"
                    value={form.id_iva}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm((prev) => ({ ...prev, id_iva: val }))
                      const sel = ivaOptions.find((i) => String(i.id_iva) === String(val))
                      if (!sel || Number(sel.percento) !== 0) {
                        setForm((prev) => ({ ...prev, id_sdi_natura_iva: '' }))
                      }
                    }}
                  >
                    <option value="">--</option>
                    {ivaOptions.map((i) => (
                      <option key={i.id_iva} value={i.id_iva}>
                        {i.percento}%{i.descrizione ? ` - ${i.descrizione}` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Natura (se IVA 0%)</CFormLabel>
                  <CFormSelect
                    name="id_sdi_natura_iva"
                    value={form.id_sdi_natura_iva}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, id_sdi_natura_iva: e.target.value }))
                    }
                    disabled={
                      !form.id_iva ||
                      Number(
                        (ivaOptions.find((i) => String(i.id_iva) === String(form.id_iva)) || {})
                          .percento,
                      ) !== 0
                    }
                  >
                    <option value="">--</option>
                    {naturaOptions.map((n) => (
                      <option key={n.id_natura} value={n.id_natura}>
                        {n.code} - {n.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
              <div className="mt-3 d-flex gap-2">
                <PermissionButton
                  type="submit"
                  color="primary"
                  disabled={saving}
                  permission={isCreating ? 'prod.create' : 'prod.write'}
                >
                  Salva
                </PermissionButton>
              </div>
            </CForm>

            {!isCreating && (
              <>
                <h6 className="mb-3">Variazioni</h6>
                <CRow className="g-2 align-items-end mb-3">
                  <CCol md={6}>
                    <CFormSelect
                      value={selectedVar}
                      onChange={(e) => setSelectedVar(e.target.value)}
                    >
                      <option value="">Seleziona variazione da aggiungere...</option>
                      {(() => {
                        // Raggruppa tutte le variazioni per categoria per la selezione
                        const map = {}
                        for (const v of variazioniByCodice) {
                          const cat = String(v.categoria || 'Altro')
                          if (!map[cat]) map[cat] = []
                          map[cat].push(v)
                        }
                        const cats = Object.keys(map).sort((a, b) => a.localeCompare(b))
                        return cats.map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {map[cat]
                              .sort((a, b) => {
                                const ac = String(a?.codice || '').toLowerCase()
                                const bc = String(b?.codice || '').toLowerCase()
                                const cmp = ac.localeCompare(bc)
                                if (cmp !== 0) return cmp
                                return String(a?.nome || '')
                                  .toLowerCase()
                                  .localeCompare(String(b?.nome || '').toLowerCase())
                              })
                              .map((v) => (
                                <option key={v.id_variazione} value={v.id_variazione}>
                                  {v.codice ? `${v.codice} — ${v.nome}` : v.nome}
                                  {Number.isFinite(Number(v.prezzo)) ? ` (base ${v.prezzo})` : ''}
                                </option>
                              ))}
                          </optgroup>
                        ))
                      })()}
                    </CFormSelect>
                  </CCol>
                  <CCol md="auto">
                    <PermissionButton
                      color="primary"
                      onClick={handleLink}
                      disabled={!selectedVar}
                      permission="prod.write"
                    >
                      Aggiungi
                    </PermissionButton>
                  </CCol>
                  <CCol md="auto">
                    <PermissionButton
                      color="secondary"
                      variant="outline"
                      onClick={handleImportCategory}
                      disabled={!selectedVar || importingCategory}
                      permission="prod.write"
                    >
                      {importingCategory ? 'Importazione...' : 'Importa categoria'}
                    </PermissionButton>
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
                      Variazione{sortIndicator('nome')}
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

                {groupedAssegnate.map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <div className="fw-semibold mb-2">{cat}</div>
                    <CAccordion alwaysOpen>
                      {items.map((v) => {
                        const idVariazione = Number(v.id_variazione || 0)
                        const edit = variationInlineEditById[idVariazione] || {
                          nome: String(v.nome || ''),
                          codice: String(v.codice || ''),
                          categoria: String(v.categoria || ''),
                          prezzo:
                            v.prezzo !== null && v.prezzo !== undefined && v.prezzo !== ''
                              ? String(v.prezzo)
                              : '',
                        }
                        const consumptionRows = Array.isArray(
                          variationConsumptionRowsById[idVariazione],
                        )
                          ? variationConsumptionRowsById[idVariazione]
                          : [createEmptyConsumptionRow()]
                        const loadingConsumptions =
                          variationConsumptionLoadingById[idVariazione] === true
                        const savingConsumptions =
                          variationConsumptionSavingById[idVariazione] === true
                        const savingVariation = variationInlineSavingById[idVariazione] === true

                        return (
                          <CAccordionItem
                            key={idVariazione || v.nome}
                            itemKey={`var-${idVariazione || v.nome}`}
                          >
                            <CAccordionHeader onClick={() => loadVariationConsumptions(v)}>
                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-1 w-100 pe-2">
                                <span>
                                  {v.codice ? `${v.codice} - ` : ''}
                                  {v.nome || '-'}
                                </span>
                                <span className="text-body-secondary">
                                  Articoli:{' '}
                                  <strong>
                                    {Number(variationConsumptionCountById[idVariazione] || 0)}
                                  </strong>{' '}
                                  | Prezzo:{' '}
                                  <strong>
                                    {Number((v.prezzo ?? varById[idVariazione]?.prezzo) || 0)}
                                  </strong>
                                </span>
                              </div>
                            </CAccordionHeader>
                            <CAccordionBody>
                              <CRow className="g-2 align-items-end mb-3">
                                <CCol md={3}>
                                  <CFormLabel className="mb-1">Categoria</CFormLabel>
                                  <CFormInput
                                    value={edit.categoria}
                                    onChange={(event) =>
                                      updateVariationInlineField(
                                        idVariazione,
                                        'categoria',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </CCol>
                                <CCol md={3}>
                                  <CFormLabel className="mb-1">Nome</CFormLabel>
                                  <CFormInput
                                    value={edit.nome}
                                    onChange={(event) =>
                                      updateVariationInlineField(
                                        idVariazione,
                                        'nome',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </CCol>
                                <CCol md={2}>
                                  <CFormLabel className="mb-1">Codice</CFormLabel>
                                  <CFormInput
                                    value={edit.codice}
                                    onChange={(event) =>
                                      updateVariationInlineField(
                                        idVariazione,
                                        'codice',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </CCol>
                                <CCol md={2}>
                                  <CFormLabel className="mb-1">Prezzo</CFormLabel>
                                  <CFormInput
                                    type="number"
                                    step="0.01"
                                    value={edit.prezzo}
                                    onChange={(event) =>
                                      updateVariationInlineField(
                                        idVariazione,
                                        'prezzo',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </CCol>
                                <CCol md="auto" className="d-flex gap-2">
                                  <PermissionButton
                                    color="primary"
                                    size="sm"
                                    onClick={() => saveVariationInline(v)}
                                    disabled={savingVariation}
                                    permission="prod.write"
                                  >
                                    {savingVariation ? 'Salvataggio...' : 'Salva variazione'}
                                  </PermissionButton>
                                  <PermissionButton
                                    color="danger"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnlink(v.id_variazione)}
                                    permission="prod.delete"
                                  >
                                    Rimuovi
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
                                      {consumptionRows.map((row, index) => (
                                        <CTableRow key={`var-${idVariazione}-cons-${index}`}>
                                          <CTableDataCell>
                                            <CFormSelect
                                              value={row.id_articolo}
                                              onChange={(event) =>
                                                updateVariationConsumptionRow(
                                                  idVariazione,
                                                  index,
                                                  'id_articolo',
                                                  event.target.value,
                                                )
                                              }
                                            >
                                              <option value="">Seleziona articolo</option>
                                              {stockArticles.map((article) => (
                                                <option
                                                  key={article.id_articolo || article.id_prodotto}
                                                  value={article.id_articolo || article.id_prodotto}
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
                                                removeVariationConsumptionRow(idVariazione, index)
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
                                      onClick={() => addVariationConsumptionRow(idVariazione)}
                                    >
                                      Aggiungi articolo
                                    </CButton>
                                    <PermissionButton
                                      color="primary"
                                      size="sm"
                                      onClick={() => saveVariationConsumptions(idVariazione)}
                                      disabled={savingConsumptions}
                                      permission="prod.write"
                                    >
                                      {savingConsumptions ? 'Salvataggio...' : 'Salva articoli'}
                                    </PermissionButton>
                                  </div>
                                </>
                              )}
                            </CAccordionBody>
                          </CAccordionItem>
                        )
                      })}
                    </CAccordion>
                  </div>
                ))}

                <hr className="my-4" />
                <h6 className="mb-3">Prezzi combinati (multi-variazione)</h6>
                <CRow className="g-2 align-items-end mb-2">
                  {Object.keys(comboOptionsByCategory)
                    .sort((a, b) => String(a).localeCompare(String(b)))
                    .map((cat) => (
                      <CCol md={4} key={cat}>
                        <CFormLabel>{cat}</CFormLabel>
                        <CFormSelect
                          value={comboSelByCat[cat] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setComboSelByCat((prev) => ({ ...prev, [cat]: val }))
                            const ids = Object.values({ ...comboSelByCat, [cat]: val })
                              .map((v) => Number(v))
                              .filter((n) => n > 0)
                            setComboSelIds(ids)
                            const key = buildComboKey(ids)
                            const existing = key ? comboByKey.get(key) : null
                            const calc = calcComboPrice(ids)
                            if (
                              existing &&
                              existing.prezzo !== null &&
                              existing.prezzo !== undefined &&
                              existing.prezzo !== ''
                            ) {
                              setComboPrezzoVal(String(existing.prezzo))
                              if (isDiff(existing.prezzo, calc)) {
                                setPriceDiffAlert({
                                  show: true,
                                  current: Number(existing.prezzo),
                                  calc,
                                })
                              } else {
                                setPriceDiffAlert({ show: false, current: null, calc: null })
                              }
                            } else {
                              setComboPrezzoVal(String(calc))
                              setPriceDiffAlert({ show: false, current: null, calc: null })
                            }
                          }}
                        >
                          <option value="">--</option>
                          {comboOptionsByCategory[cat].map((v) => (
                            <option key={v.id_variazione} value={v.id_variazione}>
                              {v.nome}
                              {v.codice ? ` [${v.codice}]` : ''}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                    ))}
                  <CCol md={3}>
                    <CFormLabel>Prezzo</CFormLabel>
                    <CFormInput
                      type="number"
                      step="0.01"
                      value={comboPrezzoVal}
                      onChange={(e) => setComboPrezzoVal(e.target.value)}
                      placeholder="Es. 0.65"
                    />
                    {priceDiffAlert.show && (
                      <CAlert color="warning" className="mt-2 py-2">
                        Prezzo salvato diverso dal ricalcolo. Vuoi aggiornare?
                        <div className="mt-2 d-flex gap-2">
                          <CButton
                            color="warning"
                            size="sm"
                            onClick={() => {
                              setComboPrezzoVal(String(priceDiffAlert.calc))
                              setPriceDiffAlert({ show: false, current: null, calc: null })
                            }}
                          >
                            Ricalcola
                          </CButton>
                          <CButton
                            color="secondary"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPriceDiffAlert({ show: false, current: null, calc: null })
                            }
                          >
                            Mantieni
                          </CButton>
                        </div>
                      </CAlert>
                    )}
                  </CCol>
                  <CCol md="auto" className="d-flex gap-2">
                    <PermissionButton
                      color="primary"
                      variant="outline"
                      onClick={handleComboAdd}
                      disabled={comboSelIds.length === 0}
                      permission="prod.write"
                    >
                      {comboEditing ? 'Salva' : 'Aggiungi'}
                    </PermissionButton>
                    <PermissionButton
                      color="secondary"
                      variant="outline"
                      onClick={handleGenerateAllCombos}
                      disabled={comboGenerating || Object.keys(comboOptionsByCategory).length === 0}
                      permission="prod.write"
                    >
                      {comboGenerating ? 'Generazione...' : 'Genera combinazioni'}
                    </PermissionButton>
                    <PermissionButton
                      color="danger"
                      variant="outline"
                      onClick={handleComboDeleteAll}
                      disabled={!comboPrezzi?.length}
                      permission="prod.delete"
                    >
                      Rimuovi tutti
                    </PermissionButton>
                    {comboEditing && (
                      <CButton color="secondary" variant="outline" onClick={handleComboCancel}>
                        Annulla
                      </CButton>
                    )}
                  </CCol>
                </CRow>

                {(!comboPrezzi || comboPrezzi.length === 0) && (
                  <CAlert color="light" className="mb-0">
                    Nessun prezzo combinato
                  </CAlert>
                )}
                {!!comboPrezzi?.length && (
                  <CAccordion alwaysOpen>
                    {comboPrezzi.map((r, idx) => {
                      const comboKey = buildComboKey(r.var_ids)
                      const labels = Array.isArray(r.var_ids)
                        ? r.var_ids.map((idv) => {
                            const vv =
                              assegnate.find((x) => Number(x.id_variazione) === Number(idv)) ||
                              variazioni.find((x) => Number(x.id_variazione) === Number(idv))
                            return vv
                              ? vv.categoria
                                ? `${vv.categoria} - ${vv.nome}`
                                : vv.nome
                              : String(idv)
                          })
                        : []
                      const consumptionRows = Array.isArray(comboConsumptionRowsByKey[comboKey])
                        ? comboConsumptionRowsByKey[comboKey]
                        : [createEmptyConsumptionRow()]
                      const loadingConsumptions = comboConsumptionLoadingByKey[comboKey] === true
                      const savingConsumptions = comboConsumptionSavingByKey[comboKey] === true
                      const articleCount = Array.isArray(comboConsumptionRowsByKey[comboKey])
                        ? comboConsumptionRowsByKey[comboKey].filter(
                            (entry) => Number(entry?.id_articolo) > 0,
                          ).length
                        : Number(comboConsumptionCountByKey[comboKey] || 0)
                      return (
                        <CAccordionItem
                          itemKey={comboKey || `combo-${idx}`}
                          key={comboKey || `combo-${idx}`}
                        >
                          <CAccordionHeader onClick={() => loadComboConsumptions(r)}>
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-1 w-100 pe-2">
                              <span>{labels.join(', ') || `Combinazione #${idx + 1}`}</span>
                              <span className="text-body-secondary">
                                Articoli: <strong>{articleCount}</strong> | Prezzo:{' '}
                                <strong>{getRowPrice(r)}</strong>
                              </span>
                            </div>
                          </CAccordionHeader>
                          <CAccordionBody>
                            <div className="d-flex flex-wrap gap-2 justify-content-end mb-3">
                              <PermissionButton
                                color="primary"
                                size="sm"
                                variant="outline"
                                onClick={() => handleComboInlineEdit(r)}
                                permission="prod.write"
                              >
                                Modifica prezzo
                              </PermissionButton>
                              <PermissionButton
                                color="danger"
                                size="sm"
                                variant="outline"
                                onClick={() => handleComboDelete(r.var_ids)}
                                permission="prod.delete"
                              >
                                Rimuovi combinazione
                              </PermissionButton>
                            </div>
                            {comboInlineEditKey === comboKey && (
                              <div className="border rounded p-2 mb-3">
                                <CRow className="g-2 align-items-end">
                                  <CCol md={4}>
                                    <CFormLabel className="mb-1">Prezzo combinazione</CFormLabel>
                                    <CFormInput
                                      type="number"
                                      step="0.01"
                                      value={comboInlinePriceVal}
                                      onChange={(event) =>
                                        setComboInlinePriceVal(event.target.value)
                                      }
                                    />
                                  </CCol>
                                  <CCol md="auto" className="d-flex gap-2">
                                    <PermissionButton
                                      color="primary"
                                      size="sm"
                                      onClick={() => handleComboInlineSave(r)}
                                      disabled={comboInlineSaving}
                                      permission="prod.write"
                                    >
                                      {comboInlineSaving ? 'Salvataggio...' : 'Salva prezzo'}
                                    </PermissionButton>
                                    <CButton
                                      color="secondary"
                                      size="sm"
                                      variant="outline"
                                      onClick={handleComboInlineCancel}
                                      disabled={comboInlineSaving}
                                    >
                                      Annulla
                                    </CButton>
                                  </CCol>
                                </CRow>
                              </div>
                            )}

                            <h6 className="mb-2">Articoli da scalare a magazzino</h6>
                            {loadingConsumptions ? (
                              <div className="d-flex justify-content-center py-3">
                                <CSpinner size="sm" />
                              </div>
                            ) : (
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
                                    {consumptionRows.map((consumptionRow, rowIndex) => (
                                      <CTableRow key={`${comboKey || idx}-cons-${rowIndex}`}>
                                        <CTableDataCell>
                                          <CFormSelect
                                            value={consumptionRow.id_articolo}
                                            onChange={(event) =>
                                              updateComboConsumptionRow(
                                                comboKey,
                                                rowIndex,
                                                'id_articolo',
                                                event.target.value,
                                              )
                                            }
                                          >
                                            <option value="">Seleziona articolo</option>
                                            {stockArticles.map((article) => (
                                              <option
                                                key={article.id_articolo || article.id_prodotto}
                                                value={article.id_articolo || article.id_prodotto}
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
                                            value={consumptionRow.quantita_per_unita}
                                            onChange={(event) =>
                                              updateComboConsumptionRow(
                                                comboKey,
                                                rowIndex,
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
                                            value={consumptionRow.scarto_percento}
                                            onChange={(event) =>
                                              updateComboConsumptionRow(
                                                comboKey,
                                                rowIndex,
                                                'scarto_percento',
                                                event.target.value,
                                              )
                                            }
                                          />
                                        </CTableDataCell>
                                        <CTableDataCell>
                                          <CFormSelect
                                            value={consumptionRow.attivo}
                                            onChange={(event) =>
                                              updateComboConsumptionRow(
                                                comboKey,
                                                rowIndex,
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
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              removeComboConsumptionRow(comboKey, rowIndex)
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
                                    onClick={() => addComboConsumptionRow(comboKey)}
                                  >
                                    Aggiungi articolo
                                  </CButton>
                                  <PermissionButton
                                    color="primary"
                                    size="sm"
                                    onClick={() => saveComboConsumptions(r)}
                                    disabled={savingConsumptions}
                                    permission="prod.write"
                                  >
                                    {savingConsumptions ? 'Salvataggio...' : 'Salva articoli'}
                                  </PermissionButton>
                                </div>
                              </>
                            )}
                          </CAccordionBody>
                        </CAccordionItem>
                      )
                    })}
                  </CAccordion>
                )}
              </>
            )}
            <BottomToast open={toast.open} type={toast.type} message={toast.message} />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProdottiDetail
