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
import { cilSave, cilTrash, cilPlus, cilArrowLeft } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { deleteContratto, fetchContrattoDetail, saveContratto } from '../../services/contratti'
import { fetchNatureIva, fetchProdotti } from '../../services/prodotti'
import { fetchPacchetti } from '../../services/pacchetti'
import AnagraficaAutocomplete from '../../components/AnagraficaAutocomplete'
import HtmlEditor from '../../components/HtmlEditor'

const createEmptyLine = () => ({
  tipo_item: 'prodotto',
  id_prodotto: '',
  id_pacchetto: '',
  descrizione: '',
  prezzo_unitario: 0,
  iva: 22,
  id_sdi_natura_iva: null,
  sconto_base: 0,
  sconti: [],
})

const ContrattiDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = Number(query.get('id') || 0)
  const { token, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [anagraficaOptions, setAnagraficaOptions] = useState([])
  const [anagraficaLoading, setAnagraficaLoading] = useState(false)
  const searchAbortRef = useRef(null)

  const [codice, setCodice] = useState('')
  const [titolo, setTitolo] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [rinnovoAutomatico, setRinnovoAutomatico] = useState(false)
  const [attivo, setAttivo] = useState(true)
  const [testoLegale, setTestoLegale] = useState('')

  const [righe, setRighe] = useState([createEmptyLine()])
  const [prodOptions, setProdOptions] = useState([])
  const [pkgOptions, setPkgOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])

  useEffect(() => {
    if (!id) {
      navigate('/contratti/lista', { replace: true })
    }
  }, [id, navigate])

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchContrattoDetail({ token, id, signal: controller.signal })
        const header = data?.contratto || {}
        setIdAnagrafica(String(header.id_anagrafica || ''))
        setCodice(header.codice || '')
        setTitolo(header.titolo || '')
        setDataInizio(header.data_inizio || '')
        setDataFine(header.data_fine || '')
        setRinnovoAutomatico(Number(header.rinnovo_automatico) === 1)
        setAttivo(Number(header.attivo) === 1)
        setTestoLegale(header.testo_legale || '')
        setRighe(
          Array.isArray(data?.righe) && data.righe.length > 0
            ? data.righe.map((r) => ({
                tipo_item: r.tipo_item || 'prodotto',
                id_prodotto: r.id_prodotto ?? '',
                id_pacchetto: r.id_pacchetto ?? '',
                descrizione: r.descrizione ?? '',
                prezzo_unitario: r.prezzo_unitario ?? 0,
                iva: r.iva ?? 22,
                id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                sconto_base: r.sconto_base ?? 0,
                sconti: Array.isArray(r.sconti) ? r.sconti : [],
              }))
            : [createEmptyLine()],
        )
        if (header.id_anagrafica && header.ragione_sociale) {
          setAnagraficaOptions((prev) => {
            const exists = prev.some(
              (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(header.id_anagrafica),
            )
            if (exists) return prev
            return [
              {
                id_anagrafica: header.id_anagrafica,
                ragione_sociale: header.ragione_sociale,
              },
              ...prev,
            ]
          })
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: prodotti }, { items: pacchetti }, { items: nature }] = await Promise.all([
          fetchProdotti({ token, signal: controller.signal }),
          fetchPacchetti({ token, onlyActive: true, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
        ])
        setProdOptions(Array.isArray(prodotti) ? prodotti : [])
        setPkgOptions(Array.isArray(pacchetti) ? pacchetti : [])
        setNaturaOptions(Array.isArray(nature) ? nature : [])
      } catch (_err) {
        setProdOptions([])
        setPkgOptions([])
        setNaturaOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

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

  const handleAddLine = () => {
    setRighe((rows) => rows.concat(createEmptyLine()))
  }

  const handleRemoveLine = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }

  const normalizeLines = (rows) => {
    const out = []
    rows.forEach((row) => {
      const tipo = row.tipo_item === 'pacchetto' ? 'pacchetto' : 'prodotto'
      const idProd = tipo === 'prodotto' ? Number(row.id_prodotto) : null
      const idPkg = tipo === 'pacchetto' ? Number(row.id_pacchetto) : null
      if (tipo === 'prodotto' && (!idProd || Number.isNaN(idProd))) return
      if (tipo === 'pacchetto' && (!idPkg || Number.isNaN(idPkg))) return

      out.push({
        tipo_item: tipo,
        id_prodotto: tipo === 'prodotto' ? idProd : null,
        id_pacchetto: tipo === 'pacchetto' ? idPkg : null,
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
      id_contratto: id,
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
      await saveContratto({ token, body: payload })
      setSaveSuccess('Contratto salvato.')
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

  const handleDelete = async () => {
    if (!window.confirm('Confermi l\'eliminazione definitiva del contratto?')) return
    setDeleting(true)
    try {
      await deleteContratto({ token, id })
      navigate('/contratti/lista')
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setDeleting(false)
    }
  }

  const productsMap = useMemo(() => {
    const map = new Map()
    prodOptions.forEach((p) => map.set(Number(p.id_prodotto), p))
    return map
  }, [prodOptions])

  const packagesMap = useMemo(() => {
    const map = new Map()
    pkgOptions.forEach((p) => map.set(Number(p.id_pacchetto), p))
    return map
  }, [pkgOptions])

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody>
          <CAlert color="danger">{error.message || 'Contratto non trovato.'}</CAlert>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/contratti/lista')}>
            Torna alla lista
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Contratti - Dettagli</h5>
        <CButton color="secondary" variant="outline" onClick={() => navigate('/contratti/lista')}>
          <CIcon icon={cilArrowLeft} className="me-2" /> Lista contratti
        </CButton>
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
                  onChange={(e) => setDataInizio(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data fine</CFormLabel>
                <CFormInput
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
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
              <CButton color="secondary" variant="outline" size="sm" onClick={handleAddLine} type="button">
                <CIcon icon={cilPlus} className="me-2" /> Aggiungi riga
              </CButton>
            </div>
            <CTable hover responsive>
              <CTableHead color="light">
                <CTableRow className="align-middle">
                  <CTableHeaderCell style={{ width: 140 }}>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>Prodotto/Pacchetto</CTableHeaderCell>
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
                  const isPackage = row.tipo_item === 'pacchetto'
                  const requireNatura = Number(row.iva) === 0
                  return (
                    <React.Fragment key={`line-${idx}`}>
                      <CTableRow className="align-middle">
                        <CTableDataCell>
                          <CFormSelect
                            value={row.tipo_item}
                            onChange={(e) =>
                              updateLine(idx, {
                                tipo_item: e.target.value,
                                id_prodotto: '',
                                id_pacchetto: '',
                              })
                            }
                          >
                            <option value="prodotto">Prodotto</option>
                            <option value="pacchetto">Pacchetto</option>
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell>
                          {isPackage ? (
                            <CFormSelect
                              value={row.id_pacchetto}
                              onChange={(e) => {
                                const idValue = e.target.value
                                const item = packagesMap.get(Number(idValue))
                                updateLine(idx, {
                                  id_pacchetto: idValue,
                                  descrizione: row.descrizione || item?.nome || '',
                                })
                              }}
                            >
                              <option value="">Seleziona pacchetto</option>
                              {pkgOptions.map((p) => (
                                <option key={p.id_pacchetto} value={p.id_pacchetto}>
                                  {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                                </option>
                              ))}
                            </CFormSelect>
                          ) : (
                            <CFormSelect
                              value={row.id_prodotto}
                              onChange={(e) => {
                                const idValue = e.target.value
                                const item = productsMap.get(Number(idValue))
                                updateLine(idx, {
                                  id_prodotto: idValue,
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
                          )}
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
                          <CButton color="link" size="sm" onClick={() => handleRemoveLine(idx)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell colSpan={8}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-body-secondary small">Sconti per quantita'</span>
                            <CButton color="secondary" size="sm" variant="outline" onClick={() => addTier(idx)} type="button">
                              <CIcon icon={cilPlus} className="me-2" /> Aggiungi soglia
                            </CButton>
                          </div>
                          {row.sconti && row.sconti.length > 0 ? (
                            <CTable small responsive className="mb-0">
                              <CTableHead color="light">
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
                                      <CButton color="link" size="sm" onClick={() => removeTier(idx, tIdx)}>
                                        <CIcon icon={cilTrash} />
                                      </CButton>
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
            <CButton color="primary" type="submit" disabled={saving}>
              {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
              Salva
            </CButton>
            <CButton color="danger" variant="outline" onClick={handleDelete} disabled={deleting}>
              {deleting ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilTrash} className="me-2" />}
              Elimina
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default ContrattiDetail
