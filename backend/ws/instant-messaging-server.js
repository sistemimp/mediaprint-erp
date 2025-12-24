const http = require('http')
const { readFileSync, existsSync } = require('fs')
const { WebSocketServer } = require('ws')

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
  'http://localhost:8000/pubblica').replace(/\/$/, '')
const WS_HOST = process.env.IM_WS_HOST || '0.0.0.0'
const WS_PORT = Number.parseInt(process.env.IM_WS_PORT || '4010', 10)

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
})

const wss = new WebSocketServer({ server, path: '/ws/im' })
const connectionsByAccount = new Map()

const safeJson = (input) => {
  try {
    return JSON.parse(input)
  } catch (_error) {
    return null
  }
}

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

const sendToAccount = (accountId, payload) => {
  const connections = connectionsByAccount.get(accountId)
  if (!connections) {
    return
  }
  const message = JSON.stringify(payload)
  connections.forEach((socket) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(message)
    }
  })
}

wss.on('connection', async (ws, req) => {
  const requestUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const queryToken = requestUrl.searchParams.get('token')
  const headerTokenRaw = req.headers.authorization || ''
  const headerToken = headerTokenRaw.toLowerCase().startsWith('bearer ')
    ? headerTokenRaw.slice(7).trim()
    : headerTokenRaw.trim()
  const token = queryToken || headerToken

  if (!token) {
    ws.close(1008, 'Token mancante')
    return
  }

  try {
    const me = await apiRequest('/me.php', token)
    const user = me?.user
    const accountId = Number.parseInt(user?.id, 10)
    if (!accountId) {
      ws.close(1008, 'Auth fallita')
      return
    }

    ws.accountId = accountId
    ws.token = token
    attachConnection(accountId, ws)
    ws.send(JSON.stringify({ type: 'im.auth', data: { ok: true, accountId } }))
  } catch (error) {
    ws.send(JSON.stringify({ type: 'im.auth', data: { ok: false, message: error.message } }))
    ws.close(1008, 'Auth fallita')
    return
  }

  ws.on('message', async (raw) => {
    const message = safeJson(raw)
    if (!message || typeof message !== 'object') {
      ws.send(JSON.stringify({ type: 'im.error', data: { message: 'Payload non valido.' } }))
      return
    }

    if (message.type === 'im.ping') {
      ws.send(JSON.stringify({ type: 'im.pong', data: { t: Date.now() } }))
      return
    }

    if (message.type === 'im.thread.created') {
      const targetId = Number.parseInt(message?.data?.targetAccountId, 10)
      const threadId = Number.parseInt(message?.data?.threadId, 10)
      if (targetId && threadId) {
        sendToAccount(targetId, { type: 'im.thread.created', data: { threadId } })
      }
      return
    }

    if (message.type !== 'im.message') {
      ws.send(JSON.stringify({ type: 'im.error', data: { message: 'Tipo messaggio non supportato.' } }))
      return
    }

    const threadId = Number.parseInt(message?.data?.threadId, 10)
    const body = String(message?.data?.body || '').trim()
    if (!threadId || !body) {
      ws.send(JSON.stringify({ type: 'im.error', data: { message: 'Messaggio incompleto.' } }))
      return
    }

    try {
      const result = await apiRequest('/imMessagesSend.php', ws.token, {
        id_thread: threadId,
        body,
      })
      const payload = result?.data
      const participants = payload?.participants || []
      const broadcast = {
        type: 'im.message',
        data: payload?.message || null,
        threadId: payload?.thread_id || threadId,
      }
      participants.forEach((participantId) => {
        sendToAccount(participantId, broadcast)
      })
    } catch (error) {
      ws.send(JSON.stringify({ type: 'im.error', data: { message: error.message } }))
    }
  })

  ws.on('close', () => {
    detachConnection(ws.accountId, ws)
  })
})

server.listen(WS_PORT, WS_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`IM WebSocket listening on ws://${WS_HOST}:${WS_PORT}/ws/im`)
})
