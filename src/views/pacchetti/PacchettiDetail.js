/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilSave, cilPaperclip } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchPacchettoDetail, savePacchetto, deletePacchetto } from '../../services/pacchetti'
import { fetchNatureIva, fetchCategorieProdotti, fetchProdotti, fetchProdottoVariazioni, fetchProdottoPrezziCombinati } from '../../services/prodotti'
import { useLocation, useNavigate } from 'react-router-dom'
import { CStepper } from '@coreui/react-pro'
import PermissionButton from '../../components/PermissionButton'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? currencyFormatter.format(n) : '-'
}

const useQuery = () => {
  const { search } = useLocation()
  return React.useMemo(() => new URLSearchParams(search), [search])
}

const PacchettiDetail = () => {
  const navigate = useNavigate()
  const query = useQuery()
  const { token, logout } = useAuth()

  const id = Number(query.get('id') || 0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [codice, setCodice] = useState('')
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const descrRef = useRef(null)
  const [attivo, setAttivo] = useState(true)

  const [righe, setRighe] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  // Stepper selezione prodotti
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  // Selezione combo (non mostriamo singole variazioni)
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)
  const [selIva, setSelIva] = useState('')
  const [selNatura, setSelNatura] = useState('')

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data, righe: lr }, { items: nature }, { items: cats }] = await Promise.all([
          fetchPacchettoDetail({ token, signal: controller.signal, id }),
          fetchNatureIva({ token, signal: controller.signal }),
          fetchCategorieProdotti({ token, signal: controller.signal }),
        ])
        setCodice(data?.codice || '')
        setNome(data?.nome || '')
        setDescrizione(data?.descrizione || '')
        setAttivo((Number(data?.attivo) || 1) === 1)
        setRighe(Array.isArray(lr) && lr.length > 0 ? lr.map((r) => ({
          descrizione: r.descrizione ?? '',
          quantita: r.quantita ?? 1,
          prezzo: r.prezzo_unitario ?? 0,
          iva: r.iva ?? 22,
          sconto: r.sconto ?? 0,
          id_prodotto: r.id_prodotto ?? null,
          combo_key: r.combo_key ?? null,
          id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
          id_categoria: r.id_categoria ?? null,
          categoria_nome: r.categoria_nome ?? null,
        })) : [{ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }])
        setNaturaOptions(nature || [])
        setCatOptions(cats || [])
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
  }, [token, id, logout])

  // Auto-size description textarea for readability
  useEffect(() => {
    const el = descrRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [descrizione])

  const handleAddRiga = () => {
    setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }))
  }

  // Carica prodotti quando apro lo stepper o cambio filtro
  useEffect(() => {
    if (!token) return
    if (!stepperOpen) return
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
  }, [token, selCat, prodSearch, stepperOpen])

  // Carica variazioni e prezzi quando seleziono prodotto
  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    if (!token || !stepperOpen) return
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
  }, [token, selProd, stepperOpen])

  // Calcolo prezzo suggerito
  useEffect(() => {
    const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboPrice = selectedComboKey && prodComboMap[selectedComboKey] != null ? Number(prodComboMap[selectedComboKey]) : null
    const suggested = comboPrice != null ? comboPrice : base
    setModalPrice(suggested)
  }, [selProd, prodOptions, selectedComboKey, prodComboMap])

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedComboKey('')
    setSelIva('')
    setSelNatura('')
    setModalQty(1)
    setModalPrice(0)
  }
  const handleRemoveRiga = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }
  const updateRiga = (index, patch) => {
    setRighe((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

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

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const controller = new AbortController()
      const payload = {
        id_pacchetto: id,
        codice: codice || undefined,
        nome: nome,
        descrizione: descrizione || undefined,
        attivo: attivo ? 1 : 0,
        righe,
      }
      await savePacchetto({ token, signal: controller.signal, ...payload })
      setSubmitSuccess('Pacchetto aggiornato')
    } catch (err) {
      if (err.status === 401 && logout) { logout(); return }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo pacchetto?')) return
    try {
      await deletePacchetto({ token, id })
      navigate('/pacchetti/lista')
    } catch (err) {
      if (err.status === 401 && logout) { logout(); return }
      setSubmitError(err)
    }
  }

  if (!id) {
    return (
      <CAlert color="warning">Parametro id mancante.</CAlert>
    )
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Pacchetti - Dettagli</h5>
            <div className="d-flex gap-2">
              <PermissionButton color="danger" variant="outline" onClick={handleDelete} permission="pack.delete">
                Elimina
              </PermissionButton>
            </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger">{error.message || 'Errore nel caricamento.'}</CAlert>
        )}
        {submitError && (
          <CAlert color="danger">{submitError.message || 'Errore durante il salvataggio.'}</CAlert>
        )}
        {submitSuccess && (
          <CAlert color="success">{submitSuccess}</CAlert>
        )}
        {loading ? (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        ) : (
          <CForm onSubmit={handleSave}>
            <section className="mb-4">
              <CRow className="g-2">
                <CCol md={3}>
                  <CFormLabel>Codice</CFormLabel>
                  <CFormInput size="sm" value={codice} onChange={(e) => setCodice(e.target.value)} />
                </CCol>
                <CCol md={5}>
                  <CFormLabel>Nome</CFormLabel>
                  <CFormInput size="sm" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </CCol>
                <CCol md={4} className="d-flex align-items-end">
                  <CFormCheck id="attivo" label="Attivo" checked={attivo} onChange={(e) => setAttivo(e.target.checked)} />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Descrizione</CFormLabel>
                  <CFormTextarea
                    rows={12}
                    ref={descrRef}
                    style={{ overflow: 'hidden', resize: 'vertical' }}
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                  />
                </CCol>
              </CRow>
            </section>

            {/* Modal selezione prodotto (stepper) */}
            <CModal visible={stepperOpen} onClose={() => setStepperOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Selettore prodotto</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CStepper
                  activeStepNumber={prodStep}
                  steps={['Categoria', 'Prodotto', 'Variazioni', 'Riepilogo']}
                  linear={false}
                  validation={false}
                  onStepChange={(n) => {
                    if (n <= prodStep) { setProdStep(n); return }
                    if (n === 2) { setProdStep(2); return }
                    if (n === 3) {
                      if (!selProd) return
                      if (Array.isArray(prodComboList) && prodComboList.length > 0) { setProdStep(3) } else { setProdStep(4) }
                      return
                    }
                    if (n === 4) { if (!selProd) return; setProdStep(4); return }
                  }}
                />
                {prodStep === 1 && (
                  <CRow className="g-3">
                    <CCol md={4}>
                      <CFormLabel>Categoria</CFormLabel>
                      <CFormSelect size="sm" value={selCat} onChange={(e) => setSelCat(e.target.value)}>
                        <option value="">Tutte</option>
                        {catOptions.map((c) => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={8}>
                      <CFormLabel>Ricerca prodotto</CFormLabel>
                      <CFormInput size="sm" placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                    </CCol>
                  </CRow>
                )}
                {prodStep === 2 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Seleziona prodotto</CFormLabel>
                      <CFormSelect
                        size="sm"
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
                  </CRow>
                )}
                {prodStep === 3 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Combinazioni</CFormLabel>
                      <CFormSelect
                        size="sm"
                        value={selectedComboKey}
                        onChange={(e) => {
                          const key = e.target.value
                          setSelectedComboKey(key)
                          const opt = prodComboList.find((r) => String(r.combo_key) === String(key))
                          if (opt && Array.isArray(opt.var_ids)) {
                            setSelectedVarIds(opt.var_ids.map(Number))
                          }
                        }}
                      >
                        <option value="">Seleziona una combinazione…</option>
                        {prodComboList.map((r) => {
                          const ids = Array.isArray(r.var_ids) ? r.var_ids : String(r.combo_key).split('+').map((x) => Number(x) || 0)
                          // Raggruppa per categoria: "Categoria: nome1, nome2; Categoria2: ..."
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
                            <option key={r.combo_key} value={r.combo_key}>
                              {label || r.combo_key} — {Number(r.prezzo) ? Number(r.prezzo).toFixed(2) : '0.00'} €
                            </option>
                          )
                        })}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
                {prodStep === 4 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Riepilogo</CFormLabel>
                      <div className="form-text mb-2">
                        {(() => {
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                          const ids = (selectedComboKey || '')
                            .split('+')
                            .map((x) => Number(x) || 0)
                            .filter((n) => n > 0)
                          if (!prod) return '-'
                          if (ids.length === 0) return prod.nome
                          const groups = {}
                          ids.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                          return `${prod.nome} - ${label}`
                        })()}
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Quantità</CFormLabel>
                      <CFormInput size="sm" type="number" min="1" step="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value) || 1)} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput size="sm" type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput size="sm" type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Natura IVA</CFormLabel>
                      <CFormSelect className="w-auto d-inline-block" size="sm" value={selNatura} onChange={(e) => setSelNatura(e.target.value)} disabled={Number(selIva) !== 0}>
                        <option value="">--</option>
                        {naturaOptions.map((n) => (
                          <option key={n.id_natura} value={n.id_natura}>{n.code}</option>
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
                  <PermissionButton
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
                    permission="pack.write"
                  >
                    Avanti
                  </PermissionButton>
                )}
                {prodStep === 4 && (
                  <PermissionButton
                    color="primary"
                    onClick={() => {
                      const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                      if (!prod) return
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const selectedIds = (selectedComboKey || '').split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                        let descr = prod.nome
                        if (selectedIds.length > 0) {
                          const groups = {}
                          selectedIds.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                          descr = `${prod.nome} - ${label}`
                        }
                        const riga = {
                          descrizione: descr,
                          quantita: modalQty,
                          prezzo: modalPrice,
                          iva: ivaPerc,
                          sconto: 0,
                          id_prodotto: prod.id_prodotto,
                          combo_key: selectedComboKey || null,
                        }
                        // Aggiungi categoria del prodotto per futuri raggruppamenti o usi
                        if (prod.id_categoria != null) {
                          const catId = Number(prod.id_categoria)
                          if (Number.isFinite(catId) && catId > 0) {
                            riga.id_categoria = catId
                            const c = (catOptions || []).find((x) => Number(x.id_categoria) === catId)
                            if (c && c.nome) riga.categoria_nome = String(c.nome)
                          }
                        }
                        if (ivaPerc === 0) {
                          const natId = selNatura ? Number(selNatura) : 0
                          if (natId > 0) riga.id_sdi_natura_iva = natId
                      }
                      setRighe((rows) => rows.concat(riga))
                      setStepperOpen(false)
                    }}
                    permission="pack.write"
                  >
                    Inserisci riga
                  </PermissionButton>
                )}
              </div>
            </CModalFooter>
          </CModal>

            <section className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 text-body-secondary">Righe pacchetto</h6>
                <div className="d-flex gap-2">
                  <PermissionButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0, combo_key: null }))}
                    permission="pack.write"
                  >
                    Riga manuale
                  </PermissionButton>
                  <PermissionButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => { resetProductModal(); setStepperOpen(true) }}
                    permission="pack.write"
                  >
                    Selettore prodotti
                  </PermissionButton>
                </div>
              </div>
              <CTable hover responsive small>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell >Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Q.tà</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Sconto %</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Natura</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {righe.map((riga, idx) => {
                    const q = Number(riga.quantita) || 0
                    const p = Number(riga.prezzo) || 0
                    const s = Number(riga.sconto) || 0
                    const aliquota = Number(riga.iva) || 0
                    const impon = Math.max(0, q * p * (1 - s / 100))
                    const ivaVal = impon * (aliquota / 100)
                    const tot = impon + ivaVal
                    return (
                      <CTableRow key={idx}>
                        <CTableDataCell>
                          <CFormInput size="sm" style={{ width: "550px" }} value={riga.descrizione} onChange={(e) => updateRiga(idx, { descrizione: e.target.value })} />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput size="sm" type="number" min="1" step="1" value={riga.quantita} onChange={(e) => updateRiga(idx, { quantita: e.target.value })} />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput size="sm" type="number" min="0" step="0.01" value={riga.prezzo} onChange={(e) => updateRiga(idx, { prezzo: e.target.value })} />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput size="sm" type="number" min="0" max="100" step="0.1" value={riga.sconto} onChange={(e) => updateRiga(idx, { sconto: e.target.value })} />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput size="sm" type="number" min="0" max="100" step="1" value={riga.iva} onChange={(e) => {
                            const newIva = e.target.value
                            const patch = { iva: newIva }
                            if (Number(newIva) !== 0) { patch.id_sdi_natura_iva = null }
                            updateRiga(idx, patch)
                          }} />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CFormSelect
                            className="d-inline-block"
                            size="sm"
                            value={riga.id_sdi_natura_iva ?? ''}
                            onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                            disabled={Number(riga.iva) !== 0}
                          >
                            <option value="">--</option>
                            {naturaOptions.map((n) => (
                              <option key={n.id_natura} value={n.id_natura}>
                                {n.code}
                              </option>
                            ))}
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">{formatCurrency(impon)}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatCurrency(ivaVal)}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatCurrency(tot)}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <PermissionButton
                            color="link"
                            size="sm"
                            className="p-0"
                            onClick={() => handleRemoveRiga(idx)}
                            permission="pack.write"
                          >
                            <CIcon icon={cilTrash} />
                          </PermissionButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </section>

            <div className="d-flex gap-2">
              <PermissionButton color="primary" type="submit" disabled={submitting} permission="pack.write">
                <CIcon icon={cilSave} className="me-2" /> Salva
              </PermissionButton>
            </div>
          </CForm>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PacchettiDetail
