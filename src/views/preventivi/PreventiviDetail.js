import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilSave } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche, fetchAnagraficaDetail } from '../../services/anagrafiche'
import { createPreventivo, fetchPreventivoDetail } from '../../services/preventivi'
import { fetchCategorieProdotti, fetchProdotti, fetchNatureIva, fetchProdottoVariazioni, fetchProdottoPrezziCombinati } from '../../services/prodotti'
import { fetchPacchetti, fetchPacchettoDetail } from '../../services/pacchetti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? currencyFormatter.format(n) : '-'
}

const useQuery = () => new URLSearchParams(useLocation().search)

const PreventiviDetail = () => {
  const navigate = useNavigate()
  const query = useQuery()
  const id = Number(query.get('id') || 0)
  const { token, logout } = useAuth()

  // Se non viene passato un ID valido, reindirizza alla lista
  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate('/preventivi/lista', { replace: true })
    }
  }, [id, navigate])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editable, setEditable] = useState(false)
  const [header, setHeader] = useState({ anno: null, numero: null, stato: null })

  // Dati generali
  const [clienteSearch, setClienteSearch] = useState('')
  const [loadingClienti, setLoadingClienti] = useState(false)
  const [allClientiOptions, setAllClientiOptions] = useState([])
  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [dataPreventivo, setDataPreventivo] = useState('')
  const [note, setNote] = useState('')

  // Righe
  const [righe, setRighe] = useState([])

  // Stepper prodotti
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  // Variazioni prodotto selezionato
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [selIva, setSelIva] = useState('')
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [anagraficaDisabled, setAnagraficaDisabled] = useState(false)
  // Pacchetti (modal selezione)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgOptions, setPkgOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const { data, editable, righe: righeSrv } = await fetchPreventivoDetail({ token, id, signal: controller.signal })
        if (!data) throw new Error('Dettaglio non disponibile')
        setEditable(!!editable)
        setHeader({
          anno: data.anno_preventivo ?? null,
          numero: data.numero_documento ?? null,
          stato: data.stato_code ?? null,
        })
        setIdAnagrafica(String(data.id_anagrafica ?? ''))
        setDataPreventivo(data.data_preventivo ?? '')
        setNote(data.note ?? '')

        // Righe dal server -> mappa a forma UI (nessun fallback sintetico)
        if (Array.isArray(righeSrv)) {
          setRighe(
            righeSrv.map((r) => ({
              descrizione: r.descrizione ?? '',
              quantita: r.quantita ?? 1,
              prezzo: r.prezzo_unitario ?? 0,
              iva: r.iva ?? 22,
              sconto: r.sconto ?? 0,
              id_prodotto: r.id_prodotto ?? null,
              id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
            })),
          )
        } else {
          setRighe([])
        }
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setLoadError(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, id, logout])

  // Verifica se l'anagrafica associata è disattiva per disabilitare attività
  useEffect(() => {
    const run = async () => {
      try {
        const aid = Number(idAnagrafica)
        if (!token || !aid) {
          setAnagraficaDisabled(false)
          return
        }
        const det = await fetchAnagraficaDetail({ token, id: aid })
        const active = Number(det?.anagrafica?.is_active) === 1 && String(det?.anagrafica?.stato || '').toLowerCase() === 'attiva'
        setAnagraficaDisabled(!active)
      } catch (_e) {
        setAnagraficaDisabled(false)
      }
    }
    run()
  }, [token, idAnagrafica])

  // Carica tutti i clienti una volta (come in Crea) e filtra in locale
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoadingClienti(true)
      try {
        const PAGE_SIZE = 100
        const first = await fetchAnagrafiche({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: PAGE_SIZE,
          // no search: fetch all, filter locally
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
          // Fallback: continua se la prima pagina è piena
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
        const mapById = new Map()
        for (const c of allItems) {
          const cid = c?.id_anagrafica ?? c?.id
          if (cid !== undefined && cid !== null && !mapById.has(cid)) {
            mapById.set(cid, c)
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
        // Silenzia errori minori
        setAllClientiOptions([])
      } finally {
        setLoadingClienti(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  const clientiOptions = useMemo(() => {
    const list = Array.isArray(allClientiOptions) ? allClientiOptions : []
    const q = (clienteSearch || '').trim().toLowerCase()
    if (q === '') return list
    const norm = (s) => String(s || '').toLowerCase()
    return list.filter((c) => {
      const rs = norm(c.ragione_sociale)
      const piva = norm(c.piva).replace(/[ .-]/g, '')
      const cf = norm(c.codice_fiscale)
      return rs.includes(q) || piva.includes(q.replace(/[ .-]/g, '')) || cf.includes(q)
    })
  }, [allClientiOptions, clienteSearch])

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
      } catch (_e) {}
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

  // Carica variazioni del prodotto selezionato + prezzi combinati
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

  // Aggiorna prezzo suggerito nel riepilogo del modal
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

  const updateRiga = (index, patch) => {
    setRighe((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const handleAddRiga = () => {
    setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }))
  }

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setSelIva('')
    setModalQty(1)
    setModalPrice(0)
  }
  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgOptions([])
    setPkgPreview([])
  }
  const handleRemoveRiga = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }

  const totals = useMemo(() => {
    let imponibile = 0
    let totaleIva = 0
    for (const r of righe) {
      const q = Number(r.quantita) || 0
      const p = Number(r.prezzo) || 0
      const s = Number(r.sconto) || 0
      const aliq = Number(r.iva) || 0
      const rigaImpon = Math.max(0, q * p * (1 - s / 100))
      const rigaIva = rigaImpon * (aliq / 100)
      imponibile += rigaImpon
      totaleIva += rigaIva
    }
    const totale = imponibile + totaleIva
    return { imponibile, totaleIva, totale }
  }, [righe])

  // Carica pacchetti quando apro modal o modifico ricerca
  useEffect(() => {
    if (!token) return
    if (!pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({ token, q: pkgSearch, onlyActive: pkgOnlyActive, signal: controller.signal })
        setPkgOptions(items)
      } catch (_e) {
        setPkgOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  // Carica righe pacchetto selezionato
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

  const buildPayload = () => ({
    id_preventivo: id,
    id_anagrafica: Number(idAnagrafica) || 0,
    data_preventivo: dataPreventivo,
    note,
    righe,
    totals: {
      imponibile: totals.imponibile,
      totaleIva: totals.totaleIva,
      totale: totals.totale,
      sconto: 0,
    },
  })

  const handleSalvaBozza = async (e) => {
    e.preventDefault()
    if (!editable) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({ token, ...payload, send: false, signal: controller.signal })
      setSubmitSuccess(
        result?.anno_preventivo && result?.numero_documento
          ? `Bozza aggiornata. N. ${result.anno_preventivo}/${result.numero_documento}`
          : `Bozza aggiornata (ID ${result?.id_preventivo ?? id})`,
      )
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
    if (!editable) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({ token, ...payload, send: true, signal: controller.signal })
      setSubmitSuccess(
        result?.status === 'sent'
          ? `Preventivo confermato e inviato. N. ${result.anno_preventivo}/${result.numero_documento}`
          : `Preventivo salvato come bozza (ID ${result?.id_preventivo ?? id})`,
      )
      // Dopo conferma, non più modificabile
      setEditable(false)
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

  if (!id) return null

  const uiDisabled = !editable || anagraficaDisabled

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Preventivi - Dettagli</h5>
            <small className="text-body-secondary">
              Documento {header.anno ?? '-'} / {header.numero ?? '-'}
            </small>
          </div>
          {header.stato && (
            <CBadge color={editable ? 'info' : 'secondary'} className="text-uppercase">
              {header.stato}
            </CBadge>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && loadError && (
          <CAlert color="danger">{loadError.message || 'Impossibile caricare il dettaglio.'}</CAlert>
        )}

        {!loading && !loadError && (
          <CForm onSubmit={handleConferma}>
            {anagraficaDisabled && (
              <CAlert color="warning" className="mb-3">Cliente disattivato: modifiche e conferma disabilitate.</CAlert>
            )}
            {submitError && (
              <CAlert color="danger" className="mb-3">
                {submitError?.payload?.message || submitError.message || 'Errore durante il salvataggio.'}
              </CAlert>
            )}
            {submitSuccess && (
              <CAlert color="success" className="mb-3">{submitSuccess}</CAlert>
            )}

            {!editable && (
              <CAlert color="info" className="mb-3">
                Il documento non è in stato bozza. La modifica è disabilitata.
              </CAlert>
            )}

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Dati generali</h6>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Cliente</CFormLabel>
                  <CInputGroup>
                    <CFormInput
                      placeholder="Cerca cliente per ragione sociale o P.IVA"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      disabled={uiDisabled}
                    />
                  </CInputGroup>
                  <CFormSelect
                    className="mt-2"
                    value={idAnagrafica}
                    onChange={(e) => setIdAnagrafica(e.target.value)}
                    disabled={uiDisabled || loadingClienti}
                  >
                    <option value="">Seleziona cliente...</option>
                    {clientiOptions.map((c) => (
                      <option key={c.id_anagrafica ?? c.id} value={c.id_anagrafica ?? c.id}>
                        {c.ragione_sociale}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Data preventivo</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dataPreventivo || ''}
                    onChange={(e) => setDataPreventivo(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Note</CFormLabel>
                  <CFormInput
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0 text-body-secondary">Righe preventivo</h6>
              <div className="d-flex gap-2">
                <CButton color="secondary" variant="outline" size="sm" onClick={handleAddRiga} disabled={uiDisabled}>
                  Aggiungi riga
                </CButton>
                <CButton color="primary" variant="outline" size="sm" onClick={() => { resetProductModal(); setStepperOpen(true) }} disabled={uiDisabled}>
                  Selettore prodotti
                </CButton>
                <CButton color="primary" size="sm" type="button" onClick={() => { resetPkgModal(); setPkgOpen(true) }} disabled={uiDisabled}>
                  Inserisci pacchetto
                </CButton>
              </div>
            </div>
            {/* Modal selezione pacchetto */}
            <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Seleziona pacchetto</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CRow className="g-3 mb-3 align-items-end">
                  <CCol md={7}>
                    <CFormLabel>Ricerca</CFormLabel>
                    <CFormInput placeholder="Nome o codice pacchetto" value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} disabled={uiDisabled} />
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Pacchetto</CFormLabel>
                    <CFormSelect value={selPacchetto} onChange={(e) => setSelPacchetto(e.target.value)} disabled={uiDisabled}>
                      <option value="">Seleziona…</option>
                      {pkgOptions.map((p) => (
                        <option key={p.id_pacchetto} value={p.id_pacchetto}>
                          {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={12}>
                    <div className="form-check mt-2">
                      <input id="pkgOnlyActive" type="checkbox" className="form-check-input" checked={pkgOnlyActive} onChange={(e) => setPkgOnlyActive(e.target.checked)} />
                      <label htmlFor="pkgOnlyActive" className="form-check-label">Solo attivi</label>
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
                            <CTableDataCell className="text-end">{Number(r.quantita) || 1}</CTableDataCell>
                            <CTableDataCell className="text-end">{(Number(r.prezzo_unitario) || 0).toFixed(2)}</CTableDataCell>
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
                  <CButton color="link" onClick={() => setPkgOpen(false)}>Annulla</CButton>
                  <CButton
                    color="primary"
                    disabled={!selPacchetto || pkgPreview.length === 0 || uiDisabled}
                    onClick={() => {
                      if (!selPacchetto || pkgPreview.length === 0) return
                      const newLines = pkgPreview.map((r) => ({
                        descrizione: r.descrizione ?? '',
                        quantita: Number(r.quantita) || 1,
                        prezzo: Number(r.prezzo_unitario) || 0,
                        iva: r.iva != null ? Number(r.iva) : 22,
                        sconto: r.sconto != null ? Number(r.sconto) : 0,
                        id_prodotto: r.id_prodotto ?? null,
                        id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                      }))
                      setRighe((rows) => rows.concat(newLines))
                      setPkgOpen(false)
                    }}
                  >
                    Inserisci in preventivo
                  </CButton>
                </div>
              </CModalFooter>
            </CModal>
            {false && (
              <div className="border rounded p-3 mt-3">
                <CRow className="g-3 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Categoria</CFormLabel>
                    <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
                      <option value="">Tutte</option>
                      {catOptions.map((c) => (
                        <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
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
                      disabled={uiDisabled}
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
                    <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                  </CCol>
                  {/* Rimosso: selettore manuale variazioni. Si usano direttamente le combinazioni */}
                  {prodComboList.length > 0 && (
                  <CCol md={4}>
                    <CFormLabel>Combinazioni disponibili</CFormLabel>
                    <CFormSelect
                      value={(() => {
                        const key = selectedVarIds
                          .map((id) => Number(id) || 0)
                          .filter((n) => n > 0)
                          .sort((a, b) => a - b)
                          .join('+')
                        return key
                      })()}
                      onChange={(e) => {
                        const opt = prodComboList.find((r) => String(r.combo_key) === String(e.target.value))
                        if (!opt) return
                        const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                        setSelectedVarIds(ids)
                        const prezzo = Number(opt.prezzo) || 0
                        const prezzoInput = document.getElementById('step-prezzo')
                        if (prezzoInput) prezzoInput.value = String(prezzo)
                      }}
                      disabled={uiDisabled || prodComboList.length === 0}
                    >
                      <option value="">--</option>
                      {prodComboList.map((r, idx) => {
                        const labels = Array.isArray(r.var_ids)
                          ? r.var_ids.map((idv) => {
                              const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                              return vv ? (vv.categoria ? `${vv.categoria} - ${vv.nome}` : vv.nome) : String(idv)
                            })
                          : []
                        return (
                          <option key={r.combo_key || idx} value={r.combo_key}>
                            {labels.join(', ')} — {Number(r.prezzo) ?? 0}
                          </option>
                        )
                      })}
                    </CFormSelect>
                    <div className="mt-2">
                      <CButton color="secondary" variant="outline" size="sm" onClick={() => setSelectedVarIds([])} disabled={uiDisabled || selectedVarIds.length === 0}>Annulla selezione</CButton>
                    </div>
                  </CCol>
                  )}
                </CRow>
                <CRow className="g-3 mt-2 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Ricerca prodotto</CFormLabel>
                    <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Quantità</CFormLabel>
                    <CFormInput id="step-qta" type="number" min="1" step="1" defaultValue={1} disabled={uiDisabled} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Prezzo</CFormLabel>
                    <CFormInput id="step-prezzo" type="number" min="0" step="0.01" defaultValue={(() => {
                      const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                      return prod?.prezzo_listino ?? 0
                    })()} disabled={uiDisabled} />
                  </CCol>
                  <CCol md={3} className="d-flex gap-2">
                    <CButton color="primary" type="button" disabled={uiDisabled}
                      onClick={() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const q = Number(document.getElementById('step-qta')?.value || 1)
                        const prezzoBase = Number(document.getElementById('step-prezzo')?.value || prod.prezzo_listino || 0)
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const selectedVars = prodVarOptions.filter((v) => selectedVarIds.includes(v.id_variazione))
                        const delta = selectedVars.reduce((acc, v) => acc + (Number(v.delta_prezzo) || 0), 0)
                        const comboKey = selectedVars
                          .map((v) => Number(v.id_variazione) || 0)
                          .filter((n) => n > 0)
                          .sort((a, b) => a - b)
                          .join('+')
                        const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
                        const descr = selectedVars.length > 0
                          ? `${prod.nome} - ${selectedVars.map((v) => `${v.nome}${v.codice ? ' [' + v.codice + ']' : ''}`).join(', ')}`
                          : prod.nome
                        const prezzoFinale = comboPrice != null ? comboPrice : (prezzoBase + delta)
                        const riga = { descrizione: descr, quantita: q, prezzo: prezzoFinale, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto }
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
                        setSelectedVarIds([])
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

            <CModal visible={stepperOpen} onClose={() => setStepperOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Selettore prodotti</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CStepper
                  activeStepNumber={prodStep}
                  steps={[ 'Categoria', 'Prodotto', 'Variazioni', 'Riepilogo' ]}
                  linear={false}
                  validation={false}
                  onStepChange={(n) => {
                    if (uiDisabled) return
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
                      <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
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
                        disabled={uiDisabled}
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
                      <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
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
                          disabled={uiDisabled || prodComboList.length === 0}
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
                      <CFormInput type="number" min="1" step="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value) || 1)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Natura IVA</CFormLabel>
                      <CFormSelect value={(() => '')()} onChange={() => {}} disabled={true}>
                        <option value="">Selezione natura disponibile nella riga dopo inserimento</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div>
                  {prodStep > 1 && (
                    <CButton color="secondary" variant="outline" onClick={() => setProdStep((s) => Math.max(1, s - 1))} disabled={uiDisabled}>Indietro</CButton>
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
                      disabled={(prodStep === 2 && !selProd) || uiDisabled}
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
                          // Se IVA 0, natura IVA modificabile in tabella dopo inserimento
                        }
                        setRighe((rows) => rows.concat(riga))
                        setStepperOpen(false)
                      }}
                      disabled={uiDisabled}
                    >
                      Inserisci riga
                    </CButton>
                  )}
                </div>
              </CModalFooter>
            </CModal>

              <CTable className="mt-3" responsive small>
                <CTableHead color="light">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell>Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                      Q.tà
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 160 }}>
                      Prezzo
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 140 }}>
                      Sconto %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                      IVA %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 200 }}>
                      Natura IVA
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
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
                          <CFormInput
                            placeholder="Descrizione articolo/servizio"
                            value={riga.descrizione}
                            onChange={(e) => updateRiga(idx, { descrizione: e.target.value })}
                      disabled={uiDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="1"
                            value={riga.quantita}
                            onChange={(e) => updateRiga(idx, { quantita: e.target.value })}
                            disabled={uiDisabled}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={riga.prezzo}
                            onChange={(e) => updateRiga(idx, { prezzo: e.target.value })}
                            disabled={uiDisabled}
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
                            disabled={uiDisabled}
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
                          disabled={uiDisabled}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormSelect
                          value={riga.id_sdi_natura_iva ?? ''}
                          onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                          disabled={uiDisabled || Number(riga.iva) !== 0}
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
                          <CButton color="link" size="sm" className="p-0" onClick={() => handleRemoveRiga(idx)} disabled={uiDisabled}>
                            ×
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

            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" type="button" onClick={handleSalvaBozza} disabled={uiDisabled || submitting}>
                <CIcon icon={cilSave} className="me-2" /> Aggiorna bozza
              </CButton>
              <CButton color="primary" type="submit" disabled={uiDisabled || submitting}>
                <CIcon icon={cilCheckCircle} className="me-2" /> Conferma
              </CButton>
              <CButton color="link" type="button" onClick={() => navigate('/preventivi/lista')}>
                Torna alla lista
              </CButton>
            </div>
          </CForm>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PreventiviDetail
