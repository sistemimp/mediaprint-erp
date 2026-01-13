import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble, cilCheck, cilPaperPlane, cilPlus, cilUserPlus, cilXCircle } from '@coreui/icons'
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
  CFormSwitch,
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
  getDesktopNotificationPermission,
  getDesktopNotificationsEnabled,
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabled,
  showDesktopNotification,
} from '../services/desktopNotifications'
import {
  createImThread,
  listImAccounts,
  listImMessages,
  listImThreads,
  markImThreadRead,
  sendImMessage,
} from '../services/instantMessagingApi'
import { useInstantMessagingSocket } from '../services/instantMessagingSocket'
import BottomToast from './BottomToast'
import PermissionButton from './PermissionButton'

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

const getThreadParticipants = (thread) => {
  if (Array.isArray(thread?.participants) && thread.participants.length > 0) {
    return thread.participants
  }
  if (thread?.participant) {
    return [thread.participant]
  }
  return []
}

const formatThreadTitle = (thread) => {
  if (!thread) {
    return ''
  }
  const participants = getThreadParticipants(thread)
  if (participants.length === 0) {
    return 'Conversazione'
  }
  const names = participants.map((participant) => participant?.username || 'Account')
  if (names.length <= 2) {
    return names.join(', ')
  }
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

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
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [createError, setCreateError] = useState(null)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [desktopSupported, setDesktopSupported] = useState(() => isDesktopNotificationSupported())
  const [desktopEnabled, setDesktopEnabled] = useState(() => getDesktopNotificationsEnabled())
  const [desktopPermission, setDesktopPermission] = useState(() => getDesktopNotificationPermission())
  const messageListRef = useRef(null)
  const toastTimerRef = useRef(null)
  const notifyThreadReadRef = useRef(null)
  const wsStatusRef = useRef('idle')
  const isChatFocusedRef = useRef(false)
  const isWindowFocusedRef = useRef(true)

  const ownUserId = user?.id ?? null

  const showToast = useCallback((message) => {
    if (!message) {
      return
    }
    setToast({ open: true, message })
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 4000)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (!messageListRef.current) {
      return
    }
    const container = messageListRef.current
    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [])

  const canAutoMarkRead = useCallback(
    (threadId) => {
      if (!threadId || threadId !== activeThreadId) {
        return false
      }
      if (!isWindowFocusedRef.current) {
        return false
      }
      if (!isChatFocusedRef.current) {
        return false
      }
      return true
    },
    [activeThreadId],
  )

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

  const markThreadRead = useCallback(
    (threadId) => {
      if (!threadId) {
        return
      }
      markImThreadRead(threadId)
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
        ),
      )
      if (wsStatusRef.current === 'connected' && notifyThreadReadRef.current) {
        notifyThreadReadRef.current({ threadId })
      }
    },
    [],
  )

  const loadMessages = useCallback(
    async (threadId) => {
      if (!threadId) {
        return
      }
      setIsLoadingMessages(true)
      try {
        const data = await listImMessages({ threadId })
        setMessagesByThread((prev) => ({ ...prev, [threadId]: data }))
      } catch (_error) {
        // handled by global fetch handler
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [],
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
      const isOwn = ownUserId && message?.sender?.id === ownUserId
      appendMessage(threadId, message)
      if (threadId !== activeThreadId) {
        loadThreads()
        if (!isOwn) {
          const sender = message?.sender?.username || 'Account'
          const body = String(message?.body || '').trim()
          const preview = body.length > 90 ? `${body.slice(0, 87)}...` : body
          const shown = showDesktopNotification({
            title: `Nuovo messaggio da ${sender}`,
            body: preview,
            tag: threadId ? `im-thread-${threadId}` : undefined,
          })
          if (!shown) {
            showToast(`Nuovo messaggio da ${sender}${preview ? `: ${preview}` : ''}`)
          }
        }
      } else {
        if (canAutoMarkRead(threadId)) {
          markThreadRead(threadId)
        }
      }
    },
    [activeThreadId, appendMessage, loadThreads, ownUserId, showToast, canAutoMarkRead, markThreadRead],
  )

  const handleThreadCreated = useCallback(() => {
    loadThreads()
  }, [loadThreads])

  const handleDesktopToggle = useCallback(
    async (event) => {
      const nextValue = Boolean(event?.target?.checked)
      if (!nextValue) {
        setDesktopNotificationsEnabled(false)
        setDesktopEnabled(false)
        return
      }
      if (!isDesktopNotificationSupported()) {
        setDesktopNotificationsEnabled(false)
        setDesktopEnabled(false)
        setDesktopSupported(false)
        showToast('Notifiche Windows non supportate da questo browser.')
        return
      }
      const permission = await requestDesktopNotificationPermission()
      setDesktopPermission(permission)
      if (permission === 'granted') {
        setDesktopNotificationsEnabled(true)
        setDesktopEnabled(true)
        showToast('Notifiche Windows attivate.')
        return
      }
      setDesktopNotificationsEnabled(false)
      setDesktopEnabled(false)
      showToast('Autorizzazione notifiche non concessa dal browser.')
    },
    [showToast],
  )

  const handleThreadRead = useCallback(
    (payload) => {
      const threadId = Number(payload?.threadId)
      if (!threadId) {
        return
      }
      const readAt = payload?.readAt ? new Date(payload.readAt) : new Date()
      if (Number.isNaN(readAt.getTime())) {
        return
      }
      setMessagesByThread((prev) => {
        const existing = prev[threadId]
        if (!existing) {
          return prev
        }
        const next = existing.map((message) => {
          if (!ownUserId || message?.sender?.id !== ownUserId) {
            return message
          }
          const createdAt = new Date(message.createdAt)
          if (Number.isNaN(createdAt.getTime())) {
            return message
          }
          if (createdAt <= readAt) {
            return { ...message, isRead: true }
          }
          return message
        })
        return { ...prev, [threadId]: next }
      })
    },
    [ownUserId],
  )

  const {
    status: wsStatus,
    lastError,
    sendMessage,
    notifyThreadCreated,
    notifyThreadRead,
  } = useInstantMessagingSocket({
    token,
    onMessage: handleIncomingMessage,
    onThreadCreated: handleThreadCreated,
    onThreadRead: handleThreadRead,
  })

  useEffect(() => {
    notifyThreadReadRef.current = notifyThreadRead || null
  }, [notifyThreadRead])

  useEffect(() => {
    wsStatusRef.current = wsStatus
  }, [wsStatus])

  useEffect(() => {
    const supported = isDesktopNotificationSupported()
    setDesktopSupported(supported)
    setDesktopPermission(getDesktopNotificationPermission())
    if (!supported) {
      setDesktopNotificationsEnabled(false)
      setDesktopEnabled(false)
    }
  }, [])

  useEffect(() => {
    if (desktopEnabled && desktopPermission !== 'granted') {
      setDesktopNotificationsEnabled(false)
      setDesktopEnabled(false)
    }
  }, [desktopEnabled, desktopPermission])

  useEffect(() => {
    const handleFocus = () => {
      isWindowFocusedRef.current = true
    }
    const handleBlur = () => {
      isWindowFocusedRef.current = false
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!activeThreadId) {
      return
    }
    markThreadRead(activeThreadId)
    loadMessages(activeThreadId)
  }, [activeThreadId, loadMessages, markThreadRead])

  useEffect(() => {
    scrollToBottom()
  }, [activeThreadId, messagesByThread, scrollToBottom])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, threads],
  )
  const activeMessages = messagesByThread[activeThreadId] || []
  const activeTitle = useMemo(() => formatThreadTitle(activeThread), [activeThread])

  const handleOpenCreate = useCallback(async () => {
    setIsCreating(true)
    setCreateError(null)
    setSelectedAccountIds([])
    try {
      const data = await listImAccounts()
      setAccounts(data)
    } catch (_error) {
      setCreateError('Impossibile caricare gli account.')
    }
  }, [])

  const handleCreateThread = useCallback(async () => {
    if (!selectedAccountIds.length) {
      setCreateError('Seleziona almeno un account.')
      return
    }
    setCreateError(null)
    try {
      const result = await createImThread(selectedAccountIds.map((id) => Number(id)))
      if (result?.id) {
        await loadThreads()
        setActiveThreadId(result.id)
        setIsCreating(false)
        setSelectedAccountIds([])
        if (notifyThreadCreated && Array.isArray(result?.participants)) {
          const targetIds = result.participants
            .map((participant) => Number(participant?.id))
            .filter((id) => Number.isFinite(id) && id > 0)
          if (targetIds.length > 0) {
            notifyThreadCreated({ threadId: result.id, targetAccountIds: targetIds })
          }
        }
      }
    } catch (error) {
      setCreateError(error?.message || 'Impossibile creare la conversazione.')
    }
  }, [loadThreads, notifyThreadCreated, selectedAccountIds])

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

  const panelClass = compact ? 'im-panel im-panel-compact' : 'im-panel'

  return (
    <div
      className={panelClass}
      onFocusCapture={() => {
        isChatFocusedRef.current = true
        if (activeThreadId && canAutoMarkRead(activeThreadId)) {
          markThreadRead(activeThreadId)
        }
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget
        if (nextTarget && event.currentTarget.contains(nextTarget)) {
          return
        }
        isChatFocusedRef.current = false
      }}
    >
      <CRow className="g-3">
        <CCol xs={12} lg={4}>
          <CCard className="h-100">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Conversazioni</span>
              <div className="d-flex align-items-center gap-2">
                <PermissionButton
                  size="sm"
                  color="primary"
                  variant="outline"
                  onClick={handleOpenCreate}
                  permission="msg.create"
                >
                  <CIcon icon={compact ? cilPlus : cilUserPlus} className={compact ? '' : 'me-1'} />
                  {compact ? null : 'Nuova'}
                </PermissionButton>
                {onClose ? (
                  <CButton size="sm" color="light" variant="outline" onClick={onClose}>
                    {compact ? <CIcon icon={cilXCircle} /> : 'Chiudi'}
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
                    const participants = getThreadParticipants(thread)
                    const participantLabel =
                      participants.length > 1
                        ? `${participants.length} partecipanti`
                        : formatRoleLabel(participants[0])
                    return (
                      <CListGroupItem
                        key={thread.id}
                        as="button"
                        type="button"
                        active={isActive}
                        onClick={() => setActiveThreadId(thread.id)}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div>
                            <div className="fw-semibold">{formatThreadTitle(thread)}</div>
                            <div className="small text-body-secondary">
                              {participantLabel}
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
                        {thread.unreadCount > 0 ? (
                          <div className="small text-danger mt-1">Nuovo messaggio</div>
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
                  {activeTitle || 'Seleziona una conversazione'}
                </span>
              </div>
              <div className="d-flex align-items-center gap-3">
                <CFormSwitch
                  id={`im-desktop-notifications-${compact ? 'compact' : 'full'}`}
                  label={compact ? 'Notifiche' : 'Notifiche Windows'}
                  checked={desktopEnabled}
                  onChange={handleDesktopToggle}
                  disabled={!desktopSupported || desktopPermission === 'denied'}
                />
                <div className="small text-body-secondary text-uppercase">
                  {wsStatus === 'connected' ? 'Online' : 'Offline'}
                </div>
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
                        {isOwn ? (
                          <div className="im-message-footer">
                            <CIcon icon={cilCheck} size="sm" className="im-message-check" />
                            {message.isRead ? (
                              <CIcon icon={cilCheck} size="sm" className="im-message-check im-message-check-double" />
                            ) : null}
                          </div>
                        ) : null}
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
                      ? `Conversazione con ${activeTitle || 'account'}`
                      : 'Seleziona una conversazione per scrivere'}
                  </div>
                  <PermissionButton
                    type="submit"
                    color="primary"
                    disabled={isSending || !activeThreadId}
                    permission="msg.write"
                  >
                    {isSending ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPaperPlane} className="me-2" />}
                    Invia
                  </PermissionButton>
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
            multiple
            value={selectedAccountIds}
            onChange={(event) => {
              const selected = Array.from(event.target.selectedOptions).map((option) => option.value)
              setSelectedAccountIds(selected)
            }}
          >
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
          <PermissionButton color="primary" onClick={handleCreateThread} permission="msg.create">
            Crea
          </PermissionButton>
        </CModalFooter>
      </CModal>
      <BottomToast open={toast.open} message={toast.message} type="success" />
    </div>
  )
}

export default InstantMessagingPanel
