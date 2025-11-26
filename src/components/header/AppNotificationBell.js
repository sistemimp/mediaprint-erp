import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
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

const AppNotificationBell = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const accountId = user?.id_account ?? user?.id ?? user?.account_id ?? null

  const [visible, setVisible] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [marking, setMarking] = useState(false)

  const isAuthenticated = Boolean(token && accountId)

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchLavorazioneNotifications({
        token,
        accountId,
        limit: 10,
      })
      setNotifications(Array.isArray(response?.items) ? response.items : [])
      setUnreadCount(Number(response?.unread) || 0)
    } catch (err) {
      console.error('Impossibile caricare le notifiche:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [token, accountId, isAuthenticated])

  const handleVisibleChange = (next) => {
    setVisible(next)
    if (next) {
      loadNotifications()
    }
  }

  const unreadItems = useMemo(
    () => notifications.filter((item) => String(item?.stato).toLowerCase() !== 'read'),
    [notifications],
  )

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
    if (item.id_lavorazione) {
      navigate(`/lavorazioni/dettaglio?id=${item.id_lavorazione}`)
    }
  }

  return (
    <CDropdown
      variant="nav-item"
      placement="bottom-end"
      visible={visible}
      onVisibleChange={handleVisibleChange}
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
        ) : notifications.length === 0 ? (
          <CDropdownItem className="text-body-secondary small py-3">
            Nessuna notifica disponibile.
          </CDropdownItem>
        ) : (
          notifications.map((item) => {
            const isUnread = String(item?.stato).toLowerCase() !== 'read'
            return (
              <CDropdownItem
                key={item.id_notifica}
                className="py-3"
                onClick={() => handleItemClick(item)}
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
                    {item.attivita_titolo ? ` • Attivita ${item.attivita_titolo}` : ''}
                  </div>
                ) : null}
              </CDropdownItem>
            )
          })
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppNotificationBell
