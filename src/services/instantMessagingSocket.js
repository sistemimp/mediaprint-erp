import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getStoredToken } from './apiClient'

const DEFAULT_IM_WS_URL = 'wss://wss.mediaprint.it/ws/im'
const DEFAULT_IM_WS_PATH = ''

const resolveSocketConfig = () => {
  const configuredUrl = import.meta.env.VITE_IM_WS_URL
  const configuredPath = import.meta.env.VITE_IM_WS_PATH
  return {
    url: (configuredUrl && configuredUrl.trim()) || DEFAULT_IM_WS_URL,
    path: (configuredPath && configuredPath.trim()) || DEFAULT_IM_WS_PATH,
  }
}

const normalizeSocketUrl = (rawUrl) => {
  if (!rawUrl) {
    return null
  }
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'ws:') {
      parsed.protocol = 'http:'
    }
    if (parsed.protocol === 'wss:') {
      parsed.protocol = 'https:'
    }
    return parsed
  } catch (_error) {
    return null
  }
}

const normalizeSocketPath = (rawPath) => {
  if (!rawPath) {
    return null
  }
  let normalized = rawPath.trim()
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }
  return normalized
}


export const useInstantMessagingSocket = ({
  url,
  path,
  token,
  enabled = true,
  onMessage,
  onThreadCreated,
  onThreadRead,
  onError,
} = {}) => {
  const [status, setStatus] = useState('idle')
  const [lastError, setLastError] = useState(null)
  const socketRef = useRef(null)
  const reconnectTimer = useRef(null)
  const shouldReconnect = useRef(true)

  const { url: resolvedUrl, path: resolvedPath } = useMemo(() => resolveSocketConfig(), [])
  const resolvedToken = useMemo(() => token || getStoredToken(), [token])

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled')
      setLastError(null)
      return undefined
    }
    const socketUrl = url || resolvedUrl
    const socketPathOverride = path || resolvedPath
    const parsedUrl = normalizeSocketUrl(socketUrl)
    if (!parsedUrl || !resolvedToken) {
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

      const rawSocketPath =
        socketPathOverride ||
        (parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname : '/ws/im')
      let socketPath = normalizeSocketPath(rawSocketPath) || '/ws/im'
      if (!socketPathOverride && socketPath !== '/socket.io' && socketPath.endsWith('/socket.io')) {
        socketPath = socketPath.slice(0, -'/socket.io'.length) || '/'
      }
      const socketBaseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`
      const socket = io(socketBaseUrl, {
        path: socketPath,
        auth: { token: resolvedToken },
        query: { token: resolvedToken },
        reconnection: false,
      })
      socketRef.current = socket

      socket.on('connect', () => {
        setStatus('connected')
      })

      socket.on('im.message', (payload) => {
        if (onMessage) {
          onMessage(payload?.data, payload?.threadId)
        }
      })

      socket.on('im.thread.created', (payload) => {
        if (onThreadCreated) {
          onThreadCreated(payload)
        }
      })

      socket.on('im.thread.read', (payload) => {
        if (onThreadRead) {
          onThreadRead(payload)
        }
      })

      socket.on('im.error', (payload) => {
        setLastError(payload?.message || 'Errore di connessione realtime.')
      })

      socket.on('connect_error', (event) => {
        setLastError('Errore di connessione realtime.')
        if (onError) {
          onError(event)
        }
        setStatus('error')
      })

      socket.on('disconnect', () => {
        socketRef.current = null
        if (!shouldReconnect.current) {
          setStatus('disconnected')
          return
        }
        scheduleReconnect()
      })

      if (socket.io) {
        socket.io.on('reconnect_attempt', () => {
          setStatus('reconnecting')
        })
      }
    }

    connectWebSocket()

    return () => {
      shouldReconnect.current = false
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      socketRef.current = null
    }
  }, [url, resolvedUrl, path, resolvedPath, resolvedToken, onMessage, onThreadCreated, onError, enabled])

  const sendEvent = useCallback((event, payload) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      throw new Error('Connessione realtime non disponibile.')
    }
    socket.emit(event, payload)
  }, [])

  const sendMessage = useCallback(
    ({ threadId, body }) => {
      sendEvent('im.message', { threadId, body })
    },
    [sendEvent],
  )

  const notifyThreadCreated = useCallback(
    ({ threadId, targetAccountId, targetAccountIds }) => {
      sendEvent('im.thread.created', {
        threadId,
        targetAccountId,
        targetAccountIds: Array.isArray(targetAccountIds) ? targetAccountIds : undefined,
      })
    },
    [sendEvent],
  )

  const notifyThreadRead = useCallback(
    ({ threadId }) => {
      const socket = socketRef.current
      if (!socket || !socket.connected) {
        return
      }
      socket.emit('im.thread.read', { threadId })
    },
    [sendEvent],
  )

  return {
    status,
    lastError,
    sendMessage,
    notifyThreadCreated,
    notifyThreadRead,
  }
}
