import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CBadge, CNavItem, CNavLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPaperPlane } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { listImThreads } from '../../services/instantMessagingApi'
import { useInstantMessagingSocket } from '../../services/instantMessagingSocket'

const ChatNotificationBell = () => {
  const location = useLocation()
  const { token, user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const refreshTimerRef = useRef(null)

  const isChatPage = useMemo(() => (location?.pathname || '').includes('/messaggi'), [location])
  const isAuthenticated = Boolean(token && (user?.id || user?.id_account || user?.account_id))

  const refreshUnread = useCallback(async () => {
    try {
      const threads = await listImThreads()
      const total = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0)
      setUnreadCount(total)
    } catch (_error) {
      // ignore
    }
  }, [])

  const handleIncomingMessage = useCallback(() => {
    refreshUnread()
  }, [refreshUnread])

  useInstantMessagingSocket({
    enabled: isAuthenticated && !isChatPage,
    onMessage: handleIncomingMessage,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return undefined
    }
    refreshUnread()
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current)
    }
    refreshTimerRef.current = window.setInterval(refreshUnread, 30000)
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
      }
    }
  }, [isAuthenticated, refreshUnread])

  if (!isAuthenticated) {
    return null
  }

  return (
    <CNavItem className="position-relative">
      <CNavLink as={NavLink} to="/messaggi" className="position-relative">
        <CIcon icon={cilPaperPlane} size="lg" />
        {unreadCount > 0 ? (
          <CBadge
            color="danger"
            shape="rounded-pill"
            className="position-absolute top-0 start-100 translate-middle"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </CBadge>
        ) : null}
      </CNavLink>
    </CNavItem>
  )
}

export default ChatNotificationBell
