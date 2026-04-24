import { buildApiUrl, getStoredToken } from './apiClient'

// Costruisce gli header di autenticazione supportando i diversi nomi richiesti dal backend.
const buildAuthHeaders = (token) => {
  const headers = {}
  const resolvedToken = token || getStoredToken()
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
    headers['X-Authorization'] = `Bearer ${resolvedToken}`
    headers['X-Access-Token'] = resolvedToken
  }
  return headers
}

// Recupera l'avatar dell'utente corrente; se non presente restituisce null.
export const fetchProfileAvatar = async ({ token, signal } = {}) => {
  const url = buildApiUrl('/profileAvatar.php')
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(token),
    signal,
  })

  if (response.status === 404 || response.status === 204) {
    return null
  }

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch (_error) {
      payload = null
    }
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return response.blob()
}

// Carica un nuovo avatar tramite multipart/form-data e restituisce il payload JSON di risposta.
export const uploadProfileAvatar = async ({ token, file, signal } = {}) => {
  if (!file) {
    throw new Error('File mancante')
  }

  const formData = new FormData()
  formData.append('avatar', file)

  const url = buildApiUrl('/profileAvatarUpload.php')
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: formData,
    signal,
  })

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

  return payload ?? {}
}
