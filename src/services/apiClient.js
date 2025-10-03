const DEFAULT_BASE_URL = 'https://gestionale.mediaprint.it/pubblica/'

const resolveBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured && configured.trim() !== '') {
    return configured.trim()
  }

  if (import.meta.env.DEV) {
    return '/api'
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

export const apiFetch = async (path, { method = 'GET', token, body, params, signal } = {}) => {
  const url = buildUrl(path, params)
  const headers = {
    Accept: 'application/json',
  }

  const options = {
    method,
    headers,
    signal,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
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
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
