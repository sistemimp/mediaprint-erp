import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useAuth } from '../../context/AuthContext'
import {
  fetchCategorieProdotti,
  fetchProdotti,
  fetchProdottoPrezziCombinati,
  fetchProdottoVariazioni,
} from '../../services/prodotti'
import {
  createMagazzinoArticleWithProducts,
  fetchMagazzinoStock,
  fetchMagazzinoProductConsumptions,
  saveMagazzinoProductConsumptions,
} from '../../services/magazzino'

// Riga vuota per consumi articolo.
const emptyRow = { id_articolo: '', quantita_per_unita: '1', scarto_percento: '0', attivo: 1 }
// Riga vuota per collegamento prodotto/variazione ad articolo esistente.
const emptyProductLinkRow = {
  id_prodotto: '',
  id_variazione: '',
  quantita_per_unita: '1',
  scarto_percento: '0',
  attivo: 1,
}
const emptyExistingLinkForm = {
  id_articolo: '',
  rows: [emptyProductLinkRow],
}

// Gestione consumi articoli per prodotti, varianti e combinazioni.
const MagazzinoConsumiPage = () => {
  const { token, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [prodotti, setProdotti] = useState([])
  const [productVariations, setProductVariations] = useState([])
  const [articoli, setArticoli] = useState([])
  const [categorie, setCategorie] = useState([])
  const [unitaMisuraOptions, setUnitaMisuraOptions] = useState([])
  const [selectedProductScope, setSelectedProductScope] = useState('')
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [selectorStep, setSelectorStep] = useState(1)
  const [selectorCat, setSelectorCat] = useState('')
  const [selectorSearch, setSelectorSearch] = useState('')
  const [selectorProdOptions, setSelectorProdOptions] = useState([])
  const [selectorProd, setSelectorProd] = useState('')
  const [selectorComboKey, setSelectorComboKey] = useState('')
  const [selectorComboOptions, setSelectorComboOptions] = useState([])
  const [selectorVarOptions, setSelectorVarOptions] = useState([])
  const [comboLabelsByProduct, setComboLabelsByProduct] = useState({})
  const [rows, setRows] = useState([emptyRow])
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [articleSaving, setArticleSaving] = useState(false)
  const [existingLinkModalOpen, setExistingLinkModalOpen] = useState(false)
  const [existingLinkSaving, setExistingLinkSaving] = useState(false)
  const [existingLinkForm, setExistingLinkForm] = useState(emptyExistingLinkForm)
  const [articleForm, setArticleForm] = useState({
    codice: '',
    nome: '',
    id_categoria: '',
    gestione_magazzino: true,
    giacenza_attuale: '0',
    soglia_scorta: '',
    id_unita: '',
    note: '',
  })

  // Auto-hide dei messaggi feedback.
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  // Carica consumi e metadati in base allo scope prodotto selezionato.
  const loadData = useCallback(
    async (scopeKey) => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [scopeProdottoRaw, scopeComboRaw = ''] = String(scopeKey || '').split(':')
        const scopeProdotto = Number(scopeProdottoRaw) || 0
        const {
          items,
          prodotti: prodList,
          productVariations: variationsList,
          articoli: artList,
        } = await fetchMagazzinoProductConsumptions({
          token,
          id_prodotto: scopeProdotto || undefined,
          combo_key: scopeKey ? scopeComboRaw : undefined,
        })
        setProdotti(Array.isArray(prodList) ? prodList : [])
        setProductVariations(Array.isArray(variationsList) ? variationsList : [])
        setArticoli(Array.isArray(artList) ? artList : [])
        if (scopeKey) {
          const nextRows = (Array.isArray(items) ? items : []).map((item) => ({
            id_articolo: item.id_articolo ? String(item.id_articolo) : '',
            quantita_per_unita:
              item.quantita_per_unita != null ? String(item.quantita_per_unita) : '1',
            scarto_percento: item.scarto_percento != null ? String(item.scarto_percento) : '0',
            attivo: Number(item.attivo ?? 1) === 1 ? 1 : 0,
          }))
          setRows(nextRows.length > 0 ? nextRows : [emptyRow])
        }
      } catch (err) {
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setError(err)
      } finally {
        setLoading(false)
      }
    },
    [logout, token],
  )

  // Carica categorie prodotti e unità di misura disponibili.
  const loadMeta = useCallback(async () => {
    if (!token) return
    try {
      const [{ items: categorieItems }, { unitaMisuraOptions: unitItems }] = await Promise.all([
        fetchCategorieProdotti({ token }),
        fetchMagazzinoStock({ token, include_unmanaged: true }),
      ])
      setCategorie(Array.isArray(categorieItems) ? categorieItems : [])
      setUnitaMisuraOptions(Array.isArray(unitItems) ? unitItems : [])
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
      }
    }
  }, [logout, token])

  // Load iniziale pagina.
  useEffect(() => {
    loadData(null)
    loadMeta()
  }, [loadData, loadMeta])

  // Ricarica dati quando cambia lo scope selezionato.
  useEffect(() => {
    if (!selectedProductScope) return
    loadData(selectedProductScope)
  }, [selectedProductScope, loadData])

  // Etichetta prodotto/scope mostrata in testata.
  const productLabel = useMemo(() => {
    if (!selectedProductScope) return ''
    const [idProdottoRaw, comboKeyRaw = ''] = String(selectedProductScope).split(':')
    const idProdotto = Number(idProdottoRaw) || 0
    const p = prodotti.find((entry) => Number(entry?.id_prodotto) === idProdotto)
    if (!p) return ''
    if (!comboKeyRaw) {
      return `${p.codice || '-'} - ${p.nome || ''}`
    }
    const labelsByCombo = comboLabelsByProduct[idProdotto] || {}
    const comboLabel = labelsByCombo[comboKeyRaw] || comboKeyRaw
    return `${p.codice || '-'} - ${p.nome || ''} | ${comboLabel}`
  }, [prodotti, selectedProductScope, comboLabelsByProduct])

  // Apre wizard selezione prodotto + combinazione.
  const openProductSelector = () => {
    const [idProdottoRaw, comboKeyRaw = ''] = String(selectedProductScope || '').split(':')
    setSelectorProd(idProdottoRaw || '')
    setSelectorComboKey(comboKeyRaw || '')
    setSelectorStep(1)
    setSelectorOpen(true)
  }

  // Carica opzioni prodotti per wizard selector.
  useEffect(() => {
    if (!selectorOpen || !token) return undefined
    const controller = new AbortController()
    const run = async () => {
      try {
        const { items } = await fetchProdotti({
          token,
          id_categoria: selectorCat ? Number(selectorCat) : undefined,
          q: selectorSearch,
          signal: controller.signal,
        })
        setSelectorProdOptions(Array.isArray(items) ? items : [])
      } catch (_) {
        // no-op
      }
    }
    run()
    return () => controller.abort()
  }, [selectorOpen, token, selectorCat, selectorSearch])

  // Carica combinazioni e variazioni del prodotto selezionato.
  useEffect(() => {
    if (!selectorOpen || !token || !selectorProd) {
      setSelectorComboOptions([])
      setSelectorVarOptions([])
      setSelectorComboKey('')
      return undefined
    }
    const controller = new AbortController()
    const run = async () => {
      try {
        const [comboResp, varResp] = await Promise.all([
          fetchProdottoPrezziCombinati({
            token,
            id_prodotto: Number(selectorProd),
            signal: controller.signal,
          }),
          fetchProdottoVariazioni({
            token,
            id_prodotto: Number(selectorProd),
            signal: controller.signal,
          }),
        ])
        const comboItems = Array.isArray(comboResp?.items) ? comboResp.items : []
        const varItems = Array.isArray(varResp?.items) ? varResp.items : []
        setSelectorComboOptions(comboItems)
        setSelectorVarOptions(varItems)

        const labelsByCombo = {}
        for (const combo of comboItems) {
          const ids = Array.isArray(combo?.var_ids)
            ? combo.var_ids
            : String(combo?.combo_key || '')
                .split('+')
                .map((value) => Number(value) || 0)
                .filter((value) => value > 0)
          const labels = ids
            .map((id) => {
              const variation = varItems.find((item) => Number(item?.id_variazione) === Number(id))
              if (!variation) return String(id)
              return variation.codice ? `${variation.codice} - ${variation.nome}` : variation.nome
            })
            .filter(Boolean)
          labelsByCombo[String(combo.combo_key || '')] = labels.join(', ')
        }
        setComboLabelsByProduct((prev) => ({
          ...prev,
          [Number(selectorProd)]: labelsByCombo,
        }))
      } catch (_) {
        setSelectorComboOptions([])
        setSelectorVarOptions([])
      }
    }
    run()
    return () => controller.abort()
  }, [selectorOpen, selectorProd, token])

  // Aggiorna campo di una riga consumi.
  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  // Aggiunge una nuova riga consumi.
  const addRow = () => setRows((prev) => [...prev, emptyRow])

  // Rimuove una riga consumi.
  const removeRow = (index) => {
    setRows((prev) => {
      const out = prev.filter((_, i) => i !== index)
      return out.length > 0 ? out : [emptyRow]
    })
  }

  // Apre modal creazione nuovo articolo magazzino.
  const openCreateArticleModal = () => {
    setArticleForm({
      codice: '',
      nome: '',
      id_categoria: '',
      gestione_magazzino: true,
      giacenza_attuale: '0',
      soglia_scorta: '',
      id_unita: '',
      note: '',
    })
    setArticleModalOpen(true)
  }

  // Apre modal collegamento articolo esistente a prodotto/variazione.
  const openExistingLinkModal = () => {
    setExistingLinkForm(emptyExistingLinkForm)
    setExistingLinkModalOpen(true)
  }

  // Aggiorna una riga del form collegamenti esistenti.
  const updateExistingLinkRow = (index, field, value) => {
    setExistingLinkForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }))
  }

  // Aggiunge riga collegamento nel modal articolo esistente.
  const addExistingLinkRow = () => {
    setExistingLinkForm((prev) => ({ ...prev, rows: [...prev.rows, emptyProductLinkRow] }))
  }

  // Rimuove riga collegamento nel modal articolo esistente.
  const removeExistingLinkRow = (index) => {
    setExistingLinkForm((prev) => {
      const out = prev.rows.filter((_, i) => i !== index)
      return { ...prev, rows: out.length > 0 ? out : [emptyProductLinkRow] }
    })
  }

  // Restituisce variazioni disponibili per un prodotto.
  const getVariationOptionsForProduct = useCallback(
    (idProdotto) =>
      productVariations.filter(
        (variation) => Number(variation?.id_prodotto) === Number(idProdotto),
      ),
    [productVariations],
  )

  // Indica se il prodotto selezionato ha variazioni.
  const productHasVariations = useCallback(
    (idProdotto) => getVariationOptionsForProduct(idProdotto).length > 0,
    [getVariationOptionsForProduct],
  )

  // Indica se per il prodotto ci sono combinazioni configurate.
  const selectorHasCombos = useMemo(() => selectorComboOptions.length > 0, [selectorComboOptions])

  // Conferma selezione scope prodotto/combinazione.
  const applySelectorChoice = () => {
    const idProdotto = Number(selectorProd) || 0
    if (idProdotto <= 0) return
    if (selectorHasCombos && String(selectorComboKey || '').trim() === '') {
      setFeedback({
        color: 'warning',
        message: 'Seleziona una combinazione del prodotto.',
      })
      return
    }
    setSelectedProductScope(`${idProdotto}:${String(selectorComboKey || '').trim()}`)
    setSelectorOpen(false)
  }

  // Salva consumi articoli per lo scope selezionato.
  const handleSave = async () => {
    if (!selectedProductScope) {
      setFeedback({ color: 'warning', message: 'Seleziona prima un prodotto.' })
      return
    }
    const [scopeProdottoRaw, scopeComboRaw = ''] = String(selectedProductScope).split(':')
    const scopeProdotto = Number(scopeProdottoRaw) || 0
    const scopeComboKey = String(scopeComboRaw || '').trim()
    setSaving(true)
    setError(null)
    try {
      await saveMagazzinoProductConsumptions({
        token,
        body: {
          id_prodotto: scopeProdotto,
          combo_key: scopeComboKey || null,
          rows: rows.map((row) => ({
            id_articolo: row.id_articolo ? Number(row.id_articolo) : null,
            quantita_per_unita: row.quantita_per_unita,
            scarto_percento: row.scarto_percento,
            attivo: Number(row.attivo) === 1 ? 1 : 0,
          })),
        },
      })
      setFeedback({ color: 'success', message: 'Distinta consumi salvata.' })
      await loadData(selectedProductScope)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  // Crea un nuovo articolo magazzino dal modal dedicato.
  const handleCreateArticle = async (event) => {
    event.preventDefault()
    if (!articleForm.nome || String(articleForm.nome).trim() === '') {
      setFeedback({ color: 'warning', message: "Il nome dell'articolo è obbligatorio." })
      return
    }

    setArticleSaving(true)
    setError(null)
    try {
      const response = await createMagazzinoArticleWithProducts({
        token,
        body: {
          codice: articleForm.codice || null,
          nome: articleForm.nome,
          id_categoria: articleForm.id_categoria ? Number(articleForm.id_categoria) : null,
          gestione_magazzino: articleForm.gestione_magazzino ? 1 : 0,
          giacenza_attuale:
            articleForm.giacenza_attuale === '' ? 0 : Number(articleForm.giacenza_attuale),
          soglia_scorta:
            articleForm.soglia_scorta === '' ? null : Number(articleForm.soglia_scorta),
          id_unita: articleForm.id_unita === '' ? null : Number(articleForm.id_unita),
          note: articleForm.note || null,
          rows: [],
        },
      })

      setArticleModalOpen(false)
      setFeedback({
        color: 'success',
        message: `Articolo creato (${response?.item?.nome || articleForm.nome}).`,
      })
      await loadData(selectedProductScope || null)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setError(err)
    } finally {
      setArticleSaving(false)
    }
  }

  // Collega un articolo esistente a uno o più prodotti/variazioni.
  const handleLinkExistingArticle = async (event) => {
    event.preventDefault()
    const idArticolo = Number(existingLinkForm.id_articolo) || 0
    if (idArticolo <= 0) {
      setFeedback({ color: 'warning', message: 'Seleziona un articolo da collegare.' })
      return
    }

    const normalizedLinks = existingLinkForm.rows
      .map((row) => ({
        id_prodotto: row.id_prodotto ? Number(row.id_prodotto) : null,
        id_variazione: row.id_variazione ? Number(row.id_variazione) : null,
        quantita_per_unita: row.quantita_per_unita,
        scarto_percento: row.scarto_percento,
        attivo: Number(row.attivo) === 1 ? 1 : 0,
      }))
      .filter((row) => Number(row.id_prodotto) > 0 && Number(row.quantita_per_unita) > 0)

    const missingVariation = existingLinkForm.rows.find(
      (row) =>
        Number(row.id_prodotto) > 0 && productHasVariations(row.id_prodotto) && !row.id_variazione,
    )
    if (missingVariation) {
      setFeedback({
        color: 'warning',
        message: 'Seleziona la variazione per ogni prodotto che la prevede.',
      })
      return
    }

    if (normalizedLinks.length === 0) {
      setFeedback({
        color: 'warning',
        message: 'Seleziona almeno un prodotto con quantità valida.',
      })
      return
    }

    setExistingLinkSaving(true)
    setError(null)
    try {
      const uniqueLinks = Array.from(
        normalizedLinks.reduce((map, row) => {
          map.set(`${Number(row.id_prodotto)}:${Number(row.id_variazione) || 0}`, row)
          return map
        }, new Map()),
      ).map(([, row]) => row)

      for (const linkRow of uniqueLinks) {
        const productId = Number(linkRow.id_prodotto) || 0
        const variationId = Number(linkRow.id_variazione) || 0
        if (productId <= 0) continue

        const { items } = await fetchMagazzinoProductConsumptions({
          token,
          id_prodotto: productId,
          id_variazione: variationId,
        })

        const existingRows = (Array.isArray(items) ? items : []).map((item) => ({
          id_articolo: Number(item.id_articolo) || null,
          quantita_per_unita: item.quantita_per_unita != null ? Number(item.quantita_per_unita) : 1,
          scarto_percento: item.scarto_percento != null ? Number(item.scarto_percento) : 0,
          attivo: Number(item.attivo ?? 1) === 1 ? 1 : 0,
        }))

        const payloadRow = {
          id_articolo: idArticolo,
          quantita_per_unita: Number(linkRow.quantita_per_unita),
          scarto_percento: linkRow.scarto_percento === '' ? 0 : Number(linkRow.scarto_percento),
          attivo: Number(linkRow.attivo) === 1 ? 1 : 0,
        }

        const idx = existingRows.findIndex((row) => Number(row.id_articolo) === idArticolo)
        const mergedRows = [...existingRows]
        if (idx >= 0) {
          mergedRows[idx] = payloadRow
        } else {
          mergedRows.push(payloadRow)
        }

        await saveMagazzinoProductConsumptions({
          token,
          body: {
            id_prodotto: productId,
            id_variazione: variationId > 0 ? variationId : null,
            rows: mergedRows,
          },
        })
      }

      const articleName =
        articoli.find((entry) => Number(entry?.id_articolo || entry?.id_prodotto) === idArticolo)
          ?.nome || 'Articolo'
      setExistingLinkModalOpen(false)
      setFeedback({
        color: 'success',
        message: `${articleName} collegato a ${uniqueLinks.length} prodotto/i (variazione inclusa).`,
      })
      await loadData(selectedProductScope || null)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setError(err)
    } finally {
      setExistingLinkSaving(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Distinta consumi prodotto</h5>
        <small className="text-body-secondary">
          Ogni prodotto può consumare uno o più articoli di magazzino
        </small>
      </CCardHeader>
      <CCardBody>
        {feedback && <CAlert color={feedback.color || 'info'}>{feedback.message}</CAlert>}
        {error && <CAlert color="danger">{error?.message || 'Errore operazione.'}</CAlert>}

        <CRow className="g-2 mb-3">
          <CCol md={6}>
            <CFormLabel>Prodotto / variazione</CFormLabel>
            <div className="d-flex gap-2">
              <CFormInput
                value={selectedProductScope ? productLabel : ''}
                placeholder="Nessuna selezione"
                readOnly
              />
              <CButton color="secondary" variant="outline" onClick={openProductSelector}>
                Selettore prodotti
              </CButton>
            </div>
          </CCol>
          <CCol md={6} className="d-flex justify-content-end gap-2">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => loadData(selectedProductScope || null)}
              disabled={loading}
            >
              Aggiorna
            </CButton>
            <CButton color="secondary" variant="outline" onClick={openCreateArticleModal}>
              Nuovo articolo
            </CButton>
            <CButton color="secondary" variant="outline" onClick={openExistingLinkModal}>
              Collega articolo esistente
            </CButton>
            <CButton
              color="primary"
              onClick={handleSave}
              disabled={saving || !selectedProductScope}
            >
              Salva distinta
            </CButton>
          </CCol>
        </CRow>

        {selectedProductScope && (
          <div className="small text-body-secondary mb-2">
            Prodotto/variazione selezionato: <strong>{productLabel}</strong>
          </div>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner />
          </div>
        ) : (
          <>
            <CTable responsive>
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell>Articolo magazzino</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Q.ta per unita</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Scarto %</CTableHeaderCell>
                  <CTableHeaderCell>Attivo</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((row, index) => (
                  <CTableRow key={`row-${index}`}>
                    <CTableDataCell>
                      <CFormSelect
                        value={row.id_articolo}
                        onChange={(event) => updateRow(index, 'id_articolo', event.target.value)}
                      >
                        <option value="">Seleziona articolo</option>
                        {articoli.map((article) => (
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
                          updateRow(index, 'quantita_per_unita', event.target.value)
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
                          updateRow(index, 'scarto_percento', event.target.value)
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormSelect
                        value={row.attivo}
                        onChange={(event) =>
                          updateRow(index, 'attivo', Number(event.target.value) === 1 ? 1 : 0)
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
                        onClick={() => removeRow(index)}
                      >
                        Rimuovi
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            <div className="d-flex justify-content-start">
              <CButton color="secondary" variant="outline" onClick={addRow}>
                Aggiungi riga
              </CButton>
            </div>
          </>
        )}
      </CCardBody>

      <CModal
        visible={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        size="lg"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>Selettore prodotti</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CStepper
            activeStepNumber={selectorStep}
            steps={['Categoria', 'Prodotto', 'Combinazione', 'Riepilogo']}
            linear={false}
            validation={false}
            onStepChange={(step) => {
              const n = Number(step) || 1
              if (n <= selectorStep) {
                setSelectorStep(n)
                return
              }
              if (n === 2) {
                setSelectorStep(2)
                return
              }
              if (n === 3) {
                if (!selectorProd) return
                setSelectorStep(3)
                return
              }
              if (n === 4) {
                if (!selectorProd) return
                if (selectorHasCombos && String(selectorComboKey || '').trim() === '') return
                setSelectorStep(4)
              }
            }}
          />

          {selectorStep === 1 && (
            <CRow className="g-3 mt-1">
              <CCol md={12}>
                <CFormLabel>Categoria prodotto</CFormLabel>
                <CFormSelect
                  value={selectorCat}
                  onChange={(event) => setSelectorCat(event.target.value)}
                >
                  <option value="">Tutte</option>
                  {categorie.map((category) => (
                    <option key={category.id_categoria} value={category.id_categoria}>
                      {category.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
          )}

          {selectorStep === 2 && (
            <CRow className="g-3 mt-1">
              <CCol md={6}>
                <CFormLabel>Prodotto</CFormLabel>
                <CFormSelect
                  value={selectorProd}
                  onChange={(event) => {
                    setSelectorProd(event.target.value)
                    setSelectorComboKey('')
                  }}
                >
                  <option value="">Seleziona...</option>
                  {selectorProdOptions.map((product) => (
                    <option key={product.id_prodotto} value={product.id_prodotto}>
                      {product.codice ? `${product.codice} - ${product.nome}` : product.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Ricerca</CFormLabel>
                <CFormInput
                  placeholder="Cerca per nome o codice"
                  value={selectorSearch}
                  onChange={(event) => setSelectorSearch(event.target.value)}
                />
              </CCol>
            </CRow>
          )}

          {selectorStep === 3 && (
            <CRow className="g-3 mt-1">
              <CCol md={12}>
                <CFormLabel>Combinazione prodotto</CFormLabel>
                <CFormSelect
                  value={selectorComboKey}
                  onChange={(event) => setSelectorComboKey(event.target.value)}
                >
                  <option value="">
                    {selectorHasCombos ? 'Seleziona combinazione' : 'Nessuna combinazione definita'}
                  </option>
                  {selectorComboOptions.map((combo, index) => {
                    const comboKey = String(combo?.combo_key || '')
                    const labels =
                      (comboLabelsByProduct[Number(selectorProd)] || {})[comboKey] || comboKey
                    return (
                      <option key={comboKey || index} value={comboKey}>
                        {labels}
                      </option>
                    )
                  })}
                </CFormSelect>
                {!selectorHasCombos && (
                  <CAlert color="info" className="mb-0 mt-2">
                    Nessuna combinazione definita: verra usato il prodotto base.
                  </CAlert>
                )}
              </CCol>
            </CRow>
          )}

          {selectorStep === 4 && (
            <CRow className="g-3 mt-1">
              <CCol md={12}>
                <div>
                  <strong>Prodotto:</strong>{' '}
                  {(() => {
                    const p = selectorProdOptions.find(
                      (product) => String(product.id_prodotto) === String(selectorProd),
                    )
                    if (!p) return '-'
                    return p.codice ? `${p.codice} - ${p.nome}` : p.nome
                  })()}
                </div>
                <div className="mt-2">
                  <strong>Combinazione:</strong>{' '}
                  {(() => {
                    if (!selectorComboKey) return 'Prodotto base'
                    const labelsByCombo = comboLabelsByProduct[Number(selectorProd)] || {}
                    return labelsByCombo[selectorComboKey] || selectorComboKey
                  })()}
                </div>
                {!!selectorComboKey && (
                  <div className="mt-2">
                    <strong>Variazioni incluse:</strong>{' '}
                    {selectorComboKey
                      .split('+')
                      .map((idValue) => Number(idValue) || 0)
                      .filter((idValue) => idValue > 0)
                      .map((idValue) => {
                        const variation = selectorVarOptions.find(
                          (entry) => Number(entry.id_variazione) === idValue,
                        )
                        if (!variation) return String(idValue)
                        return variation.codice
                          ? `${variation.codice} - ${variation.nome}`
                          : variation.nome
                      })
                      .join(', ')}
                  </div>
                )}
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <div>
            {selectorStep > 1 && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => setSelectorStep((step) => Math.max(1, step - 1))}
              >
                Indietro
              </CButton>
            )}
          </div>
          <div className="d-flex gap-2">
            <CButton color="link" onClick={() => setSelectorOpen(false)}>
              Chiudi
            </CButton>
            {selectorStep < 4 && (
              <CButton
                color="primary"
                onClick={() => {
                  if (selectorStep === 1) {
                    setSelectorStep(2)
                    return
                  }
                  if (selectorStep === 2) {
                    if (!selectorProd) return
                    setSelectorStep(3)
                    return
                  }
                  if (selectorStep === 3) {
                    if (selectorHasCombos && String(selectorComboKey || '').trim() === '') return
                    setSelectorStep(4)
                  }
                }}
                disabled={selectorStep === 2 && !selectorProd}
              >
                Avanti
              </CButton>
            )}
            {selectorStep === 4 && (
              <CButton color="primary" onClick={applySelectorChoice}>
                Conferma selezione
              </CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>

      <CModal visible={articleModalOpen} onClose={() => setArticleModalOpen(false)} size="lg">
        <CForm onSubmit={handleCreateArticle}>
          <CModalHeader>
            <CModalTitle>Nuovo articolo magazzino</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-2 mb-3">
              <CCol md={4}>
                <CFormLabel>Codice</CFormLabel>
                <CFormInput
                  value={articleForm.codice}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, codice: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={8}>
                <CFormLabel>Nome articolo</CFormLabel>
                <CFormInput
                  required
                  value={articleForm.nome}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, nome: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect
                  value={articleForm.id_categoria}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, id_categoria: event.target.value }))
                  }
                >
                  <option value="">Seleziona...</option>
                  {categorie.map((category) => (
                    <option key={category.id_categoria} value={category.id_categoria}>
                      {category.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Unità di misura</CFormLabel>
                <CFormSelect
                  value={articleForm.id_unita}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, id_unita: event.target.value }))
                  }
                >
                  <option value="">Seleziona...</option>
                  {unitaMisuraOptions.map((unit) => (
                    <option key={unit.id_unita} value={unit.id_unita}>
                      {unit.label} ({unit.code})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Giacenza iniziale</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.001"
                  value={articleForm.giacenza_attuale}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, giacenza_attuale: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Soglia scorta</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.001"
                  value={articleForm.soglia_scorta}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, soglia_scorta: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={8}>
                <CFormLabel>Note</CFormLabel>
                <CFormInput
                  value={articleForm.note}
                  onChange={(event) =>
                    setArticleForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={12}>
                <CFormCheck
                  id="article-gestione"
                  label="Gestione magazzino attiva"
                  checked={articleForm.gestione_magazzino}
                  onChange={(event) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      gestione_magazzino: event.target.checked,
                    }))
                  }
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setArticleModalOpen(false)}>
              Annulla
            </CButton>
            <CButton type="submit" color="primary" disabled={articleSaving}>
              {articleSaving ? <CSpinner size="sm" /> : 'Crea articolo'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal
        visible={existingLinkModalOpen}
        onClose={() => setExistingLinkModalOpen(false)}
        size="lg"
      >
        <CForm onSubmit={handleLinkExistingArticle}>
          <CModalHeader>
            <CModalTitle>Collega articolo esistente a prodotti</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-2 mb-3">
              <CCol md={12}>
                <CFormLabel>Articolo di magazzino</CFormLabel>
                <CFormSelect
                  value={existingLinkForm.id_articolo}
                  onChange={(event) =>
                    setExistingLinkForm((prev) => ({ ...prev, id_articolo: event.target.value }))
                  }
                >
                  <option value="">Seleziona articolo</option>
                  {articoli.map((article) => (
                    <option
                      key={article.id_articolo || article.id_prodotto}
                      value={article.id_articolo || article.id_prodotto}
                    >
                      {article.codice || '-'} - {article.nome || ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            <h6 className="mb-2">Prodotti da collegare/aggiornare</h6>
            <CTable responsive>
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell>Prodotto</CTableHeaderCell>
                  <CTableHeaderCell>Variazione</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Q.ta per unita</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Scarto %</CTableHeaderCell>
                  <CTableHeaderCell>Attivo</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {existingLinkForm.rows.map((row, index) => (
                  <CTableRow key={`existing-link-row-${index}`}>
                    <CTableDataCell>
                      <CFormSelect
                        value={row.id_prodotto}
                        onChange={(event) =>
                          setExistingLinkForm((prev) => ({
                            ...prev,
                            rows: prev.rows.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, id_prodotto: event.target.value, id_variazione: '' }
                                : entry,
                            ),
                          }))
                        }
                      >
                        <option value="">Seleziona prodotto</option>
                        {prodotti.map((product) => (
                          <option key={product.id_prodotto} value={product.id_prodotto}>
                            {product.codice || '-'} - {product.nome || ''}
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                    <CTableDataCell>
                      {(() => {
                        const variationOptions = getVariationOptionsForProduct(row.id_prodotto)
                        return (
                          <CFormSelect
                            value={row.id_variazione || ''}
                            onChange={(event) =>
                              updateExistingLinkRow(index, 'id_variazione', event.target.value)
                            }
                            disabled={!row.id_prodotto}
                          >
                            <option value="">
                              {variationOptions.length > 0
                                ? 'Seleziona variazione'
                                : 'Nessuna variazione'}
                            </option>
                            {variationOptions.map((variation) => (
                              <option key={variation.id_variazione} value={variation.id_variazione}>
                                {variation.codice ? `${variation.codice} - ` : ''}
                                {variation.nome || ''}
                              </option>
                            ))}
                          </CFormSelect>
                        )
                      })()}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.quantita_per_unita}
                        onChange={(event) =>
                          updateExistingLinkRow(index, 'quantita_per_unita', event.target.value)
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
                          updateExistingLinkRow(index, 'scarto_percento', event.target.value)
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormSelect
                        value={row.attivo}
                        onChange={(event) =>
                          updateExistingLinkRow(
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
                        variant="outline"
                        size="sm"
                        onClick={() => removeExistingLinkRow(index)}
                      >
                        Rimuovi
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            <CButton color="secondary" variant="outline" onClick={addExistingLinkRow}>
              Aggiungi prodotto
            </CButton>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setExistingLinkModalOpen(false)}
            >
              Annulla
            </CButton>
            <CButton type="submit" color="primary" disabled={existingLinkSaving}>
              {existingLinkSaving ? <CSpinner size="sm" /> : 'Applica collegamenti'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CCard>
  )
}

export default MagazzinoConsumiPage
