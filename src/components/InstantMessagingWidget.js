import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilChatBubble } from '@coreui/icons'
import { CBadge } from '@coreui/react'

import { useAuth } from '../context/AuthContext'
import { showDesktopNotification } from '../services/desktopNotifications'
import { listImThreads } from '../services/instantMessagingApi'
import { useInstantMessagingSocket } from '../services/instantMessagingSocket'
import BottomToast from './BottomToast'
import InstantMessagingPanel from './InstantMessagingPanel'
import PermissionButton from './PermissionButton'

const InstantMessagingWidget = ({ showLabel = false }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [toast, setToast] = useState({ open: false, message: '' })
  const toastTimerRef = useRef(null)
  const ownUserId = user?.id ?? null

  const isChatPage = useMemo(() => (location?.pathname || '').includes('/messaggi'), [location])

  const refreshUnread = useCallback(async () => {
    try {
      const threads = await listImThreads()
      const total = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0)
      setUnreadCount(total)
    } catch (_error) {
      // ignore
    }
  }, [])

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

  const handleIncomingMessage = useCallback(
    (message) => {
      if (ownUserId && message?.sender?.id === ownUserId) {
        return
      }
      refreshUnread()
      if (!isOpen) {
        const sender = message?.sender?.username || 'Account'
        const body = String(message?.body || '').trim()
        const preview = body.length > 90 ? `${body.slice(0, 87)}...` : body
        const shown = showDesktopNotification({
          title: `Nuovo messaggio da ${sender}`,
          body: preview,
          tag: message?.threadId ? `im-thread-${message.threadId}` : undefined,
        })
        if (!shown) {
          showToast(`Nuovo messaggio da ${sender}${preview ? `: ${preview}` : ''}`)
        }
      }
    },
    [isOpen, ownUserId, refreshUnread, showToast],
  )

  useInstantMessagingSocket({
    enabled: !isChatPage,
    onMessage: handleIncomingMessage,
  })

  useEffect(() => {
    if (isChatPage) {
      return
    }
    refreshUnread()
    const timer = window.setInterval(refreshUnread, 30000)
    return () => window.clearInterval(timer)
  }, [isChatPage, refreshUnread])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  if (isChatPage) {
    return null
  }

  return (
    <div className="im-widget">
      <PermissionButton
        color="primary"
        className="im-widget-button"
        onClick={() => setIsOpen((v) => !v)}
        permission="msg.read"
      >
        <CIcon icon={cilChatBubble} />
        {showLabel ? <span className="im-widget-label">Messaggi</span> : null}
        {unreadCount > 0 ? (
          <CBadge color="danger" className="im-widget-badge">
            {unreadCount}
          </CBadge>
        ) : null}
      </PermissionButton>
      {isOpen ? (
        <div className="im-widget-panel">
          <InstantMessagingPanel compact onClose={() => setIsOpen(false)} />
        </div>
      ) : null}
      <BottomToast open={toast.open} message={toast.message} type="success" />
    </div>
  )
}

export default InstantMessagingWidget
