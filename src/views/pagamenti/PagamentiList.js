import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CNav,
  CNavItem,
  CNavLink,
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
import { cilArrowRight, cilSpreadsheet } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchPagamentiLedger, fetchPagamentiList } from '../../services/pagamenti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

const formatCurrency = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : '-'
}

const PagamentiList = () => {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('ledger')
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState(null)
  const [ledgerSearch, setLedgerSearch] = useState('')

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLedgerLoading(true)
      setLedgerError(null)
      try {
        const { items } = await fetchPagamentiLedger({
          token,
          q: ledgerSearch,
          signal: controller.signal,
        })
        setLedger(items)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setLedger([])
        setLedgerError(err)
      } finally {
        setLedgerLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, ledgerSearch, logout])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setPaymentsLoading(true)
      setPaymentsError(null)
      try {
        const { items } = await fetchPagamentiList({
          token,
          filters,
          signal: controller.signal,
        })
        setPayments(items)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setPayments([])
        setPaymentsError(err)
      } finally {
        setPaymentsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, filters, logout])

  const filteredLedger = useMemo(() => {
    if (!ledger || ledger.length === 0) return []
    const term = ledgerSearch.trim().toLowerCase()
    if (term === '') return ledger
    return ledger.filter((row) =>
      [row.ragione_sociale, row.piva, row.codice_fiscale].some((field) =>
        field ? String(field).toLowerCase().includes(term) : false,
      ),
    )
  }, [ledger, ledgerSearch])

  const handleFiltersChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const stagingPayments = useMemo(() => payments.filter((row) => row.staging), [payments])
  const assignedPayments = useMemo(() => payments.filter((row) => !row.staging), [payments])
  const hasPendingPayments = stagingPayments.length > 0
  const hasAssignedPayments = assignedPayments.length > 0

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between flex-wrap gap-3 align-items-center">
        <div>
          <h5 className="mb-0">Pagamenti</h5>
          <small className="text-body-secondary">
            Situazione dare/avere clienti e elenco movimenti di pagamento.
          </small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/pagamenti/import')}>
            <CIcon icon={cilSpreadsheet} className="me-2" />
            Importa da Excel
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CNav variant="tabs" role="tablist" className="mb-3">
          <CNavItem>
            <CNavLink active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')}>
              Situazione clienti
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink active={activeTab === 'payments'} onClick={() => setActiveTab('payments')}>
              Pagamenti registrati
            </CNavLink>
          </CNavItem>
        </CNav>

        {activeTab === 'ledger' && (
          <>
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CFormLabel>Filtra per cliente</CFormLabel>
                <CFormInput
                  placeholder="Nome o P.IVA"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </CCol>
            </CRow>
            {ledgerLoading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : ledgerError ? (
              <CAlert color="danger">{ledgerError.message || 'Errore nel caricamento dei saldi.'}</CAlert>
            ) : filteredLedger.length === 0 ? (
              <CAlert color="info">Nessun cliente trovato.</CAlert>
            ) : (
              <CTable responsive hover>
                <CTableHead color="light">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell>Cliente</CTableHeaderCell>
                    <CTableHeaderCell>Partita IVA</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Fatturato</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Pagato</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Residuo</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredLedger.map((row) => (
                    <CTableRow key={row.id_anagrafica}>
                      <CTableDataCell>{row.ragione_sociale}</CTableDataCell>
                      <CTableDataCell>{row.piva || row.codice_fiscale || '-'}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {formatCurrency(row.totale_fatturato)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end text-success">
                        {formatCurrency(row.totale_pagato)}
                      </CTableDataCell>
                      <CTableDataCell
                        className={`text-end ${Number(row.saldo_residuo) > 0 ? 'text-danger' : ''}`}
                      >
                        {formatCurrency(row.saldo_residuo)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CFormLabel>Ricerca</CFormLabel>
                <CFormInput
                  placeholder="Cliente, fattura o note"
                  value={filters.q}
                  onChange={handleFiltersChange('q')}
                />
              </CCol>
              <CCol xs={6} md={4} lg={3}>
                <CFormLabel>Dal</CFormLabel>
                <CFormInput type="date" value={filters.date_from} onChange={handleFiltersChange('date_from')} />
              </CCol>
              <CCol xs={6} md={4} lg={3}>
                <CFormLabel>Al</CFormLabel>
                <CFormInput type="date" value={filters.date_to} onChange={handleFiltersChange('date_to')} />
              </CCol>
            </CRow>
            {paymentsLoading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : paymentsError ? (
              <CAlert color="danger">{paymentsError.message || 'Errore nel caricamento dei pagamenti.'}</CAlert>
            ) : !hasPendingPayments && !hasAssignedPayments ? (
              <CAlert color="info">Nessun pagamento registrato.</CAlert>
            ) : (
              <>
                {hasAssignedPayments && (
                  <CTable responsive hover>
                    <CTableHead color="light">
                      <CTableRow className="align-middle">
                        <CTableHeaderCell>Data</CTableHeaderCell>
                        <CTableHeaderCell>Cliente</CTableHeaderCell>
                        <CTableHeaderCell>Fattura</CTableHeaderCell>
                        <CTableHeaderCell>Riferimento</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                        <CTableHeaderCell>Modalità</CTableHeaderCell>
                        <CTableHeaderCell>Note</CTableHeaderCell>
                        <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {assignedPayments.map((row) => {
                        const isUnassigned = !row.id_fattura
                        const importoRegistrato = Number(row.importo) || 0
                        const importoDocumento = row.importo_documento != null ? Number(row.importo_documento) : null
                        const residuoPagamento =
                          row.residuo_pagamento != null ? Number(row.residuo_pagamento) : null
                        const showImportato =
                          !isUnassigned &&
                          importoDocumento != null &&
                          Math.abs(importoDocumento - importoRegistrato) > 0.009
                        const showResiduo = residuoPagamento != null && Math.abs(residuoPagamento) > 0.009
                        const displayAmount =
                          isUnassigned && importoDocumento != null ? importoDocumento : importoRegistrato

                        return (
                          <CTableRow key={row.id_pagamento}>
                            <CTableDataCell>{row.data_pagamento || '-'}</CTableDataCell>
                            <CTableDataCell>{row.cliente || '-'}</CTableDataCell>
                            <CTableDataCell>
                              {row.fattura_display || '-'}
                              {isUnassigned && (
                                <CBadge color="warning" textColor="dark" className="ms-2">
                                  Da assegnare
                                </CBadge>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div>{row.reference || '-'}</div>
                              {row.import_uid && (
                                <small className="text-body-secondary">UID: {row.import_uid}</small>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <div>{formatCurrency(displayAmount)}</div>
                              {showImportato && importoDocumento != null && (
                                <small className="text-body-secondary d-block">
                                  Importato: {formatCurrency(importoDocumento)}
                                </small>
                              )}
                              {showResiduo && (
                                <small className="text-warning d-block">
                                  Residuo: {formatCurrency(residuoPagamento)}
                                </small>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {row.modalita_code ? (
                                <>
                                  <div className="fw-semibold">{row.modalita_code}</div>
                                  {row.modalita_label && (
                                    <small className="text-body-secondary d-block">{row.modalita_label}</small>
                                  )}
                                </>
                              ) : (
                                <span className="text-body-secondary">-</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-break">
                              {row.note ? row.note : <span className="text-body-secondary">-</span>}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => navigate(`/pagamenti/dettaglio?id=${row.id_pagamento}`)}
                              >
                                <CIcon icon={cilArrowRight} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                )}
                {!hasAssignedPayments && (
                  <CAlert color="info" className="mb-0">
                    Nessun pagamento assegnato ancora registrato.
                  </CAlert>
                )}
              </>
            )}

            {hasPendingPayments && (
              <div className="mt-5">
                <h6 className="text-body-secondary mb-2">Pagamenti importati (tb_pagamenti)</h6>
                <CAlert color="info" className="mb-3">
                  Questi pagamenti sono stati importati ma non ancora assegnati a una fattura. Utilizza il dettaglio per
                  completare l&apos;associazione o eliminarli se non più necessari.
                </CAlert>
                <CTable responsive hover>
                  <CTableHead color="light">
                    <CTableRow className="align-middle">
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Riferimento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Importo totale</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Allocato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Residuo</CTableHeaderCell>
                      <CTableHeaderCell>Modalità</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {stagingPayments.map((row) => {
                      const residuo = row.residuo_pagamento != null ? Number(row.residuo_pagamento) : null
                      const allocato = row.importo_allocato != null ? Number(row.importo_allocato) : null
                      return (
                        <CTableRow key={`pending-${row.id_pagamento}`}>
                          <CTableDataCell>{row.data_pagamento || '-'}</CTableDataCell>
                          <CTableDataCell>{row.cliente || '-'}</CTableDataCell>
                          <CTableDataCell>
                            <div>{row.reference || '-'}</div>
                            {row.import_uid && (
                              <small className="text-body-secondary">UID: {row.import_uid}</small>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formatCurrency(row.importo_totale)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formatCurrency(allocato || 0)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {residuo != null ? formatCurrency(residuo) : '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.modalita_code ? (
                              <>
                                <div className="fw-semibold">{row.modalita_code}</div>
                                {row.modalita_label && (
                                  <small className="text-body-secondary d-block">{row.modalita_label}</small>
                                )}
                              </>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton
                              color="link"
                              size="sm"
                              className="p-0"
                              onClick={() => navigate(`/pagamenti/dettaglio?id=${row.id_pagamento}`)}
                            >
                              <CIcon icon={cilArrowRight} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PagamentiList
