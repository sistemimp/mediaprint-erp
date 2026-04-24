import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilZoom } from '@coreui/icons'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CPagination,
  CPaginationItem,
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
import usePermissions from '../../hooks/usePermissions'
import { fetchCrmEmailArchive } from '../../services/crmEmail'

const PAGE_SIZE = 10

// Normalizza un valore generico in stringa trimmed.
const asString = (value) => (typeof value === 'string' ? value.trim() : '')

// Parsing sicuro della data (null se invalida).
const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Rimuove prefissi reply/forward per raggruppare meglio le conversazioni.
const normalizeConversationSubject = (value) => {
  let subject = String(value || '').trim()
  if (!subject) return '(senza oggetto)'
  let updated = true
  while (updated) {
    const next = subject.replace(/^(re|fw|fwd|rv|aw|rif)\s*:\s*/i, '').trim()
    updated = next !== subject
    subject = next
  }
  return subject || '(senza oggetto)'
}

// Restituisce una chiave conversazione stabile (conversation_key o subject normalizzato).
const resolveEmailConversationKey = (email) => {
  const key = String(email?.conversation_key || '')
    .trim()
    .toLowerCase()
  if (key !== '') {
    return key
  }
  return normalizeConversationSubject(email?.subject).toLowerCase()
}

// Identifica il contatto principale della conversazione (anagrafica/email/from).
const resolveConversationParty = (email) => {
  const senderAnagrafica = Array.isArray(email?.anagrafiche)
    ? email.anagrafiche
        .filter((entry) => String(entry?.link_type || '').toLowerCase() === 'sender')
        .map((entry) => String(entry?.ragione_sociale || '').trim())
        .find(Boolean)
    : null
  if (senderAnagrafica) {
    return senderAnagrafica
  }

  const anyAnagrafica = Array.isArray(email?.anagrafiche)
    ? email.anagrafiche.map((entry) => String(entry?.ragione_sociale || '').trim()).find(Boolean)
    : null
  if (anyAnagrafica) {
    return anyAnagrafica
  }

  const senderEmail = Array.isArray(email?.sender_emails)
    ? email.sender_emails.map((entry) => String(entry || '').trim()).find(Boolean)
    : null
  if (senderEmail) {
    return senderEmail
  }

  const from = String(email?.from || '').trim()
  if (from !== '') {
    return from
  }

  return '(mittente sconosciuto)'
}

const isUnknownParty = (value) => asString(value).toLowerCase() === '(mittente sconosciuto)'

// Genera paginazione smart con ellissi per molte pagine.
const buildSmartPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 1) {
    return [{ type: 'page', value: 1 }]
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }))
  }

  const items = [{ type: 'page', value: 1 }]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  if (start > 2) {
    items.push({ type: 'ellipsis', value: 'left' })
  }
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page })
  }
  if (end < totalPages - 1) {
    items.push({ type: 'ellipsis', value: 'right' })
  }
  items.push({ type: 'page', value: totalPages })
  return items
}

// Estrae le anagrafiche collegate all'email senza duplicati.
const uniqueAnagrafiche = (email) => {
  const values = Array.isArray(email?.anagrafiche)
    ? email.anagrafiche.map((entry) => asString(entry?.ragione_sociale)).filter(Boolean)
    : []
  return values.filter((value, index, array) => array.indexOf(value) === index)
}

// Archivio email CRM con filtri, paginazione e drill-down per conversazione.
const CrmPlusEmailArchivio = () => {
  const { token } = useAuth()
  const { has } = usePermissions()
  const canReadMessages = has('msg.read')
  const canWriteMessages = has('msg.write')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    sender: '',
    subject: '',
    anagrafica: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({
    sender: '',
    subject: '',
    anagrafica: '',
  })
  const [conversationHistoryByKey, setConversationHistoryByKey] = useState({})
  const [conversationLoadingByKey, setConversationLoadingByKey] = useState({})

  // Carica archivio email in base ai filtri applicati e alla pagina corrente.
  useEffect(() => {
    if (!token) {
      setError('Sessione non valida. Effettua nuovamente il login.')
      setLoading(false)
      return
    }
    if (!canReadMessages) {
      setError("Non hai i permessi per visualizzare l'archivio email.")
      setLoading(false)
      setItems([])
      setTotal(0)
      return
    }

    let active = true
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchCrmEmailArchive({
          token,
          signal: controller.signal,
          sender: appliedFilters.sender,
          subject: appliedFilters.subject,
          anagrafica: appliedFilters.anagrafica,
          page,
          pageSize: PAGE_SIZE,
        })
        if (!active) {
          return
        }
        setItems(Array.isArray(response?.items) ? response.items : [])
        setTotal(Number(response?.count) || 0)
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) {
          return
        }
        setItems([])
        setTotal(0)
        setError(loadError?.message || 'Errore durante il caricamento archivio email.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [canReadMessages, token, page, appliedFilters])

  // Raggruppa i risultati per conversazione e ordina per data piu recente.
  const groupedConversations = useMemo(() => {
    const map = new Map()
    items.forEach((email) => {
      const baseSubject = normalizeConversationSubject(email?.subject)
      const key = resolveEmailConversationKey(email)
      const party = resolveConversationParty(email)
      if (!map.has(key)) {
        map.set(key, {
          key,
          subject: baseSubject,
          party,
          items: [],
        })
      }
      const group = map.get(key)
      if (!group) {
        return
      }
      if (isUnknownParty(group.party) && !isUnknownParty(party)) {
        group.party = party
      }
      group.items.push(email)
    })
    return Array.from(map.values()).sort((a, b) => {
      const left = parseDateValue(a.items?.[0]?.date_iso)?.getTime() ?? 0
      const right = parseDateValue(b.items?.[0]?.date_iso)?.getTime() ?? 0
      return right - left
    })
  }, [items])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const smartPaginationItems = useMemo(
    () => buildSmartPaginationItems(page, totalPages),
    [page, totalPages],
  )

  // Reset cache storico quando cambia il contesto di ricerca/pagina.
  useEffect(() => {
    setConversationHistoryByKey({})
    setConversationLoadingByKey({})
  }, [appliedFilters, page])

  // Carica lo storico completo di una singola conversazione.
  const handleLoadConversationHistory = async (conversation) => {
    if (!token || !canReadMessages || !conversation?.key || !conversation?.subject) return
    if (conversationLoadingByKey[conversation.key]) return

    setConversationLoadingByKey((prev) => ({ ...prev, [conversation.key]: true }))
    try {
      const allItems = []
      let cursor = 1
      let totalPageCount = 1
      const maxPages = 20

      while (cursor <= totalPageCount && cursor <= maxPages) {
        const response = await fetchCrmEmailArchive({
          token,
          sender: appliedFilters.sender,
          subject: conversation.subject,
          anagrafica: appliedFilters.anagrafica,
          conversationKey: conversation.key,
          page: cursor,
          pageSize: 100,
        })
        const pageItems = Array.isArray(response?.items) ? response.items : []
        allItems.push(...pageItems)
        const count = Number(response?.count) || 0
        totalPageCount = Math.max(1, Math.ceil(count / 100))
        cursor += 1
      }

      const filtered = allItems.filter(
        (email) => resolveEmailConversationKey(email) === conversation.key,
      )
      const byId = new Map()
      filtered.forEach((email) => {
        const id = String(email?.id_email || email?.message_uid || email?.message_id || '')
        if (id !== '') {
          byId.set(id, email)
        }
      })
      const merged = Array.from(byId.values()).sort((a, b) => {
        const first = parseDateValue(a?.date_iso)?.getTime() ?? 0
        const second = parseDateValue(b?.date_iso)?.getTime() ?? 0
        return second - first
      })
      setConversationHistoryByKey((prev) => ({ ...prev, [conversation.key]: merged }))
    } catch (historyError) {
      setError(historyError?.message || 'Impossibile caricare lo storico della conversazione.')
    } finally {
      setConversationLoadingByKey((prev) => ({ ...prev, [conversation.key]: false }))
    }
  }

  // Aggiorna il singolo campo filtro nel form locale.
  const onFilterChange = (field) => (event) => {
    const value = event?.target?.value || ''
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  // Applica i filtri normalizzati e resetta la paginazione alla prima pagina.
  const onApplyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters({
      sender: asString(filters.sender),
      subject: asString(filters.subject),
      anagrafica: asString(filters.anagrafica),
    })
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Archivio Email</h2>
          <p className="text-body-secondary mb-0">
            Ricerca email pregresse con raggruppamento per oggetto/conversazione.
          </p>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow className="mb-3">
        <CCol>
          <CCard>
            <CCardHeader>Filtri</CCardHeader>
            <CCardBody>
              <CForm onSubmit={onApplyFilters}>
                <CRow className="g-3 align-items-end">
                  <CCol md={4}>
                    <CFormLabel>Mittente</CFormLabel>
                    <CFormInput
                      value={filters.sender}
                      onChange={onFilterChange('sender')}
                      placeholder="email o nome mittente"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Oggetto</CFormLabel>
                    <CFormInput
                      value={filters.subject}
                      onChange={onFilterChange('subject')}
                      placeholder="testo oggetto"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Anagrafica correlata</CFormLabel>
                    <CFormInput
                      value={filters.anagrafica}
                      onChange={onFilterChange('anagrafica')}
                      placeholder="ragione sociale o ID"
                    />
                  </CCol>
                </CRow>
                <div className="d-flex gap-2 mt-3">
                  <CButton type="submit" color="primary" disabled={loading || !canReadMessages}>
                    Cerca
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    disabled={loading || !canReadMessages}
                    onClick={() => {
                      const empty = { sender: '', subject: '', anagrafica: '' }
                      setFilters(empty)
                      setAppliedFilters(empty)
                      setPage(1)
                    }}
                  >
                    Pulisci
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              Risultati: {loading ? <CSpinner size="sm" /> : total} email | Pagina {page} di{' '}
              {totalPages}
            </CCardHeader>
            <CCardBody>
              {!canReadMessages ? (
                <CAlert color="warning" className="mb-0">
                  Permesso `msg.read` richiesto per consultare l'archivio email.
                </CAlert>
              ) : loading ? (
                <div className="text-center py-3">
                  <CSpinner />
                </div>
              ) : groupedConversations.length === 0 ? (
                <div className="text-body-secondary">
                  Nessuna email trovata con i filtri impostati.
                </div>
              ) : (
                <>
                  <CAccordion alwaysOpen flush>
                    {groupedConversations.map((group) => {
                      const historyItems = conversationHistoryByKey[group.key]
                      const conversationItems =
                        Array.isArray(historyItems) && historyItems.length > 0
                          ? historyItems
                          : group.items
                      const isHistoryLoaded = Array.isArray(historyItems)
                      const isLoadingHistory = Boolean(conversationLoadingByKey[group.key])

                      return (
                        <CAccordionItem key={group.key} itemKey={group.key}>
                          <CAccordionHeader>
                            <div className="d-flex justify-content-between w-100 pe-2">
                              <div className="fw-semibold">
                                {group.party}
                                <div className="small text-body-secondary">
                                  Oggetto: {group.subject}
                                </div>
                              </div>
                              <div className="small text-body-secondary">
                                {conversationItems.length} email
                                {isHistoryLoaded ? ' (storico incluso)' : ''}
                              </div>
                            </div>
                          </CAccordionHeader>
                          <CAccordionBody>
                            {!isHistoryLoaded ? (
                              <div className="mb-3">
                                <CButton
                                  size="sm"
                                  color="primary"
                                  variant="outline"
                                  disabled={isLoadingHistory}
                                  onClick={() => handleLoadConversationHistory(group)}
                                >
                                  {isLoadingHistory
                                    ? 'Ricerca pregresse in corso...'
                                    : 'Cerca anche pregresse'}
                                </CButton>
                              </div>
                            ) : null}
                            <CTable small responsive hover className="mb-0">
                              <CTableHead>
                                <CTableRow>
                                  <CTableHeaderCell>Mittente</CTableHeaderCell>
                                  <CTableHeaderCell>Data</CTableHeaderCell>
                                  <CTableHeaderCell>Oggetto</CTableHeaderCell>
                                  <CTableHeaderCell>Destinatari</CTableHeaderCell>
                                  <CTableHeaderCell>Anagrafiche collegate</CTableHeaderCell>
                                  <CTableHeaderCell>Azioni</CTableHeaderCell>
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {conversationItems.map((email, index) => (
                                  <CTableRow
                                    key={String(
                                      email.id_email ||
                                        email.message_uid ||
                                        email.message_id ||
                                        `${group.key}-${index}`,
                                    )}
                                  >
                                    <CTableDataCell>{asString(email.from) || '-'}</CTableDataCell>
                                    <CTableDataCell>{email.date || '-'}</CTableDataCell>
                                    <CTableDataCell>
                                      <Link to={`/crm/email-dettaglio?id=${email.id_email}`}>
                                        {email.subject || '(senza oggetto)'}
                                      </Link>
                                    </CTableDataCell>
                                    <CTableDataCell>{email.recipients || '-'}</CTableDataCell>
                                    <CTableDataCell>
                                      {uniqueAnagrafiche(email).join(' | ') || '-'}
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <div className="d-inline-flex gap-2">
                                        <Link
                                          to={`/crm/email-dettaglio?id=${email.id_email}`}
                                          title="Apri dettaglio email"
                                          aria-label="Apri dettaglio email"
                                        >
                                          <CIcon icon={cilZoom} />
                                        </Link>
                                        {canWriteMessages ? (
                                          <Link
                                            to={`/crm/email-dettaglio?id=${email.id_email}&reply=1`}
                                            title="Rispondi email"
                                            aria-label="Rispondi email"
                                          >
                                            <CIcon icon={cilEnvelopeOpen} />
                                          </Link>
                                        ) : null}
                                      </div>
                                    </CTableDataCell>
                                  </CTableRow>
                                ))}
                              </CTableBody>
                            </CTable>
                          </CAccordionBody>
                        </CAccordionItem>
                      )
                    })}
                  </CAccordion>

                  <CPagination align="center" className="mt-3 mb-0">
                    <CPaginationItem disabled={loading || page <= 1} onClick={() => setPage(1)}>
                      {'<<'}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={loading || page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      {'<'}
                    </CPaginationItem>

                    {smartPaginationItems.map((entry, index) => {
                      if (entry.type === 'ellipsis') {
                        return (
                          <CPaginationItem
                            key={`ellipsis-${String(entry.value)}-${index}`}
                            disabled
                          >
                            ...
                          </CPaginationItem>
                        )
                      }
                      return (
                        <CPaginationItem
                          key={`page-${entry.value}`}
                          active={entry.value === page}
                          disabled={loading}
                          onClick={() => setPage(entry.value)}
                        >
                          {entry.value}
                        </CPaginationItem>
                      )
                    })}

                    <CPaginationItem
                      disabled={loading || page >= totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      {'>'}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={loading || page >= totalPages}
                      onClick={() => setPage(totalPages)}
                    >
                      {'>>'}
                    </CPaginationItem>
                  </CPagination>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusEmailArchivio
