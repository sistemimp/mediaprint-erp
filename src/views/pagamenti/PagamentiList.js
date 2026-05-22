import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
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

import { useAuth } from '../../context/AuthContext'
import {
  autoReassignPagamentiLearned,
  fetchPagamentiLedger,
  fetchPagamentiList,
  tryAutoAssignPagamento,
} from '../../services/pagamenti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

// Formatta importi in euro.
const formatCurrency = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : '-'
}

// Lista pagamenti con tre viste: ledger clienti, registrati, importati.
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
  const [retryAssigningId, setRetryAssigningId] = useState(null)
  const [retryAssignMessage, setRetryAssignMessage] = useState(null)
  const [massReassignLoading, setMassReassignLoading] = useState(false)
  const [rowRetryMessages, setRowRetryMessages] = useState({})

  // Carica il ledger clienti filtrabile per ricerca.
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

  // Carica l'elenco pagamenti registrati/importati applicando i filtri.
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

  const reloadPayments = async () => {
    if (!token) return
    setPaymentsLoading(true)
    setPaymentsError(null)
    try {
      const { items } = await fetchPagamentiList({
        token,
        filters: { ...filters, pending_only_open: pendingOnlyOpen },
      })
      setPayments(items)
    } catch (err) {
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

  const handleRetryAutoAssign = async (idPagamento) => {
    if (!token || !idPagamento || retryAssigningId) return
    setRetryAssigningId(idPagamento)
    setRetryAssignMessage(null)
    setRowRetryMessages((prev) => {
      const next = { ...prev }
      delete next[idPagamento]
      return next
    })
    try {
      const result = await tryAutoAssignPagamento({ token, id_pagamento: idPagamento })
      const rowMessage = result.updated
        ? { color: 'success', text: 'Riassegnazione completata: cliente trovato dalle note.' }
        : { color: 'warning', text: 'Nessuna riassegnazione effettuata: controllo note non sufficiente.' }
      setRowRetryMessages((prev) => ({ ...prev, [idPagamento]: rowMessage }))
      if (result?.data && Number(result.data.id_pagamento) > 0) {
        setPayments((prev) =>
          prev.map((item) =>
            Number(item?.id_pagamento) === Number(result.data.id_pagamento) ? { ...item, ...result.data } : item,
          ),
        )
      }
      window.setTimeout(() => {
        setRowRetryMessages((prev) => {
          if (!prev[idPagamento]) return prev
          const next = { ...prev }
          delete next[idPagamento]
          return next
        })
      }, 5000)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      const errorMessage = {
        color: 'danger',
        text: err?.message || 'Errore durante il tentativo di riassegnazione.',
      }
      setRowRetryMessages((prev) => ({ ...prev, [idPagamento]: errorMessage }))
      window.setTimeout(() => {
        setRowRetryMessages((prev) => {
          if (!prev[idPagamento]) return prev
          const next = { ...prev }
          delete next[idPagamento]
          return next
        })
      }, 5000)
    } finally {
      setRetryAssigningId(null)
    }
  }

  const handleMassAutoReassign = async () => {
    if (!token || massReassignLoading) return
    setMassReassignLoading(true)
    setRetryAssignMessage(null)
    try {
      const result = await autoReassignPagamentiLearned({ token, limit: 500 })
      setRetryAssignMessage({
        color: result.updated > 0 ? 'success' : 'warning',
        text:
          result.updated > 0
            ? `Riassegnazione completata: ${result.updated} pagamento/i aggiornati su ${result.checked} verificati.`
            : `Nessuna riassegnazione eseguita su ${result.checked} pagamento/i verificati.`,
      })
      await reloadPayments()
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setRetryAssignMessage({
        color: 'danger',
        text: err?.message || 'Errore durante la riassegnazione automatica massiva.',
      })
    } finally {
      setMassReassignLoading(false)
    }
  }

  // Applica filtri client-side al ledger (testo, sospesi, residui).
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

  // Esporta il ledger filtrato in file Excel.
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
      const excelJsModule = await import('exceljs')
      const ExcelJS = excelJsModule.default ?? excelJsModule
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Ledger')
      worksheet.addRow(headers)
      rows.forEach((row) => worksheet.addRow(row))
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
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
  // Estrae la pagina corrente del ledger (10 righe).
  const paginatedLedger = useMemo(() => {
    const start = ledgerPage * 10
    return filteredLedger.slice(start, start + 10)
  }, [filteredLedger, ledgerPage])
  // Reset pagina ledger quando cambia la ricerca.
  useEffect(() => {
    setLedgerPage(0)
  }, [ledgerSearch])

  // Aggiorna i filtri della vista pagamenti registrati/importati.
  const handleFiltersChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Separa i pagamenti in sospeso dai pagamenti già assegnati.
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
                data-testid="search"
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
                  data-testid="search"
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
                <CTable responsive hover data-testid="table">
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
                      <CTableRow key={row.id_anagrafica} data-testid={`row-${row.id_anagrafica}`}>
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
              <CTable responsive hover data-testid="table">
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
                      <CTableRow key={row.id_pagamento} data-testid={`row-${row.id_pagamento}`}>
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
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <CButton
                color="primary"
                variant="outline"
                type="button"
                onClick={handleMassAutoReassign}
                disabled={massReassignLoading || paymentsLoading || stagingPayments.length === 0}
              >
                {massReassignLoading ? 'Riassegnazione in corso...' : 'Auto riassegna da storico manuale'}
              </CButton>
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
                {retryAssignMessage && (
                  <CAlert color={retryAssignMessage.color} className="mb-3">
                    {retryAssignMessage.text}
                  </CAlert>
                )}
                <CAlert color="info" className="mb-3">
                  Questi pagamenti sono stati importati ma non ancora assegnati a una fattura. Utilizza il dettaglio per
                  completare l'associazione o eliminarli se non piu necessari.
                </CAlert>
                <CAccordion alwaysOpen data-testid="table">
                  {stagingPayments.map((row) => {
                    const totaleImporto = Number(row.importo_totale)
                    const allocatoRaw = Number(row.importo_allocato)
                    const residuoRaw = row.residuo_pagamento != null ? Number(row.residuo_pagamento) : null
                    const allocatoValue = Number.isFinite(allocatoRaw) ? allocatoRaw : 0
                    const residuoValue = Number.isFinite(totaleImporto)
                      ? Math.max(0, Math.round((totaleImporto - allocatoValue) * 100) / 100)
                      : residuoRaw
                    return (
                      <CAccordionItem itemKey={String(row.id_pagamento)} key={`pending-acc-${row.id_pagamento}`}>
                        <CAccordionHeader>
                          <div className="w-100 pe-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                              <strong>{row.cliente || 'Cliente non assegnato'}</strong>
                              <div className="small text-body-secondary">
                                {row.data_pagamento || '-'} {row.reference ? `• ${row.reference}` : ''}
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="fw-semibold">{formatCurrency(row.importo_totale)}</div>
                              <small className="text-body-secondary">
                                Residuo: {residuoValue != null ? formatCurrency(residuoValue) : '-'}
                              </small>
                            </div>
                          </div>
                        </CAccordionHeader>
                        <CAccordionBody>
                          <CRow className="g-3">
                            <CCol md={4}>
                              <div className="small text-body-secondary">Allocato</div>
                              <div>{formatCurrency(allocatoValue)}</div>
                            </CCol>
                            <CCol md={4}>
                              <div className="small text-body-secondary">Modalità</div>
                              <div>
                                {row.modalita_code
                                  ? `${row.modalita_code}${row.modalita_label ? ` - ${row.modalita_label}` : ''}`
                                  : '-'}
                              </div>
                            </CCol>
                            <CCol md={4}>
                              <div className="small text-body-secondary">UID Import</div>
                              <div>{row.import_uid || '-'}</div>
                            </CCol>
                            <CCol xs={12}>
                              <div className="small text-body-secondary">Nota importazione</div>
                              <div className="border rounded p-2 bg-body-tertiary text-body">
                                {row.note || <span className="text-body-secondary">Nessuna nota</span>}
                              </div>
                            </CCol>
                            {rowRetryMessages[row.id_pagamento] && (
                              <CCol xs={12}>
                                <div className={`small text-${rowRetryMessages[row.id_pagamento].color}`}>
                                  {rowRetryMessages[row.id_pagamento].text}
                                </div>
                              </CCol>
                            )}
                            <CCol xs={12}>
                              <div className="d-flex align-items-center gap-2">
                                <CButton
                                  color="secondary"
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleRetryAutoAssign(row.id_pagamento)}
                                  disabled={retryAssigningId === row.id_pagamento || Number(row.id_anagrafica) > 0}
                                >
                                  {retryAssigningId === row.id_pagamento ? 'Verifica...' : 'Prova riassegnazione'}
                                </CButton>
                                <CButton
                                  color="link"
                                  size="sm"
                                  type="button"
                                  className="p-0"
                                  onClick={() => navigate(`/pagamenti/dettaglio?id=${row.id_pagamento}`)}
                                >
                                  <CIcon icon={cilArrowRight} />
                                </CButton>
                              </div>
                            </CCol>
                          </CRow>
                        </CAccordionBody>
                      </CAccordionItem>
                    )
                  })}
                </CAccordion>
              </>
            )}
          </>
        )}

      </CCardBody>
    </CCard>
  )
}

export default PagamentiList


