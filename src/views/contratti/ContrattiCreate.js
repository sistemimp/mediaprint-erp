import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSave, cilTrash } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { saveContratto } from '../../services/contratti'
import { fetchCategorieProdotti, fetchNatureIva, fetchProdotti, fetchProdottoPrezziCombinati, fetchProdottoVariazioni } from '../../services/prodotti'
import { fetchPacchettoDetail, fetchPacchetti } from '../../services/pacchetti'
import AnagraficaAutocomplete from '../../components/AnagraficaAutocomplete'
import HtmlEditor from '../../components/HtmlEditor'
import PermissionButton from '../../components/PermissionButton'

const createEmptyLine = () => ({
  id_prodotto: '',
  combo_key: '',
  descrizione: '',
  prezzo_unitario: 0,
  iva: 22,
  id_sdi_natura_iva: null,
  sconto_base: 0,
  sconti: [],
})

const ContrattiCreate = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, logout } = useAuth()

  const prefill = location.state?.prefill ?? null

  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [anagraficaOptions, setAnagraficaOptions] = useState([])
  const [anagraficaLoading, setAnagraficaLoading] = useState(false)
  const searchAbortRef = useRef(null)

  const [codice, setCodice] = useState('')
  const [titolo, setTitolo] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [dataFineManual, setDataFineManual] = useState(false)
  const [rinnovoAutomatico, setRinnovoAutomatico] = useState(false)
  const [attivo, setAttivo] = useState(true)
  const [testoLegale, setTestoLegale] = useState('')

  const [righe, setRighe] = useState([createEmptyLine()])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [stepperProdOptions, setStepperProdOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [selIva, setSelIva] = useState('')
  const [modalPrice, setModalPrice] = useState(0)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgModalOptions, setPkgModalOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: prodotti }, { items: nature }, { items: cats }] = await Promise.all([
          fetchProdotti({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
          fetchCategorieProdotti({ token, signal: controller.signal }),
        ])
        setProdOptions(Array.isArray(prodotti) ? prodotti : [])
        setNaturaOptions(Array.isArray(nature) ? nature : [])
        setCatOptions(Array.isArray(cats) ? cats : [])
      } catch (_err) {
        setProdOptions([])
        setNaturaOptions([])
        setCatOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica prodotti per lo stepper in base a categoria/ricerca
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({ token, id_categoria: idcat, q: prodSearch, signal: controller.signal })
        setStepperProdOptions(Array.isArray(items) ? items : [])
      } catch (_e) {
        setStepperProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  // Carica variazioni e prezzi combinati per il prodotto selezionato nello stepper
  useEffect(() => {
    setProdVarOptions([])
    setProdComboMap({})
    setProdComboList([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    if (!token || !selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items) ? items.slice() : []
        sorted.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
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
    const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey = selectedComboKey && String(selectedComboKey).trim() !== ''
      ? selectedComboKey
      : (selectedVarIds
        .map((id) => Number(id) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .join('+'))
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const suggested = comboPrice != null ? comboPrice : base
    setModalPrice(suggested)
  }, [selProd, stepperProdOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  // Carica pacchetti nel modal
  useEffect(() => {
    if (!token || !pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({ token, q: pkgSearch, onlyActive: pkgOnlyActive, signal: controller.signal })
        setPkgModalOptions(Array.isArray(items) ? items : [])
      } catch (_e) {
        setPkgModalOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  useEffect(() => {
    if (!token || !pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      setPkgPreview([])
      if (!selPacchetto) return
      try {
        const { righe } = await fetchPacchettoDetail({ token, id: Number(selPacchetto), signal: controller.signal })
        setPkgPreview(Array.isArray(righe) ? righe : [])
      } catch (_e) {
        setPkgPreview([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  useEffect(() => {
    if (!prefill) return
    if (prefill.id_anagrafica != null) {
      setIdAnagrafica(String(prefill.id_anagrafica))
    }
    if (prefill.ragione_sociale) {
      setAnagraficaOptions((prev) => {
        const exists = prev.some(
          (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(prefill.id_anagrafica),
        )
        if (exists) return prev
        return [
          {
            id_anagrafica: prefill.id_anagrafica,
            ragione_sociale: prefill.ragione_sociale,
          },
          ...prev,
        ]
      })
    }
  }, [prefill])

  const loadAnagrafiche = async (query) => {
    if (!token) return
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller
    setAnagraficaLoading(true)
    try {
      const { items } = await fetchAnagrafiche({
        token,
        search: query,
        page: 1,
        pageSize: 50,
        signal: controller.signal,
      })
      setAnagraficaOptions(Array.isArray(items) ? items : [])
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setAnagraficaOptions([])
    } finally {
      setAnagraficaLoading(false)
    }
  }

  useEffect(() => {
    loadAnagrafiche('')
  }, [token])

  const handleAddLine = () => {
    setRighe((rows) => rows.concat(createEmptyLine()))
  }

  const handleRemoveLine = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }


  const syncDataFine = (value) => {
    const raw = String(value || '').trim()
    setDataInizio(raw)
  }

  useEffect(() => {
    if (!dataInizio || dataFineManual) {
      return
    }
    const dt = new Date(`${dataInizio}T00:00:00`)
    if (Number.isNaN(dt.getTime())) {
      return
    }
    dt.setFullYear(dt.getFullYear() + 1)
    const next = dt.toISOString().slice(0, 10)
    setDataFine(next)
  }, [dataInizio, dataFineManual])

  const handleDataFineChange = (value) => {
    const raw = String(value || '').trim()
    setDataFine(raw)
    setDataFineManual(raw !== '')
  }

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setSelIva('')
    setModalPrice(0)
  }

  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgModalOptions([])
    setPkgPreview([])
    setPkgOnlyActive(true)
  }

  const updateLine = (index, patch) => {
    setRighe((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addTier = (lineIndex) => {
    setRighe((rows) =>
      rows.map((row, i) =>
        i === lineIndex
          ? { ...row, sconti: [...(row.sconti || []), { quantita_min: 0, quantita_max: '', sconto: 0 }] }
          : row,
      ),
    )
  }

  const updateTier = (lineIndex, tierIndex, patch) => {
    setRighe((rows) =>
      rows.map((row, i) => {
        if (i !== lineIndex) return row
        const tiers = Array.isArray(row.sconti) ? row.sconti : []
        return {
          ...row,
          sconti: tiers.map((t, idx) => (idx === tierIndex ? { ...t, ...patch } : t)),
        }
      }),
    )
  }

  const removeTier = (lineIndex, tierIndex) => {
    setRighe((rows) =>
      rows.map((row, i) => {
        if (i !== lineIndex) return row
        const tiers = Array.isArray(row.sconti) ? row.sconti : []
        return { ...row, sconti: tiers.filter((_, idx) => idx !== tierIndex) }
      }),
    )
  }

  const normalizeLines = (rows) => {
    const out = []
    rows.forEach((row) => {
      const idProd = Number(row.id_prodotto)
      if (!idProd || Number.isNaN(idProd)) return

      out.push({
        tipo_item: 'prodotto',
        id_prodotto: idProd,
        combo_key: row.combo_key ? String(row.combo_key) : null,
        descrizione: row.descrizione || null,
        prezzo_unitario: Number(row.prezzo_unitario) || 0,
        iva: row.iva !== '' && row.iva != null ? Number(row.iva) : null,
        id_sdi_natura_iva:
          row.id_sdi_natura_iva != null && row.id_sdi_natura_iva !== ''
            ? Number(row.id_sdi_natura_iva)
            : null,
        sconto_base: Number(row.sconto_base) || 0,
        sconti: (row.sconti || []).map((t) => ({
          quantita_min: Number(t.quantita_min) || 0,
          quantita_max: t.quantita_max !== '' && t.quantita_max != null ? Number(t.quantita_max) : null,
          sconto: Number(t.sconto) || 0,
        })),
      })
    })
    return out
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    const payload = {
      id_anagrafica: Number(idAnagrafica),
      codice: codice || null,
      titolo,
      testo_legale: testoLegale || null,
      data_inizio: dataInizio,
      data_fine: dataFine || null,
      rinnovo_automatico: rinnovoAutomatico ? 1 : 0,
      attivo: attivo ? 1 : 0,
      righe: normalizeLines(righe),
    }

    try {
      const res = await saveContratto({ token, body: payload })
      const id = res?.id_contratto
      setSaveSuccess('Contratto salvato.')
      if (id) {
        navigate(`/contratti/dettagli?id=${id}`)
      }
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const productsMap = useMemo(() => {
    const map = new Map()
    prodOptions.forEach((p) => map.set(Number(p.id_prodotto), p))
    return map
  }, [prodOptions])


  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Contratti - Crea nuovo</h5>
      </CCardHeader>
      <CCardBody>
        {saveError && (
          <CAlert color="danger">{saveError.message || 'Errore durante il salvataggio.'}</CAlert>
        )}
        {saveSuccess && (
          <CAlert color="success">{saveSuccess}</CAlert>
        )}
        <CForm onSubmit={handleSubmit}>
          <section className="mb-4">
            <CRow className="g-3">
              <CCol md={8}>
                <CFormLabel>Cliente</CFormLabel>
                <AnagraficaAutocomplete
                  items={anagraficaOptions}
                  value={idAnagrafica}
                  loading={anagraficaLoading}
                  onSearch={(q) => {
                    loadAnagrafiche(q)
                  }}
                  onChange={(value) => setIdAnagrafica(value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Codice</CFormLabel>
                <CFormInput value={codice} onChange={(e) => setCodice(e.target.value)} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Titolo</CFormLabel>
                <CFormInput required value={titolo} onChange={(e) => setTitolo(e.target.value)} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data inizio</CFormLabel>
                <CFormInput
                  type="date"
                  required
                  value={dataInizio}
                  onChange={(e) => syncDataFine(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data fine</CFormLabel>
                <CFormInput
                  type="date"
                  value={dataFine}
                  onChange={(e) => handleDataFineChange(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormCheck
                  id="rinnovoAutomatico"
                  label="Rinnovo automatico"
                  checked={rinnovoAutomatico}
                  onChange={(e) => setRinnovoAutomatico(e.target.checked)}
                />
              </CCol>
              <CCol md={3}>
                <CFormCheck
                  id="attivo"
                  label="Attivo"
                  checked={attivo}
                  onChange={(e) => setAttivo(e.target.checked)}
                />
              </CCol>
            </CRow>
          </section>

          <section className="mb-4">
            <CFormLabel>Testo legale</CFormLabel>
            <HtmlEditor
              value={testoLegale}
              onChange={setTestoLegale}
              placeholder="Testo legale del contratto"
              minHeight={220}
            />
          </section>

          <section className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-body-secondary">Righe contratto</h6>
              <div className="d-flex gap-2">
                <PermissionButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  type="button"
                  permission="contr.create"
                >
                  <CIcon icon={cilPlus} className="me-2" /> Aggiungi riga
                </PermissionButton>
                <PermissionButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => { resetProductModal(); setStepperOpen(true) }}
                  type="button"
                  permission="contr.create"
                >
                  Selettore prodotti
                </PermissionButton>
                <PermissionButton
                  color="primary"
                  size="sm"
                  onClick={() => { resetPkgModal(); setPkgOpen(true) }}
                  type="button"
                  permission="contr.create"
                >
                  Inserisci righe pacchetto
                </PermissionButton>
              </div>
            </div>
            <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
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
                    />
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Pacchetto</CFormLabel>
                    <CFormSelect value={selPacchetto} onChange={(e) => setSelPacchetto(e.target.value)}>
                      <option value="">Seleziona.</option>
                      {pkgModalOptions.map((p) => (
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
                      />
                      <label htmlFor="pkgOnlyActive" className="form-check-label">Solo attivi</label>
                    </div>
                  </CCol>
                </CRow>
                {pkgPreview.length > 0 && (
                  <div className="border rounded p-2">
                    <div className="fw-semibold mb-2">Righe del pacchetto</div>
                    <CTable compact hover responsive>
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell>Descrizione</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Q.ta</CTableHeaderCell>
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
                  <PermissionButton
                    color="primary"
                    disabled={!selPacchetto || pkgPreview.length === 0}
                    onClick={() => {
                      if (!selPacchetto || pkgPreview.length === 0) return
                      const newLines = pkgPreview
                        .map((r) => {
                          const idProd = Number(r.id_prodotto) || 0
                          if (idProd <= 0) return null
                          return {
                            id_prodotto: idProd,
                            combo_key: '',
                            descrizione: r.descrizione ?? '',
                            prezzo_unitario: Number(r.prezzo_unitario) || 0,
                            iva: r.iva != null ? Number(r.iva) : 22,
                            id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                            sconto_base: r.sconto != null ? Number(r.sconto) : 0,
                            sconti: [],
                          }
                        })
                        .filter(Boolean)
                      if (newLines.length === 0) return
                      setRighe((rows) => rows.concat(newLines))
                      setPkgOpen(false)
                    }}
                    permission="contr.create"
                  >
                    Inserisci righe pacchetto
                  </PermissionButton>
                </div>
              </CModalFooter>
            </CModal>

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
                    if (Number(n) === prodStep) return
                    if (n <= prodStep) {
                      setProdStep(n)
                      return
                    }
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
                          const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(pid))
                          if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                        }}
                      >
                        <option value="">Seleziona...</option>
                        {stepperProdOptions.map((p) => (
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
                          disabled={prodComboList.length === 0}
                        >
                          <option value="">Seleziona una combinazione.</option>
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
                      <div className="mb-2">
                        <strong>Prodotto:</strong> {(() => {
                          const p = stepperProdOptions.find((x) => String(x.id_prodotto) === String(selProd))
                          return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-'
                        })()}
                      </div>
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
                    <CCol md={6}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} />
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
                      disabled={prodStep === 2 && !selProd}
                      permission="contr.create"
                    >
                      Avanti
                    </PermissionButton>
                  )}
                  {prodStep === 4 && (
                    <PermissionButton
                      color="primary"
                      onClick={() => {
                        const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(selProd))
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
                        const comboKey = Array.isArray(comboIds) && comboIds.length > 0
                          ? comboIds.map((idv) => Number(idv) || 0).filter((n) => n > 0).sort((a, b) => a - b).join('+')
                          : ''
                        const riga = {
                          id_prodotto: prod.id_prodotto,
                          combo_key: comboKey || null,
                          descrizione: descr,
                          prezzo_unitario: modalPrice,
                          iva: ivaPerc,
                          id_sdi_natura_iva: null,
                          sconto_base: 0,
                          sconti: [],
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
                        setStepperOpen(false)
                      }}
                      permission="contr.create"
                    >
                      Inserisci riga
                    </PermissionButton>
                  )}
                </div>
              </CModalFooter>
            </CModal>
            <CTable hover responsive>
              <CTableHead className="mp-table-head">
                <CTableRow className="align-middle">
                  <CTableHeaderCell>Prodotto</CTableHeaderCell>
                  <CTableHeaderCell>Descrizione</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 140 }}>Prezzo</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>IVA %</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 200 }}>Natura IVA</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>Sconto %</CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: 80 }}>Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {righe.map((row, idx) => {
                  const requireNatura = Number(row.iva) === 0
                  return (
                    <React.Fragment key={`line-${idx}`}>
                      <CTableRow className="align-middle">
                        <CTableDataCell>
                          <CFormSelect
                            value={row.id_prodotto}
                            onChange={(e) => {
                              const id = e.target.value
                                const item = productsMap.get(Number(id))
                                updateLine(idx, {
                                  id_prodotto: id,
                                  combo_key: '',
                                  descrizione: row.descrizione || item?.nome || '',
                                })
                              }}
                            >
                            <option value="">Seleziona prodotto</option>
                            {prodOptions.map((p) => (
                              <option key={p.id_prodotto} value={p.id_prodotto}>
                                {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                              </option>
                            ))}
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={row.descrizione}
                            onChange={(e) => updateLine(idx, { descrizione: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.prezzo_unitario}
                            onChange={(e) => updateLine(idx, { prezzo_unitario: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.iva}
                            onChange={(e) => updateLine(idx, { iva: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            value={row.id_sdi_natura_iva ?? ''}
                            disabled={!requireNatura}
                            onChange={(e) =>
                              updateLine(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })
                            }
                          >
                            <option value="">--</option>
                            {naturaOptions.map((n) => (
                              <option key={n.id_natura} value={n.id_natura}>
                                {n.code} - {n.label}
                              </option>
                            ))}
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.sconto_base}
                            onChange={(e) => updateLine(idx, { sconto_base: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <PermissionButton
                            color="link"
                            size="sm"
                            onClick={() => handleRemoveLine(idx)}
                            permission="contr.create"
                          >
                            <CIcon icon={cilTrash} />
                          </PermissionButton>
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell colSpan={7}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-body-secondary small">Sconti per quantita'</span>
                            <PermissionButton
                              color="secondary"
                              size="sm"
                              variant="outline"
                              onClick={() => addTier(idx)}
                              type="button"
                              permission="contr.create"
                            >
                              <CIcon icon={cilPlus} className="me-2" /> Aggiungi soglia
                            </PermissionButton>
                          </div>
                          {row.sconti && row.sconti.length > 0 ? (
                            <CTable small responsive className="mb-0">
                              <CTableHead className="mp-table-head">
                                <CTableRow>
                                  <CTableHeaderCell style={{ width: 160 }}>Q.ta min</CTableHeaderCell>
                                  <CTableHeaderCell style={{ width: 160 }}>Q.ta max</CTableHeaderCell>
                                  <CTableHeaderCell style={{ width: 160 }}>Sconto %</CTableHeaderCell>
                                  <CTableHeaderCell style={{ width: 80 }} />
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {row.sconti.map((tier, tIdx) => (
                                  <CTableRow key={`tier-${idx}-${tIdx}`}>
                                    <CTableDataCell>
                                      <CFormInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tier.quantita_min}
                                        onChange={(e) => updateTier(idx, tIdx, { quantita_min: e.target.value })}
                                      />
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <CFormInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tier.quantita_max}
                                        onChange={(e) => updateTier(idx, tIdx, { quantita_max: e.target.value })}
                                      />
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <CFormInput
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={tier.sconto}
                                        onChange={(e) => updateTier(idx, tIdx, { sconto: e.target.value })}
                                      />
                                    </CTableDataCell>
                                    <CTableDataCell className="text-center">
                                      <PermissionButton
                                        color="link"
                                        size="sm"
                                        onClick={() => removeTier(idx, tIdx)}
                                        permission="contr.create"
                                      >
                                        <CIcon icon={cilTrash} />
                                      </PermissionButton>
                                    </CTableDataCell>
                                  </CTableRow>
                                ))}
                              </CTableBody>
                            </CTable>
                          ) : (
                            <div className="small text-body-secondary">Nessuna soglia configurata.</div>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    </React.Fragment>
                  )
                })}
              </CTableBody>
            </CTable>
          </section>

          <div className="d-flex gap-2">
            <PermissionButton color="primary" type="submit" disabled={saving} permission="contr.create">
              {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
              Salva
            </PermissionButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default ContrattiCreate
