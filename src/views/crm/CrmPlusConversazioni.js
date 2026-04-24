import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilZoom } from '@coreui/icons'
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
import { listImThreads } from '../../services/instantMessagingApi'

const PAGE_SIZE = 20
const EMAIL_PAGE_SIZE = 10

// Parsing data robusto con fallback null.
const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Formatta data/ora nel formato italiano.
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

// Genera paginazione compatta con ellissi.
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

// Normalizza testo per confronti case-insensitive.
const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

// Normalizza il subject rimuovendo prefissi reply/forward.
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

// Determina una chiave conversazione stabile per le email.
const resolveEmailConversationKey = (email) => {
  const key = String(email?.conversation_key || '')
    .trim()
    .toLowerCase()
  if (key !== '') {
    return key
  }
  return normalizeConversationSubject(email?.subject).toLowerCase()
}

// Risolve la controparte conversazione (anagrafica/email/from).
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

// Verifica se l'email ha almeno una anagrafica collegata.
const hasLinkedAnagrafica = (email) =>
  Array.isArray(email?.anagrafiche) &&
  email.anagrafiche.some((entry) => Number(entry?.id_anagrafica) > 0)

// Vista unificata conversazioni IM + conversazioni email aggregate.
const CrmPlusConversazioni = () => {
  const { token } = useAuth()
  const { has } = usePermissions()
  const canReadMessages = has('msg.read')
  const canWriteMessages = has('msg.write')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [threads, setThreads] = useState([])
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailError, setEmailError] = useState(null)
  const [emailConversationGroups, setEmailConversationGroups] = useState([])
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [emailPage, setEmailPage] = useState(1)

  // Carica tutto l'archivio email e costruisce i gruppi conversazione.
  useEffect(() => {
    if (!token || !canReadMessages) {
      setEmailLoading(false)
      setEmailConversationGroups([])
      return
    }

    let active = true
    const controller = new AbortController()

    const loadEmailConversations = async () => {
      setEmailLoading(true)
      setEmailError(null)
      try {
        let currentPage = 1
        let totalPages = 1
        const allItems = []
        while (currentPage <= totalPages) {
          const response = await fetchCrmEmailArchive({
            token,
            signal: controller.signal,
            page: currentPage,
            pageSize: 200,
          })
          const items = Array.isArray(response?.items) ? response.items : []
          allItems.push(...items)
          const total = Number(response?.count) || 0
          totalPages = Math.max(1, Math.ceil(total / 200))
          currentPage += 1
        }

        if (!active) {
          return
        }

        const grouped = new Map()
        allItems.filter(hasLinkedAnagrafica).forEach((email) => {
          const subject = normalizeConversationSubject(email?.subject)
          const key = resolveEmailConversationKey(email)
          const party = resolveConversationParty(email)
          if (!grouped.has(key)) {
            grouped.set(key, {
              key,
              subject,
              party,
              count: 0,
              lastDateIso: '',
              lastEmailId: null,
            })
          }
          const group = grouped.get(key)
          if (!group) {
            return
          }
          if (isUnknownParty(group.party) && !isUnknownParty(party)) {
            group.party = party
          }
          group.count += 1
          const existing = parseDateValue(group.lastDateIso)?.getTime() ?? 0
          const current = parseDateValue(email?.date_iso)?.getTime() ?? 0
          if (current >= existing) {
            group.lastDateIso = String(email?.date_iso || '')
            group.lastEmailId = Number(email?.id_email) > 0 ? Number(email.id_email) : null
          }
        })

        const groups = Array.from(grouped.values()).sort((a, b) => {
          const left = parseDateValue(a.lastDateIso)?.getTime() ?? 0
          const right = parseDateValue(b.lastDateIso)?.getTime() ?? 0
          return right - left
        })

        setEmailConversationGroups(groups)
      } catch (loadError) {
        if (!active || loadError?.name === 'AbortError') {
          return
        }
        setEmailConversationGroups([])
        setEmailError(loadError?.message || 'Impossibile caricare le conversazioni email.')
      } finally {
        if (active) {
          setEmailLoading(false)
        }
      }
    }

    loadEmailConversations()
    return () => {
      active = false
      controller.abort()
    }
  }, [canReadMessages, token])

  // Carica le conversazioni di instant messaging.
  useEffect(() => {
    if (!canReadMessages) {
      setThreads([])
      setLoading(false)
      return () => {}
    }
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listImThreads()
        if (!active) {
          return
        }
        const items = Array.isArray(response) ? response : []
        items.sort((a, b) => {
          const left = parseDateValue(a?.lastMessage?.createdAt)?.getTime() ?? 0
          const right = parseDateValue(b?.lastMessage?.createdAt)?.getTime() ?? 0
          return right - left
        })
        setThreads(items)
      } catch (loadError) {
        if (!active) {
          return
        }
        setThreads([])
        setError(loadError?.message || 'Impossibile caricare le conversazioni.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [canReadMessages])

  // Applica il filtro testuale ai thread IM.
  const filteredThreads = useMemo(() => {
    const term = normalizeText(query)
    if (term === '') {
      return threads
    }
    return threads.filter((thread) => {
      const participants = Array.isArray(thread?.participants)
        ? thread.participants
            .map((entry) => String(entry?.username || '').trim())
            .filter(Boolean)
            .join(' ')
        : ''
      const lastMessage = String(thread?.lastMessage?.body || '').trim()
      return (
        normalizeText(participants).includes(term) ||
        normalizeText(lastMessage).includes(term) ||
        normalizeText(thread?.id).includes(term)
      )
    })
  }, [threads, query])

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / PAGE_SIZE))
  const smartPaginationItems = useMemo(
    () => buildSmartPaginationItems(page, totalPages),
    [page, totalPages],
  )

  // Mantiene la pagina corrente valida quando cambia il totale risultati.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  // Estrae solo gli elementi della pagina corrente IM.
  const pageItems = useMemo(() => {
    const offset = (page - 1) * PAGE_SIZE
    return filteredThreads.slice(offset, offset + PAGE_SIZE)
  }, [filteredThreads, page])

  // Conteggia i non letti sui thread filtrati.
  const unreadTotal = useMemo(
    () => filteredThreads.reduce((sum, thread) => sum + (Number(thread?.unreadCount) || 0), 0),
    [filteredThreads],
  )

  // Applica il filtro testuale ai gruppi conversazione email.
  const filteredEmailGroups = useMemo(() => {
    const term = normalizeText(query)
    if (term === '') {
      return emailConversationGroups
    }
    return emailConversationGroups.filter((group) => {
      return (
        normalizeText(group.party).includes(term) || normalizeText(group.subject).includes(term)
      )
    })
  }, [emailConversationGroups, query])

  const emailTotalPages = Math.max(1, Math.ceil(filteredEmailGroups.length / EMAIL_PAGE_SIZE))
  const emailPaginationItems = useMemo(
    () => buildSmartPaginationItems(emailPage, emailTotalPages),
    [emailPage, emailTotalPages],
  )

  // Mantiene valida la pagina email quando cambia il totale.
  useEffect(() => {
    if (emailPage > emailTotalPages) {
      setEmailPage(emailTotalPages)
    }
  }, [emailPage, emailTotalPages])

  // Estrae solo i gruppi email della pagina corrente.
  const emailPageItems = useMemo(() => {
    const offset = (emailPage - 1) * EMAIL_PAGE_SIZE
    return filteredEmailGroups.slice(offset, offset + EMAIL_PAGE_SIZE)
  }, [filteredEmailGroups, emailPage])

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Tutte le conversazioni</h2>
          <p className="text-body-secondary mb-0">
            Storico completo delle conversazioni interne. Usa la ricerca per partecipante, testo o
            ID thread.
          </p>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow className="mb-3 g-3">
        <CCol lg={8}>
          <CCard>
            <CCardHeader>Ricerca conversazioni</CCardHeader>
            <CCardBody>
              <CForm
                onSubmit={(event) => {
                  event.preventDefault()
                  setPage(1)
                  setQuery(queryInput)
                }}
              >
                <CRow className="g-2 align-items-end">
                  <CCol md={9}>
                    <CFormLabel>Filtro</CFormLabel>
                    <CFormInput
                      value={queryInput}
                      onChange={(event) => setQueryInput(event.target.value || '')}
                      placeholder="nome partecipante, testo ultimo messaggio, ID thread"
                    />
                  </CCol>
                  <CCol md={3} className="d-flex gap-2">
                    <CButton type="submit" color="primary" disabled={loading || !canReadMessages}>
                      Cerca
                    </CButton>
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      disabled={loading || !canReadMessages}
                      onClick={() => {
                        setQueryInput('')
                        setQuery('')
                        setPage(1)
                        setEmailPage(1)
                      }}
                    >
                      Pulisci
                    </CButton>
                  </CCol>
                </CRow>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={4}>
          <CCard className="h-100">
            <CCardBody className="d-flex flex-column justify-content-center">
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Conversazioni filtrate
              </div>
              <div className="fs-4 fw-semibold">
                {loading ? <CSpinner size="sm" /> : canReadMessages ? filteredThreads.length : '-'}
              </div>
              <div className="text-body-secondary small text-uppercase fw-semibold mt-3">
                Messaggi non letti
              </div>
              <div className="fs-5 fw-semibold">
                {loading ? <CSpinner size="sm" /> : canReadMessages ? unreadTotal : '-'}
              </div>
              <div className="text-body-secondary small text-uppercase fw-semibold mt-3">
                Conversazioni email filtrate
              </div>
              <div className="fs-5 fw-semibold">
                {emailLoading ? (
                  <CSpinner size="sm" />
                ) : canReadMessages ? (
                  filteredEmailGroups.length
                ) : (
                  '-'
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span>
                Elenco completo - Pagina {page}/{totalPages}
              </span>
              {canReadMessages ? <Link to="/messaggi">Apri pannello messaggi</Link> : null}
            </CCardHeader>
            <CCardBody>
              {!canReadMessages ? (
                <div className="text-body-secondary">Permesso `msg.read` richiesto.</div>
              ) : loading ? (
                <div className="text-center py-3">
                  <CSpinner />
                </div>
              ) : pageItems.length === 0 ? (
                <div className="text-body-secondary">Nessuna conversazione trovata.</div>
              ) : (
                <>
                  <CTable small responsive hover className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Thread</CTableHeaderCell>
                        <CTableHeaderCell>Partecipanti</CTableHeaderCell>
                        <CTableHeaderCell>Ultimo messaggio</CTableHeaderCell>
                        <CTableHeaderCell>Data ultimo</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Non letti</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {pageItems.map((thread, index) => {
                        const participants = Array.isArray(thread?.participants)
                          ? thread.participants
                              .map((entry) => String(entry?.username || '').trim())
                              .filter(Boolean)
                          : []
                        const lastBody = String(thread?.lastMessage?.body || '').trim()
                        return (
                          <CTableRow key={String(thread?.id ?? `thread-${index}`)}>
                            <CTableDataCell>#{thread?.id ?? '-'}</CTableDataCell>
                            <CTableDataCell>{participants.join(', ') || '-'}</CTableDataCell>
                            <CTableDataCell className="text-truncate" style={{ maxWidth: '360px' }}>
                              {lastBody || '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {formatDateTime(thread?.lastMessage?.createdAt)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {Number(thread?.unreadCount) > 0 ? (
                                <CBadge color="warning">{Number(thread?.unreadCount)}</CBadge>
                              ) : (
                                '0'
                              )}
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>

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

      <CRow className="mt-3">
        <CCol>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span>
                Conversazioni email (archivio) - Pagina {emailPage}/{emailTotalPages}
              </span>
              {canReadMessages ? <Link to="/crm/email-archivio">Apri archivio email</Link> : null}
            </CCardHeader>
            <CCardBody>
              {!canReadMessages ? (
                <CAlert color="warning" className="mb-0">
                  Permesso `msg.read` richiesto per visualizzare le conversazioni email.
                </CAlert>
              ) : null}
              {emailError ? <CAlert color="warning">{emailError}</CAlert> : null}
              {canReadMessages && emailLoading ? (
                <div className="text-center py-3">
                  <CSpinner />
                </div>
              ) : canReadMessages && emailPageItems.length === 0 ? (
                <div className="text-body-secondary">
                  Nessuna conversazione email collegata ad anagrafica trovata.
                </div>
              ) : canReadMessages ? (
                <>
                  <CTable small responsive hover className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Canale</CTableHeaderCell>
                        <CTableHeaderCell>Mittente / Anagrafica</CTableHeaderCell>
                        <CTableHeaderCell>Oggetto conversazione</CTableHeaderCell>
                        <CTableHeaderCell>Messaggi</CTableHeaderCell>
                        <CTableHeaderCell>Ultimo messaggio</CTableHeaderCell>
                        <CTableHeaderCell>Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {emailPageItems.map((group) => (
                        <CTableRow key={`email-group-${group.key}`}>
                          <CTableDataCell>
                            <CBadge color="info">Email</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>{group.party}</CTableDataCell>
                          <CTableDataCell>{group.subject}</CTableDataCell>
                          <CTableDataCell>{group.count}</CTableDataCell>
                          <CTableDataCell>{formatDateTime(group.lastDateIso)}</CTableDataCell>
                          <CTableDataCell>
                            {Number(group.lastEmailId) > 0 ? (
                              <div className="d-inline-flex gap-2">
                                <Link
                                  to={`/crm/email-dettaglio?id=${group.lastEmailId}`}
                                  title="Apri dettaglio email"
                                  aria-label="Apri dettaglio email"
                                >
                                  <CIcon icon={cilZoom} />
                                </Link>
                                {canWriteMessages ? (
                                  <Link
                                    to={`/crm/email-dettaglio?id=${group.lastEmailId}&reply=1`}
                                    title="Rispondi email"
                                    aria-label="Rispondi email"
                                  >
                                    <CIcon icon={cilEnvelopeOpen} />
                                  </Link>
                                ) : null}
                              </div>
                            ) : (
                              '-'
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>

                  <CPagination align="center" className="mt-3 mb-0">
                    <CPaginationItem
                      disabled={emailLoading || emailPage <= 1}
                      onClick={() => setEmailPage(1)}
                    >
                      {'<<'}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={emailLoading || emailPage <= 1}
                      onClick={() => setEmailPage((prev) => Math.max(1, prev - 1))}
                    >
                      {'<'}
                    </CPaginationItem>

                    {emailPaginationItems.map((entry, index) => {
                      if (entry.type === 'ellipsis') {
                        return (
                          <CPaginationItem
                            key={`email-ellipsis-${String(entry.value)}-${index}`}
                            disabled
                          >
                            ...
                          </CPaginationItem>
                        )
                      }
                      return (
                        <CPaginationItem
                          key={`email-page-${entry.value}`}
                          active={entry.value === emailPage}
                          disabled={emailLoading}
                          onClick={() => setEmailPage(entry.value)}
                        >
                          {entry.value}
                        </CPaginationItem>
                      )
                    })}

                    <CPaginationItem
                      disabled={emailLoading || emailPage >= emailTotalPages}
                      onClick={() => setEmailPage((prev) => Math.min(emailTotalPages, prev + 1))}
                    >
                      {'>'}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={emailLoading || emailPage >= emailTotalPages}
                      onClick={() => setEmailPage(emailTotalPages)}
                    >
                      {'>>'}
                    </CPaginationItem>
                  </CPagination>
                </>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusConversazioni
