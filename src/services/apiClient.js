const DEFAULT_BASE_URL = 'https://gestionale.mediaprint.it/pubblica/'

const resolveBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured && configured.trim() !== '') {
    return configured.trim()
  }

  return DEFAULT_BASE_URL
}

const buildUrl = (path, params) => {
  const baseUrl = resolveBaseUrl().replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  const fullPath = `${baseUrl}/${cleanPath}`
  const url = baseUrl.startsWith('http')
    ? new URL(fullPath)
    : new URL(fullPath, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  return url
}

export const buildApiUrl = (path, params) => buildUrl(path, params)

export const AUTH_TOKEN_STORAGE_KEY = 'mediaprint-erp-auth-token'
export const AUTH_USER_STORAGE_KEY = 'mediaprint-erp-user'

export const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export const apiFetch = async (path, { method = 'GET', token, body, params, signal } = {}) => {
  const url = buildUrl(path, params)
  const headers = {
    Accept: 'application/json',
  }

  const resolvedToken = token || getStoredToken()

  const options = {
    method,
    headers,
    signal,
  }

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
    headers['X-Authorization'] = `Bearer ${resolvedToken}`
    headers['X-Access-Token'] = resolvedToken
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url.toString(), options)

  if (response.status === 204) {
    return null
  }

  let payload = null
  try {
    payload = await response.json()
  } catch (_error) {
    payload = null
  }

  if (!response.ok) {
    const payloadText = [payload?.message, payload?.error].filter(Boolean).join(' ').toLowerCase()
    const isAccessError =
      response.status === 401 ||
      response.status === 403 ||
      payloadText.includes('token') ||
      payloadText.includes('jwt') ||
      payloadText.includes('authorization') ||
      payloadText.includes('autorizz') ||
      payloadText.includes('accesso') ||
      payloadText.includes('permesso') ||
      payloadText.includes('credenzial') ||
      payloadText.includes('malformed json') ||
      payloadText.includes('malformed')

    if (isAccessError && typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
