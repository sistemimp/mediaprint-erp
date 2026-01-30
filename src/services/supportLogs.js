const MAX_CONSOLE_ENTRIES = 120
const MAX_NETWORK_ENTRIES = 80
const MAX_STRING_LENGTH = 4000

const consoleEntries = []
const networkEntries = []
let consoleHooked = false

const nowIso = () => new Date().toISOString()

const trimString = (value) => {
  if (typeof value !== 'string') return value
  if (value.length <= MAX_STRING_LENGTH) return value
  return `${value.slice(0, MAX_STRING_LENGTH)}…`
}

const safeStringify = (value) => {
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return val.toString()
        if (typeof val === 'string') return trimString(val)
        return val
      },
      2,
    )
  } catch (error) {
    return JSON.stringify({ error: String(error), fallback: String(value) })
  }
}

const serializeArgs = (args) =>
  args.map((arg) => {
    if (typeof arg === 'string') return trimString(arg)
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: trimString(arg.message),
        stack: trimString(arg.stack || ''),
      }
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.parse(safeStringify(arg))
      } catch (_error) {
        return trimString(String(arg))
      }
    }
    return arg
  })

const pushEntry = (list, entry, max) => {
  list.push(entry)
  if (list.length > max) {
    list.splice(0, list.length - max)
  }
}

export const initSupportLogCapture = () => {
  if (consoleHooked || typeof window === 'undefined') return
  consoleHooked = true

  const levels = ['log', 'info', 'warn', 'error', 'debug']
  levels.forEach((level) => {
    const original = console[level]
    if (typeof original !== 'function') return
    console[level] = (...args) => {
      try {
        pushEntry(
          consoleEntries,
          {
            level,
            timestamp: nowIso(),
            args: serializeArgs(args),
          },
          MAX_CONSOLE_ENTRIES,
        )
      } catch (_error) {
        // ignore logging errors
      }
      return original(...args)
    }
  })
}

export const logSupportApiCall = ({
  url,
  method,
  status,
  ok,
  durationMs,
  requestBody,
  responseBody,
  errorMessage,
}) => {
  if (typeof window === 'undefined') return
  pushEntry(
    networkEntries,
    {
      timestamp: nowIso(),
      url,
      method,
      status,
      ok,
      duration_ms: durationMs,
      request_body: requestBody ?? null,
      response_body: responseBody ?? null,
      error: errorMessage ? trimString(errorMessage) : null,
    },
    MAX_NETWORK_ENTRIES,
  )
}

export const getSupportDebugSnapshot = () => {
  return {
    collected_at: nowIso(),
    location: typeof window !== 'undefined' ? window.location.href : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    console: consoleEntries.slice(),
    network: networkEntries.slice(),
  }
}

export const formatSupportDebugJson = (userDescription) => {
  const snapshot = getSupportDebugSnapshot()
  const networkFailures = snapshot.network.filter((entry) => entry?.status !== 200)
  const payload = {
    note: trimString(userDescription || ''),
    debug: {
      ...snapshot,
      network: networkFailures,
    },
  }
  return safeStringify(payload)
}
