import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilPaperclip, cilSend } from '@coreui/icons'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CRow,
  CSpinner,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import BottomToast from '../../components/BottomToast'
import {
  CONVERSATION_CHANGE_EVENT,
  DEFAULT_CHAT_CONVERSATION_ID,
  createCustomConversation,
  getAvailableConversations,
} from '../../services/chatServer'
import useChatWebSocket, { DEFAULT_CHAT_WS_URL } from '../../services/chatSocket'

const formatTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CONVERSATION_CATEGORY_BADGES = {
  'operator-only': { label: 'Operatori', color: 'primary' },
  'operator-client': { label: 'Operatori + clienti', color: 'success' },
  'operator-group': { label: 'Gruppo', color: 'info' },
}

const CONVERSATION_CATEGORY_OPTIONS = Object.entries(CONVERSATION_CATEGORY_BADGES).map(
  ([value, { label }]) => ({
    value,
    label,
  }),
)

const NEW_CONVERSATION_TEMPLATE = {
  label: '',
  description: '',
  category: 'operator-only',
  participants: '',
}

const ChatRoom = () => {
  const { user, token } = useAuth()
  const [draft, setDraft] = useState('')
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const attachmentInputRef = useRef(null)
  const messageListRef = useRef(null)
  const wsUrl = DEFAULT_CHAT_WS_URL
  const { messages, status, lastError, sendMessage } = useChatWebSocket({
    url: wsUrl,
    token,
    user,
  })
  const [activeConversationId, setActiveConversationId] = useState(DEFAULT_CHAT_CONVERSATION_ID)
  const [conversations, setConversations] = useState(() => getAvailableConversations())
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [creationError, setCreationError] = useState(null)
  const [creationLoading, setCreationLoading] = useState(false)
  const [newConversationForm, setNewConversationForm] = useState(() => ({
    ...NEW_CONVERSATION_TEMPLATE,
  }))
  const [notificationToast, setNotificationToast] = useState({
    open: false,
    message: '',
    type: 'info',
  })
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'denied'
    }
    return Notification.permission
  })
  const notificationPermissionRequested = useRef(false)
  const latestRemoteMessageRef = useRef(null)
  const filteredMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          (message.conversationId ?? DEFAULT_CHAT_CONVERSATION_ID) === activeConversationId,
      ),
    [activeConversationId, messages],
  )
  const activeConversationMeta = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      conversations[0],
    [activeConversationId, conversations],
  )
  useEffect(() => {
    const handleConversationUpdate = () => {
      setConversations(getAvailableConversations())
    }
    window.addEventListener(CONVERSATION_CHANGE_EVENT, handleConversationUpdate)
    return () => {
      window.removeEventListener(CONVERSATION_CHANGE_EVENT, handleConversationUpdate)
    }
  }, [])

  const showNotificationToast = useCallback((message, type = 'info') => {
    setNotificationToast({
      open: true,
      message,
      type,
    })
  }, [])

  const triggerBrowserNotification = useCallback(
    (title, body) => {
      if (typeof window === 'undefined' || typeof Notification === 'undefined') {
        return
      }
      if (notificationPermission !== 'granted') {
        return
      }
      try {
        new Notification(title, { body })
      } catch (error) {
        console.error('Impossibile mostrare notifiche Web:', error)
      }
    },
    [notificationPermission],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return
    }
    if (notificationPermissionRequested.current) {
      setNotificationPermission(Notification.permission)
      return
    }
    if (Notification.permission === 'default') {
      notificationPermissionRequested.current = true
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission)
      })
    } else {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [filteredMessages])

  useEffect(() => {
    if (!notificationToast.open) {
      return
    }
    const timer = window.setTimeout(() => {
      setNotificationToast((previous) => ({ ...previous, open: false }))
    }, 4200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [notificationToast.open])

  const handleAttachmentChange = useCallback((event) => {
    const file = event.target.files?.[0] ?? null
    setAttachmentFile(file)
  }, [])

  const resetAttachmentInput = useCallback(() => {
    setAttachmentFile(null)
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }, [])

  const updateNewConversationField = useCallback((field, value) => {
    setNewConversationForm((previous) => ({ ...previous, [field]: value }))
  }, [])

  const resetNewConversationForm = useCallback(() => {
    setNewConversationForm({ ...NEW_CONVERSATION_TEMPLATE })
  }, [])

  const handleCreateConversation = useCallback(() => {
    if (creationLoading) {
      return
    }
    setCreationError(null)
    const { label, description, category, participants } = newConversationForm
    setCreationLoading(true)
    try {
      const participantList = (participants ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      const conversation = createCustomConversation({
        label,
        description,
        category,
        participants: participantList,
      })
      setActiveConversationId(conversation.id)
      resetNewConversationForm()
      setIsCreatingConversation(false)
      showNotificationToast(`Conversazione "${conversation.label}" creata`, 'success')
    } catch (error) {
      setCreationError(error?.message || 'Impossibile creare la conversazione.')
    } finally {
      setCreationLoading(false)
    }
  }, [
    creationLoading,
    newConversationForm,
    resetNewConversationForm,
    showNotificationToast,
  ])

  const handleCloseConversationModal = useCallback(() => {
    setIsCreatingConversation(false)
    setCreationError(null)
    resetNewConversationForm()
  }, [resetNewConversationForm])

  const canSend = useMemo(() => status === 'connected', [status])

  const handleSend = useCallback(
    async (event) => {
      event.preventDefault()
      if (!draft.trim() && !attachmentFile) {
        setSendError('Inserisci almeno un testo o un allegato.')
        return
      }

      if (!canSend) {
        setSendError('Connessione live chat non pronta, attendi qualche secondo.')
        return
      }

      setIsSending(true)
      try {
        await sendMessage({
          text: draft,
          attachmentFile,
          conversationId: activeConversationId,
        })
        setDraft('')
        setSendError(null)
        resetAttachmentInput()
      } catch (error) {
        setSendError(error?.message || 'Impossibile inviare il messaggio.')
      } finally {
        setIsSending(false)
      }
    },
    [activeConversationId, attachmentFile, canSend, draft, resetAttachmentInput, sendMessage],
  )

  const statusBadge = useMemo(() => {
    switch (status) {
      case 'connecting':
        return { label: 'Connessione...', color: 'warning' }
      case 'connected':
        return { label: 'Online', color: 'success' }
      case 'reconnecting':
        return { label: 'Riconnessione', color: 'warning' }
      case 'error':
        return { label: 'Errore', color: 'danger' }
      case 'disconnected':
        return { label: 'Disconnesso', color: 'secondary' }
      case 'idle':
      case 'disabled':
      default:
        return { label: 'Non disponibile', color: 'secondary' }
    }
  }, [status])

  const ownUserId = user?.id ?? user?.user_id ?? user?.id_anagrafica ?? null

  useEffect(() => {
    if (!messages.length) {
      return
    }
    const latest = messages[messages.length - 1]
    if (latestRemoteMessageRef.current?.id === latest.id) {
      return
    }
    latestRemoteMessageRef.current = latest
    if (latest.sender?.id && latest.sender.id === ownUserId) {
      return
    }
    if (latest.conversationId === activeConversationId) {
      return
    }
    const conversation = conversations.find((conversationItem) => conversationItem.id === latest.conversationId)
    const label = conversation?.label ?? 'conversazione'
    const body = `Nuovo messaggio in "${label}".`
    showNotificationToast(body, 'info')
    triggerBrowserNotification('Nuovo messaggio in chat', body)
  }, [
    activeConversationId,
    conversations,
    messages,
    ownUserId,
    showNotificationToast,
    triggerBrowserNotification,
  ])

  return (
    <CContainer fluid className="py-4">
      <CRow className="g-4">
        <CCol xs={12} xl={4}>
          <CCard className="h-100 conversation-card">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Conversazioni disponibili</span>
              <CButton size="sm" color="primary" onClick={() => setIsCreatingConversation(true)}>
                Nuova chat
              </CButton>
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                {conversations.map((conversation) => {
                  const badge = CONVERSATION_CATEGORY_BADGES[conversation.category] ?? {
                    label: 'Chat',
                    color: 'secondary',
                  }
                  const isActive = conversation.id === activeConversationId
                  return (
                    <CListGroupItem
                      key={conversation.id}
                      action
                      active={isActive}
                      className="border-0 rounded-0 px-3 py-3"
                      onClick={() => setActiveConversationId(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setActiveConversationId(conversation.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fw-semibold">{conversation.label}</span>
                        <CBadge color={badge.color}>{badge.label}</CBadge>
                      </div>
                      <span className="small text-body-secondary">{conversation.description}</span>
                      {conversation.participants?.length ? (
                        <span className="small text-body-secondary d-block mt-1">
                          Partecipanti: {conversation.participants.join(', ')}
                        </span>
                      ) : null}
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} xl={8}>
          <CCard className="chat-card h-100">
            <CCardHeader className="d-flex align-items-start justify-content-between flex-wrap gap-2">
              <div>
                <div className="fw-semibold">
                  {activeConversationMeta
                    ? `Live chat · ${activeConversationMeta.label}`
                    : 'Live chat'}
                </div>
                <small className="text-body-secondary">
                  {activeConversationMeta?.description ||
                    'Ricevi messaggi e allegati in tempo reale.'}
                </small>
              </div>
              <CBadge color={statusBadge.color}>{statusBadge.label}</CBadge>
            </CCardHeader>
            <CCardBody className="chat-card-body">
              {(lastError || sendError) && (
                <div className="alert alert-danger mb-3 small" role="alert">
                  {sendError || lastError}
                </div>
              )}
              <div className="chat-messages-list" ref={messageListRef}>
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-body-secondary py-5">
                    Nessun messaggio per la conversazione "{activeConversationMeta?.label}".
                    I nuovi messaggi appariranno qui in tempo reale.
                  </div>
                ) : (
                  filteredMessages.map((message) => {
                    const isOwn = Boolean(ownUserId && message.sender?.id && message.sender.id === ownUserId)
                    return (
                      <div
                        key={message.id}
                        className={`chat-message ${isOwn ? 'chat-message-own' : 'chat-message-remote'}`}
                      >
                        <div className="chat-message-header">
                          <span className="fw-semibold small">{message.sender?.name || 'Utente'}</span>
                          <span className="chat-message-time text-body-secondary">{formatTime(message.createdAt)}</span>
                        </div>
                        <div className="chat-message-body">
                          {message.text ? <p className="mb-2">{message.text}</p> : null}
                          {message.attachment?.url ? (
                            <div className="chat-message-attachment">
                              {message.attachment.type?.startsWith('image/') ? (
                                <img
                                  className="chat-attachment-preview"
                                  src={message.attachment.url}
                                  alt={message.attachment.name}
                                />
                              ) : null}
                              <a
                                href={message.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                download={message.attachment.name}
                                className="d-flex align-items-center chat-attachment-link"
                              >
                                <CIcon icon={cilPaperclip} className="me-2" />
                                <span className="text-truncate">{message.attachment.name}</span>
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CCardBody>
            <CCardFooter className="border-0 pt-0">
              <CForm className="chat-send-form" onSubmit={handleSend}>
                <CFormTextarea
                  className="chat-input"
                  rows={3}
                  placeholder="Scrivi un messaggio..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="chat-send-actions align-items-center">
                  <label className="chat-attachment-label">
                    <CIcon icon={cilPaperclip} className="me-1" />
                    Allegato
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      className="d-none"
                      onChange={handleAttachmentChange}
                    />
                  </label>
                  <div className="chat-attachment-info text-body-secondary small">
                    {attachmentFile ? `${attachmentFile.name} (${(attachmentFile.size / 1024).toFixed(1)} KB)` : 'Nessun allegato selezionato'}
                  </div>
                  <CButton color="primary" type="submit" disabled={isSending || !canSend}>
                    {isSending ? (
                      <CSpinner size="sm" />
                    ) : (
                      <>
                        <CIcon icon={cilSend} className="me-1" />
                        Invia
                      </>
                    )}
                  </CButton>
                  {!canSend && (
                    <div className="chat-connection-hint text-body-secondary small">
                      Connessione non pronta ({statusBadge.label.toLowerCase()}); riprova appena tornerà online.
                    </div>
                  )}
                </div>
              </CForm>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>
      <CModal visible={isCreatingConversation} onClose={handleCloseConversationModal}>
        <CModalHeader closeButton>
          <div className="fw-semibold">Nuova conversazione</div>
        </CModalHeader>
        <CModalBody>
          {creationError && (
            <div className="alert alert-danger small mb-3" role="alert">
              {creationError}
            </div>
          )}
          <CForm className="d-grid gap-3">
            <div>
              <CFormLabel htmlFor="chat-conversation-label">Nome conversazione</CFormLabel>
              <CFormInput
                id="chat-conversation-label"
                placeholder="Es. Team Operazioni"
                value={newConversationForm.label}
                onChange={(event) => updateNewConversationField('label', event.target.value)}
              />
            </div>
            <div>
              <CFormLabel htmlFor="chat-conversation-description">Descrizione</CFormLabel>
              <CFormTextarea
                id="chat-conversation-description"
                rows={2}
                placeholder="Descrivi lo scopo della chat"
                value={newConversationForm.description}
                onChange={(event) => updateNewConversationField('description', event.target.value)}
              />
            </div>
            <div>
              <CFormLabel htmlFor="chat-conversation-category">Categoria</CFormLabel>
              <CFormSelect
                id="chat-conversation-category"
                value={newConversationForm.category}
                onChange={(event) => updateNewConversationField('category', event.target.value)}
              >
                {CONVERSATION_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
            <div>
              <CFormLabel htmlFor="chat-conversation-participants">Partecipanti</CFormLabel>
              <CFormInput
                id="chat-conversation-participants"
                placeholder="Inserisci nomi separati da virgola"
                value={newConversationForm.participants}
                onChange={(event) => updateNewConversationField('participants', event.target.value)}
              />
              <small className="text-body-secondary">
                I nomi servono solo per identificare i partecipanti, non viene inviato alcun invito reale.
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={handleCloseConversationModal}>
            Annulla
          </CButton>
          <CButton color="primary" onClick={handleCreateConversation} disabled={creationLoading}>
            {creationLoading ? <CSpinner size="sm" className="me-2" /> : null}
            Crea conversazione
          </CButton>
        </CModalFooter>
      </CModal>
      <BottomToast {...notificationToast} />
    </CContainer>
  )
}

export default ChatRoom
