import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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

import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import {
  createClienteFondoMovimento,
  fetchClienteFondi,
  fetchClienteFondoMovimenti,
} from '../../services/clienteFondi'
import { searchPagamentiFatture } from '../../services/pagamenti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : '-'
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

const PagamentiFondi = () => {
  const { token, logout } = useAuth()
  const [fondi, setFondi] = useState([])
  const [fondiLoading, setFondiLoading] = useState(false)
  const [fondiError, setFondiError] = useState(null)
  const [selectedFondoId, setSelectedFondoId] = useState('')
  const [movimenti, setMovimenti] = useState([])
  const [movimentiLoading, setMovimentiLoading] = useState(false)
  const [movimentiError, setMovimentiError] = useState(null)
  const [anagrafiche, setAnagrafiche] = useState([])
  const [anagraficheLoading, setAnagraficheLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitOk, setSubmitOk] = useState(null)
  const [saving, setSaving] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceResults, setInvoiceResults] = useState([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceError, setInvoiceError] = useState(null)
  const [selectedAllocs, setSelectedAllocs] = useState({})
  const [form, setForm] = useState({
    id_anagrafica: '',
    causale_code: 'AFFRANCATURA',
    causale_label: 'Fondo affrancatura',
    tipo_movimento: 'entrata',
    importo: '',
    note: '',
  })

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setAnagraficheLoading(true)
      try {
        const result = await fetchAnagrafiche({ token, page: 1, pageSize: 200, signal: controller.signal })
        setAnagrafiche(Array.isArray(result?.items) ? result.items : [])
      } catch (err) {
        if (err?.name !== 'AbortError' && err?.status === 401 && logout) logout()
      } finally {
        setAnagraficheLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout])

  const loadFondi = async () => {
    if (!token) return
    setFondiLoading(true)
    setFondiError(null)
    try {
      const { items } = await fetchClienteFondi({ token, only_active: true })
      setFondi(items)
      if (!selectedFondoId && items[0]?.id_fondo) {
        setSelectedFondoId(String(items[0].id_fondo))
      }
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setFondi([])
      setFondiError(err)
    } finally {
      setFondiLoading(false)
    }
  }

  useEffect(() => {
    loadFondi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!token || !selectedFondoId) {
      setMovimenti([])
      return
    }
    const controller = new AbortController()
    const load = async () => {
      setMovimentiLoading(true)
      setMovimentiError(null)
      try {
        const { items } = await fetchClienteFondoMovimenti({
          token,
          id_fondo: Number(selectedFondoId),
          limit: 200,
          signal: controller.signal,
        })
        setMovimenti(items)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setMovimenti([])
        setMovimentiError(err)
      } finally {
        setMovimentiLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, selectedFondoId, logout])

  const selectedFondo = useMemo(
    () => fondi.find((f) => String(f.id_fondo) === String(selectedFondoId)) || null,
    [fondi, selectedFondoId],
  )
  const selectedAllocList = useMemo(
    () =>
      Object.values(selectedAllocs)
        .filter((entry) => entry?.selected && Number(entry?.id_fattura) > 0 && Number(entry?.importo) > 0)
        .map((entry) => ({ id_fattura: Number(entry.id_fattura), importo: Number(entry.importo) })),
    [selectedAllocs],
  )
  const selectedAllocTotal = useMemo(
    () => selectedAllocList.reduce((sum, entry) => sum + Number(entry.importo || 0), 0),
    [selectedAllocList],
  )

  const getInvoiceSearchAnagrafica = () => {
    if (selectedFondo && Number(selectedFondo.id_anagrafica) > 0) {
      return Number(selectedFondo.id_anagrafica)
    }
    if (!selectedFondoId && Number(form.id_anagrafica) > 0) {
      return Number(form.id_anagrafica)
    }
    return null
  }

  const runInvoiceSearch = async (q = '') => {
    const idAnagrafica = getInvoiceSearchAnagrafica()
    if (!token || !idAnagrafica) return
    setInvoiceLoading(true)
    setInvoiceError(null)
    try {
      const response = await searchPagamentiFatture({
        token,
        id_anagrafica: idAnagrafica,
        onlyOpen: true,
        q: q || undefined,
      })
      const items = Array.isArray(response?.items) ? response.items : []
      setInvoiceResults(items)
      setSelectedAllocs((prev) => {
        const next = { ...prev }
        items.forEach((row) => {
          const idf = Number(row.id_fattura)
          const saldo = Number(row.saldo ?? row.totale ?? 0)
          if (!next[idf]) {
            next[idf] = { id_fattura: idf, selected: false, importo: saldo > 0 ? saldo.toFixed(2) : '0.00' }
          }
        })
        return next
      })
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setInvoiceError(err)
      setInvoiceResults([])
    } finally {
      setInvoiceLoading(false)
    }
  }

  const openLinkModal = async () => {
    if (!getInvoiceSearchAnagrafica()) {
      setSubmitError(new Error('Seleziona prima il fondo o il cliente del fondo.'))
      return
    }
    setLinkModalOpen(true)
    await runInvoiceSearch(invoiceSearch)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    if (form.tipo_movimento === 'uscita' && selectedAllocList.length === 0) {
      setSubmitError(new Error("Per l'uscita devi selezionare almeno una fattura da collegare."))
      return
    }
    setSaving(true)
    setSubmitError(null)
    setSubmitOk(null)
    try {
      const payload = {
        tipo_movimento: form.tipo_movimento,
        importo:
          form.tipo_movimento === 'uscita' && selectedAllocList.length > 0
            ? selectedAllocTotal
            : form.importo,
        note: form.note,
      }
      if (selectedFondoId) {
        payload.id_fondo = Number(selectedFondoId)
      } else {
        payload.id_anagrafica = Number(form.id_anagrafica)
        payload.causale_code = form.causale_code
        payload.causale_label = form.causale_label
      }
      if (form.tipo_movimento === 'uscita' && selectedAllocList.length > 0) {
        payload.allocazioni = selectedAllocList
      }
      const response = await createClienteFondoMovimento({ token, ...payload })
      setSubmitOk(`Movimento registrato. ID: ${response?.data?.id_movimento || '-'}`)
      if (!selectedFondoId && response?.fondo?.id_fondo) {
        setSelectedFondoId(String(response.fondo.id_fondo))
      }
      await loadFondi()
      if (selectedFondoId) {
        const { items } = await fetchClienteFondoMovimenti({ token, id_fondo: Number(selectedFondoId), limit: 200 })
        setMovimenti(items)
      }
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Fondi cliente</h5>
        <small className="text-body-secondary">
          Gestione anticipi e fondi dedicati (es. affrancatura/postalizzazione).
        </small>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-4">
          <CCol md={6}>
            <CFormLabel>Fondo cliente</CFormLabel>
            <CFormSelect
              value={selectedFondoId}
              onChange={(e) => setSelectedFondoId(e.target.value)}
              disabled={fondiLoading}
            >
              <option value="">-- Seleziona o crea fondo --</option>
              {fondi.map((fondo) => (
                <option key={fondo.id_fondo} value={fondo.id_fondo}>
                  #{fondo.id_fondo} - {fondo.causale_label} - {fondo.ragione_sociale || `Cliente #${fondo.id_anagrafica}`}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={6} className="d-flex align-items-end">
            {selectedFondo && (
              <CBadge color={Number(selectedFondo.saldo_attuale) > 0 ? 'success' : 'secondary'}>
                Saldo: {formatCurrency(selectedFondo.saldo_attuale)}
              </CBadge>
            )}
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>Nuovo movimento fondo</CCardHeader>
          <CCardBody>
            <form onSubmit={handleSubmit}>
              <CRow className="g-3">
                {!selectedFondoId && (
                  <>
                    <CCol md={4}>
                      <CFormLabel>Cliente</CFormLabel>
                      <CFormSelect
                        value={form.id_anagrafica}
                        onChange={(e) => setForm((prev) => ({ ...prev, id_anagrafica: e.target.value }))}
                        required
                        disabled={anagraficheLoading}
                      >
                        <option value="">-- Seleziona cliente --</option>
                        {anagrafiche.map((a) => (
                          <option key={a.id_anagrafica} value={a.id_anagrafica}>
                            {a.ragione_sociale || `Cliente #${a.id_anagrafica}`}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Causale fondo (code)</CFormLabel>
                      <CFormInput
                        value={form.causale_code}
                        onChange={(e) => setForm((prev) => ({ ...prev, causale_code: e.target.value }))}
                        required
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Causale fondo (label)</CFormLabel>
                      <CFormInput
                        value={form.causale_label}
                        onChange={(e) => setForm((prev) => ({ ...prev, causale_label: e.target.value }))}
                        required
                      />
                    </CCol>
                  </>
                )}

                <CCol md={3}>
                  <CFormLabel>Tipo movimento</CFormLabel>
                  <CFormSelect
                    value={form.tipo_movimento}
                    onChange={(e) => setForm((prev) => ({ ...prev, tipo_movimento: e.target.value }))}
                  >
                    <option value="entrata">Entrata</option>
                    <option value="uscita">Uscita</option>
                  </CFormSelect>
                </CCol>
                <CCol md={9}>
                  <CFormLabel>Importo</CFormLabel>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={
                      form.tipo_movimento === 'uscita' && selectedAllocList.length > 0
                        ? selectedAllocTotal.toFixed(2)
                        : form.importo
                    }
                    onChange={(e) => setForm((prev) => ({ ...prev, importo: e.target.value }))}
                    required={!(form.tipo_movimento === 'uscita' && selectedAllocList.length > 0)}
                    readOnly={form.tipo_movimento === 'uscita' && selectedAllocList.length > 0}
                  />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Note</CFormLabel>
                  <CFormInput
                    value={form.note}
                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </CCol>
              </CRow>
              {form.tipo_movimento === 'uscita' && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="small text-body-secondary">
                    Fatture collegate: {selectedAllocList.length} • Totale collegato: {formatCurrency(selectedAllocTotal)}
                  </div>
                  <CButton type="button" color="secondary" variant="outline" onClick={openLinkModal}>
                    Seleziona fatture da collegare
                  </CButton>
                </div>
              )}
              <div className="d-flex justify-content-end mt-3">
                <CButton type="submit" color="primary" disabled={saving}>
                  {saving ? 'Salvataggio...' : 'Registra movimento'}
                </CButton>
              </div>
            </form>
            {submitError && <CAlert color="danger" className="mt-3 mb-0">{submitError.message}</CAlert>}
            {submitOk && <CAlert color="success" className="mt-3 mb-0">{submitOk}</CAlert>}
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader>Estratto movimenti</CCardHeader>
          <CCardBody>
            {fondiError && <CAlert color="danger">{fondiError.message || 'Errore caricamento fondi.'}</CAlert>}
            {movimentiError && <CAlert color="danger">{movimentiError.message || 'Errore caricamento movimenti.'}</CAlert>}
            {fondiLoading || movimentiLoading ? (
              <div className="d-flex justify-content-center py-4"><CSpinner /></div>
            ) : !selectedFondoId ? (
              <CAlert color="info">Seleziona un fondo per visualizzare i movimenti.</CAlert>
            ) : movimenti.length === 0 ? (
              <CAlert color="info">Nessun movimento registrato.</CAlert>
            ) : (
              <CTable responsive hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Data</CTableHeaderCell>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Saldo prog.</CTableHeaderCell>
                    <CTableHeaderCell>Riferimenti</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {movimenti.map((m) => (
                    <CTableRow key={m.id_movimento}>
                      <CTableDataCell>{m.id_movimento}</CTableDataCell>
                      <CTableDataCell>{formatDateTime(m.created_at)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={m.tipo_movimento === 'entrata' ? 'success' : 'warning'}>
                          {m.tipo_movimento}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(m.importo)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(m.saldo_progressivo)}</CTableDataCell>
                      <CTableDataCell>
                        {m.id_fattura ? `Fattura #${m.id_fattura}` : ''}
                        {!m.id_fattura && m.fatture_collegate_ids
                          ? `Fatture #${String(m.fatture_collegate_ids).split(',').join(', #')}`
                          : ''}
                        {m.id_pagamento ? `${m.id_fattura ? ' · ' : ''}Pagamento #${m.id_pagamento}` : ''}
                        {m.id_lavorazione ? `${m.id_fattura || m.fatture_collegate_ids || m.id_pagamento ? ' · ' : ''}Lav. #${m.id_lavorazione}` : ''}
                        {!m.id_fattura && !m.fatture_collegate_ids && !m.id_pagamento && !m.id_lavorazione ? '-' : ''}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>

        <CModal visible={linkModalOpen} onClose={() => setLinkModalOpen(false)} size="xl">
          <CModalHeader closeButton>
            <CModalTitle>Seleziona fatture da collegare all'uscita</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-3 mb-3">
              <CCol md={9}>
                <CFormInput
                  placeholder="Cerca fatture per numero o cliente"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CButton color="primary" disabled={invoiceLoading} onClick={() => runInvoiceSearch(invoiceSearch)}>
                  Cerca
                </CButton>
              </CCol>
            </CRow>
            {invoiceError && <CAlert color="danger">{invoiceError.message || 'Errore ricerca fatture.'}</CAlert>}
            {invoiceLoading ? (
              <div className="d-flex justify-content-center py-4"><CSpinner /></div>
            ) : invoiceResults.length === 0 ? (
              <CAlert color="info">Nessuna fattura aperta trovata per questo cliente.</CAlert>
            ) : (
              <CTable responsive hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell></CTableHeaderCell>
                    <CTableHeaderCell>Fattura</CTableHeaderCell>
                    <CTableHeaderCell>Cliente</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Residuo</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Importo da allocare</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {invoiceResults.map((row) => {
                    const idf = Number(row.id_fattura)
                    const saldo = Number(row.saldo ?? row.totale ?? 0)
                    const entry = selectedAllocs[idf] || { selected: false, importo: saldo.toFixed(2) }
                    return (
                      <CTableRow key={idf}>
                        <CTableDataCell>
                          <CFormCheck
                            checked={Boolean(entry.selected)}
                            onChange={(e) =>
                              setSelectedAllocs((prev) => ({
                                ...prev,
                                [idf]: {
                                  ...(prev[idf] || {}),
                                  id_fattura: idf,
                                  selected: e.target.checked,
                                  importo: prev[idf]?.importo ?? saldo.toFixed(2),
                                },
                              }))
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell>{row.anno}/{row.numero_documento}</CTableDataCell>
                        <CTableDataCell>{row.ragione_sociale || '-'}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatCurrency(saldo)}</CTableDataCell>
                        <CTableDataCell className="text-end" style={{ maxWidth: 180 }}>
                          <CFormInput
                            type="number"
                            min="0.01"
                            step="0.01"
                            disabled={!entry.selected}
                            value={entry.importo}
                            onChange={(e) =>
                              setSelectedAllocs((prev) => ({
                                ...prev,
                                [idf]: {
                                  ...(prev[idf] || {}),
                                  id_fattura: idf,
                                  selected: true,
                                  importo: e.target.value,
                                },
                              }))
                            }
                          />
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
            <div className="small text-body-secondary mt-2">
              Totale selezionato: <strong>{formatCurrency(selectedAllocTotal)}</strong>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setLinkModalOpen(false)}>
              Chiudi
            </CButton>
            <CButton color="primary" onClick={() => setLinkModalOpen(false)}>
              Conferma selezione
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default PagamentiFondi
