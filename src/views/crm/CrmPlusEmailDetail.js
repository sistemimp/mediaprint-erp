import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useAuth } from '../../context/AuthContext'
import PermissionButton from '../../components/PermissionButton'
import usePermissions from '../../hooks/usePermissions'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { createTicket } from '../../services/tickets'
import {
  fetchCrmEmailDetail,
  linkCrmEmailAnagrafica,
  linkCrmEmailTicket,
  replyCrmEmail,
  downloadCrmEmailAttachment,
  downloadCrmEmailAttachmentsZip,
} from '../../services/crmEmail'

// Converte byte in formato leggibile (B/KB/MB).
const formatBytes = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '-'
  if (numeric < 1024) return `${numeric} B`
  if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(1)} KB`
  return `${(numeric / (1024 * 1024)).toFixed(1)} MB`
}

// Estrae l'elenco anagrafiche collegate come mittente, senza duplicati.
const uniqueSenderAnagrafiche = (email) => {
  const list = Array.isArray(email?.anagrafiche)
    ? email.anagrafiche
        .filter((entry) => String(entry?.link_type || '').toLowerCase() === 'sender')
        .map((entry) => String(entry?.ragione_sociale || '').trim())
        .filter(Boolean)
    : []
  return list.filter((value, index, array) => array.indexOf(value) === index)
}

// Dettaglio email CRM con azioni di risposta, collegamento anagrafica e ticket.
const CrmPlusEmailDetail = () => {
  const { token } = useAuth()
  const { has } = usePermissions()
  const location = useLocation()
  const canReadMessages = has('msg.read')
  const canWriteMessages = has('msg.write')
  const canReadAnagrafiche = has('anag.read')
  const canReadTickets = has('bug.read')
  const canCreateTicket = has('bug.create')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState(null)
  const [linkAnagraficaId, setLinkAnagraficaId] = useState('')
  const [linking, setLinking] = useState(false)
  const [reloadSeq, setReloadSeq] = useState(0)
  const [anagraficaSearch, setAnagraficaSearch] = useState('')
  const [anagraficaLoading, setAnagraficaLoading] = useState(false)
  const [anagraficaResults, setAnagraficaResults] = useState([])
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyMessage, setReplyMessage] = useState(null)
  const [ticketId, setTicketId] = useState('')
  const [ticketSectionType, setTicketSectionType] = useState('')
  const [ticketSectionId, setTicketSectionId] = useState('')
  const [ticketLinking, setTicketLinking] = useState(false)
  const [ticketMessage, setTicketMessage] = useState(null)
  const [newTicketTitle, setNewTicketTitle] = useState('')
  const [newTicketDescription, setNewTicketDescription] = useState('')
  const [newTicketPriority, setNewTicketPriority] = useState('media')
  const [newTicketSectionType, setNewTicketSectionType] = useState('')
  const [newTicketSectionId, setNewTicketSectionId] = useState('')
  const [ticketCreating, setTicketCreating] = useState(false)

  // Legge l'id email dalla querystring supportando alias id/id_email.
  const idEmail = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    return Number(params.get('id') || params.get('id_email') || 0)
  }, [location.search])

  // Permette apertura predefinita dell'editor risposta da query param reply.
  const openReplyByDefault = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    const raw = String(params.get('reply') || '').toLowerCase()
    return raw === '1' || raw === 'true' || raw === 'yes'
  }, [location.search])

  // Carica il dettaglio email e precompila i campi di risposta/ticket.
  useEffect(() => {
    if (!token) {
      setError('Sessione non valida. Effettua nuovamente il login.')
      setLoading(false)
      return
    }
    if (!canReadMessages) {
      setError('Non hai i permessi per visualizzare il dettaglio email.')
      setLoading(false)
      return
    }
    if (!idEmail || idEmail <= 0) {
      setError('ID email non valido.')
      setLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchCrmEmailDetail({ idEmail, token, signal: controller.signal })
        if (!active) return
        const item = response?.item || null
        setEmail(item)
        if (item) {
          const currentSubject = String(item.subject || '').trim()
          setReplySubject(currentSubject ? `Re: ${currentSubject}` : 'Re: Comunicazione MediaPrint')
          setReplyBody('')
          setReplyMessage(null)
          setNewTicketTitle(currentSubject ? `Email: ${currentSubject}` : 'Ticket da email CRM')
          const sender = String(item.from || '').trim()
          const recipients = String(item.recipients || '').trim()
          const messageText = String(item.message_text || '').trim()
          const details = [
            sender ? `Mittente: ${sender}` : '',
            recipients ? `Destinatari: ${recipients}` : '',
            item.date ? `Data: ${item.date}` : '',
            messageText ? `\n${messageText.slice(0, 1600)}` : '',
          ]
            .filter(Boolean)
            .join('\n')
          setNewTicketDescription(details)
        }
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || !active) return
        setEmail(null)
        setError(loadError?.message || 'Impossibile caricare il dettaglio email.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [canReadMessages, idEmail, token, reloadSeq])

  // Ricerca anagrafiche con debounce per il collegamento manuale.
  useEffect(() => {
    if (!token || !canReadAnagrafiche) {
      setAnagraficaResults([])
      return
    }
    const term = String(anagraficaSearch || '').trim()
    if (term.length < 2) {
      setAnagraficaResults([])
      return
    }

    let active = true
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setAnagraficaLoading(true)
        const response = await fetchAnagrafiche({
          token,
          search: term,
          page: 1,
          pageSize: 8,
          signal: controller.signal,
        })
        if (!active) return
        setAnagraficaResults(Array.isArray(response?.items) ? response.items : [])
      } catch (_error) {
        if (!active) return
        setAnagraficaResults([])
      } finally {
        if (active) setAnagraficaLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [anagraficaSearch, canReadAnagrafiche, token])

  // Scarica un allegato singolo creando un link temporaneo nel browser.
  const handleDownloadAttachment = async (attachmentName) => {
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
      setError(downloadError?.message || "Impossibile scaricare l'allegato.")
    }
  }

  // Scarica tutti (o alcuni) allegati in ZIP.
  const handleDownloadZip = async (attachments) => {
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
      setError(downloadError?.message || 'Impossibile scaricare lo ZIP allegati.')
    }
  }

  // Invia la risposta email con subject/body correnti.
  const handleSendReply = async () => {
    if (!canWriteMessages) {
      setError('Non hai i permessi per rispondere alle email.')
      return
    }
    try {
      setReplySending(true)
      setError(null)
      setReplyMessage(null)
      await replyCrmEmail({
        idEmail,
        body: replyBody,
        subject: replySubject,
        token,
      })
      setReplyMessage('Risposta inviata correttamente.')
      setReplyBody('')
    } catch (replyError) {
      setError(replyError?.message || 'Impossibile inviare la risposta email.')
    } finally {
      setReplySending(false)
    }
  }

  // Collega un ticket esistente all'email corrente con sezione opzionale.
  const handleLinkTicket = async () => {
    if (!canWriteMessages) {
      setError('Non hai i permessi per collegare ticket alla email.')
      return
    }
    const numericTicketId = Number(ticketId)
    if (!Number.isInteger(numericTicketId) || numericTicketId <= 0) {
      setError('Inserisci un ID ticket valido.')
      return
    }
    const sectionType = String(ticketSectionType || '').trim()
    const numericSectionId = sectionType !== '' ? Number(ticketSectionId) : null
    if (
      sectionType !== '' &&
      (!Number.isInteger(numericSectionId) || Number(numericSectionId) <= 0)
    ) {
      setError('Inserisci un ID valido per la sezione gestionale selezionata.')
      return
    }

    try {
      setTicketLinking(true)
      setError(null)
      setTicketMessage(null)
      await linkCrmEmailTicket({
        idEmail,
        idTicket: numericTicketId,
        sectionType,
        sectionId: sectionType !== '' ? Number(numericSectionId) : null,
        token,
      })
      setTicketMessage('Ticket collegato correttamente.')
      setTicketId('')
      setTicketSectionType('')
      setTicketSectionId('')
      setReloadSeq((prev) => prev + 1)
    } catch (ticketError) {
      setError(ticketError?.message || 'Impossibile collegare ticket alla email.')
    } finally {
      setTicketLinking(false)
    }
  }

  // Crea un nuovo ticket da questa email e lo collega immediatamente.
  const handleCreateAndLinkTicket = async () => {
    if (!canWriteMessages || !canCreateTicket) {
      setError('Non hai i permessi per creare ticket dal CRM.')
      return
    }
    const title = String(newTicketTitle || '').trim()
    if (!title) {
      setError('Inserisci il titolo del ticket.')
      return
    }

    const sectionType = String(newTicketSectionType || '').trim()
    const numericSectionId = sectionType !== '' ? Number(newTicketSectionId) : null
    if (
      sectionType !== '' &&
      (!Number.isInteger(numericSectionId) || Number(numericSectionId) <= 0)
    ) {
      setError('Inserisci un ID valido per la sezione gestionale selezionata.')
      return
    }

    try {
      setTicketCreating(true)
      setError(null)
      setTicketMessage(null)

      const created = await createTicket({
        token,
        body: {
          titolo: title,
          descrizione: String(newTicketDescription || '').trim(),
          priorita: String(newTicketPriority || 'media').trim() || 'media',
          stato: 'aperto',
          modulo: 'crm_plus',
          url: `/crm/email-dettaglio?id=${idEmail}`,
        },
      })
      const createdId = Number(created?.id_ticket || 0)
      if (!Number.isInteger(createdId) || createdId <= 0) {
        throw new Error('Creazione ticket non riuscita.')
      }

      await linkCrmEmailTicket({
        idEmail,
        idTicket: createdId,
        sectionType,
        sectionId: sectionType !== '' ? Number(numericSectionId) : null,
        token,
      })

      setTicketMessage(`Ticket #${createdId} creato e collegato correttamente.`)
      setNewTicketSectionType('')
      setNewTicketSectionId('')
      setReloadSeq((prev) => prev + 1)
    } catch (ticketError) {
      setError(ticketError?.message || 'Impossibile creare/collegare il ticket.')
    } finally {
      setTicketCreating(false)
    }
  }

  // Dati derivati per rendering: allegati, anagrafiche collegate, ticket collegati.
  const attachments = Array.isArray(email?.attachments) ? email.attachments.filter(Boolean) : []
  const senderAnagrafiche = uniqueSenderAnagrafiche(email)
  const allAnagrafiche = Array.isArray(email?.anagrafiche)
    ? email.anagrafiche
        .map((entry) => String(entry?.ragione_sociale || '').trim())
        .filter(Boolean)
        .filter((value, index, array) => array.indexOf(value) === index)
    : []
  const linkedTickets = Array.isArray(email?.tickets) ? email.tickets : []

  // Collega una anagrafica esistente all'email corrente.
  const handleLinkAnagrafica = async () => {
    if (!canWriteMessages) {
      setError('Non hai i permessi per collegare anagrafiche alla email.')
      return
    }
    const numericId = Number(linkAnagraficaId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Inserisci un ID anagrafica valido.')
      return
    }
    try {
      setLinking(true)
      setError(null)
      await linkCrmEmailAnagrafica({ idEmail, idAnagrafica: numericId, token })
      setLinkAnagraficaId('')
      setReloadSeq((prev) => prev + 1)
    } catch (linkError) {
      setError(linkError?.message || "Impossibile collegare l'anagrafica.")
    } finally {
      setLinking(false)
    }
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM - Dettaglio Email</h2>
          <p className="text-body-secondary mb-0">
            Visualizzazione completa del messaggio selezionato.
          </p>
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol>
          <Link to="/crm/comunicazioni">Torna a comunicazioni</Link>
        </CCol>
      </CRow>

      {error ? <CAlert color="danger">{error}</CAlert> : null}

      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              {loading ? <CSpinner size="sm" /> : email?.subject || '(senza oggetto)'}
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner />
                </div>
              ) : !email ? (
                <div className="text-body-secondary">Email non trovata.</div>
              ) : (
                <>
                  <div className="small mb-2">
                    <strong>Data:</strong> {email.date || '-'} | <strong>Mittente:</strong>{' '}
                    {email.from || '-'}
                  </div>
                  <div className="small mb-2">
                    <strong>Destinatari:</strong> {email.recipients || '-'}
                  </div>
                  <div className="small mb-2">
                    <strong>Anagrafiche collegate (mittente):</strong>{' '}
                    {senderAnagrafiche.join(' | ') || '-'}
                  </div>
                  <div className="small mb-2">
                    <strong>Tutte le anagrafiche collegate:</strong>{' '}
                    {allAnagrafiche.join(' | ') || '-'}
                  </div>
                  <div className="small mb-3">
                    <strong>Collega anagrafica (ID):</strong>
                    {!canWriteMessages ? (
                      <div className="text-body-secondary mt-2">
                        Permesso `msg.write` richiesto.
                      </div>
                    ) : (
                      <>
                        <div className="mt-2">
                          <CFormInput
                            type="text"
                            value={anagraficaSearch}
                            onChange={(event) => setAnagraficaSearch(event.target.value)}
                            placeholder="Cerca anagrafica per nome / CF / P.IVA (min 2 caratteri)"
                            disabled={linking || !canReadAnagrafiche}
                          />
                        </div>
                        {!canReadAnagrafiche ? (
                          <div className="small text-body-secondary mt-2">
                            Permesso `anag.read` richiesto per la ricerca.
                          </div>
                        ) : null}
                        {anagraficaLoading ? (
                          <div className="small text-body-secondary mt-2">
                            Ricerca anagrafica in corso...
                          </div>
                        ) : null}
                        {anagraficaResults.length > 0 ? (
                          <div
                            className="border rounded mt-2"
                            style={{ maxHeight: '180px', overflowY: 'auto' }}
                          >
                            {anagraficaResults.map((entry) => {
                              const id = Number(entry?.id_anagrafica || 0)
                              const label =
                                String(entry?.ragione_sociale || '').trim() || `Anagrafica #${id}`
                              const piva = String(entry?.piva || '').trim()
                              const cf = String(entry?.codice_fiscale || '').trim()
                              return (
                                <button
                                  key={`anag-${id}`}
                                  type="button"
                                  className="btn btn-link text-start w-100 text-decoration-none border-bottom rounded-0"
                                  onClick={() => {
                                    setLinkAnagraficaId(String(id))
                                    setAnagraficaSearch(label)
                                    setAnagraficaResults([])
                                  }}
                                >
                                  <div className="fw-semibold">{label}</div>
                                  <div className="small text-body-secondary">
                                    ID: {id}
                                    {piva ? ` | P.IVA: ${piva}` : ''}
                                    {cf ? ` | CF: ${cf}` : ''}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                        <div className="d-flex gap-2 mt-2" style={{ maxWidth: '420px' }}>
                          <CFormInput
                            type="number"
                            min={1}
                            value={linkAnagraficaId}
                            onChange={(event) => setLinkAnagraficaId(event.target.value)}
                            placeholder="Inserisci ID anagrafica"
                            disabled={linking}
                          />
                          <PermissionButton
                            permission="msg.write"
                            color="primary"
                            disabled={linking}
                            onClick={handleLinkAnagrafica}
                          >
                            {linking ? 'Salvataggio...' : 'Collega'}
                          </PermissionButton>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="small mb-3">
                    <strong>Rispondi email:</strong>
                    {!canWriteMessages ? (
                      <div className="text-body-secondary mt-2">
                        Permesso `msg.write` richiesto.
                      </div>
                    ) : (
                      <div className="mt-2 d-flex flex-column gap-2" style={{ maxWidth: '900px' }}>
                        <CFormInput
                          type="text"
                          value={replySubject}
                          onChange={(event) => setReplySubject(event.target.value)}
                          placeholder="Oggetto risposta"
                          disabled={replySending}
                        />
                        <textarea
                          className="form-control"
                          rows={openReplyByDefault ? 10 : 6}
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          placeholder="Scrivi la risposta..."
                          disabled={replySending}
                        />
                        <div>
                          <PermissionButton
                            permission="msg.write"
                            color="primary"
                            disabled={replySending}
                            onClick={handleSendReply}
                          >
                            {replySending ? 'Invio in corso...' : 'Invia risposta'}
                          </PermissionButton>
                        </div>
                      </div>
                    )}
                    {replyMessage ? <div className="text-success mt-2">{replyMessage}</div> : null}
                  </div>
                  <div className="small mb-3">
                    <strong>Ticket:</strong>
                    {linkedTickets.length === 0 ? (
                      <div className="mt-2 d-flex flex-column gap-2" style={{ maxWidth: '900px' }}>
                        {!canWriteMessages ? (
                          <div className="text-body-secondary">
                            Permesso `msg.write` richiesto per collegare ticket.
                          </div>
                        ) : (
                          <>
                            <div className="text-body-secondary">
                              Nessun ticket collegato: crea nuovo ticket.
                            </div>
                            <CFormInput
                              type="text"
                              value={newTicketTitle}
                              onChange={(event) => setNewTicketTitle(event.target.value)}
                              placeholder="Titolo ticket"
                              disabled={ticketCreating || !canCreateTicket}
                            />
                            <textarea
                              className="form-control"
                              rows={5}
                              value={newTicketDescription}
                              onChange={(event) => setNewTicketDescription(event.target.value)}
                              placeholder="Descrizione ticket"
                              disabled={ticketCreating || !canCreateTicket}
                            />
                            <div className="d-flex gap-2 flex-wrap">
                              <select
                                className="form-select"
                                value={newTicketPriority}
                                onChange={(event) => setNewTicketPriority(event.target.value)}
                                style={{ maxWidth: '180px' }}
                                disabled={ticketCreating || !canCreateTicket}
                              >
                                <option value="bassa">Priorita bassa</option>
                                <option value="media">Priorita media</option>
                                <option value="alta">Priorita alta</option>
                                <option value="critica">Priorita critica</option>
                              </select>
                              <select
                                className="form-select"
                                value={newTicketSectionType}
                                onChange={(event) => setNewTicketSectionType(event.target.value)}
                                style={{ maxWidth: '220px' }}
                                disabled={ticketCreating || !canCreateTicket}
                              >
                                <option value="">Nessuna sezione</option>
                                <option value="preventivo">Preventivo</option>
                                <option value="lavorazione">Lavorazione</option>
                                <option value="fattura">Fattura</option>
                              </select>
                              {newTicketSectionType !== '' ? (
                                <CFormInput
                                  type="number"
                                  min={1}
                                  value={newTicketSectionId}
                                  onChange={(event) => setNewTicketSectionId(event.target.value)}
                                  placeholder={`ID ${newTicketSectionType}`}
                                  style={{ maxWidth: '180px' }}
                                  disabled={ticketCreating || !canCreateTicket}
                                />
                              ) : null}
                              <PermissionButton
                                permission="bug.create"
                                color="primary"
                                disabled={ticketCreating}
                                onClick={handleCreateAndLinkTicket}
                              >
                                {ticketCreating ? 'Creazione...' : 'Crea e collega ticket'}
                              </PermissionButton>
                            </div>

                            <div className="mt-2">
                              <strong>Oppure collega ticket esistente:</strong>
                              <div className="d-flex gap-2 mt-2 flex-wrap">
                                <CFormInput
                                  type="number"
                                  min={1}
                                  value={ticketId}
                                  onChange={(event) => setTicketId(event.target.value)}
                                  placeholder="ID ticket"
                                  style={{ maxWidth: '160px' }}
                                  disabled={ticketLinking}
                                />
                                <select
                                  className="form-select"
                                  value={ticketSectionType}
                                  onChange={(event) => setTicketSectionType(event.target.value)}
                                  style={{ maxWidth: '220px' }}
                                  disabled={ticketLinking}
                                >
                                  <option value="">Nessuna sezione</option>
                                  <option value="preventivo">Preventivo</option>
                                  <option value="lavorazione">Lavorazione</option>
                                  <option value="fattura">Fattura</option>
                                </select>
                                {ticketSectionType !== '' ? (
                                  <CFormInput
                                    type="number"
                                    min={1}
                                    value={ticketSectionId}
                                    onChange={(event) => setTicketSectionId(event.target.value)}
                                    placeholder={`ID ${ticketSectionType}`}
                                    style={{ maxWidth: '180px' }}
                                    disabled={ticketLinking}
                                  />
                                ) : null}
                                <PermissionButton
                                  permission="msg.write"
                                  color="primary"
                                  disabled={ticketLinking}
                                  onClick={handleLinkTicket}
                                >
                                  {ticketLinking ? 'Collegamento...' : 'Collega ticket'}
                                </PermissionButton>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {linkedTickets.map((ticket) => {
                          const idTicket = Number(ticket?.id_ticket || 0)
                          const titolo =
                            String(ticket?.titolo || '').trim() || `Ticket #${idTicket}`
                          return canReadTickets ? (
                            <Link
                              key={`email-ticket-open-${idTicket}`}
                              to={`/tickets/dettagli?id=${idTicket}`}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Visualizza ticket #{idTicket} - {titolo}
                            </Link>
                          ) : (
                            <span
                              key={`email-ticket-open-${idTicket}`}
                              className="btn btn-outline-secondary btn-sm disabled"
                            >
                              Ticket #{idTicket} - {titolo}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {ticketMessage ? (
                      <div className="text-success mt-2">{ticketMessage}</div>
                    ) : null}
                  </div>
                  <div className="small mb-2">
                    <strong>ID messaggio:</strong> {email.message_id || '-'} | <strong>UID:</strong>{' '}
                    {email.message_uid || '-'}
                  </div>
                  <div className="small mb-2">
                    <strong>Dimensione:</strong> {formatBytes(email.size_bytes)}
                  </div>

                  <div className="small mb-3">
                    <strong>Allegati:</strong>{' '}
                    {attachments.length > 0 ? (
                      <div className="d-flex flex-column gap-2 mt-2">
                        <div>
                          <CButton
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => handleDownloadZip(attachments)}
                          >
                            Scarica ZIP allegati
                          </CButton>
                        </div>
                        <span className="d-inline-flex flex-wrap gap-2 align-items-center">
                          {attachments.map((attachmentName) => (
                            <CButton
                              key={`${idEmail}-${attachmentName}`}
                              size="sm"
                              color="light"
                              variant="outline"
                              onClick={() => handleDownloadAttachment(attachmentName)}
                            >
                              {attachmentName}
                            </CButton>
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
                        <div className="small text-body-secondary mb-1">Messaggio (HTML)</div>
                        <iframe
                          title={`email-html-detail-${email.id_email || idEmail}`}
                          sandbox=""
                          srcDoc={email.message_html}
                          style={{
                            width: '100%',
                            minHeight: '420px',
                            border: '1px solid var(--cui-border-color, #dee2e6)',
                            borderRadius: '0.25rem',
                            backgroundColor: 'white',
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <div className="small text-body-secondary mb-1">Testo messaggio</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {email.message_text || 'Testo non disponibile.'}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusEmailDetail
