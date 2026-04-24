import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import PermissionButton from '../../components/PermissionButton'
import usePermissions from '../../hooks/usePermissions'
import { listImThreads } from '../../services/instantMessagingApi'
import { fetchTickets } from '../../services/tickets'
import {
  fetchCrmEmailArchive,
  fetchCrmEmailToday,
  downloadCrmEmailAttachment,
  downloadCrmEmailAttachmentsZip,
} from '../../services/crmEmail'

// Tenta il parsing data JS restituendo null se non valida.
const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Formatta data/ora in formato italiano breve.
const formatDateTime = (value) => {
  const date = parseDateValue(value)
  if (!date) return '-'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Mappa lo stato ticket su un colore badge consistente.
const ticketStatusColor = (status) => {
  if (status === 'aperto') return 'warning'
  if (status === 'in_lavorazione') return 'info'
  if (status === 'risolto') return 'success'
  if (status === 'chiuso') return 'secondary'
  return 'primary'
}

// Converte byte in testo leggibile (B/KB/MB).
const formatBytes = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '-'
  if (numeric < 1024) return `${numeric} B`
  if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(1)} KB`
  return `${(numeric / (1024 * 1024)).toFixed(1)} MB`
}

// Normalizza soggetti email rimuovendo prefissi reply/forward ripetuti.
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

// Risolve la chiave conversazione partendo da conversation_key o soggetto normalizzato.
const resolveEmailConversationKey = (email) => {
  const key = String(email?.conversation_key || '')
    .trim()
    .toLowerCase()
  if (key !== '') {
    return key
  }
  return normalizeConversationSubject(email?.subject).toLowerCase()
}

// Determina il "party" della conversazione privilegiando anagrafica mittente.
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

const isUnknownParty = (value) =>
  String(value || '')
    .trim()
    .toLowerCase() === '(mittente sconosciuto)'

// Costruisce una paginazione compatta con ellissi per dataset lunghi.
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

// Pannello CRM operativo: IM, ticket attivi ed email archiviate con allegati.
const CrmPlusComunicazioni = () => {
  const EMAILS_PAGE_SIZE = 5
  const { token } = useAuth()
  const { has } = usePermissions()
  const canReadMessages = has('msg.read')
  const canWriteMessages = has('msg.write')
  const canReadTickets = has('bug.read')
  const [loading, setLoading] = useState(true)
  const [emailsLoading, setEmailsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [threads, setThreads] = useState([])
  const [tickets, setTickets] = useState([])
  const [emailsToday, setEmailsToday] = useState([])
  const [emailsPage, setEmailsPage] = useState(1)
  const [emailsTotal, setEmailsTotal] = useState(0)
  const [emailsError, setEmailsError] = useState(null)
  const [emailsSyncing, setEmailsSyncing] = useState(false)
  const [conversationHistoryByKey, setConversationHistoryByKey] = useState({})
  const [conversationLoadingByKey, setConversationLoadingByKey] = useState({})

  // Carica riepilogo comunicazioni IM e ticket operativi in parallelo.
  useEffect(() => {
    if (!token) {
      setError('Sessione non valida. Effettua nuovamente il login.')
      setLoading(false)
      return
    }
    if (!canReadMessages && !canReadTickets) {
      setError('Non hai i permessi per visualizzare comunicazioni CRM.')
      setLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [threadsResult, ticketsResult] = await Promise.allSettled([
          canReadMessages ? listImThreads() : Promise.resolve([]),
          canReadTickets
            ? fetchTickets({ token, signal: controller.signal })
            : Promise.resolve({ items: [] }),
        ])

        if (!active) return

        if (canReadMessages && threadsResult.status === 'fulfilled') {
          setThreads(Array.isArray(threadsResult.value) ? threadsResult.value : [])
        } else {
          setThreads([])
        }

        if (canReadTickets && ticketsResult.status === 'fulfilled') {
          setTickets(Array.isArray(ticketsResult.value?.items) ? ticketsResult.value.items : [])
        } else {
          setTickets([])
        }

        if (
          ((canReadMessages && threadsResult.status === 'rejected') || !canReadMessages) &&
          ((canReadTickets && ticketsResult.status === 'rejected') || !canReadTickets)
        ) {
          setError('Impossibile caricare comunicazioni e ticket.')
        }
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) return
        setError(loadError?.message || 'Errore durante il caricamento delle comunicazioni.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [canReadMessages, canReadTickets, token])

  // Carica la pagina corrente delle email archiviate CRM.
  useEffect(() => {
    if (!token || !canReadMessages) {
      setEmailsLoading(false)
      setEmailsToday([])
      setEmailsTotal(0)
      return
    }

    let active = true
    const controller = new AbortController()

    const loadEmails = async () => {
      setEmailsLoading(true)
      setEmailsError(null)
      try {
        const response = await fetchCrmEmailArchive({
          token,
          signal: controller.signal,
          page: emailsPage,
          pageSize: EMAILS_PAGE_SIZE,
        })
        if (!active) return
        setEmailsToday(Array.isArray(response?.items) ? response.items : [])
        setEmailsTotal(Number(response?.count) || 0)
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) return
        setEmailsToday([])
        setEmailsTotal(0)
        setEmailsError(loadError?.message || 'Impossibile leggere le email archiviate.')
      } finally {
        if (active) setEmailsLoading(false)
      }
    }

    loadEmails()
    return () => {
      active = false
      controller.abort()
    }
  }, [canReadMessages, token, emailsPage])

  // Seleziona le conversazioni IM piu recenti.
  const recentThreads = useMemo(
    () =>
      [...threads]
        .sort((a, b) => {
          const first = parseDateValue(a?.lastMessage?.createdAt)?.getTime() ?? 0
          const second = parseDateValue(b?.lastMessage?.createdAt)?.getTime() ?? 0
          return second - first
        })
        .slice(0, 8),
    [threads],
  )

  // Filtra i ticket attivi (aperti/in lavorazione) per dashboard CRM.
  const activeTickets = useMemo(
    () =>
      tickets
        .filter((ticket) =>
          ['aperto', 'in_lavorazione'].includes(String(ticket?.stato || '').toLowerCase()),
        )
        .slice(0, 8),
    [tickets],
  )

  // Conteggia i messaggi non letti totali dalle conversazioni IM.
  const unreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + (Number(thread?.unreadCount) || 0), 0),
    [threads],
  )

  // Raggruppa le email per conversazione e ordina i gruppi per data recente.
  const groupedConversations = useMemo(() => {
    const map = new Map()
    emailsToday.forEach((email) => {
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
  }, [emailsToday])

  const emailsTotalPages = Math.max(1, Math.ceil(emailsTotal / EMAILS_PAGE_SIZE))
  const smartPaginationItems = useMemo(
    () => buildSmartPaginationItems(emailsPage, emailsTotalPages),
    [emailsPage, emailsTotalPages],
  )

  // Carica lo storico completo della conversazione con paginazione backend.
  const handleLoadConversationHistory = async (conversation) => {
    if (!token || !canReadMessages || !conversation?.key || !conversation?.subject) {
      return
    }
    if (conversationLoadingByKey[conversation.key]) {
      return
    }

    setConversationLoadingByKey((prev) => ({ ...prev, [conversation.key]: true }))
    try {
      const allItems = []
      let page = 1
      let totalPages = 1
      const maxPages = 20

      while (page <= totalPages && page <= maxPages) {
        const response = await fetchCrmEmailArchive({
          token,
          subject: conversation.subject,
          conversationKey: conversation.key,
          page,
          pageSize: 100,
        })
        const items = Array.isArray(response?.items) ? response.items : []
        allItems.push(...items)
        const total = Number(response?.count) || 0
        totalPages = Math.max(1, Math.ceil(total / 100))
        page += 1
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
      setEmailsError(
        historyError?.message || 'Impossibile caricare lo storico della conversazione.',
      )
    } finally {
      setConversationLoadingByKey((prev) => ({ ...prev, [conversation.key]: false }))
    }
  }

  // Scarica un allegato singolo da una email archivio.
  const handleDownloadAttachment = async (idEmail, attachmentName) => {
    if (!canReadMessages) {
      setEmailsError('Non hai i permessi per scaricare allegati.')
      return
    }
    try {
      const { blob, filename } = await downloadCrmEmailAttachment({
        idEmail,
        attachment: attachmentName,
        token,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      setEmailsError(downloadError?.message || "Impossibile scaricare l'allegato selezionato.")
    }
  }

  // Scarica tutti gli allegati dell'email in ZIP.
  const handleDownloadAttachmentsZip = async (idEmail, attachments) => {
    if (!canReadMessages) {
      setEmailsError('Non hai i permessi per scaricare allegati.')
      return
    }
    try {
      const { blob, filename } = await downloadCrmEmailAttachmentsZip({
        idEmail,
        attachments,
        token,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      setEmailsError(downloadError?.message || 'Impossibile scaricare il file ZIP degli allegati.')
    }
  }

  // Forza una sincronizzazione manuale POP e ricarica la prima pagina archivio.
  const handleManualReloadEmails = async () => {
    if (!token || !canReadMessages || emailsSyncing) {
      return
    }

    setEmailsSyncing(true)
    setEmailsError(null)
    try {
      await fetchCrmEmailToday({ token })
      const targetPage = 1
      const response = await fetchCrmEmailArchive({
        token,
        page: targetPage,
        pageSize: EMAILS_PAGE_SIZE,
      })
      setEmailsPage(targetPage)
      setEmailsToday(Array.isArray(response?.items) ? response.items : [])
      setEmailsTotal(Number(response?.count) || 0)
      setConversationHistoryByKey({})
      setConversationLoadingByKey({})
    } catch (reloadError) {
      setEmailsError(reloadError?.message || 'Impossibile ricaricare le email manualmente.')
    } finally {
      setEmailsSyncing(false)
    }
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Comunicazioni</h2>
          <p className="text-body-secondary mb-0">
            Monitoraggio conversazioni interne, ticket operativi ed email ricevute oggi.
          </p>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow className="g-3 mb-4">
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Conversazioni
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : canReadMessages ? threads.length : '-'}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Messaggi non letti
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : canReadMessages ? unreadCount : '-'}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Ticket aperti
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : canReadTickets ? activeTickets.length : '-'}
              </div>
              <div className="small text-body-secondary mt-2 d-flex gap-3">
                {canReadMessages ? <Link to="/messaggi">Apri messaggi</Link> : null}
                {canReadMessages ? <Link to="/crm/conversazioni">Tutte conversazioni</Link> : null}
                {canReadTickets ? <Link to="/tickets/lista">Apri ticket</Link> : null}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4">
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Conversazioni recenti</CCardHeader>
            <CCardBody>
              {!canReadMessages ? (
                <div className="text-body-secondary">Permesso `msg.read` richiesto.</div>
              ) : loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : (
                <CTable small responsive hover className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Thread</CTableHeaderCell>
                      <CTableHeaderCell>Ultimo messaggio</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Non letti</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {recentThreads.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-body-secondary">
                          Nessuna conversazione disponibile.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      recentThreads.map((thread) => (
                        <CTableRow key={thread.id}>
                          <CTableDataCell>
                            <Link to="/messaggi" className="text-decoration-none">
                              {thread?.participants
                                ?.map((entry) => entry?.username)
                                .filter(Boolean)
                                .join(', ') || 'Conversazione'}
                            </Link>
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDateTime(thread?.lastMessage?.createdAt)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {Number(thread?.unreadCount) || 0}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Ticket aperti / in lavorazione</CCardHeader>
            <CCardBody>
              {!canReadTickets ? (
                <div className="text-body-secondary">Permesso `bug.read` richiesto.</div>
              ) : loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : (
                <CTable small responsive hover className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>ID</CTableHeaderCell>
                      <CTableHeaderCell>Titolo</CTableHeaderCell>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell>Aggiornato</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {activeTickets.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={4} className="text-body-secondary">
                          Nessun ticket aperto.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      activeTickets.map((ticket) => (
                        <CTableRow key={ticket.id_ticket}>
                          <CTableDataCell>
                            <Link
                              to={`/tickets/dettagli?id=${ticket.id_ticket}`}
                              className="text-decoration-none"
                            >
                              #{ticket.id_ticket}
                            </Link>
                          </CTableDataCell>
                          <CTableDataCell>{ticket.titolo || '-'}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={ticketStatusColor(ticket.stato)}>
                              {ticket.stato || '-'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>{formatDateTime(ticket.updated_at)}</CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4 mt-1">
        <CCol>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span>
                Email archiviate (DB) - Pagina {emailsPage}/{emailsTotalPages} - Totale{' '}
                {emailsTotal}
              </span>
              <div className="d-inline-flex align-items-center gap-3">
                <PermissionButton
                  permission="msg.read"
                  size="sm"
                  color="primary"
                  variant="outline"
                  disabled={emailsSyncing}
                  onClick={handleManualReloadEmails}
                >
                  {emailsSyncing ? 'Ricarico...' : 'Ricarica email'}
                </PermissionButton>
                {canReadMessages ? <Link to="/crm/email-archivio">Apri archivio email</Link> : null}
              </div>
            </CCardHeader>
            <CCardBody>
              {!canReadMessages ? (
                <CAlert color="warning" className="mb-0">
                  Permesso `msg.read` richiesto per visualizzare l'archivio email.
                </CAlert>
              ) : null}
              {emailsError ? <CAlert color="warning">{emailsError}</CAlert> : null}
              {canReadMessages && emailsLoading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : canReadMessages ? (
                <>
                  {emailsToday.length === 0 ? (
                    <div className="text-body-secondary">Nessuna email presente in archivio.</div>
                  ) : (
                    <>
                      <CAccordion alwaysOpen flush>
                        {groupedConversations.map((conversation) => {
                          const historyItems = conversationHistoryByKey[conversation.key]
                          const conversationItems =
                            Array.isArray(historyItems) && historyItems.length > 0
                              ? historyItems
                              : conversation.items
                          const isHistoryLoaded = Array.isArray(historyItems)
                          const isLoadingHistory = Boolean(
                            conversationLoadingByKey[conversation.key],
                          )

                          return (
                            <CAccordionItem
                              key={`conv-${conversation.key}`}
                              itemKey={`conv-${conversation.key}`}
                            >
                              <CAccordionHeader>
                                <div className="d-flex flex-column gap-1 w-100 pe-2">
                                  <div className="fw-semibold">{conversation.party}</div>
                                  <div className="small text-body-secondary">
                                    Oggetto: {conversation.subject}
                                  </div>
                                  <div className="small text-body-secondary">
                                    Messaggi nel gruppo: {conversationItems.length}
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
                                      onClick={() => handleLoadConversationHistory(conversation)}
                                    >
                                      {isLoadingHistory
                                        ? 'Ricerca pregresse in corso...'
                                        : 'Cerca anche pregresse'}
                                    </CButton>
                                  </div>
                                ) : null}

                                {conversationItems.map((email, emailIndex) => {
                                  const senderAnagrafiche = Array.isArray(email.anagrafiche)
                                    ? email.anagrafiche
                                        .filter(
                                          (entry) =>
                                            String(entry?.link_type || '').toLowerCase() ===
                                            'sender',
                                        )
                                        .map((entry) => entry?.ragione_sociale)
                                        .filter(Boolean)
                                        .filter(
                                          (value, index, array) => array.indexOf(value) === index,
                                        )
                                    : []
                                  const attachments = Array.isArray(email.attachments)
                                    ? email.attachments.filter(Boolean)
                                    : []

                                  return (
                                    <div
                                      key={String(
                                        email.id_email ||
                                          email.message_uid ||
                                          email.message_id ||
                                          `${conversation.key}-${emailIndex}`,
                                      )}
                                      className="border rounded p-2 mb-3"
                                    >
                                      <div className="small mb-2">
                                        <strong>Data:</strong> {email.date || '-'} |{' '}
                                        <strong>Mittente:</strong> {email.from || '-'}
                                      </div>
                                      <div className="small mb-2">
                                        <Link to={`/crm/email-dettaglio?id=${email.id_email}`}>
                                          Apri dettaglio email
                                        </Link>
                                        {canWriteMessages ? (
                                          <>
                                            {' | '}
                                            <Link
                                              to={`/crm/email-dettaglio?id=${email.id_email}&reply=1`}
                                            >
                                              Rispondi
                                            </Link>
                                          </>
                                        ) : null}
                                      </div>
                                      <div className="small mb-2">
                                        <strong>Destinatari:</strong> {email.recipients || '-'}
                                      </div>
                                      <div className="small mb-2">
                                        <strong>Anagrafiche collegate (mittente):</strong>{' '}
                                        {senderAnagrafiche.join(' | ') || '-'}
                                      </div>
                                      <div className="small mb-2">
                                        <strong>ID messaggio:</strong> {email.message_id || '-'} |{' '}
                                        <strong>Dimensione:</strong> {formatBytes(email.size_bytes)}
                                      </div>
                                      <div className="small mb-2">
                                        <strong>Allegati:</strong>{' '}
                                        {attachments.length > 0 ? (
                                          <div className="d-flex flex-column gap-2">
                                            <div>
                                              <PermissionButton
                                                permission="msg.read"
                                                size="sm"
                                                color="primary"
                                                variant="outline"
                                                onClick={() =>
                                                  handleDownloadAttachmentsZip(
                                                    email.id_email,
                                                    attachments,
                                                  )
                                                }
                                              >
                                                Scarica ZIP allegati
                                              </PermissionButton>
                                            </div>
                                            <span className="d-inline-flex flex-wrap gap-2 align-items-center">
                                              {attachments.map((attachmentName) => (
                                                <PermissionButton
                                                  permission="msg.read"
                                                  key={`${email.id_email || email.index}-${attachmentName}`}
                                                  size="sm"
                                                  color="light"
                                                  variant="outline"
                                                  onClick={() =>
                                                    handleDownloadAttachment(
                                                      email.id_email,
                                                      attachmentName,
                                                    )
                                                  }
                                                >
                                                  {attachmentName}
                                                </PermissionButton>
                                              ))}
                                            </span>
                                          </div>
                                        ) : (
                                          'Nessun allegato'
                                        )}
                                      </div>
                                      <div className="mt-3 p-2 border rounded bg-body-tertiary">
                                        {email.message_html ? (
                                          <>
                                            <div className="small text-body-secondary mb-1">
                                              Messaggio (HTML)
                                            </div>
                                            <iframe
                                              title={`email-html-${email.id_email || email.index}`}
                                              sandbox=""
                                              srcDoc={email.message_html}
                                              style={{
                                                width: '100%',
                                                minHeight: '260px',
                                                border:
                                                  '1px solid var(--cui-border-color, #dee2e6)',
                                                borderRadius: '0.25rem',
                                                backgroundColor: 'white',
                                              }}
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <div className="small text-body-secondary mb-1">
                                              Testo messaggio
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                              {email.message_text || 'Testo non disponibile.'}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </CAccordionBody>
                            </CAccordionItem>
                          )
                        })}
                      </CAccordion>
                      <CPagination align="center" className="mt-3 mb-0">
                        <CPaginationItem
                          disabled={emailsLoading || emailsPage <= 1}
                          onClick={() => setEmailsPage(1)}
                        >
                          {'<<'}
                        </CPaginationItem>
                        <CPaginationItem
                          disabled={emailsLoading || emailsPage <= 1}
                          onClick={() => setEmailsPage((prev) => Math.max(1, prev - 1))}
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
                              active={entry.value === emailsPage}
                              disabled={emailsLoading}
                              onClick={() => setEmailsPage(entry.value)}
                            >
                              {entry.value}
                            </CPaginationItem>
                          )
                        })}

                        <CPaginationItem
                          disabled={emailsLoading || emailsPage >= emailsTotalPages}
                          onClick={() =>
                            setEmailsPage((prev) => Math.min(emailsTotalPages, prev + 1))
                          }
                        >
                          {'>'}
                        </CPaginationItem>
                        <CPaginationItem
                          disabled={emailsLoading || emailsPage >= emailsTotalPages}
                          onClick={() => setEmailsPage(emailsTotalPages)}
                        >
                          {'>>'}
                        </CPaginationItem>
                      </CPagination>
                    </>
                  )}
                </>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusComunicazioni
