import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCallout,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { showDesktopNotification } from '../../services/desktopNotifications'
import { useInstantMessagingSocket } from '../../services/instantMessagingSocket'
import {
  fetchLavorazioneNotifications,
  markLavorazioneNotificationsRead,
} from '../../services/lavorazioni'

const formatDateTime = (value) => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

const parsePayload = (value) => {
  if (!value) {
    return null
  }
  if (typeof value === 'object') {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  try {
    return JSON.parse(value)
  } catch (_error) {
    return null
  }
}

const AppNotificationBell = ({ limit = 10 }) => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const accountId = user?.id_account ?? user?.id ?? user?.account_id ?? null
  const initialLoadRef = useRef(true)
  const notifiedIdsRef = useRef(new Set())

  const [visible, setVisible] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [marking, setMarking] = useState(false)

  const isAuthenticated = Boolean(token && accountId)

  const loadNotifications = useCallback(async (notify = false) => {
    if (!isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchLavorazioneNotifications({
        token,
        accountId,
        limit: Math.max(20, limit),
        onlyUnread: notify,
      })
      const items = Array.isArray(response?.items) ? response.items : []
      setNotifications(items)
      setUnreadCount(Number(response?.unread) || 0)
      if (notify) {
        const freshIds = new Set(
          items
            .map((item) => Number(item?.id_notifica))
            .filter((value) => Number.isFinite(value) && value > 0),
        )
        if (initialLoadRef.current) {
          initialLoadRef.current = false
          notifiedIdsRef.current = freshIds
          return
        }
        items.forEach((item) => {
          const id = Number(item?.id_notifica)
          if (!Number.isFinite(id) || id <= 0 || notifiedIdsRef.current.has(id)) {
            return
          }
          const title = item?.titolo || 'Nuova notifica'
          const body = item?.messaggio || ''
          const shown = showDesktopNotification({
            title,
            body,
            tag: `notif-${id}`,
          })
          if (shown) {
            notifiedIdsRef.current.add(id)
          }
        })
        if (notifiedIdsRef.current.size > 200) {
          notifiedIdsRef.current.clear()
        }
      }
    } catch (err) {
      console.error('Impossibile caricare le notifiche:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [token, accountId, isAuthenticated, limit])

  const handleShow = () => {
    setVisible(true)
    loadNotifications()
  }

  const handleHide = () => {
    setVisible(false)
  }

  const unreadItems = useMemo(
    () => notifications.filter((item) => String(item?.stato).toLowerCase() !== 'read'),
    [notifications],
  )

  const visibleNotifications = useMemo(() => notifications.slice(0, limit), [notifications, limit])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }
    loadNotifications(true)
  }, [isAuthenticated, loadNotifications])

  useInstantMessagingSocket({
    token,
    enabled: isAuthenticated,
    onNotification: () => {
      loadNotifications(true)
    },
  })

  const markNotifications = useCallback(
    async (ids) => {
      if (!isAuthenticated || !Array.isArray(ids) || ids.length === 0) {
        return
      }
      setMarking(true)
      try {
        await markLavorazioneNotificationsRead({
          token,
          accountId,
          notificationIds: ids,
        })
        setNotifications((prev) =>
          prev.map((item) =>
            ids.includes(Number(item?.id_notifica))
              ? { ...item, stato: 'read', read_at: new Date().toISOString() }
              : item,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - ids.length))
      } catch (err) {
        console.error('Impossibile aggiornare le notifiche:', err)
        setError(err)
      } finally {
        setMarking(false)
      }
    },
    [token, accountId, isAuthenticated],
  )

  const handleMarkAll = () => {
    if (unreadItems.length === 0) {
      return
    }
    const ids = unreadItems
      .map((item) => Number(item?.id_notifica))
      .filter((value) => Number.isFinite(value) && value > 0)
    markNotifications(ids)
  }

  const handleItemClick = async (item) => {
    if (!item) return
    const notificationId = Number(item.id_notifica)
    if (Number.isFinite(notificationId)) {
      await markNotifications([notificationId])
    }
    setVisible(false)
    const payload = parsePayload(item.payload)
    const directRoute = payload?.route
    if (typeof directRoute === 'string' && directRoute.trim() !== '') {
      navigate(directRoute)
      return
    }
    if (payload?.entity === 'preventivo' && payload?.id_preventivo) {
      navigate(`/preventivi/dettagli?id=${payload.id_preventivo}`)
      return
    }
    if (payload?.entity === 'fattura' && payload?.id_fattura) {
      navigate(`/fatture/dettagli?id=${payload.id_fattura}`)
      return
    }
    if (item.id_lavorazione) {
      navigate(`/lavorazioni/dettaglio?id=${item.id_lavorazione}`)
    }
  }

  return (
    <CDropdown
      variant="nav-item"
      placement="bottom-end"
      visible={visible}
      onShow={handleShow}
      onHide={handleHide}
    >
      <CDropdownToggle caret={false} className="position-relative" disabled={!isAuthenticated}>
        <CIcon icon={cilBell} size="lg" />
        {unreadCount > 0 ? (
          <CBadge
            color="danger"
            shape="rounded-pill"
            className="position-absolute top-0 start-100 translate-middle"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </CBadge>
        ) : null}
      </CDropdownToggle>
      <CDropdownMenu className="p-0" style={{ width: '360px' }}>
        <CDropdownHeader className="d-flex align-items-center justify-content-between">
          <span>Notifiche</span>
          <div className="d-flex align-items-center gap-2">
            <span className="text-body-secondary small">
              {unreadCount > 0 ? `${unreadCount} da leggere` : 'Tutte lette'}
            </span>
            <CButton
              color="link"
              size="sm"
              className="p-0"
              disabled={unreadItems.length === 0 || marking}
              onClick={handleMarkAll}
            >
              Segna tutte come lette
            </CButton>
          </div>
        </CDropdownHeader>
        <CDropdownDivider className="my-0" />
        {!isAuthenticated ? (
          <CDropdownItem className="text-body-secondary small text-center py-4">
            Accedi per visualizzare le notifiche.
          </CDropdownItem>
        ) : loading ? (
          <div className="d-flex justify-content-center py-4">
            <CSpinner size="sm" />
          </div>
        ) : error ? (
          <CDropdownItem className="text-danger small py-3">
            {error?.message || 'Impossibile caricare le notifiche.'}
          </CDropdownItem>
        ) : visibleNotifications.length === 0 ? (
          <CDropdownItem className="text-body-secondary small py-3">
            Nessuna notifica disponibile.
          </CDropdownItem>
        ) : (
          visibleNotifications.map((item) => {
            const isUnread = String(item?.stato).toLowerCase() !== 'read'
            return (
              <CDropdownItem
                key={item.id_notifica}
                className="p-0"
                onClick={() => handleItemClick(item)}
              >
                <CCallout
                  color={isUnread ? 'warning' : 'secondary'}
                  className="m-0 py-3 px-3"
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-semibold">{item.titolo || 'Notifica'}</div>
                      <div className="text-body-secondary small">{item.messaggio || '-'}</div>
                      <div className="text-body-tertiary small mt-1">
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                    {isUnread ? <CBadge color="primary">New</CBadge> : null}
                  </div>
                  {item.lavorazione_codice || item.attivita_titolo ? (
                    <div className="text-body-secondary small mt-2">
                      {item.lavorazione_codice ? `Lavorazione ${item.lavorazione_codice}` : ''}
                      {item.attivita_titolo ? `   Attivita ${item.attivita_titolo}` : ''}
                    </div>
                  ) : null}
                </CCallout>
              </CDropdownItem>
            )
          })
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppNotificationBell
