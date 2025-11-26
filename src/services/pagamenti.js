import { apiFetch, buildApiUrl } from './apiClient'

export const fetchPagamentiLedger = async ({ token, q, limit, signal } = {}) => {
  const response = await apiFetch('/pagamentiLedger.php', {
    token,
    params: {
      q,
      limit,
    },
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}

export const fetchPagamentiList = async ({ token, filters = {}, signal } = {}) => {
  const params = {}
  if (filters.q) params.q = filters.q
  if (filters.id_anagrafica) params.id_anagrafica = filters.id_anagrafica
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.pending_only_open !== undefined) {
    params.pending_only_open = filters.pending_only_open ? 1 : 0
  }

  const response = await apiFetch('/pagamentiList.php', {
    token,
    params,
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}

export const fetchPagamentoDetail = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/pagamentiDetail.php', {
    token,
    params: { id },
    signal,
  })

  return response?.data ?? null
}

export const searchPagamentiFatture = async ({ token, q, id_anagrafica, limit, onlyOpen = true, signal } = {}) => {
  const params = {}
  if (q) params.q = q
  if (id_anagrafica) params.id_anagrafica = id_anagrafica
  if (limit) params.limit = limit
  if (onlyOpen) params.solo_aperti = 1

  const response = await apiFetch('/pagamentiInvoicesSearch.php', {
    token,
    params,
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}

export const uploadPagamentiExcel = async ({ token, file, signal } = {}) => {
  if (!file) {
    throw new Error('Selezionare un file da caricare.')
  }
  const formData = new FormData()
  formData.append('file', file)

  const url = buildApiUrl('/pagamentiImportUpload.php')
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
    signal,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    headers: Array.isArray(payload?.headers) ? payload.headers : [],
  }
}

export const confirmPagamentiImport = async ({ token, items, signal } = {}) => {
  const response = await apiFetch('/pagamentiImportConfirm.php', {
    method: 'POST',
    token,
    body: {
      items,
    },
    signal,
  })

  return response ?? {}
}
