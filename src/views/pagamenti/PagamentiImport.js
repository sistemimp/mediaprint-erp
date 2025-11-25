import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload, cilMagnifyingGlass, cilPlus, cilTrash } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchFattureConfig } from '../../services/fatture'
import {
  confirmPagamentiImport,
  searchPagamentiFatture,
  uploadPagamentiExcel,
} from '../../services/pagamenti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const PagamentiImport = () => {
  const { token, logout } = useAuth()

  const [config, setConfig] = useState({ metodi_pagamento: [], modalita_pagamento: [] })
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState(null)

  const [stage, setStage] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [rows, setRows] = useState([])
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    rowId: null,
    allocId: null,
    search: '',
    loading: false,
    results: [],
    error: null,
  })

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setConfigLoading(true)
      setConfigError(null)
      try {
        const data = await fetchFattureConfig({ token, signal: controller.signal })
        setConfig({
          metodi_pagamento: Array.isArray(data?.metodi_pagamento) ? data.metodi_pagamento : [],
          modalita_pagamento: Array.isArray(data?.modalita_pagamento) ? data.modalita_pagamento : [],
        })
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setConfig({ metodi_pagamento: [], modalita_pagamento: [] })
        setConfigError(err)
      } finally {
        setConfigLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, logout])

  const metodiOptions = useMemo(() => config.metodi_pagamento || [], [config])
  const modalitaOptions = useMemo(() => config.modalita_pagamento || [], [config])

  const handleFileChange = async (event) => {
    const file = event?.target?.files?.[0]
    if (!file || !token) return
    setUploading(true)
    setUploadError(null)
    setSubmitSuccess(null)
    try {
      const response = await uploadPagamentiExcel({
        token,
        file,
      })
      const mapped = response.items.map((item) => {
        const rawImport = item.importo
        let importAmount = null
        if (rawImport !== undefined && rawImport !== null) {
          if (typeof rawImport === 'string') {
            const trimmed = rawImport.trim()
            if (trimmed !== '') {
              const parsed = Number(trimmed)
              if (Number.isFinite(parsed)) {
                importAmount = parsed
              }
            }
          } else {
            const parsed = Number(rawImport)
            if (Number.isFinite(parsed)) {
              importAmount = parsed
            }
          }
        }
        const safeImport = importAmount ?? 0
        return {
          tempId: item.temp_id,
          reference: item.reference || '',
          data_pagamento: item.data_pagamento || '',
          importo: safeImport,
          importo_originale: importAmount,
          note: item.note || '',
          cliente_nome:
            item.cliente?.nome || item.auto_invoice?.ragione_sociale || item.auto_invoice?.cliente || '',
          cliente_id_hint: item.auto_invoice?.id_anagrafica || null,
          warnings: Array.isArray(item.warnings) ? item.warnings : [],
          id_metodo: item.metodo?.id_metodo ?? '',
          id_mp: item.modalita?.id_modalita ?? '',
          allocations: [
            {
              id: cryptoRandom(),
              fattura: item.auto_invoice?.id_fattura ? item.auto_invoice : null,
              importo: safeImport,
            },
          ],
        }
      })
      setRows(mapped)
      setStage('mapping')
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setRows([])
      setUploadError(err)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleRowFieldChange = (rowId, field) => (event) => {
    const value = event?.target?.value ?? ''
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== rowId) return row
        if (field === 'importo' && row.importo_originale != null) {
          return row
        }
        return {
          ...row,
          [field]: field === 'importo' ? Number(value) || 0 : value,
        }
      }),
    )
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const handleAllocationAmountChange = (rowId, allocId) => (event) => {
    const value = event?.target?.value ?? ''
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== rowId) return row
        return {
          ...row,
          allocations: row.allocations.map((alloc) => {
            if (alloc.id !== allocId) return alloc
            return {
              ...alloc,
              importo: Number(value) || 0,
            }
          }),
        }
      }),
    )
  }

  const handleRemoveAllocation = (rowId, allocId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== rowId) return row
        return {
          ...row,
          allocations: row.allocations.filter((alloc) => alloc.id !== allocId),
        }
      }),
    )
  }

  const handleAddAllocation = (rowId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== rowId) return row
        return {
          ...row,
          allocations: [
            ...row.allocations,
            {
              id: cryptoRandom(),
              fattura: null,
              importo: 0,
            },
          ],
        }
      }),
    )
  }

  const handleRemoveRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.tempId !== rowId))
    setSubmitError(null)
    setSubmitSuccess(null)
    setInvoiceModal((prev) => {
      if (prev.rowId !== rowId) return prev
      return { ...prev, open: false, rowId: null, allocId: null, results: [], search: '', error: null }
    })
  }

  const openInvoiceModal = (rowId, allocId) => {
    setInvoiceModal({
      open: true,
      rowId,
      allocId,
      search: '',
      loading: false,
      results: [],
      error: null,
    })
  }

  const closeInvoiceModal = () => {
    setInvoiceModal((prev) => ({ ...prev, open: false, results: [], search: '', error: null }))
  }

  const performInvoiceSearch = async () => {
    if (!invoiceModal.open || !invoiceModal.rowId) return
    const row = rows.find((item) => item.tempId === invoiceModal.rowId)
    if (!row || !token) return
    setInvoiceModal((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { items } = await searchPagamentiFatture({
        token,
        q: invoiceModal.search,
        id_anagrafica: row.cliente_id_hint || undefined,
      })
      setInvoiceModal((prev) => ({ ...prev, results: items }))
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setInvoiceModal((prev) => ({ ...prev, error: err }))
    } finally {
      setInvoiceModal((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleSelectInvoice = (invoice) => {
    if (!invoiceModal.rowId || !invoiceModal.allocId) return
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== invoiceModal.rowId) return row
        const targetTotal = Number(row.importo_originale ?? row.importo) || 0
        return {
          ...row,
          cliente_id_hint: invoice.id_anagrafica || row.cliente_id_hint,
          cliente_nome: row.cliente_nome || invoice.ragione_sociale || '',
          allocations: row.allocations.map((alloc) => {
            if (alloc.id !== invoiceModal.allocId) return alloc
            return {
              ...alloc,
              fattura: invoice,
              importo: alloc.importo || Math.min(Number(invoice.saldo) || targetTotal, targetTotal),
            }
          }),
        }
      }),
    )
    closeInvoiceModal()
  }

  const rowsWithTotals = useMemo(() => {
    return rows.map((row) => {
      const targetTotal = Number(row.importo_originale ?? row.importo) || 0
      const totalAlloc = row.allocations.reduce((sum, alloc) => sum + (Number(alloc.importo) || 0), 0)
      const diff = targetTotal - totalAlloc
      const hasAllocations = row.allocations.length > 0
      return {
        ...row,
        targetTotal,
        totalAlloc,
        diff,
        hasAllocations,
        isBalanced: !hasAllocations || Math.abs(diff) < 0.01,
      }
    })
  }, [rows])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    if (rowsWithTotals.length === 0) {
      setSubmitError(new Error('Caricare almeno un pagamento da importare.'))
      return
    }

    const preparedRows = rowsWithTotals.map((row) => {
      const allocations = row.allocations.filter((alloc) => alloc.fattura?.id_fattura)
      const totalAlloc = allocations.reduce((sum, alloc) => sum + (Number(alloc.importo) || 0), 0)
      const diff = row.targetTotal - totalAlloc
      return {
        ...row,
        allocations,
        totalAlloc,
        diff,
        hasAllocations: allocations.length > 0,
        isBalanced: allocations.length === 0 || Math.abs(diff) < 0.01,
      }
    })

    for (const row of preparedRows) {
      if (!row.data_pagamento) {
        setSubmitError(new Error('Compilare la data pagamento per tutte le righe.'))
        return
      }
      if (row.allocations.length > 0) {
        for (const alloc of row.allocations) {
          if (!alloc.importo || alloc.importo <= 0) {
            setSubmitError(new Error('Specificare un importo valido per ogni fattura associata.'))
            return
          }
        }
      }
    }

    const unbalancedRows = preparedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.hasAllocations && !row.isBalanced)

    if (unbalancedRows.length > 0) {
      const summary = unbalancedRows
        .map(({ row, index }) => {
          const allocLabel = currencyFormatter.format(row.totalAlloc)
          const targetLabel = currencyFormatter.format(row.targetTotal)
          const diffLabel = currencyFormatter.format(row.diff)
          return `Pagamento #${index + 1}: registrato ${allocLabel} su ${targetLabel} (differenza ${diffLabel})`
        })
        .join('\n')
      const confirmMessage = `Ci sono pagamenti con differenze tra importo totale e importi allocati:\n${summary}\nVuoi procedere comunque?`
      const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : true
      if (!confirmed) {
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const payload = preparedRows.map((row) => {
        const validAllocations = row.allocations.filter(
          (alloc) => Number(alloc.fattura?.id_fattura) > 0 && Number(alloc.importo) > 0,
        )
        const base = {
          reference: row.reference || undefined,
          data_pagamento: row.data_pagamento,
          id_metodo: row.id_metodo ? Number(row.id_metodo) : undefined,
          id_mp: row.id_mp ? Number(row.id_mp) : undefined,
          note: row.note || undefined,
          importo_totale: row.targetTotal,
          import_uid: row.tempId,
          cliente_nome: row.cliente_nome || undefined,
          cliente_id_hint: row.cliente_id_hint || undefined,
        }
        if (validAllocations.length > 0) {
          base.allocations = validAllocations.map((alloc) => ({
            id_fattura: Number(alloc.fattura.id_fattura),
            importo: Number(alloc.importo) || 0,
          }))
        }
        return base
      })

      const result = await confirmPagamentiImport({
        token,
        items: payload,
      })

      setSubmitSuccess(
        `Importazione completata: ${result?.inserted || payload.length} pagamenti registrati con successo.`,
      )
      setStage('result')
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetWizard = () => {
    setRows([])
    setStage('upload')
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Import pagamenti</h5>
        <small className="text-body-secondary">
          Carica un file Excel/CSV con i movimenti e collega ciascun pagamento alle fatture.
        </small>
      </CCardHeader>
      <CCardBody>
        {configError && (
          <CAlert color="warning" className="mb-3">
            {configError.message || 'Impossibile caricare le configurazioni di pagamento.'}
          </CAlert>
        )}

        {stage === 'upload' && (
          <div className="border rounded p-4 text-center bg-body-tertiary">
            <CIcon icon={cilCloudUpload} size="3xl" className="mb-3 text-primary" />
            <p className="text-body-secondary mb-3">
              Seleziona un file Excel (.xlsx) o CSV con le colonne principali (data, importo, note, fattura). Dopo
              l&apos;upload potrai associare lo stesso movimento a più fatture aggiungendo più righe di
              collegamento.
            </p>
            {uploadError && (
              <CAlert color="danger" className="mb-3">
                {uploadError.message || 'Errore durante il caricamento.'}
              </CAlert>
            )}
            <CFormLabel className="btn btn-primary mb-0">
              {uploading ? 'Caricamento...' : 'Seleziona file'}
              <CFormInput
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={uploading}
                hidden
              />
            </CFormLabel>
          </div>
        )}

        {stage !== 'upload' && (
          <CForm onSubmit={handleSubmit}>
            {rowsWithTotals.length === 0 && (
              <CAlert color="info">Nessuna riga da importare. Torna al caricamento iniziale.</CAlert>
            )}

            {rowsWithTotals.map((row, index) => {
              const diffBadgeColor = row.isBalanced ? 'success' : row.diff > 0 ? 'warning' : 'danger'
              return (
              <CCard className="mb-4 border-primary-subtle" key={row.tempId}>
                <CCardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Pagamento #{index + 1}</strong>
                      {row.cliente_nome && (
                        <span className="ms-2 text-body-secondary">Cliente: {row.cliente_nome}</span>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {row.warnings?.length > 0 && (
                        <CBadge color="warning" textColor="dark">
                          Attenzione
                        </CBadge>
                      )}
                      <CButton color="danger" variant="ghost" size="sm" type="button" onClick={() => handleRemoveRow(row.tempId)}>
                        <CIcon icon={cilTrash} className="me-2" />
                        Elimina riga
                      </CButton>
                    </div>
                  </div>
                </CCardHeader>
                <CCardBody>
                  {row.warnings?.length > 0 && (
                    <CAlert color="warning" className="mb-3">
                      {row.warnings.join(' ')}
                    </CAlert>
                  )}

                  <CRow className="g-3 mb-3">
                    <CCol md={3}>
                      <CFormLabel>Data pagamento</CFormLabel>
                      <CFormInput
                        type="date"
                        value={row.data_pagamento}
                        onChange={handleRowFieldChange(row.tempId, 'data_pagamento')}
                        required
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Importo totale</CFormLabel>
                      {row.importo_originale != null ? (
                        <>
                          <CFormInput
                            type="number"
                            value={row.importo_originale}
                            readOnly
                            disabled
                            className="bg-body-tertiary"
                          />
                          <small className="text-body-secondary">
                            Valore importato dal file. Modifiche non consentite.
                          </small>
                        </>
                      ) : (
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.importo}
                          onChange={handleRowFieldChange(row.tempId, 'importo')}
                        />
                      )}
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Metodo (interno)</CFormLabel>
                      <CFormSelect
                        value={row.id_metodo}
                        onChange={handleRowFieldChange(row.tempId, 'id_metodo')}
                        disabled={configLoading || metodiOptions.length === 0}
                      >
                        <option value="">--</option>
                        {metodiOptions.map((m) => (
                          <option key={m.id_metodo} value={m.id_metodo}>
                            {m.code ? `${m.code} - ${m.label}` : m.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Modalità SdI</CFormLabel>
                      <CFormSelect
                        value={row.id_mp}
                        onChange={handleRowFieldChange(row.tempId, 'id_mp')}
                        disabled={configLoading || modalitaOptions.length === 0}
                        required
                      >
                        <option value="">Seleziona...</option>
                        {modalitaOptions.map((m) => (
                          <option key={m.id_modalita} value={m.id_modalita}>
                            {m.code ? `${m.code} - ${m.label}` : m.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Riferimento</CFormLabel>
                      <CFormTextarea
                        placeholder="Es. CRO, numero disposizione..."
                        value={row.reference}
                        onChange={handleRowFieldChange(row.tempId, 'reference')}
                        rows={2}
                        style={{ resize: 'vertical' }}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Note</CFormLabel>
                      <CFormInput
                        placeholder="Note aggiuntive"
                        value={row.note}
                        onChange={handleRowFieldChange(row.tempId, 'note')}
                      />
                    </CCol>
                  </CRow>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-body-secondary mb-0">Fatture associate</h6>
                    <CButton color="secondary" size="sm" variant="outline" onClick={() => handleAddAllocation(row.tempId)}>
                      <CIcon icon={cilPlus} className="me-2" />
                      Aggiungi fattura
                    </CButton>
                  </div>

                  {row.allocations.map((alloc) => (
                    <div key={alloc.id} className="border rounded p-2 mb-2 bg-body-tertiary">
                      <CRow className="g-2 align-items-center">
                        <CCol md={5}>
                          <CFormLabel>Fattura</CFormLabel>
                          <CInputGroup>
                            <CFormInput
                              readOnly
                              value={
                                alloc.fattura
                                  ? `${alloc.fattura.ragione_sociale || ''} - ${alloc.fattura.anno || ''}/${
                                      alloc.fattura.numero_documento || ''
                                    }`
                                  : 'Nessuna fattura selezionata'
                              }
                              className="bg-white"
                            />
                            <CButton
                              type="button"
                              color="secondary"
                              variant="outline"
                              onClick={() => openInvoiceModal(row.tempId, alloc.id)}
                            >
                              <CIcon icon={cilMagnifyingGlass} />
                            </CButton>
                          </CInputGroup>
                          {alloc.fattura?.saldo != null && (
                            <small className="text-body-secondary">
                              Saldo residuo: {currencyFormatter.format(Number(alloc.fattura.saldo))}
                            </small>
                          )}
                        </CCol>
                        <CCol md={3}>
                          <CFormLabel>Importo</CFormLabel>
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={alloc.importo}
                            onChange={handleAllocationAmountChange(row.tempId, alloc.id)}
                          />
                        </CCol>
                        <CCol md={2}>
                          <CFormLabel> </CFormLabel>
                          <CButton
                            color="danger"
                            variant="ghost"
                            type="button"
                            onClick={() => handleRemoveAllocation(row.tempId, alloc.id)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CCol>
                      </CRow>
                  </div>
                ))}

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="fw-semibold text-body-secondary me-3">
                    Registrato su fatture: {currencyFormatter.format(row.totalAlloc)} / Importo pagamento:{' '}
                    {currencyFormatter.format(row.targetTotal)}
                  </small>
                  <CBadge color={diffBadgeColor} shape="rounded-pill">
                    Differenza {currencyFormatter.format(row.diff)}
                  </CBadge>
                </div>
                {row.allocations.length === 0 && (
                  <CAlert color="info" className="mt-3 mb-0">
                    Nessuna fattura associata: l&apos;importo verrà importato e potrà essere collegato successivamente.
                  </CAlert>
                )}
              </CCardBody>
            </CCard>
          )
          })}

            {submitError && (
              <CAlert color="danger" className="mb-3">
                {submitError.message || 'Errore durante il salvataggio.'}
              </CAlert>
            )}
            {submitSuccess && (
              <CAlert color="success" className="mb-3">
                {submitSuccess}
              </CAlert>
            )}

            <div className="d-flex justify-content-between">
              <CButton color="secondary" variant="ghost" type="button" onClick={resetWizard}>
                Nuovo caricamento
              </CButton>
              <CButton color="primary" type="submit" disabled={submitting || rowsWithTotals.length === 0}>
                {submitting ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Importazione...
                  </>
                ) : (
                  'Registra pagamenti'
                )}
              </CButton>
            </div>
          </CForm>
        )}
      </CCardBody>

      <CModal visible={invoiceModal.open} onClose={closeInvoiceModal} size="lg">
        <CModalHeader closeButton>
          <CModalTitle>Seleziona fattura</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {invoiceModal.error && (
            <CAlert color="danger">{invoiceModal.error.message || 'Errore nella ricerca fatture.'}</CAlert>
          )}
          <CInputGroup className="mb-3">
            <CInputGroupText>
              <CIcon icon={cilMagnifyingGlass} />
            </CInputGroupText>
            <CFormInput
              placeholder="Numero o cliente"
              value={invoiceModal.search}
              onChange={(e) => setInvoiceModal((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  performInvoiceSearch()
                }
              }}
            />
            <CButton color="primary" type="button" onClick={performInvoiceSearch} disabled={invoiceModal.loading}>
              Cerca
            </CButton>
          </CInputGroup>
          {invoiceModal.loading ? (
            <div className="d-flex justify-content-center py-3">
              <CSpinner color="primary" />
            </div>
          ) : invoiceModal.results.length === 0 ? (
            <p className="text-body-secondary">Nessuna fattura trovata.</p>
          ) : (
            <CListGroup>
              {invoiceModal.results.map((item) => (
                <CListGroupItem
                  key={item.id_fattura}
                  action
                  onClick={() => handleSelectInvoice(item)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.anno}/{item.numero_documento}
                    </div>
                    <small className="text-body-secondary">{item.ragione_sociale || '-'}</small>
                  </div>
                  <div className="text-end">
                    <div>Totale {currencyFormatter.format(item.totale || 0)}</div>
                    <small className="text-body-secondary">
                      Residuo {currencyFormatter.format(item.saldo ?? item.totale ?? 0)}
                    </small>
                  </div>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={closeInvoiceModal}>
            Chiudi
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

const cryptoRandom = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `tmp-${Math.random().toString(36).slice(2, 10)}`
}

export default PagamentiImport
