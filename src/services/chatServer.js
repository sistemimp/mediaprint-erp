import { Server, WebSocket as MockWebSocket } from 'mock-socket'

export const CHAT_CONVERSATIONS = [
  {
    id: 'operators',
    label: 'Operatori interni',
    description: 'Chat di coordinamento tra gli operatori del team.',
    category: 'operator-only',
  },
  {
    id: 'operators-clients',
    label: 'Operatori e clienti',
    description: 'Spazio aperto per le conversazioni tra operatori e clienti.',
    category: 'operator-client',
  },
  {
    id: 'group-commerciale',
    label: 'Gruppo commerciale',
    description: 'Gruppo di operatori dedicati alle trattative commerciali.',
    category: 'operator-group',
  },
  {
    id: 'group-logistica',
    label: 'Gruppo logistica',
    description: 'Coordinamento operativo e logistica tra operatori.',
    category: 'operator-group',
  },
]

export const DEFAULT_CHAT_CONVERSATION_ID = CHAT_CONVERSATIONS[0]?.id ?? 'operators'
export const INTERNAL_CHAT_WS_URL = 'ws://mediaprint.local/ws/chat'
export const CONVERSATION_CHANGE_EVENT = 'mediaprint-chat-conversations-change'
const HISTORY_STORAGE_KEY = 'mediaprint.local.chat.history'
const MAX_HISTORY = 250
const SUPPORT_REPLY_DELAY = 1200
const CUSTOM_CONVERSATIONS_KEY = 'mediaprint.local.chat.customConversations'

const supportUser = { id: 'assistant', name: 'MediaPrint Assistente' }

let messageHistoryCache = null
let serverInstance = null
let customConversationsCache = null

const readCustomConversations = () => {
  if (customConversationsCache !== null) {
    return customConversationsCache
  }

  if (typeof window === 'undefined') {
    customConversationsCache = []
    return customConversationsCache
  }

  try {
    const serialized = window.localStorage?.getItem(CUSTOM_CONVERSATIONS_KEY)
    const parsed = serialized ? JSON.parse(serialized) : []
    customConversationsCache = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Impossibile leggere conversazioni personalizzate', error)
    customConversationsCache = []
  }

  return customConversationsCache
}

const persistCustomConversations = (conversations) => {
  if (typeof window === 'undefined') {
    customConversationsCache = conversations
    return
  }

  try {
    window.localStorage?.setItem(CUSTOM_CONVERSATIONS_KEY, JSON.stringify(conversations))
  } catch (error) {
    console.error('Impossibile salvare conversazioni personalizzate', error)
  }

  customConversationsCache = conversations
}

const emitConversationChange = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(CONVERSATION_CHANGE_EVENT))
}

const getAllConversations = () => [...CHAT_CONVERSATIONS, ...readCustomConversations()]

export const getAvailableConversations = getAllConversations

export const createCustomConversation = ({
  label,
  description = '',
  category = 'operator-only',
  participants = [],
}) => {
  const trimmedLabel = (label ?? '').trim()
  if (!trimmedLabel) {
    throw new Error('Il nome della conversazione è obbligatorio.')
  }
  const conversation = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: trimmedLabel,
    description: (description ?? '').trim(),
    category,
    participants: Array.isArray(participants)
      ? participants.map((participant) => participant?.trim()).filter(Boolean)
      : [],
    custom: true,
  }
  const next = [...readCustomConversations(), conversation]
  persistCustomConversations(next)
  emitConversationChange()
  return conversation
}

const getConversationById = (id) =>
  getAllConversations().find((conversation) => conversation.id === id) ?? null

const getConversationIdFromPayload = (payload) =>
  payload?.conversationId ??
  payload?.metadata?.conversationId ??
  payload?.conversation?.id ??
  DEFAULT_CHAT_CONVERSATION_ID

const readStoredHistory = () => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const serialized = window.localStorage?.getItem(HISTORY_STORAGE_KEY)
    if (!serialized) {
      return []
    }
    const parsed = JSON.parse(serialized)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Impossibile leggere cronologia chat dal localStorage', error)
    return []
  }
}

const persistHistory = (messages) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.error('Impossibile salvare cronologia chat nel localStorage', error)
  }
}

const getHistory = () => {
  if (messageHistoryCache === null) {
    messageHistoryCache = readStoredHistory()
  }
  return messageHistoryCache
}

const pushHistory = (message) => {
  const history = [...getHistory(), message]
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY)
  }
  messageHistoryCache = history
  persistHistory(history)
  return history
}

const broadcastMessage = (message) => {
  if (!serverInstance) {
    return
  }
  const envelope = { data: message }
  const serialized = JSON.stringify(envelope)
  serverInstance.clients().forEach((client) => {
    client.send(serialized)
  })
}

const getSenderFromAuth = (socket) => {
  if (socket?.auth?.userName && socket?.auth?.userId) {
    return {
      id: socket.auth.userId,
      name: socket.auth.userName,
    }
  }
  if (socket?.auth?.user) {
    const authUser = socket.auth.user
    return {
      id: authUser.id ?? authUser.user_id ?? authUser.codice ?? null,
      name:
        authUser.displayName ??
        authUser.nome ??
        authUser.name ??
        authUser.username ??
        authUser.ragione_sociale ??
        authUser.label ??
        authUser.title ??
        'Utente',
    }
  }
  return { id: null, name: 'Utente' }
}

const buildMessagePayload = (payload, socket) => {
  const conversationId = getConversationIdFromPayload(payload)
  const conversationMeta = getConversationById(conversationId)
  const id =
    payload?.metadata?.clientId ||
    payload?.id ||
    payload?.messageId ||
    payload?.uid ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createdAt = payload?.createdAt ?? payload?.timestamp ?? new Date().toISOString()
  const sender = payload?.sender ?? getSenderFromAuth(socket)
  return {
    id,
    text: payload?.text ?? payload?.body ?? payload?.message ?? '',
    createdAt,
    sender,
    attachment: payload?.attachment ?? payload?.file ?? payload?.allegato ?? null,
    metadata: payload?.metadata ?? null,
    type: payload?.type ?? 'message',
    conversationId,
    conversationLabel: conversationMeta?.label ?? null,
    conversationCategory: conversationMeta?.category ?? null,
  }
}

const scheduleSupportReply = (userMessage) => {
  if (userMessage.sender?.id === supportUser.id) {
    return
  }
  const conversationId = userMessage.conversationId ?? DEFAULT_CHAT_CONVERSATION_ID
  const conversationMeta = getConversationById(conversationId)
  setTimeout(() => {
    const reply = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: 'Grazie per il messaggio! Ti risponderemo al più presto.',
      createdAt: new Date().toISOString(),
      sender: supportUser,
      metadata: {
        autoReplyFor: userMessage.id,
      },
      conversationId,
      conversationLabel: conversationMeta?.label ?? null,
      conversationCategory: conversationMeta?.category ?? null,
    }
    pushHistory(reply)
    broadcastMessage(reply)
  }, SUPPORT_REPLY_DELAY)
}

const handleClientMessage = (socket, rawPayload) => {
  let payload = null
  try {
    payload = JSON.parse(rawPayload)
  } catch {
    return
  }
  if (!payload) {
    return
  }

  if (payload.type === 'auth') {
    socket.auth = payload.data ?? {}
    return
  }

  const messagePayload = buildMessagePayload(payload.data ?? payload, socket)
  pushHistory(messagePayload)
  broadcastMessage(messagePayload)

  scheduleSupportReply(messagePayload)
}

const handleConnection = (socket) => {
  socket.send(JSON.stringify({ history: getHistory() }))
  socket.on('message', (raw) => handleClientMessage(socket, raw))
}

const ensureServer = () => {
  if (serverInstance) {
    return serverInstance
  }

  if (typeof window === 'undefined') {
    return null
  }

  messageHistoryCache = getHistory()
  serverInstance = new Server(INTERNAL_CHAT_WS_URL)
  serverInstance.on('connection', handleConnection)
  return serverInstance
}

export const createChatWebSocket = (url) => {
  if (url === INTERNAL_CHAT_WS_URL) {
    ensureServer()
    return new MockWebSocket(url)
  }

  if (typeof window === 'undefined') {
    throw new Error('WebSocket non disponibile in questo ambiente.')
  }

  return new window.WebSocket(url)
}
