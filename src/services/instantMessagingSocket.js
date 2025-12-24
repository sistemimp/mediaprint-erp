import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStoredToken } from './apiClient'

const buildDefaultWsUrl = () => {
  if (typeof window === 'undefined') {
    return ''
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.hostname || 'localhost'
  return `${protocol}://${host}:4010/ws/im`
}

export const DEFAULT_IM_WS_URL = import.meta.env.VITE_IM_WS_URL || buildDefaultWsUrl()

export const useInstantMessagingSocket = ({
  url = DEFAULT_IM_WS_URL,
  token,
  onMessage,
  onThreadCreated,
  onError,
} = {}) => {
  const [status, setStatus] = useState('idle')
  const [lastError, setLastError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const shouldReconnect = useRef(true)

  const resolvedToken = useMemo(() => token || getStoredToken(), [token])

  useEffect(() => {
    if (!url || !resolvedToken) {
      setStatus('disabled')
      return undefined
    }

    shouldReconnect.current = true

    const scheduleReconnect = () => {
      if (!shouldReconnect.current) {
        return
      }
      setStatus('reconnecting')
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current)
      }
      reconnectTimer.current = window.setTimeout(connectWebSocket, 2500)
    }

    function connectWebSocket() {
      if (!shouldReconnect.current) {
        return
      }
      setStatus('connecting')
      setLastError(null)

      const separator = url.includes('?') ? '&' : '?'
      const wsUrl = `${url}${separator}token=${encodeURIComponent(resolvedToken)}`
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.addEventListener('open', () => {
        setStatus('connected')
      })

      socket.addEventListener('message', (event) => {
        let payload = null
        try {
          payload = JSON.parse(event.data)
        } catch (_error) {
          return
        }

        if (payload?.type === 'im.message' && onMessage) {
          onMessage(payload.data, payload.threadId)
          return
        }

        if (payload?.type === 'im.thread.created' && onThreadCreated) {
          onThreadCreated(payload.data)
          return
        }
      })

      socket.addEventListener('error', (event) => {
        setLastError('Errore di connessione realtime.')
        if (onError) {
          onError(event)
        }
        setStatus('error')
      })

      socket.addEventListener('close', () => {
        if (!shouldReconnect.current) {
          setStatus('disconnected')
          return
        }
        scheduleReconnect()
      })
    }

    connectWebSocket()

    return () => {
      shouldReconnect.current = false
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [url, resolvedToken, onMessage, onThreadCreated, onError])

  const sendEvent = useCallback((payload) => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione realtime non disponibile.')
    }
    socket.send(JSON.stringify(payload))
  }, [])

  const sendMessage = useCallback(
    ({ threadId, body }) => {
      sendEvent({ type: 'im.message', data: { threadId, body } })
    },
    [sendEvent],
  )

  const notifyThreadCreated = useCallback(
    ({ threadId, targetAccountId }) => {
      sendEvent({ type: 'im.thread.created', data: { threadId, targetAccountId } })
    },
    [sendEvent],
  )

  return {
    status,
    lastError,
    sendMessage,
    notifyThreadCreated,
  }
}
