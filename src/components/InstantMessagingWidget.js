import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilChatBubble } from '@coreui/icons'
import { CBadge, CButton } from '@coreui/react'

import { listImThreads } from '../services/instantMessagingApi'
import InstantMessagingPanel from './InstantMessagingPanel'

const InstantMessagingWidget = () => {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  useEffect(() => {
    if (isChatPage) {
      return
    }
    refreshUnread()
    const timer = window.setInterval(refreshUnread, 30000)
    return () => window.clearInterval(timer)
  }, [isChatPage, refreshUnread])

  if (isChatPage) {
    return null
  }

  return (
    <div className="im-widget">
      <CButton color="primary" className="im-widget-button" onClick={() => setIsOpen((v) => !v)}>
        <CIcon icon={cilChatBubble} />
        {unreadCount > 0 ? (
          <CBadge color="danger" className="im-widget-badge">
            {unreadCount}
          </CBadge>
        ) : null}
      </CButton>
      {isOpen ? (
        <div className="im-widget-panel">
          <InstantMessagingPanel compact onClose={() => setIsOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}

export default InstantMessagingWidget
