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
  CPagination,
  CPaginationItem,
  CFormCheck,
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
import { cilArrowRight, cilSpreadsheet, cilWarning } from '@coreui/icons'
import { utils, write } from 'xlsx'

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
  const [ledgerPage, setLedgerPage] = useState(0)
  const [ledgerPendingOnly, setLedgerPendingOnly] = useState(false)
  const [ledgerResiduoOnly, setLedgerResiduoOnly] = useState(false)
  const [ledgerExporting, setLedgerExporting] = useState(false)

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    date_from: '',
    date_to: '',
  })
  const [pendingOnlyOpen, setPendingOnlyOpen] = useState(false)

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
          filters: { ...filters, pending_only_open: pendingOnlyOpen },
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
  }, [token, filters, pendingOnlyOpen, logout])

  const filteredLedger = useMemo(() => {
    if (!ledger || ledger.length === 0) return []
    const term = ledgerSearch.trim().toLowerCase()
    const matchesTerm = (row) =>
      term === '' ||
      [row.ragione_sociale, row.piva, row.codice_fiscale].some((field) =>
        field ? String(field).toLowerCase().includes(term) : false,
      )
    const matchesPending = (row) => (ledgerPendingOnly ? row.has_pending_unassigned : true)
    const matchesResiduo = (row) =>
      !ledgerResiduoOnly || Number.isFinite(row.saldo_residuo) && Number(row.saldo_residuo) > 0
    return ledger.filter((row) => matchesTerm(row) && matchesPending(row) && matchesResiduo(row))
  }, [ledger, ledgerSearch, ledgerPendingOnly, ledgerResiduoOnly])

  const exportLedger = async () => {
    if (filteredLedger.length === 0 || ledgerExporting) return
    setLedgerExporting(true)
    try {
      const headers = ['Cliente', 'P.IVA', 'Fatturato', 'Pagato', 'Residuo', 'Residuo da associare']
      const rows = filteredLedger.map((row) => [
        row.ragione_sociale || '',
        row.piva || row.codice_fiscale || '',
        row.totale_fatturato ?? 0,
        row.totale_pagato ?? 0,
        row.saldo_residuo ?? 0,
        row.pending_residuo ?? 0,
      ])
      const wb = utils.book_new()
      const ws = utils.aoa_to_sheet([headers, ...rows])
      utils.book_append_sheet(wb, ws, 'Ledger')
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ledger-${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setLedgerExporting(false)
    }
  }
  const paginatedLedger = useMemo(() => {
    const start = ledgerPage * 10
    return filteredLedger.slice(start, start + 10)
  }, [filteredLedger, ledgerPage])
  useEffect(() => {
    setLedgerPage(0)
  }, [ledgerSearch])

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
          <CNavItem>
            <CNavLink active={activeTab === 'imported'} onClick={() => setActiveTab('imported')}>
              Pagamenti importati
            </CNavLink>
          </CNavItem>
        </CNav>

        {activeTab !== 'ledger' && (
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
        )}

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
        <div className="d-flex justify-content-between flex-wrap gap-3 align-items-center mb-3">
          <div className="text-body-secondary small">
            Filtri attivi:{' '}
            {ledgerResiduoOnly && <span className="fw-semibold">residui &gt; 0</span>}
            {ledgerPendingOnly && (
              <>
                {ledgerResiduoOnly ? ' • ' : ''}
                <span className="fw-semibold">pagamenti da associare</span>
              </>
            )}
            {!ledgerPendingOnly && !ledgerResiduoOnly && <span className="fw-semibold">nessuno</span>}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <CButton
              size="sm"
              color={ledgerPendingOnly ? 'primary' : 'secondary'}
              variant={ledgerPendingOnly ? 'solid' : 'outline'}
              onClick={() => setLedgerPendingOnly((prev) => !prev)}
            >
              {ledgerPendingOnly ? 'Tutti i clienti' : 'Clienti con fatture da associare'}
            </CButton>
            <CButton
              size="sm"
              color={ledgerResiduoOnly ? 'primary' : 'secondary'}
              variant={ledgerResiduoOnly ? 'solid' : 'outline'}
              onClick={() => setLedgerResiduoOnly((prev) => !prev)}
            >
              {ledgerResiduoOnly ? 'Mostra Tutti' : 'Filtra clienti con debito'}
            </CButton>
            <CButton
              color="primary"
              variant="outline"
              disabled={ledgerExporting || filteredLedger.length === 0}
              onClick={exportLedger}
            >
              {ledgerExporting ? 'Esportazione...' : 'Esporta lista'}
            </CButton>
              </div>
            </div>
            {ledgerLoading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : ledgerError ? (
              <CAlert color="danger">{ledgerError.message || 'Errore nel caricamento dei saldi.'}</CAlert>
            ) : filteredLedger.length === 0 ? (
              <CAlert color="info">Nessun cliente trovato.</CAlert>
            ) : (
              <>
                <CTable responsive hover>
                  <CTableHead className="mp-table-head">
                    <CTableRow className="align-middle">
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Partita IVA</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Fatturato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Pagato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Residuo</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {paginatedLedger.map((row) => (
                      <CTableRow key={row.id_anagrafica}>
                        <CTableDataCell>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span>{row.ragione_sociale}</span>
                            {row.has_pending_unassigned && (
                              <CBadge color="warning" textColor="dark" className="d-flex align-items-center gap-1 small mb-0">
                                <CIcon icon={cilWarning} />
                                risultano pagamenti da associare
                              </CBadge>
                            )}
                          </div>
                        </CTableDataCell>
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
                {filteredLedger.length > 10 && (
                  <div className="d-flex justify-content-center mt-3">
                    <CPagination size="sm" className="mb-0">
                      <CPaginationItem
                        disabled={ledgerPage === 0}
                        onClick={() => setLedgerPage((prev) => Math.max(prev - 1, 0))}
                      >
                        &laquo;
                      </CPaginationItem>
                      {Array.from({ length: Math.ceil(filteredLedger.length / 10) }).map((_, index) => (
                        <CPaginationItem
                          key={index}
                          active={index === ledgerPage}
                          onClick={() => setLedgerPage(index)}
                        >
                          {index + 1}
                        </CPaginationItem>
                      ))}
                      <CPaginationItem
                        disabled={(ledgerPage + 1) * 10 >= filteredLedger.length}
                        onClick={() =>
                          setLedgerPage((prev) =>
                            (prev + 1) * 10 >= filteredLedger.length ? prev : prev + 1,
                          )
                        }
                      >
                        &raquo;
                      </CPaginationItem>
                    </CPagination>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            {paymentsLoading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : paymentsError ? (
              <CAlert color="danger">{paymentsError.message || 'Errore nel caricamento dei pagamenti.'}</CAlert>
            ) : !hasAssignedPayments ? (
              <CAlert color="info">Nessun pagamento registrato.</CAlert>
            ) : (
              <CTable responsive hover>
                <CTableHead className="mp-table-head">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell>Data</CTableHeaderCell>
                    <CTableHeaderCell>Cliente</CTableHeaderCell>
                    <CTableHeaderCell>Fattura</CTableHeaderCell>
                    <CTableHeaderCell>Riferimento</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                    <CTableHeaderCell>Modalita</CTableHeaderCell>
                    <CTableHeaderCell>Note</CTableHeaderCell>
                    <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {assignedPayments.map((row) => {
                    const isUnassigned = !row.id_fattura
                    const importoRegistrato = Number(row.importo) || 0
                    const importoDocumento = row.importo_documento != null ? Number(row.importo_documento) : null
                    const residuoPagamento = row.residuo_pagamento != null ? Number(row.residuo_pagamento) : null
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
          </>
        )}

        {activeTab === 'imported' && (
          <>
            <div className="d-flex justify-content-end mb-3">
              <CFormCheck
                id="pendingOnlyOpenToggle"
                label="Mostra solo pagamenti con residuo da assegnare"
                checked={pendingOnlyOpen}
                onChange={(event) => setPendingOnlyOpen(event.target.checked)}
              />
            </div>
            {paymentsLoading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : paymentsError ? (
              <CAlert color="danger">{paymentsError.message || 'Errore nel caricamento dei pagamenti.'}</CAlert>
            ) : !hasPendingPayments ? (
              <CAlert color="info">Nessun pagamento importato in sospeso.</CAlert>
            ) : (
              <>
                <CAlert color="info" className="mb-3">
                  Questi pagamenti sono stati importati ma non ancora assegnati a una fattura. Utilizza il dettaglio per
                  completare l'associazione o eliminarli se non piu necessari.
                </CAlert>
                <CTable responsive hover>
                  <CTableHead className="mp-table-head">
                    <CTableRow className="align-middle">
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Riferimento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Importo totale</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Allocato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Residuo</CTableHeaderCell>
                      <CTableHeaderCell>Modalita</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {stagingPayments.map((row) => {
                      const totaleImporto = Number(row.importo_totale)
                      const allocatoRaw = Number(row.importo_allocato)
                      const residuoRaw = row.residuo_pagamento != null ? Number(row.residuo_pagamento) : null
                      const allocatoValue = Number.isFinite(allocatoRaw) ? allocatoRaw : 0
                      const residuoValue = Number.isFinite(totaleImporto)
                        ? Math.max(0, Math.round((totaleImporto - allocatoValue) * 100) / 100)
                        : residuoRaw
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
                            {formatCurrency(allocatoValue)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {residuoValue != null ? formatCurrency(residuoValue) : '-'}
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
              </>
            )}
          </>
        )}

      </CCardBody>
    </CCard>
  )
}

export default PagamentiList
