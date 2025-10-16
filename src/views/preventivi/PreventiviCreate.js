import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
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
import { cilPlus, cilTrash, cilSave, cilCheckCircle } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { createPreventivo, fetchPreventivoOggettiOptions, createPreventivoOggettoOption } from '../../services/preventivi'
import { CMultiSelect } from '@coreui/react-pro'
import { fetchCategorieProdotti, fetchProdotti, fetchNatureIva, fetchProdottoVariazioni, fetchProdottoPrezziCombinati } from '../../services/prodotti'
import { fetchPacchetti, fetchPacchettoDetail } from '../../services/pacchetti'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter } from '@coreui/react'
import { CAutocomplete, CStepper } from '@coreui/react-pro'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? currencyFormatter.format(n) : '-'
}

const PreventiviCreate = () => {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  // Sezione: Dati generali
  const [clienteSearch, setClienteSearch] = useState('')
  const [loadingClienti, setLoadingClienti] = useState(false)
  const [allClientiOptions, setAllClientiOptions] = useState([])
  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [dataPreventivo, setDataPreventivo] = useState(() => new Date().toISOString().slice(0, 10))
  const [oggetto, setOggetto] = useState('')
  const [oggettiOptions, setOggettiOptions] = useState([])
  const [selectedOggetti, setSelectedOggetti] = useState([])
  const [rifCliente, setRifCliente] = useState('')
  const [note, setNote] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [idPreventivo, setIdPreventivo] = useState(null)

  // Sezione: Righe preventivo
  const [righe, setRighe] = useState([])

  // Stepper prodotti (modal wizard)
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  const [variazione, setVariazione] = useState('')
  // Variazioni/combos del prodotto selezionato
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  // Campi riepilogo
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)
  const [selIva, setSelIva] = useState('')
  const [selNatura, setSelNatura] = useState('')

  // Pacchetti (modal selezione)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgOptions, setPkgOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)
  const lastClienteQueryRef = useRef('')

  // Carica tutti i clienti attivi (tutte le pagine) una volta, poi filtra in locale
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoadingClienti(true)
      setLoadError(null)
      try {
        // Carica TUTTI i risultati (tutte le pagine) per la ricerca su ragione sociale o P.IVA
        const PAGE_SIZE = 100 // backend limita per_page a 100
        const first = await fetchAnagrafiche({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: PAGE_SIZE,
          // sempre tutte (ricerca applicata in locale)
          sortBy: 'ragione_sociale',
          sortDirection: 'asc',
        })

        let allItems = Array.isArray(first.items) ? [...first.items] : []
        const totalPages = Math.max(first?.meta?.pages ?? first?.meta?.last_page ?? 1, 1)
        const perPage = first?.meta?.per_page ?? (allItems.length || PAGE_SIZE)

        if (totalPages > 1) {
          for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
            if (controller.signal.aborted) return
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
            })
            if (Array.isArray(pageItems) && pageItems.length > 0) {
              allItems = allItems.concat(pageItems)
            }
          }
        } else {
          // Fallback: se meta non fornisce il numero di pagine ma la prima pagina è piena, continua a scaricare
          let nextPage = 2
          let safety = 0
          while (!controller.signal.aborted && allItems.length > 0 && allItems.length % perPage === 0 && safety < 100) {
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
            })
            if (!Array.isArray(pageItems) || pageItems.length === 0) break
            allItems = allItems.concat(pageItems)
            nextPage += 1
            safety += 1
            if (pageItems.length < perPage) break
          }
        }

        // Ordina comunque per sicurezza e deduplica per id
        const mapById = new Map()
        for (const c of allItems) {
          const id = c?.id_anagrafica ?? c?.id
          if (id !== undefined && id !== null && !mapById.has(id)) {
            mapById.set(id, c)
          }
        }
        const normalized = Array.from(mapById.values()).sort((a, b) => {
          const A = String(a?.ragione_sociale ?? '').toLowerCase()
          const B = String(b?.ragione_sociale ?? '').toLowerCase()
          return A.localeCompare(B)
        })

        setAllClientiOptions(normalized)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setLoadError(e)
        setAllClientiOptions([])
      } finally {
        setLoadingClienti(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica opzioni per "Oggetto preventivo"
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const opts = await fetchPreventivoOggettiOptions({ token, signal: controller.signal })
        setOggettiOptions(opts)
      } catch (e) {
        // fallback: default static options
        setOggettiOptions([
          { value: 1, label: 'Stampa' },
          { value: 2, label: 'Imbustamento' },
          { value: 3, label: 'Cellophanatura' },
          { value: 4, label: 'Posta Digitale' },
        ])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  // L'oggetto testuale viene calcolato dal backend dai label selezionati.

  const clientiOptions = useMemo(() => {
    if (!Array.isArray(allClientiOptions)) return []
    const q = (clienteSearch || '').trim().toLowerCase()
    if (q === '') return allClientiOptions
    const norm = (s) => String(s || '').toLowerCase()
    return allClientiOptions.filter((c) => {
      const rs = norm(c.ragione_sociale)
      const piva = norm(c.piva).replace(/[ .-]/g, '')
      const cf = norm(c.codice_fiscale)
      return rs.includes(q) || piva.includes(q.replace(/[ .-]/g, '')) || cf.includes(q)
    })
  }, [allClientiOptions, clienteSearch])

  const clientiAutocompleteOptions = useMemo(() => {
    return clientiOptions
      .map((c) => {
        const rawId = c?.id_anagrafica ?? c?.id
        if (rawId == null || rawId === '') {
          return null
        }
        const numericId = Number(rawId)
        if (!Number.isFinite(numericId)) {
          return null
        }
        const ragione = String(c?.ragione_sociale || '').trim()
        const codiceCliente = String(c?.codice_cliente || '').trim()
        const piva = String(c?.piva || '').trim()
        const codiceFiscale = String(c?.codice_fiscale || '').trim()
        return {
          label: ragione || '--',
          value: numericId,
          ragioneSociale: ragione || '--',
          codiceCliente: codiceCliente || null,
          piva: piva || null,
          codiceFiscale: codiceFiscale || null,
        }
      })
      .filter(Boolean)
  }, [clientiOptions])

  const selectedClienteValue = useMemo(() => {
    if (idAnagrafica === '' || idAnagrafica == null) {
      return undefined
    }
    const numeric = Number(idAnagrafica)
    return Number.isFinite(numeric) ? numeric : undefined
  }, [idAnagrafica])

  // Carica categorie e nature IVA per stepper
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: cats }, { items: nats }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
        ])
        setCatOptions(cats)
        setNaturaOptions(nats)
      } catch (_e) { }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica prodotti in base a categoria/ricerca
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({ token, id_categoria: idcat, q: prodSearch, signal: controller.signal })
        setProdOptions(items)
      } catch (_e) {
        setProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  // Carica variazioni + prezzi combinati quando seleziono un prodotto
  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    if (!token) return
    if (!selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items)
          ? [...items].sort((a, b) => String(a?.codice || '').localeCompare(String(b?.codice || '')) || String(a?.nome || '').localeCompare(String(b?.nome || '')))
          : []
        setProdVarOptions(sorted)
        const cmap = {}
        const rows = Array.isArray(combo?.items) ? combo.items : []
        rows.forEach((r) => { if (r?.combo_key) cmap[String(r.combo_key)] = Number(r.prezzo) || 0 })
        setProdComboMap(cmap)
        setProdComboList(rows)
      } catch (_e) {
        setProdVarOptions([])
        setProdComboMap({})
        setProdComboList([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selProd])

  // Carica lista pacchetti quando apro modal o modifico ricerca
  useEffect(() => {
    if (!token) return
    if (!pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({
          token,
          q: pkgSearch,
          onlyActive: pkgOnlyActive,
          signal: controller.signal,
        })
        setPkgOptions(items)
      } catch (_e) {
        setPkgOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  // Carica righe del pacchetto selezionato
  useEffect(() => {
    if (!token || !pkgOpen) return
    if (!selPacchetto) { setPkgPreview([]); return }
    const controller = new AbortController()
    const loadDetail = async () => {
      try {
        const { righe } = await fetchPacchettoDetail({ token, id: Number(selPacchetto), signal: controller.signal })
        setPkgPreview(righe)
      } catch (_e) {
        setPkgPreview([])
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  // Calcola prezzo suggerito in base a prodotto e combinazione selezionata (o delta variazioni)
  useEffect(() => {
    const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey = selectedComboKey && String(selectedComboKey).trim() !== ''
      ? selectedComboKey
      : (selectedVarIds
        .map((id) => Number(id) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .join('+'))
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const delta = prodVarOptions
      .filter((v) => selectedVarIds.includes(v.id_variazione))
      .reduce((acc, v) => acc + (Number(v.delta_prezzo) || 0), 0)
    const suggested = comboPrice != null ? comboPrice : base + delta
    setModalPrice(suggested)
  }, [selProd, prodOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setSelIva('')
    setSelNatura('')
    setModalQty(1)
    setModalPrice(0)
  }

  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgOptions([])
    setPkgPreview([])
    setPkgOnlyActive(true)
  }

  // Calcola un testo "oggetto" coerente dalle opzioni selezionate (fallback al testo manuale se presente)
  const computedOggettoText = useMemo(() => {
    const manual = String(oggetto || '').trim()
    if (manual) return manual
    const map = new Map((Array.isArray(oggettiOptions) ? oggettiOptions : []).map((o) => [String(o.value), String(o.label || '')]))
    const labels = (Array.isArray(selectedOggetti) ? selectedOggetti : [])
      .map((v) => map.get(String(v)))
      .filter(Boolean)
    return labels.join(' - ')
  }, [oggetto, oggettiOptions, selectedOggetti])

  const handleAddRiga = () => {
    setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }))
  }
  const handleRemoveRiga = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }
  const updateRiga = (index, patch) => {
    setRighe((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  // Calcoli totali
  const totals = useMemo(() => {
    let imponibile = 0
    let totaleIva = 0
    for (const r of righe) {
      const q = Number(r.quantita) || 0
      const p = Number(r.prezzo) || 0
      const s = Number(r.sconto) || 0
      const aliquota = Number(r.iva) || 0
      const rigaImpon = Math.max(0, q * p * (1 - s / 100))
      const rigaIva = rigaImpon * (aliquota / 100)
      imponibile += rigaImpon
      totaleIva += rigaIva
    }
    const totale = imponibile + totaleIva
    return { imponibile, totaleIva, totale }
  }, [righe])

  // Submit placeholders (no-op per ora)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  const buildNavigationPrefill = () => {
    const hasId = idAnagrafica != null && idAnagrafica !== ''
    const numericId = hasId ? Number(idAnagrafica) : null

    const rawCliente = hasId
      ? allClientiOptions.find(
          (c) =>
            Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(idAnagrafica),
        ) ?? null
      : null

    const clienteOption = hasId
      ? clientiAutocompleteOptions.find(
          (opt) => Number(opt.value) === Number(idAnagrafica),
        ) ?? null
      : null

    const clienteLabel =
      (clienteOption?.ragioneSociale ?? clienteOption?.label) ??
      (rawCliente?.ragione_sociale ?? rawCliente?.ragioneSociale ?? null)

    return {
      id_anagrafica: Number.isFinite(numericId) && numericId > 0 ? numericId : null,
      data_preventivo: dataPreventivo || '',
      note,
      oggetto,
      oggetti: Array.isArray(selectedOggetti) ? selectedOggetti.slice() : [],
      riferimento_cliente: rifCliente,
      clienteLabel: clienteLabel ?? '',
      cliente: clienteOption
        ? {
            id: Number(clienteOption.value),
            label: clienteOption.ragioneSociale ?? clienteOption.label ?? '',
            codiceCliente: clienteOption.codiceCliente ?? null,
            piva: clienteOption.piva ?? null,
            codiceFiscale: clienteOption.codiceFiscale ?? null,
          }
        : rawCliente
        ? {
            id: Number(rawCliente.id_anagrafica ?? rawCliente.id ?? 0),
            label: rawCliente.ragione_sociale ?? rawCliente.ragioneSociale ?? '',
            codiceCliente: rawCliente.codice_cliente ?? null,
            piva: rawCliente.piva ?? null,
            codiceFiscale: rawCliente.codice_fiscale ?? null,
          }
        : null,
    }
  }

  const buildPayload = () => {
    return {
      id_preventivo: idPreventivo ?? undefined,
      id_anagrafica: Number(idAnagrafica) || 0,
      data_preventivo: dataPreventivo,
      note,
      oggetto: computedOggettoText,
      oggetti: selectedOggetti.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0),
      riferimento_cliente: rifCliente,
      righe,
      totals: {
        imponibile: totals.imponibile,
        totaleIva: totals.totaleIva,
        totale: totals.totale,
        sconto: 0,
      },
    }
  }

  const handleSalvaBozza = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({
        token,
        ...payload,
        send: false,
        signal: controller.signal,
      })
      if (result?.id_preventivo) {
        setIdPreventivo(result.id_preventivo)
        navigate(`/preventivi/dettagli?id=${result.id_preventivo}`, {
          state: { prefill: buildNavigationPrefill(), fromCreate: true },
        })
        return
      }
      setSubmitSuccess('Bozza salvata.')
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConferma = async (e) => {
    e.preventDefault()
    const wantsSend = window.confirm(
      'Vuoi inviare il preventivo ora? Se scegli No, verrà salvato come bozza.',
    )
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({
        token,
        ...payload,
        send: wantsSend,
        signal: controller.signal,
      })
      if (result?.id_preventivo) {
        setIdPreventivo(result.id_preventivo)
        navigate(`/preventivi/dettagli?id=${result.id_preventivo}`, {
          state: { prefill: buildNavigationPrefill(), fromCreate: true },
        })
        return
      }
      setSubmitSuccess('Preventivo salvato.')
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Preventivi - Crea nuovo</h5>
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleConferma}>
          {submitError && (
            <CAlert color="danger" className="mb-3">
              {submitError?.payload?.message ||
                submitError.message ||
                'Errore durante il salvataggio.'}
            </CAlert>
          )}
          {submitSuccess && (
            <CAlert color="success" className="mb-3">
              {submitSuccess}
            </CAlert>
          )}
          <section className="mb-4">
            <h6 className="mb-3 text-body-secondary">Dati generali</h6>
            {loadError && (
              <CAlert color="danger">
                {loadError.message || 'Errore nel caricamento dei clienti.'}
              </CAlert>
            )}

            <CModal visible={stepperOpen} onClose={() => setStepperOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Selettore prodotti</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CStepper
                  activeStepNumber={prodStep}
                  steps={['Categoria', 'Prodotto', 'Variazioni', 'Riepilogo']}
                  linear={false}
                  validation={false}
                  onStepChange={(n) => {
                    // Always allow going back
                    if (n <= prodStep) {
                      setProdStep(n)
                      return
                    }
                    // Forward navigation with prerequisites
                    if (n === 2) {
                      setProdStep(2)
                      return
                    }
                    if (n === 3) {
                      if (!selProd) return
                      if (Array.isArray(prodComboList) && prodComboList.length > 0) {
                        setProdStep(3)
                      } else {
                        // No combinations: go directly to summary
                        setProdStep(4)
                      }
                      return
                    }
                    if (n === 4) {
                      if (!selProd) return
                      setProdStep(4)
                      return
                    }
                  }}
                />
                {prodStep === 1 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Categoria prodotto</CFormLabel>
                      <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)}>
                        <option value="">Tutte</option>
                        {catOptions.map((c) => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
                {prodStep === 2 && (
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel>Prodotto</CFormLabel>
                      <CFormSelect
                        value={selProd}
                        onChange={(e) => {
                          const pid = e.target.value
                          setSelProd(pid)
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                          if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                        }}
                      >
                        <option value="">Seleziona...</option>
                        {prodOptions.map((p) => (
                          <option key={p.id_prodotto} value={p.id_prodotto}>
                            {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Ricerca</CFormLabel>
                      <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                    </CCol>
                  </CRow>
                )}
                {prodStep === 3 && (
                  <CRow className="g-3">
                    {prodComboList.length > 0 ? (
                      <CCol md={12}>
                        <CFormLabel>Combinazioni</CFormLabel>
                        <CFormSelect
                          value={selectedComboKey}
                          onChange={(e) => {
                            const key = e.target.value
                            setSelectedComboKey(key)
                            const opt = prodComboList.find((r) => String(r.combo_key) === String(key))
                            if (!opt) { setSelectedVarIds([]); return }
                            const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                            setSelectedVarIds(ids)
                          }}
                        >
                          <option value="">Seleziona una combinazione…</option>
                          {prodComboList.map((r, idx) => {
                            const ids = Array.isArray(r.var_ids) ? r.var_ids : String(r.combo_key).split('+').map((x) => Number(x) || 0)
                            const groups = {}
                            ids.forEach((idv) => {
                              const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                              const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                              const nm = vv ? String(vv.nome) : String(idv)
                              if (!groups[cat]) groups[cat] = []
                              groups[cat].push(nm)
                            })
                            const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                            return (
                              <option key={r.combo_key || idx} value={r.combo_key}>
                                {label || r.combo_key}
                              </option>
                            )
                          })}
                        </CFormSelect>
                      </CCol>
                    ) : (
                      <CCol md={12}>
                        <CAlert color="info" className="mb-0">Nessuna variazione combinata definita per il prodotto selezionato.</CAlert>
                      </CCol>
                    )}
                  </CRow>
                )}
                {prodStep === 4 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <div className="mb-2"><strong>Prodotto:</strong> {(() => { const p = prodOptions.find((x) => String(x.id_prodotto) === String(selProd)); return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-' })()}</div>
                      {(() => {
                        const ids = selectedComboKey
                          ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        if (!ids || ids.length === 0) return null
                        const groups = {}
                        ids.forEach((idv) => {
                          const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                          const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                          const nm = vv ? String(vv.nome) : String(idv)
                          if (!groups[cat]) groups[cat] = []
                          groups[cat].push(nm)
                        })
                        const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                        return (<div className="mb-2"><strong>Variazioni:</strong> {label}</div>)
                      })()}
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Quantità</CFormLabel>
                      <CFormInput type="number" min="1" step="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value) || 1)} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Natura IVA</CFormLabel>
                      <CFormSelect value={selNatura} onChange={(e) => setSelNatura(e.target.value)} disabled={Number(selIva) !== 0}>
                        <option value="">--</option>
                        {naturaOptions.map((n) => (
                          <option key={n.id_natura} value={n.id_natura}>{n.code} - {n.label}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div>
                  {prodStep > 1 && (
                    <CButton color="secondary" variant="outline" onClick={() => setProdStep((s) => Math.max(1, s - 1))}>Indietro</CButton>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <CButton color="link" onClick={() => setStepperOpen(false)}>Annulla</CButton>
                  {prodStep < 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        if (prodStep === 1) { setProdStep(2); return }
                        if (prodStep === 2) {
                          if (!selProd) return
                          if (prodComboList.length === 0) { setProdStep(4); return }
                          setProdStep(3); return
                        }
                        if (prodStep === 3) { setProdStep(4); return }
                      }}
                      disabled={(prodStep === 2 && !selProd)}
                    >
                      Avanti
                    </CButton>
                  )}
                  {prodStep === 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const comboIds = selectedComboKey
                          ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        let descr = prod.nome
                        if (comboIds && comboIds.length > 0) {
                          const groups = {}
                          comboIds.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                          descr = `${prod.nome} - ${label}`
                        }
                        const riga = { descrizione: descr, quantita: modalQty, prezzo: modalPrice, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto }
                        if (ivaPerc === 0) {
                          const natId = selNatura ? Number(selNatura) : (Number(prod.id_sdi_natura_iva) || 0)
                          if (natId > 0) riga.id_sdi_natura_iva = natId
                        }
                        setRighe((rows) => rows.concat(riga))
                        setStepperOpen(false)
                      }}
                    >
                      Inserisci riga
                    </CButton>
                  )}
                </div>
              </CModalFooter>
            </CModal>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Cliente</CFormLabel>
                <CAutocomplete
                  placeholder="Cerca cliente per ragione sociale, codice o P.IVA"
                  options={clientiAutocompleteOptions}
                  value={selectedClienteValue}
                  search="external"
                  disabled={submitting || loadingClienti}
                  loading={loadingClienti}
                  allowOnlyDefinedOptions
                  cleaner
                  indicator
                  optionsMaxHeight={360}
                  onInput={(value) => {
                    const s = String(value || '')
                    if (lastClienteQueryRef.current !== s) {
                      lastClienteQueryRef.current = s
                      setClienteSearch(s)
                    }
                  }}
                  onChange={(option) => {
                    if (!option || typeof option === 'string') {
                      setIdAnagrafica('')
                      return
                    }
                    const optValue = typeof option.value === 'number' ? option.value : Number(option.value)
                    if (Number.isFinite(optValue)) {
                      setIdAnagrafica(String(optValue))
                    } else {
                      setIdAnagrafica('')
                    }
                  }}
                  optionsTemplate={(option) => {
                    if (!option || typeof option === 'string') {
                      return option || ''
                    }
                    const details = [
                      option.codiceCliente ? `Cod. cliente ${option.codiceCliente}` : null,
                      option.piva ? `P.IVA ${option.piva}` : null,
                      option.codiceFiscale ? `CF ${option.codiceFiscale}` : null,
                    ].filter(Boolean)
                    return (
                      <div className="d-flex flex-column">
                        <span className="fw-semibold">{option.ragioneSociale}</span>
                        {details.length > 0 && (
                          <small className="text-body-secondary">{details.join(' - ')}</small>
                        )}
                      </div>
                    )
                  }}
                  searchNoResultsLabel="Nessun cliente trovato"
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data preventivo</CFormLabel>
                <CFormInput
                  type="date"
                  value={dataPreventivo}
                  onChange={(e) => setDataPreventivo(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Stato</CFormLabel>
                <div>
                  <CBadge color="secondary">bozza</CBadge>
                </div>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Riferimento cliente</CFormLabel>
                <CFormInput
                  value={rifCliente}
                  onChange={(e) => setRifCliente(e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Oggetto preventivo</CFormLabel>
                <CMultiSelect
                  options={oggettiOptions}
                  selectionType="tags"
                  placeholder="Seleziona o crea opzioni"
                  value={selectedOggetti}
                  allowCreateOptions
                  disabled={submitting}
                  onChange={(vals) => {
                    // Gestisce sia array di values che array di oggetti { value, label }
                    const arr = Array.isArray(vals)
                      ? vals
                          .map((v) => {
                            if (v && typeof v === 'object') {
                              return v.value != null ? String(v.value) : ''
                            }
                            return String(v)
                          })
                          .filter((s) => s !== '')
                      : []
                    setSelectedOggetti(arr)
                  }}
                  onCreateOption={async (label) => {
                    try {
                      const controller = new AbortController()
                      const created = await createPreventivoOggettoOption({ token, label, signal: controller.signal })
                      if (created) {
                        setOggettiOptions((opts) => (opts.some((o) => String(o.value) === String(created.value)) ? opts : opts.concat(created)))
                        setSelectedOggetti((prev) => Array.from(new Set([...(prev || []).map(String), String(created.value)])))
                        return created
                      }
                    } catch (_e) {}
                    return null
                  }}
                />
              </CCol>
              {/* Rimosso: testo libero e anteprima (richiesta) */}
            </CRow>
          </section>

          <section className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-body-secondary">Righe preventivo</h6>
              <div className="d-flex gap-2">
                <CButton color="secondary" variant="outline" size="sm" onClick={handleAddRiga} type="button">
                  <CIcon icon={cilPlus} className="me-2" /> Riga manuale
                </CButton>
                <CButton color="primary" variant="outline" size="sm" type="button" onClick={() => { resetProductModal(); setStepperOpen(true) }}>
                  Selettore prodotti
                </CButton>
                <CButton color="primary" size="sm" type="button" onClick={() => { resetPkgModal(); setPkgOpen(true) }}>
                  Inserisci pacchetto
                </CButton>
              </div>
            </div>
            {/* Modal selezione pacchetto */}
            <CModal
              visible={pkgOpen}
              onClose={() => {
                setPkgOpen(false)
                resetPkgModal()
              }}
              size="lg"
              backdrop="static"
            >
              <CModalHeader>
                <CModalTitle>Seleziona pacchetto</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CRow className="g-3 mb-3 align-items-end">
                  <CCol md={7}>
                    <CFormLabel>Ricerca</CFormLabel>
                    <CFormInput
                      placeholder="Nome o codice pacchetto"
                      value={pkgSearch}
                      onChange={(e) => setPkgSearch(e.target.value)}
                      disabled={submitting}
                    />
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Pacchetto</CFormLabel>
                    <CFormSelect
                      value={selPacchetto}
                      onChange={(e) => setSelPacchetto(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="">Seleziona.</option>
                      {pkgOptions.map((p) => (
                        <option key={p.id_pacchetto} value={p.id_pacchetto}>
                          {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={12}>
                    <div className="form-check mt-2">
                      <input
                        id="pkgOnlyActive"
                        type="checkbox"
                        className="form-check-input"
                        checked={pkgOnlyActive}
                        onChange={(e) => setPkgOnlyActive(e.target.checked)}
                        disabled={submitting}
                      />
                      <label htmlFor="pkgOnlyActive" className="form-check-label">
                        Solo attivi
                      </label>
                    </div>
                  </CCol>
                </CRow>
                {pkgPreview.length > 0 && (
                  <div className="border rounded p-2">
                    <div className="fw-semibold mb-2">Righe del pacchetto</div>
                    <CTable compact hover responsive>
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell>Descrizione</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Sconto %</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pkgPreview.map((r, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{r.descrizione}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              {Number(r.quantita) || 1}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {(Number(r.prezzo_unitario) || 0).toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{r.iva ?? '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{r.sconto ?? 0}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div />
                <div className="d-flex gap-2">
                  <CButton
                    color="link"
                    onClick={() => {
                      setPkgOpen(false)
                      resetPkgModal()
                    }}
                  >
                    Annulla
                  </CButton>
                  <CButton
                    color="primary"
                    disabled={!selPacchetto || pkgPreview.length === 0 || submitting}
                    onClick={() => {
                      if (!selPacchetto || pkgPreview.length === 0) return
                      const newLines = pkgPreview.map((r) => {
                        const line = {
                          descrizione: r.descrizione ?? '',
                          quantita: Number(r.quantita) || 1,
                          prezzo: Number(r.prezzo_unitario) || 0,
                          iva: r.iva != null ? Number(r.iva) : 22,
                          sconto: r.sconto != null ? Number(r.sconto) : 0,
                          id_prodotto: r.id_prodotto ?? null,
                          id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                        }

                        const catId = r.id_categoria != null ? Number(r.id_categoria) : null
                        if (catId && !Number.isNaN(catId)) {
                          line.id_categoria = catId
                        }

                        if (r.categoria_nome) {
                          line.categoria_nome = String(r.categoria_nome)
                        }

                        if (line.id_categoria != null && !line.categoria_nome) {
                          const cat = (catOptions || []).find(
                            (c) => Number(c.id_categoria) === Number(line.id_categoria),
                          )
                          if (cat && cat.nome) {
                            line.categoria_nome = String(cat.nome)
                          }
                        }

                        return line
                      })
                      setRighe((rows) => rows.concat(newLines))
                      setPkgOpen(false)
                      resetPkgModal()
                    }}
                  >
                    Inserisci in preventivo
                  </CButton>
                </div>
              </CModalFooter>
            </CModal>
            {false && (
              <div className="border rounded p-3 mb-3">
                <CRow className="g-3 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Categoria</CFormLabel>
                    <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)}>
                      <option value="">Tutte</option>
                      {catOptions.map((c) => (
                        <option key={c.id_categoria} value={c.id_categoria}>
                          {c.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Prodotto</CFormLabel>
                    <CFormSelect
                      value={selProd}
                      onChange={(e) => {
                        const pid = e.target.value
                        setSelProd(pid)
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                        if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                      }}
                    >
                      <option value="">Seleziona...</option>
                      {prodOptions.map((p) => (
                        <option key={p.id_prodotto} value={p.id_prodotto}>
                          {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormLabel>IVA %</CFormLabel>
                    <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Variazione (opzionale)</CFormLabel>
                    <CFormInput value={variazione} onChange={(e) => setVariazione(e.target.value)} placeholder="es. Colore, formato, etc." />
                  </CCol>
                </CRow>
                <CRow className="g-3 mt-2 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Ricerca prodotto</CFormLabel>
                    <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Quantità</CFormLabel>
                    <CFormInput id="step-qta" type="number" min="1" step="1" defaultValue={1} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Prezzo</CFormLabel>
                    <CFormInput
                      id="step-prezzo"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        return prod?.prezzo_listino ?? 0
                      })()}
                    />
                  </CCol>
                  <CCol md={3} className="d-flex gap-2">
                    <CButton
                      color="primary"
                      type="button"
                      onClick={() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const q = Number(document.getElementById('step-qta')?.value || 1)
                        const prezzo = Number(document.getElementById('step-prezzo')?.value || prod.prezzo_listino || 0)
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const descr = variazione && variazione.trim() !== '' ? `${prod.nome} - ${variazione.trim()}` : prod.nome
                        const riga = {
                          descrizione: descr,
                          quantita: q,
                          prezzo: prezzo,
                          iva: ivaPerc,
                          sconto: 0,
                          id_prodotto: prod.id_prodotto,
                        }
                        if (prod.id_categoria != null) {
                          riga.id_categoria = Number(prod.id_categoria)
                          const cat = (catOptions || []).find((c) => Number(c.id_categoria) === Number(prod.id_categoria))
                          if (cat && cat.nome) riga.categoria_nome = String(cat.nome)
                        }
                        if (ivaPerc === 0) {
                          const natId = Number(prod.id_sdi_natura_iva) || 0
                          if (natId > 0) {
                            riga.id_sdi_natura_iva = natId
                          } else {
                            const nat = naturaOptions[0]
                            if (nat) riga.id_sdi_natura_iva = nat.id_natura
                          }
                        }
                        setRighe((rows) => rows.concat(riga))
                        setVariazione('')
                      }}
                    >
                      Inserisci riga
                    </CButton>
                    <CButton color="link" type="button" onClick={() => setStepperOpen(false)}>
                      Chiudi
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            )}
            <CTable hover responsive size="sm">
              <CTableHead color="light">
                <CTableRow className="align-middle">
                  <CTableHeaderCell>Descrizione</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                    Qtà
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 140 }}>
                    Prezzo
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                    Sconto %
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                    IVA %
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 200 }}>
                    Natura IVA
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 160 }}>
                    Imponibile
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 140 }}>
                    IVA
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 160 }}>
                    Totale
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: 64 }}>
                    Azioni
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {righe.map((riga, idx) => {
                  const q = Number(riga.quantita) || 0
                  const p = Number(riga.prezzo) || 0
                  const s = Number(riga.sconto) || 0
                  const iva = Number(riga.iva) || 0
                  const impon = Math.max(0, q * p * (1 - s / 100))
                  const ivaVal = impon * (iva / 100)
                  const tot = impon + ivaVal
                  return (
                    <CTableRow key={idx} className="align-middle">
                      <CTableDataCell>
                        <CFormTextarea
                          placeholder="Descrizione articolo/servizio"
                          value={riga.descrizione}
                          onChange={(e) => updateRiga(idx, { descrizione: e.target.value })}
                          rows={3}
                          style={{ minWidth: '420px' }}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormInput
                          type="number"
                          min="0"
                          step="1"
                          value={riga.quantita}
                          onChange={(e) => updateRiga(idx, { quantita: e.target.value })}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={riga.prezzo}
                          onChange={(e) => updateRiga(idx, { prezzo: e.target.value })}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormInput
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={riga.sconto}
                          onChange={(e) => updateRiga(idx, { sconto: e.target.value })}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormInput
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={riga.iva}
                          onChange={(e) => {
                            const newIva = e.target.value
                            const patch = { iva: newIva }
                            if (Number(newIva) !== 0) {
                              patch.id_sdi_natura_iva = null
                            }
                            updateRiga(idx, patch)
                          }}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormSelect
                          value={riga.id_sdi_natura_iva ?? ''}
                          onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                          disabled={Number(riga.iva) !== 0}
                        >
                          <option value="">--</option>
                          {naturaOptions.map((n) => (
                            <option key={n.id_natura} value={n.id_natura}>
                              {n.code} - {n.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(impon)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(ivaVal)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(tot)}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => handleRemoveRiga(idx)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </section>

          <section className="mb-4">
            <h6 className="mb-3 text-body-secondary">Riepilogo</h6>
            <CRow className="g-3">
              <CCol md={4}>
                <CInputGroup>
                  <CInputGroupText>Totale imponibile</CInputGroupText>
                  <CFormInput value={formatCurrency(totals.imponibile)} readOnly disabled />
                </CInputGroup>
              </CCol>
              <CCol md={4}>
                <CInputGroup>
                  <CInputGroupText>Totale IVA</CInputGroupText>
                  <CFormInput value={formatCurrency(totals.totaleIva)} readOnly disabled />
                </CInputGroup>
              </CCol>
              <CCol md={4}>
                <CInputGroup>
                  <CInputGroupText>Totale</CInputGroupText>
                  <CFormInput value={formatCurrency(totals.totale)} readOnly disabled />
                </CInputGroup>
              </CCol>
            </CRow>
          </section>

          <section className="mb-4">
            <h6 className="mb-3 text-body-secondary">Note</h6>
            <CFormTextarea
              rows={5}
              placeholder="Note interne o per il cliente"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </section>

          <div className="d-flex gap-2">
            <CButton
              color="secondary"
              variant="outline"
              type="button"
              onClick={handleSalvaBozza}
              disabled={submitting}
            >
              <CIcon icon={cilSave} className="me-2" /> Salva bozza
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              <CIcon icon={cilCheckCircle} className="me-2" /> Conferma
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default PreventiviCreate
