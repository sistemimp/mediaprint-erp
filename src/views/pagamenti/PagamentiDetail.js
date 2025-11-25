import React, { useCallback, useEffect, useState } from 'react'
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
import { cilArrowLeft, cilMagnifyingGlass, cilPlus, cilTrash } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchPagamentoDetail, searchPagamentiFatture } from '../../services/pagamenti'
import { deleteFatturaPagamento, saveFatturaPagamento } from '../../services/fatture'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const PagamentiDetail = () => {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = Number(query.get('id') || 0)

  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentResults, setAssignmentResults] = useState([])
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState(null)
  const [assignmentSelected, setAssignmentSelected] = useState(null)
  const [assignmentAmount, setAssignmentAmount] = useState('')
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [assignmentSubmitError, setAssignmentSubmitError] = useState(null)

  const loadDetail = useCallback(
    async (abortSignal) => {
      if (!token || !id) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPagamentoDetail({
          token,
          id,
          signal: abortSignal,
        })
        setRecord(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setRecord(null)
        setError(err)
      } finally {
        if (!abortSignal || !abortSignal.aborted) {
          setLoading(false)
        }
      }
    },
    [token, id, logout],
  )

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    loadDetail(controller.signal)
    return () => controller.abort()
  }, [token, id, loadDetail])

  const refreshRecord = useCallback(async () => {
    await loadDetail()
  }, [loadDetail])

  const assignments = (() => {
    if (!record) return []
    if (Array.isArray(record?.assegnazioni)) {
      return record.assegnazioni.filter((item) => Number(item?.id_fattura) > 0)
    }
    if (Number(record?.id_fattura) > 0) {
      return [record]
    }
    return []
  })()
  const totalAssignedFromList = assignments.reduce((sum, item) => {
    const value = Number(item?.importo)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
  const assignmentStats = record?.assegnazioni_stats || null
  const residuoDisponibile = (() => {
    if (assignmentStats && assignmentStats.residuo != null) {
      return Number(assignmentStats.residuo)
    }
    if (record?.residuo_pagamento != null) {
      return Number(record.residuo_pagamento)
    }
    if (record?.importo != null && assignmentStats?.allocato != null) {
      return Number(record.importo) - Number(assignmentStats.allocato)
    }
    if (record?.importo != null && totalAssignedFromList > 0) {
      return Number(record.importo) - totalAssignedFromList
    }
    return null
  })()
  const isStaging = Boolean(record?.staging)
  const canAssignMore = Boolean(record)
  const deleteDisabled = deleting || !record

  const handleDelete = async () => {
    if (!record || !token || !id) return
    if (!window.confirm('Confermi la cancellazione del pagamento?')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFatturaPagamento({
        token,
        id_fattura: record.id_fattura,
        id_pagamento: record.id_pagamento,
      })
      navigate('/pagamenti/lista', { replace: true })
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setDeleteError(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveAssignment = async (assignment) => {
    if (!assignment?.id_pagamento || !assignment?.id_fattura || !token) return
    if (!window.confirm('Confermi la rimozione dell\'assegnazione selezionata?')) return
    setRemovingAssignmentId(assignment.id_pagamento)
    setDeleteError(null)
    try {
      await deleteFatturaPagamento({
        token,
        id_fattura: assignment.id_fattura,
        id_pagamento: assignment.id_pagamento,
      })
      if (record && assignment.id_pagamento === record.id_pagamento) {
        navigate('/pagamenti/lista', { replace: true })
        return
      }
      await refreshRecord()
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setDeleteError(err)
    } finally {
      setRemovingAssignmentId(null)
    }
  }

  const openAssignmentModal = () => {
    if (!record) return
    const defaultAmount = residuoDisponibile != null ? Number(residuoDisponibile) : null
    setAssignmentModalOpen(true)
    setAssignmentSearch('')
    setAssignmentResults([])
    setAssignmentError(null)
    setAssignmentSelected(null)
    setAssignmentAmount(defaultAmount && defaultAmount > 0 ? defaultAmount.toFixed(2) : '')
    setAssignmentSubmitError(null)
  }

  const closeAssignmentModal = () => {
    setAssignmentModalOpen(false)
    setAssignmentResults([])
    setAssignmentError(null)
    setAssignmentSelected(null)
    setAssignmentAmount('')
    setAssignmentSubmitError(null)
  }

  const performAssignmentSearch = async () => {
    if (!token) return
    setAssignmentLoading(true)
    setAssignmentError(null)
    try {
      const response = await searchPagamentiFatture({
        token,
        q: assignmentSearch || undefined,
        onlyOpen: true,
      })
      setAssignmentResults(Array.isArray(response?.items) ? response.items : [])
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setAssignmentError(err)
      setAssignmentResults([])
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleSelectAssignmentInvoice = (invoice) => {
    if (!invoice) return
    setAssignmentSelected(invoice)
    setAssignmentSubmitError(null)
    if (residuoDisponibile !== null && residuoDisponibile > 0) {
      const suggested = Math.min(
        residuoDisponibile,
        invoice?.saldo != null ? Number(invoice.saldo) : residuoDisponibile,
      )
      if (suggested > 0) {
        setAssignmentAmount(suggested.toFixed(2))
      }
    }
  }

  const handleAssignmentSubmit = async (event) => {
    event?.preventDefault?.()
    if (!record || !token) return
    if (!assignmentSelected) {
      setAssignmentSubmitError(new Error('Seleziona una fattura da associare.'))
      return
    }
    const numericAmount = Number(assignmentAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAssignmentSubmitError(new Error('Indicare un importo valido da assegnare.'))
      return
    }
    if (residuoDisponibile !== null && numericAmount - residuoDisponibile > 0.009) {
      setAssignmentSubmitError(new Error('L\'importo supera il residuo disponibile.'))
      return
    }
    setAssignmentSaving(true)
    setAssignmentSubmitError(null)
    try {
      await saveFatturaPagamento({
        token,
        id_fattura: assignmentSelected.id_fattura,
        id_pagamento: record.id_pagamento,
        importo: numericAmount,
        data_pagamento: record.data_pagamento,
        id_metodo: record.id_metodo,
        id_mp: record.id_mp,
        note: record.note,
        import_uid: record.import_uid,
      })
      closeAssignmentModal()
      await refreshRecord()
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setAssignmentSubmitError(err)
    } finally {
      setAssignmentSaving(false)
    }
  }

  if (!id) {
    return (
      <CAlert color="danger" className="mb-0">
        ID pagamento mancante.
      </CAlert>
    )
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between flex-wrap gap-3 align-items-center">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0">Pagamento #{id}</h5>
              {record?.import_uid && (
                <CBadge color="secondary" className="text-uppercase">
                  UID {record.import_uid}
                </CBadge>
              )}
              {isStaging && (
                <CBadge color="info" textColor="dark">
                  In sospeso
                </CBadge>
              )}
            </div>
            <small className="text-body-secondary">Dettaglio movimento registrato</small>
          </div>
          <div className="d-flex gap-2">
            <CButton color="danger" variant="outline" disabled={deleteDisabled} onClick={handleDelete}>
              {deleting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <CIcon icon={cilTrash} className="me-2" />
                  Elimina
                </>
              )}
            </CButton>
            <CButton color="secondary" variant="ghost" onClick={() => navigate(-1)}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Indietro
            </CButton>
          </div>
        </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare il pagamento.'}</CAlert>
        )}

        {!loading && !error && !record && <CAlert color="warning">Pagamento non trovato.</CAlert>}

        {deleteError && (
          <CAlert color="danger" className="mb-3">
            {deleteError.message || 'Errore durante la cancellazione.'}
          </CAlert>
        )}

        {!loading && record && (
          <>
            <CRow className="gy-3 mb-4">
              <CCol md={3}>
                <div className="text-body-secondary small">Data pagamento</div>
                <div className="fw-semibold">{record.data_pagamento || '-'}</div>
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Importo</div>
                <div className="fw-semibold">{currencyFormatter.format(Number(record.importo) || 0)}</div>
                {record.importo_documento != null && (
                  <small className="text-body-secondary d-block">
                    Importo importato: {currencyFormatter.format(Number(record.importo_documento))}
                  </small>
                )}
                {record.residuo_pagamento != null && Math.abs(Number(record.residuo_pagamento)) > 0.009 && (
                  <CBadge color="warning" className="mt-2">
                    Residuo da assegnare: {currencyFormatter.format(Number(record.residuo_pagamento))}
                  </CBadge>
                )}
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Modalità</div>
                {record.modalita_code ? (
                  <CBadge color="secondary">
                    {record.modalita_code}
                    {record.modalita_label ? ` - ${record.modalita_label}` : ''}
                  </CBadge>
                ) : (
                  <span className="text-body-secondary">-</span>
                )}
              </CCol>
              <CCol md={3}>
                <div className="text-body-secondary small">Riferimento</div>
                <div className="fw-semibold">{record.reference || '-'}</div>
                {record.note && (
                  <small className="text-body-secondary d-block text-truncate" title={record.note}>
                    Note: {record.note}
                  </small>
                )}
              </CCol>
            </CRow>

            <section className="mb-4">
              <h6 className="text-body-secondary mb-2">Cliente</h6>
              <div className="border rounded p-3 bg-body-tertiary">
                <CRow>
                  <CCol md={6}>
                    <div className="text-body-secondary small">Nome</div>
                    <div className="fw-semibold">{record.cliente || '-'}</div>
                  </CCol>
                  <CCol md={3}>
                    <div className="text-body-secondary small">ID anagrafica</div>
                    <div className="fw-semibold">{record.id_anagrafica || '-'}</div>
                  </CCol>
                  <CCol md={3}>
                    <div className="text-body-secondary small">Partita IVA</div>
                    <div className="fw-semibold">{record.piva || '-'}</div>
                  </CCol>
                </CRow>
              </div>
            </section>

            {isStaging ? (
              <section className="mb-4">
                <h6 className="text-body-secondary mb-2">Stato assegnazione</h6>
                <CAlert color="info" className="mb-0">
                  Questo pagamento è stato importato e non è ancora collegato ad alcuna fattura. Utilizza il pulsante
                  <strong> &quot;Assegna ad altra fattura&quot;</strong> per distribuire l&apos;importo disponibile sulle
                  fatture aperte.
                </CAlert>
              </section>
            ) : (
              <section className="mb-4">
                <h6 className="text-body-secondary mb-2">Fattura collegata</h6>
                <div className="border rounded p-3 bg-body-tertiary">
                  <CRow className="align-items-center g-3">
                    <CCol md={3}>
                      <div className="text-body-secondary small">Numero</div>
                      <div className="fw-semibold">{record.fattura_display || '-'}</div>
                    </CCol>
                    <CCol md={3}>
                      <div className="text-body-secondary small">Totale</div>
                      <div className="fw-semibold">
                        {record.fattura_totale != null ? currencyFormatter.format(record.fattura_totale) : '-'}
                      </div>
                    </CCol>
                    <CCol md={3}>
                      <div className="text-body-secondary small">Saldo residuo</div>
                      <div className="fw-semibold">
                        {record.fattura_saldo != null ? currencyFormatter.format(record.fattura_saldo) : '-'}
                      </div>
                    </CCol>
                    <CCol md={3}>
                      <CButton
                        color="link"
                        className="px-0"
                        disabled={!record.id_fattura}
                        onClick={() => navigate(`/fatture/dettagli?id=${record.id_fattura}`)}
                      >
                        Apri fattura
                      </CButton>
                    </CCol>
                  </CRow>
                </div>
                {!record.id_fattura && (
                  <CAlert color="info" className="mt-3 mb-0">
                    Questo pagamento non è ancora collegato a una fattura. Utilizza il pulsante &quot;Assegna ad altra
                    fattura&quot; per completare l&apos;associazione.
                  </CAlert>
                )}
              </section>
            )}

            <section className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="text-body-secondary mb-0">Assegnazioni alle fatture</h6>
                {canAssignMore && (
                  <CButton color="primary" variant="outline" size="sm" onClick={openAssignmentModal}>
                    <CIcon icon={cilPlus} className="me-2" />
                    Assegna ad altra fattura
                  </CButton>
                )}
              </div>
              {assignments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table align-middle table-sm mb-0">
                    <thead>
                      <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Fattura</th>
                        <th scope="col">Cliente</th>
                        <th scope="col" className="text-end">
                          Importo
                        </th>
                        <th scope="col" className="text-end">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((item) => {
                        const assignmentUnassigned = !item.id_fattura
                        return (
                          <tr key={item.id_pagamento}>
                            <td className="fw-semibold">
                              #{item.id_pagamento}
                              {record.id_pagamento === item.id_pagamento && (
                                <CBadge color="info" className="ms-2">
                                  corrente
                                </CBadge>
                              )}
                            </td>
                            <td>
                              <div className="fw-semibold">{item.fattura_display || '-'}</div>
                              {assignmentUnassigned ? (
                                <CBadge color="warning" textColor="dark" className="mt-1">
                                  Da assegnare
                                </CBadge>
                              ) : (
                                <small className="text-body-secondary d-block">
                                  Data {item.fattura_data || '-'}
                                  {item.fattura_totale != null
                                    ? ` · Totale ${currencyFormatter.format(item.fattura_totale)}`
                                    : ''}
                                </small>
                              )}
                            </td>
                            <td>
                              <div className="fw-semibold">{item.cliente || '-'}</div>
                              <small className="text-body-secondary">ID {item.id_anagrafica || '-'}</small>
                            </td>
                            <td className="text-end fw-semibold">
                              {item.importo != null ? currencyFormatter.format(item.importo) : '-'}
                            </td>
                            <td className="text-end">
                              {assignmentUnassigned ? (
                                <span className="text-body-secondary">-</span>
                              ) : (
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  disabled={removingAssignmentId === item.id_pagamento}
                                  onClick={() => handleRemoveAssignment(item)}
                                >
                                  {removingAssignmentId === item.id_pagamento ? (
                                    <>
                                      <CSpinner size="sm" className="me-2" />
                                      Rimozione...
                                    </>
                                  ) : (
                                    <>
                                      <CIcon icon={cilTrash} className="me-2" />
                                      Rimuovi
                                    </>
                                  )}
                                </CButton>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessuna assegnazione disponibile per questo pagamento.
                </CAlert>
              )}
              {assignmentStats && (
                <div className="d-flex flex-wrap gap-4 mt-3 small text-body-secondary">
                  <span>
                    Importo pagamento:{' '}
                    {assignmentStats.totale != null ? currencyFormatter.format(assignmentStats.totale) : '-'}
                  </span>
                  <span>
                    Totale assegnato:{' '}
                    {assignmentStats.allocato != null
                      ? currencyFormatter.format(assignmentStats.allocato)
                      : '-'}
                  </span>
                  <span>
                    Residuo disponibile:{' '}
                    {assignmentStats.residuo != null ? currencyFormatter.format(assignmentStats.residuo) : '-'}
                  </span>
                </div>
              )}
            </section>

            <section>
              <h6 className="text-body-secondary mb-2">Note</h6>
              <div className="border rounded p-3 bg-white">
                {record.note ? record.note : <span className="text-body-secondary">Nessuna nota presente.</span>}
              </div>
            </section>
          </>
        )}
        </CCardBody>
      </CCard>

      <CModal visible={assignmentModalOpen} onClose={closeAssignmentModal} size="lg">
        <CModalHeader closeButton>
          <CModalTitle>Assegna ad altra fattura</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {residuoDisponibile != null && (
            <CBadge color="warning" className="mb-3 text-dark">
              Residuo disponibile: {currencyFormatter.format(residuoDisponibile)}
            </CBadge>
          )}
          {assignmentSubmitError && (
            <CAlert color="danger" className="mb-3">
              {assignmentSubmitError.message || 'Errore durante il salvataggio dell\'assegnazione.'}
            </CAlert>
          )}
          <CInputGroup className="mb-3">
            <CInputGroupText>
              <CIcon icon={cilMagnifyingGlass} />
            </CInputGroupText>
            <CFormInput
              placeholder="Cerca fattura per numero o cliente"
              value={assignmentSearch}
              onChange={(event) => setAssignmentSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  performAssignmentSearch()
                }
              }}
            />
            <CButton color="primary" type="button" onClick={performAssignmentSearch} disabled={assignmentLoading}>
              Cerca
            </CButton>
          </CInputGroup>
          {assignmentError && (
            <CAlert color="danger" className="mb-3">
              {assignmentError.message || 'Errore durante la ricerca delle fatture.'}
            </CAlert>
          )}
          {assignmentLoading ? (
            <div className="d-flex justify-content-center py-3">
              <CSpinner color="primary" />
            </div>
          ) : assignmentResults.length === 0 ? (
            <p className="text-body-secondary">Nessuna fattura trovata. Prova a cambiare i termini di ricerca.</p>
          ) : (
            <CListGroup className="mb-3">
              {assignmentResults.map((item) => (
                <CListGroupItem
                  key={item.id_fattura}
                  action
                  active={assignmentSelected?.id_fattura === item.id_fattura}
                  onClick={() => handleSelectAssignmentInvoice(item)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.anno}/{item.numero_documento ?? '-'}
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

          {assignmentSelected && (
            <div className="border rounded bg-body-tertiary p-3">
              <div className="fw-semibold mb-2">
                Fattura selezionata: {assignmentSelected.anno}/{assignmentSelected.numero_documento ?? '-'}
              </div>
              <small className="text-body-secondary d-block mb-2">
                Cliente: {assignmentSelected.ragione_sociale || '-'}
              </small>

              <CForm onSubmit={handleAssignmentSubmit}>
                <CFormLabel>Importo da assegnare</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignmentAmount}
                  onChange={(event) => setAssignmentAmount(event.target.value)}
                  required
                />
                <small className="text-body-secondary d-block mt-1">
                  Residuo disponibile:{' '}
                  {residuoDisponibile != null ? currencyFormatter.format(residuoDisponibile) : '-'}
                </small>
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <CButton color="secondary" variant="ghost" type="button" onClick={closeAssignmentModal}>
                    Annulla
                  </CButton>
                  <CButton color="primary" type="submit" disabled={assignmentSaving}>
                    {assignmentSaving ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Salvataggio...
                      </>
                    ) : (
                      'Conferma assegnazione'
                    )}
                  </CButton>
                </div>
              </CForm>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={closeAssignmentModal}>
            Chiudi
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PagamentiDetail
