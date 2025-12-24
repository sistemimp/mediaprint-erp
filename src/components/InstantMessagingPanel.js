import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble, cilPaperPlane, cilUserPlus } from '@coreui/icons'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CForm,
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

import { useAuth } from '../context/AuthContext'
import {
  createImThread,
  listImAccounts,
  listImMessages,
  listImThreads,
  markImThreadRead,
  sendImMessage,
} from '../services/instantMessagingApi'
import { useInstantMessagingSocket } from '../services/instantMessagingSocket'

const formatTime = (value) => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRoleLabel = (participant) =>
  participant?.roleLabel || participant?.roleCode || participant?.accountType || 'Account'

const InstantMessagingPanel = ({ compact = false, onClose }) => {
  const { token, user } = useAuth()
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messagesByThread, setMessagesByThread] = useState({})
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [createError, setCreateError] = useState(null)
  const messageListRef = useRef(null)

  const loadThreads = useCallback(async () => {
    setIsLoadingThreads(true)
    try {
      const data = await listImThreads()
      setThreads(data)
      if (data.length > 0) {
        const stillAvailable = activeThreadId && data.some((thread) => thread.id === activeThreadId)
        if (!stillAvailable) {
          setActiveThreadId(data[0].id)
        }
      } else if (activeThreadId) {
        setActiveThreadId(null)
      }
    } catch (_error) {
      // handled by global fetch handler
    } finally {
      setIsLoadingThreads(false)
    }
  }, [activeThreadId])

  const loadMessages = useCallback(
    async (threadId) => {
      if (!threadId) {
        return
      }
      setIsLoadingMessages(true)
      try {
        const data = await listImMessages({ threadId })
        setMessagesByThread((prev) => ({ ...prev, [threadId]: data }))
        await markImThreadRead(threadId)
        loadThreads()
      } catch (_error) {
        // handled by global fetch handler
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [loadThreads],
  )

  const appendMessage = useCallback((threadId, message) => {
    if (!threadId || !message) {
      return
    }
    setMessagesByThread((prev) => {
      const existing = prev[threadId] || []
      if (existing.some((item) => item.id === message.id)) {
        return prev
      }
      return {
        ...prev,
        [threadId]: [...existing, message],
      }
    })
  }, [])

  const handleIncomingMessage = useCallback(
    (message, threadIdFromEvent) => {
      const threadId = threadIdFromEvent || message?.threadId
      if (!threadId) {
        return
      }
      appendMessage(threadId, message)
      if (threadId !== activeThreadId) {
        loadThreads()
      } else {
        markImThreadRead(threadId).then(() => loadThreads())
      }
    },
    [activeThreadId, appendMessage, loadThreads],
  )

  const handleThreadCreated = useCallback(() => {
    loadThreads()
  }, [loadThreads])

  const { status: wsStatus, lastError, sendMessage, notifyThreadCreated } = useInstantMessagingSocket({
    token,
    onMessage: handleIncomingMessage,
    onThreadCreated: handleThreadCreated,
  })

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!activeThreadId) {
      return
    }
    if (messagesByThread[activeThreadId]) {
      return
    }
    loadMessages(activeThreadId)
  }, [activeThreadId, loadMessages, messagesByThread])

  useEffect(() => {
    if (!messageListRef.current) {
      return
    }
    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [activeThreadId, messagesByThread])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, threads],
  )
  const activeMessages = messagesByThread[activeThreadId] || []

  const handleOpenCreate = useCallback(async () => {
    setIsCreating(true)
    setCreateError(null)
    setSelectedAccountId('')
    try {
      const data = await listImAccounts()
      setAccounts(data)
    } catch (_error) {
      setCreateError('Impossibile caricare gli account.')
    }
  }, [])

  const handleCreateThread = useCallback(async () => {
    if (!selectedAccountId) {
      setCreateError('Seleziona un account.')
      return
    }
    setCreateError(null)
    try {
      const result = await createImThread(Number(selectedAccountId))
      if (result?.id) {
        await loadThreads()
        setActiveThreadId(result.id)
        setIsCreating(false)
        setSelectedAccountId('')
        if (notifyThreadCreated && result?.participant?.id) {
          notifyThreadCreated({ threadId: result.id, targetAccountId: result.participant.id })
        }
      }
    } catch (error) {
      setCreateError(error?.message || 'Impossibile creare la conversazione.')
    }
  }, [loadThreads, notifyThreadCreated, selectedAccountId])

  const handleSend = useCallback(
    async (event) => {
      event.preventDefault()
      if (!activeThreadId) {
        setSendError('Seleziona una conversazione.')
        return
      }
      if (!draft.trim()) {
        setSendError('Scrivi un messaggio.')
        return
      }
      setSendError(null)
      setIsSending(true)
      try {
        if (wsStatus === 'connected') {
          sendMessage({ threadId: activeThreadId, body: draft })
        } else {
          const response = await sendImMessage({ threadId: activeThreadId, body: draft })
          if (response?.message) {
            appendMessage(activeThreadId, response.message)
          }
        }
        setDraft('')
      } catch (error) {
        setSendError(error?.message || 'Impossibile inviare il messaggio.')
      } finally {
        setIsSending(false)
      }
    },
    [activeThreadId, appendMessage, draft, sendMessage, wsStatus],
  )

  const ownUserId = user?.id ?? null
  const panelClass = compact ? 'im-panel im-panel-compact' : 'im-panel'

  return (
    <div className={panelClass}>
      <CRow className="g-3">
        <CCol xs={12} lg={4}>
          <CCard className="h-100">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Conversazioni</span>
              <div className="d-flex align-items-center gap-2">
                <CButton size="sm" color="primary" variant="outline" onClick={handleOpenCreate}>
                  <CIcon icon={cilUserPlus} className="me-1" />
                  Nuova
                </CButton>
                {onClose ? (
                  <CButton size="sm" color="light" variant="outline" onClick={onClose}>
                    Chiudi
                  </CButton>
                ) : null}
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              {isLoadingThreads ? (
                <div className="p-4 text-center text-body-secondary">
                  <CSpinner size="sm" className="me-2" />
                  Caricamento conversazioni...
                </div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-center text-body-secondary">
                  Nessuna conversazione disponibile.
                </div>
              ) : (
                <CListGroup flush>
                  {threads.map((thread) => {
                    const isActive = thread.id === activeThreadId
                    return (
                      <CListGroupItem
                        key={thread.id}
                        action
                        active={isActive}
                        role="button"
                        onClick={() => setActiveThreadId(thread.id)}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div>
                            <div className="fw-semibold">{thread.participant?.username}</div>
                            <div className="small text-body-secondary">
                              {formatRoleLabel(thread.participant)}
                            </div>
                          </div>
                          <div className="text-end">
                            {thread.lastMessage?.createdAt ? (
                              <div className="small text-body-secondary">
                                {formatTime(thread.lastMessage.createdAt)}
                              </div>
                            ) : null}
                            {thread.unreadCount > 0 ? (
                              <CBadge color="danger">{thread.unreadCount}</CBadge>
                            ) : null}
                          </div>
                        </div>
                        {thread.lastMessage?.body ? (
                          <div className="small text-body-secondary text-truncate mt-1">
                            {thread.lastMessage.body}
                          </div>
                        ) : null}
                      </CListGroupItem>
                    )
                  })}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} lg={8}>
          <CCard className="h-100">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilChatBubble} />
                <span className="fw-semibold">
                  {activeThread?.participant?.username || 'Seleziona una conversazione'}
                </span>
              </div>
              <div className="small text-body-secondary text-uppercase">
                {wsStatus === 'connected' ? 'Online' : 'Offline'}
              </div>
            </CCardHeader>
            <CCardBody className="im-messages-body">
              {(lastError || sendError) && (
                <div className="alert alert-danger small mb-3" role="alert">
                  {sendError || lastError}
                </div>
              )}
              <div className="im-messages-list" ref={messageListRef}>
                {isLoadingMessages ? (
                  <div className="text-center text-body-secondary py-4">
                    <CSpinner size="sm" className="me-2" />
                    Caricamento messaggi...
                  </div>
                ) : activeThreadId && activeMessages.length === 0 ? (
                  <div className="text-center text-body-secondary py-4">
                    Nessun messaggio in questa conversazione.
                  </div>
                ) : (
                  activeMessages.map((message) => {
                    const isOwn = ownUserId && message.sender?.id === ownUserId
                    return (
                      <div
                        key={message.id}
                        className={`im-message ${isOwn ? 'im-message-own' : 'im-message-remote'}`}
                      >
                        <div className="im-message-header">
                          <span className="fw-semibold small">
                            {message.sender?.username || 'Account'}
                          </span>
                          <span className="small text-body-secondary">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                        <div className="im-message-body">{message.body}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </CCardBody>
            <CCardFooter className="border-0 pt-0">
              <CForm onSubmit={handleSend} className="im-send-form">
                <CFormTextarea
                  className="im-input"
                  rows={2}
                  placeholder="Scrivi un messaggio..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={!activeThreadId}
                />
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div className="small text-body-secondary">
                    {activeThreadId
                      ? `Conversazione con ${activeThread?.participant?.username || 'account'}`
                      : 'Seleziona una conversazione per scrivere'}
                  </div>
                  <CButton type="submit" color="primary" disabled={isSending || !activeThreadId}>
                    {isSending ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPaperPlane} className="me-2" />}
                    Invia
                  </CButton>
                </div>
              </CForm>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={isCreating} onClose={() => setIsCreating(false)}>
        <CModalHeader closeButton>
          <div className="fw-semibold">Nuova conversazione</div>
        </CModalHeader>
        <CModalBody>
          {createError && (
            <div className="alert alert-danger small mb-3" role="alert">
              {createError}
            </div>
          )}
          <CFormSelect
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
          >
            <option value="">Seleziona un account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.username} · {formatRoleLabel(account)}
              </option>
            ))}
          </CFormSelect>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setIsCreating(false)}>
            Annulla
          </CButton>
          <CButton color="primary" onClick={handleCreateThread}>
            Crea
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default InstantMessagingPanel
