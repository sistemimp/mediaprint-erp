import { apiFetch } from './apiClient'

export const fetchContratti = async ({ token, q, id_anagrafica, onlyActive, signal } = {}) => {
  const params = {}
  if (q) params.q = q
  if (id_anagrafica) params.id_anagrafica = id_anagrafica
  if (onlyActive != null) params.only_active = onlyActive ? 1 : 0

  const response = await apiFetch('/contrattiList.php', { token, params, signal })
  return { items: Array.isArray(response?.items) ? response.items : [] }
}

export const fetchContrattoDetail = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID contratto mancante o non valido.')
  }
  const response = await apiFetch('/contrattiDetail.php', {
    token,
    params: { id: numericId },
    signal,
  })
  return response ?? {}
}

export const fetchContrattoAttivo = async ({ token, id_anagrafica, date, signal } = {}) => {
  const params = {}
  if (id_anagrafica) params.id_anagrafica = id_anagrafica
  if (date) params.date = date
  const response = await apiFetch('/contrattiActive.php', { token, params, signal })
  return response ?? { contratto: null, righe: [] }
}

export const saveContratto = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/contrattiSave.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
  return response
}

export const deleteContratto = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID contratto mancante o non valido.')
  }
  const response = await apiFetch('/contrattiDelete.php', {
    method: 'POST',
    token,
    body: { id: numericId },
    signal,
  })
  return response ?? { ok: true }
}

