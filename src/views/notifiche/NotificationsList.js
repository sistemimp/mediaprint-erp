import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCallout,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from '@coreui/react'
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

const NotificationsList = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const accountId = user?.id_account ?? user?.id ?? user?.account_id ?? null
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [marking, setMarking] = useState(false)
  const [limit, setLimit] = useState(50)

  const isAuthenticated = Boolean(token && accountId)

  const loadNotifications = useCallback(
    async (nextLimit = limit) => {
      if (!isAuthenticated) {
        return
      }
      setLoading(true)
      setError(null)
      try {
        const response = await fetchLavorazioneNotifications({
          token,
          accountId,
          limit: nextLimit,
        })
        const items = Array.isArray(response?.items) ? response.items : []
        setNotifications(items)
      } catch (err) {
        console.error('Impossibile caricare le notifiche:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    },
    [token, accountId, isAuthenticated, limit],
  )

  useEffect(() => {
    loadNotifications(limit)
  }, [loadNotifications, limit])

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
    const isUnread = String(item?.stato).toLowerCase() !== 'read'
    if (isUnread && Number.isFinite(notificationId)) {
      await markNotifications([notificationId])
    }
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

  const handleLoadMore = () => {
    setLimit((prev) => prev + 50)
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <div>
          <div className="fw-semibold">Notifiche</div>
          <div className="text-body-secondary small">
            {unreadItems.length > 0 ? `${unreadItems.length} da leggere` : 'Tutte lette'}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <CButton
            color="link"
            size="sm"
            className="p-0"
            disabled={unreadItems.length === 0 || marking}
            onClick={handleMarkAll}
          >
            Segna tutte come lette
          </CButton>
          <CButton
            color="link"
            size="sm"
            className="p-0"
            disabled={loading}
            onClick={() => loadNotifications(limit)}
          >
            Aggiorna
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody className="d-flex flex-column gap-3">
        {!isAuthenticated ? (
          <CAlert color="warning" className="mb-0">
            Accedi per visualizzare le notifiche.
          </CAlert>
        ) : loading ? (
          <div className="d-flex justify-content-center py-4">
            <CSpinner size="sm" />
          </div>
        ) : error ? (
          <CAlert color="danger" className="mb-0">
            {error?.message || 'Impossibile caricare le notifiche.'}
          </CAlert>
        ) : notifications.length === 0 ? (
          <CAlert color="secondary" className="mb-0">
            Nessuna notifica disponibile.
          </CAlert>
        ) : (
          <>
            {notifications.map((item) => {
              const isUnread = String(item?.stato).toLowerCase() !== 'read'
              return (
                <CCallout
                  key={item.id_notifica}
                  color={isUnread ? 'warning' : 'secondary'}
                  className="mb-0 py-3 px-3 cursor-pointer"
                  role="button"
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
                      {item.attivita_titolo ? `  \u0007 Attivita ${item.attivita_titolo}` : ''}
                    </div>
                  ) : null}
                </CCallout>
              )
            })}
            {notifications.length >= limit ? (
              <div className="d-flex justify-content-center pt-2">
                <CButton color="secondary" variant="outline" onClick={handleLoadMore} disabled={loading}>
                  Carica altre
                </CButton>
              </div>
            ) : null}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default NotificationsList
