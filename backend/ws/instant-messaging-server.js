const http = require('http')
const { readFileSync, existsSync } = require('fs')
const { Server } = require('socket.io')

const parseEnvFile = (path) => {
  if (!existsSync(path)) {
    return {}
  }
  const raw = readFileSync(path, 'utf8')
  const env = {}
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return
    }
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && value !== undefined) {
      env[key] = value
    }
  })
  return env
}

const applyEnvDefaults = () => {
  const fileEnv = parseEnvFile(`${__dirname}/../.env`)
  Object.entries(fileEnv).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

applyEnvDefaults()

const API_BASE_URL = (process.env.IM_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'https://gestionale.mediaprint.it/pubblica').replace(/\/$/, '')
const WS_HOST = process.env.IM_WS_HOST || '127.0.0.1'
const WS_PORT = Number.parseInt(process.env.PORT || process.env.IM_WS_PORT || '4010', 10)

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    ok: true,
    config: {
      apiBaseUrl: API_BASE_URL,
      wsHost: WS_HOST,
      wsPort: WS_PORT,
    },
  }))
})

const io = new Server(server, {
  path: '/ws/im',
  cors: {
    origin: true,
    credentials: true,
  },
})
const connectionsByAccount = new Map()

const apiRequest = async (path, token, body = null) => {
  const url = `${API_BASE_URL}/${path.replace(/^\//, '')}`
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Authorization': `Bearer ${token}`,
    'X-Access-Token': token,
  }
  const options = {
    method: body ? 'POST' : 'GET',
    headers,
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return payload
}

const attachConnection = (accountId, ws) => {
  const existing = connectionsByAccount.get(accountId) || new Set()
  existing.add(ws)
  connectionsByAccount.set(accountId, existing)
}

const detachConnection = (accountId, ws) => {
  if (!accountId) {
    return
  }
  const existing = connectionsByAccount.get(accountId)
  if (!existing) {
    return
  }
  existing.delete(ws)
  if (existing.size === 0) {
    connectionsByAccount.delete(accountId)
  }
}

const sendToAccount = (accountId, event, payload) => {
  const connections = connectionsByAccount.get(accountId)
  if (!connections) {
    return
  }
  connections.forEach((socket) => {
    if (socket.connected) {
      socket.emit(event, payload)
    }
  })
}

io.use(async (socket, next) => {
  const authToken = socket.handshake?.auth?.token
  const queryToken = socket.handshake?.query?.token
  const headerTokenRaw = socket.handshake?.headers?.authorization || ''
  const headerToken = headerTokenRaw.toLowerCase().startsWith('bearer ')
    ? headerTokenRaw.slice(7).trim()
    : headerTokenRaw.trim()
  const token = authToken || queryToken || headerToken

  if (!token) {
    next(new Error('Token mancante'))
    return
  }

  try {
    const me = await apiRequest('/me.php', token)
    const user = me?.user
    const accountId = Number.parseInt(user?.id, 10)
    if (!accountId) {
      next(new Error('Auth fallita'))
      return
    }
    socket.data.accountId = accountId
    socket.data.token = token
    attachConnection(accountId, socket)
    next()
  } catch (error) {
    next(new Error(error.message || 'Auth fallita'))
  }
})

io.on('connection', (socket) => {
  const accountId = socket.data.accountId
  socket.emit('im.auth', { ok: true, accountId })

  socket.on('im.ping', () => {
    socket.emit('im.pong', { t: Date.now() })
  })

  socket.on('im.thread.created', (payload) => {
    const targetId = Number.parseInt(payload?.targetAccountId, 10)
    const targetIds = Array.isArray(payload?.targetAccountIds) ? payload.targetAccountIds : []
    const threadId = Number.parseInt(payload?.threadId, 10)
    if (threadId && Array.isArray(targetIds) && targetIds.length > 0) {
      targetIds
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isFinite(id) && id > 0)
        .forEach((id) => {
          sendToAccount(id, 'im.thread.created', { threadId })
        })
      return
    }
    if (targetId && threadId) {
      sendToAccount(targetId, 'im.thread.created', { threadId })
    }
  })

  socket.on('im.thread.read', async (payload) => {
    const threadId = Number.parseInt(payload?.threadId, 10)
    if (!threadId) {
      return
    }
    try {
      await apiRequest('/imThreadRead.php', socket.data.token, { id_thread: threadId })
      const threads = await apiRequest('/imThreadsList.php', socket.data.token)
      const match = (threads?.data || []).find((item) => Number.parseInt(item?.id, 10) === threadId)
      const participants = Array.isArray(match?.participants) ? match.participants : []
      participants
        .map((participant) => Number.parseInt(participant?.id, 10))
        .filter((id) => Number.isFinite(id) && id > 0)
        .forEach((id) => {
          sendToAccount(id, 'im.thread.read', {
            threadId,
            readAt: new Date().toISOString(),
          })
        })
    } catch (_error) {
      // ignore
    }
  })

  socket.on('im.message', async (payload) => {
    const threadId = Number.parseInt(payload?.threadId, 10)
    const body = String(payload?.body || '').trim()
    if (!threadId || !body) {
      socket.emit('im.error', { message: 'Messaggio incompleto.' })
      return
    }

    try {
      const result = await apiRequest('/imMessagesSend.php', socket.data.token, {
        id_thread: threadId,
        body,
      })
      const data = result?.data
      const participants = data?.participants || []
      const broadcast = {
        data: data?.message || null,
        threadId: data?.thread_id || threadId,
      }
      participants.forEach((participantId) => {
        sendToAccount(participantId, 'im.message', broadcast)
      })
    } catch (error) {
      socket.emit('im.error', { message: error.message || 'Errore invio messaggio.' })
    }
  })

  socket.on('disconnect', () => {
    detachConnection(accountId, socket)
  })
})

server.listen(WS_PORT, WS_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`IM Socket.IO listening on http://${WS_HOST}:${WS_PORT}/ws/im`)
})
