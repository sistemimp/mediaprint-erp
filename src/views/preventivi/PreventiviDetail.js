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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilSave } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { createPreventivo, fetchPreventivoDetail } from '../../services/preventivi'
import { fetchCategorieProdotti, fetchProdotti, fetchNatureIva, fetchProdottoVariazioni } from '../../services/prodotti'

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
  const [clientiOptions, setClientiOptions] = useState([])
  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [dataPreventivo, setDataPreventivo] = useState('')
  const [note, setNote] = useState('')

  // Righe
  const [righe, setRighe] = useState([])

  // Stepper prodotti
  const [stepperOpen, setStepperOpen] = useState(false)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  // Variazioni prodotto selezionato
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selIva, setSelIva] = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

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

  // Carica clienti (stesso comportamento della pagina Crea)
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoadingClienti(true)
      try {
        const PAGE_SIZE = 10000
        const first = await fetchAnagrafiche({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: PAGE_SIZE,
          search: clienteSearch && clienteSearch.trim() !== '' ? clienteSearch.trim() : undefined,
          sortBy: 'ragione_sociale',
          sortDirection: 'asc',
        })
        let allItems = Array.isArray(first.items) ? [...first.items] : []
        const totalPages = Math.max(first?.meta?.last_page ?? 1, 1)
        const perPage = first?.meta?.per_page ?? PAGE_SIZE
        for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
          if (controller.signal.aborted) return
          const { items: pageItems = [] } = await fetchAnagrafiche({
            token,
            signal: controller.signal,
            page: nextPage,
            pageSize: perPage,
            search: clienteSearch && clienteSearch.trim() !== '' ? clienteSearch.trim() : undefined,
            sortBy: 'ragione_sociale',
            sortDirection: 'asc',
          })
          if (Array.isArray(pageItems) && pageItems.length > 0) {
            allItems = allItems.concat(pageItems)
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
        setClientiOptions(normalized)
      } catch (e) {
        if (e.name === 'AbortError') return
        // Silenzia errori minori
        setClientiOptions([])
      } finally {
        setLoadingClienti(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, clienteSearch])

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

  // Carica variazioni del prodotto selezionato
  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    if (!token) return
    if (!selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal })
        const sorted = Array.isArray(items)
          ? [...items].sort((a, b) => String(a?.codice || '').localeCompare(String(b?.codice || '')) || String(a?.nome || '').localeCompare(String(b?.nome || '')))
          : []
        setProdVarOptions(sorted)
      } catch (_e) {
        setProdVarOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selProd])

  const updateRiga = (index, patch) => {
    setRighe((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const handleAddRiga = () => {
    setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }))
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
                      disabled={!editable}
                    />
                  </CInputGroup>
                  <CFormSelect
                    className="mt-2"
                    value={idAnagrafica}
                    onChange={(e) => setIdAnagrafica(e.target.value)}
                    disabled={!editable || loadingClienti}
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
                    disabled={!editable}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Note</CFormLabel>
                  <CFormInput
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!editable}
                  />
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0 text-body-secondary">Righe preventivo</h6>
              <div className="d-flex gap-2">
                <CButton color="secondary" variant="outline" size="sm" onClick={handleAddRiga} disabled={!editable}>
                  Aggiungi riga
                </CButton>
                <CButton color="primary" variant="outline" size="sm" onClick={() => setStepperOpen((v) => !v)} disabled={!editable}>
                  Selettore prodotti
                </CButton>
              </div>
            </div>
            {stepperOpen && (
              <div className="border rounded p-3 mt-3">
                <CRow className="g-3 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Categoria</CFormLabel>
                    <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={!editable}>
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
                      disabled={!editable}
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
                    <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={!editable} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Variazioni prodotto (opz.)</CFormLabel>
                    <CFormSelect
                      multiple
                      value={selectedVarIds.map(String)}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                        setSelectedVarIds(values)
                      }}
                      disabled={!editable || prodVarOptions.length === 0}
                    >
                      {prodVarOptions.map((v) => (
                        <option key={v.id_variazione} value={v.id_variazione}>
                          {v.categoria ? `${v.categoria} - ` : ''}{v.nome}{v.codice ? ` [${v.codice}]` : ''}{typeof v.delta_prezzo === 'number' && v.delta_prezzo !== 0 ? ` (${v.delta_prezzo >= 0 ? '+' : ''}${v.delta_prezzo})` : ''}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
                <CRow className="g-3 mt-2 align-items-end">
                  <CCol md={3}>
                    <CFormLabel>Ricerca prodotto</CFormLabel>
                    <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={!editable} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Quantità</CFormLabel>
                    <CFormInput id="step-qta" type="number" min="1" step="1" defaultValue={1} disabled={!editable} />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel>Prezzo</CFormLabel>
                    <CFormInput id="step-prezzo" type="number" min="0" step="0.01" defaultValue={(() => {
                      const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                      return prod?.prezzo_listino ?? 0
                    })()} disabled={!editable} />
                  </CCol>
                  <CCol md={3} className="d-flex gap-2">
                    <CButton color="primary" type="button" disabled={!editable}
                      onClick={() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const q = Number(document.getElementById('step-qta')?.value || 1)
                        const prezzoBase = Number(document.getElementById('step-prezzo')?.value || prod.prezzo_listino || 0)
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const selectedVars = prodVarOptions.filter((v) => selectedVarIds.includes(v.id_variazione))
                        const delta = selectedVars.reduce((acc, v) => acc + (Number(v.delta_prezzo) || 0), 0)
                        const descr = selectedVars.length > 0
                          ? `${prod.nome} - ${selectedVars.map((v) => `${v.nome}${v.codice ? ' [' + v.codice + ']' : ''}`).join(', ')}`
                          : prod.nome
                        const riga = { descrizione: descr, quantita: q, prezzo: prezzoBase + delta, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto }
                        if (ivaPerc === 0) {
                          const nat = naturaOptions[0]
                          if (nat) riga.id_sdi_natura_iva = nat.id_natura
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
                            disabled={!editable}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="1"
                            value={riga.quantita}
                            onChange={(e) => updateRiga(idx, { quantita: e.target.value })}
                            disabled={!editable}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={riga.prezzo}
                            onChange={(e) => updateRiga(idx, { prezzo: e.target.value })}
                            disabled={!editable}
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
                            disabled={!editable}
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
                          disabled={!editable}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CFormSelect
                          value={riga.id_sdi_natura_iva ?? ''}
                          onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                          disabled={!editable || Number(riga.iva) !== 0}
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
                          <CButton color="link" size="sm" className="p-0" onClick={() => handleRemoveRiga(idx)} disabled={!editable}>
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
              <CButton color="secondary" variant="outline" type="button" onClick={handleSalvaBozza} disabled={!editable || submitting}>
                <CIcon icon={cilSave} className="me-2" /> Aggiorna bozza
              </CButton>
              <CButton color="primary" type="submit" disabled={!editable || submitting}>
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
