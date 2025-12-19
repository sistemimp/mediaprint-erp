import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createChatWebSocket,
  DEFAULT_CHAT_CONVERSATION_ID,
  INTERNAL_CHAT_WS_URL,
} from './chatServer'

export const DEFAULT_CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL || INTERNAL_CHAT_WS_URL
const MAX_MESSAGE_HISTORY = 250

const getSenderName = (sender) =>
  sender?.displayName ||
  sender?.nome ||
  sender?.name ||
  sender?.username ||
  sender?.ragione_sociale ||
  sender?.label ||
  sender?.title ||
  'Utente'

const getSenderId = (sender) =>
  sender?.id ?? sender?.user_id ?? sender?.codice ?? sender?.id_anagrafica ?? null

const buildAttachmentUrl = (attachment) => {
  if (!attachment) {
    return null
  }

  if (attachment.url) {
    return attachment.url
  }

  const base64Content = attachment.content ?? attachment.data ?? attachment.fileContent
  const type = attachment.type ?? attachment.contentType ?? attachment.mimeType

  if (base64Content) {
    const mime = type || 'application/octet-stream'
    return `data:${mime};base64,${base64Content}`
  }

  return null
}

const normalizeAttachment = (attachment) => {
  if (!attachment) {
    return null
  }

  const url = buildAttachmentUrl(attachment)
  return {
    name: attachment.name || attachment.filename || attachment.label || 'Allegato',
    size: attachment.size,
    type: attachment.type || attachment.contentType || attachment.mimeType,
    url,
    raw: attachment,
  }
}

const normalizeSender = (rawSender) => {
  if (!rawSender) {
    return {
      id: null,
      name: 'Utente',
    }
  }

  return {
    id: getSenderId(rawSender),
    name: getSenderName(rawSender),
  }
}

const normalizeMessage = (payload) => {
  const source = payload?.data ?? payload
  if (!source) {
    return null
  }

  const senderSource = source.sender ?? source.user ?? source.utente ?? null
  const attachmentSource = source.attachment ?? source.file ?? source.allegato ?? null

  const normalized = {
    id:
      source.id ??
      source.messageId ??
      source._id ??
      source.uid ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: source.text ?? source.body ?? source.message ?? '',
    createdAt: source.createdAt ?? source.timestamp ?? source.sentAt ?? new Date().toISOString(),
    sender: normalizeSender(senderSource),
    attachment: normalizeAttachment(attachmentSource),
    metadata: source.metadata ?? source.meta ?? null,
    type: source.type ?? payload?.type ?? 'message',
    conversationId:
      source.conversationId ??
      source.metadata?.conversationId ??
      DEFAULT_CHAT_CONVERSATION_ID,
    conversationLabel: source.conversationLabel ?? null,
    conversationCategory: source.conversationCategory ?? null,
  }

  return normalized
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      return resolve(null)
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        reject(new Error('Formato file non riconosciuto'))
        return
      }

      const commaIndex = dataUrl.indexOf(',')
      resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl)
    }

    reader.onerror = () => reject(new Error('Impossibile leggere l’allegato'))
    reader.readAsDataURL(file)
  })

export const useChatWebSocket = ({ url = DEFAULT_CHAT_WS_URL, token, user }) => {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [lastError, setLastError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const shouldReconnect = useRef(true)

  const userId = useMemo(() => (user ? getSenderId(user) : null), [user])
  const userName = useMemo(() => (user ? getSenderName(user) : 'Utente'), [user])

  const appendMessage = useCallback((message) => {
    if (!message) {
      return
    }

    setMessages((previous) => {
      if (previous.some((item) => item.id === message.id)) {
        return previous
      }

      const next = [...previous, message]
      if (next.length > MAX_MESSAGE_HISTORY) {
        next.splice(0, next.length - MAX_MESSAGE_HISTORY)
      }

      return next
    })
  }, [])

  const handleRawMessage = useCallback(
    (raw) => {
      if (!raw) {
        return
      }

      const envelope = raw?.data ?? raw
      if (!envelope) {
        return
      }

      const pushMessage = (item) => {
        const normalized = normalizeMessage(item)
        appendMessage(normalized)
      }

      if (Array.isArray(envelope)) {
        envelope.forEach(pushMessage)
        return
      }

      if (Array.isArray(envelope.items)) {
        envelope.items.forEach(pushMessage)
        return
      }

      if (Array.isArray(envelope.history)) {
        envelope.history.forEach(pushMessage)
        return
      }

      pushMessage(envelope)
    },
    [appendMessage],
  )

  useEffect(() => {
    if (!url) {
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
      reconnectTimer.current = window.setTimeout(connectWebSocket, 3000)
    }

    function connectWebSocket() {
      if (!shouldReconnect.current) {
        return
      }

      setStatus('connecting')
      setLastError(null)
      const socket = createChatWebSocket(url)
      wsRef.current = socket

      socket.addEventListener('open', () => {
        setStatus('connected')
        if (token || userId || userName) {
          const authPacket = {
            type: 'auth',
            data: {
              token,
              userId,
              userName,
            },
          }

          try {
            socket.send(JSON.stringify(authPacket))
          } catch (sendError) {
            console.error('Errore invio handshake WebSocket:', sendError)
          }
        }
      })

      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data)
          handleRawMessage(payload)
        } catch (payloadError) {
          console.error('Impossibile decodificare messaggio chat:', payloadError)
        }
      })

      socket.addEventListener('error', (event) => {
        console.error('WebSocket chat error', event)
        setLastError('Errore di connessione alla live chat.')
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
  }, [url, token, userId, userName, handleRawMessage])

  const sendMessage = useCallback(
    async ({ text = '', attachmentFile = null, conversationId = DEFAULT_CHAT_CONVERSATION_ID }) => {
      const trimmedText = text?.trim() ?? ''
      if (!trimmedText && !attachmentFile) {
        throw new Error('Inserisci un testo o allega un documento.')
      }

      const socket = wsRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('Live chat non disponibile, riprova tra qualche secondo.')
      }

      const payload = {
        type: 'chat.message',
        data: {
          text: trimmedText,
          sender: {
            id: userId,
            name: userName,
          },
          conversationId,
          metadata: {
            clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            conversationId,
          },
        },
      }

      if (attachmentFile) {
        const base64Content = await toBase64(attachmentFile)
        if (base64Content) {
          payload.data.attachment = {
            name: attachmentFile.name,
            type: attachmentFile.type,
            size: attachmentFile.size,
            content: base64Content,
          }
        }
      }

      socket.send(JSON.stringify(payload))
    },
    [userId, userName],
  )

  return {
    messages,
    status,
    lastError,
    sendMessage,
  }
}

export default useChatWebSocket
