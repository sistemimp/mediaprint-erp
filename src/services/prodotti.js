import { apiFetch } from './apiClient'

export const fetchCategorieProdotti = async ({ token, signal } = {}) => {
  const response = await apiFetch('/prodotti/categorie/list.php', { token, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const fetchProdotti = async ({ token, id_categoria, q, signal } = {}) => {
  const params = {}
  if (id_categoria) params.id_categoria = id_categoria
  if (q && String(q).trim() !== '') params.q = String(q).trim()
  const response = await apiFetch('/prodotti/list.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const fetchProdottiDashboard = async ({ token, period, signal } = {}) => {
  const params = {}
  if (period) {
    params.period = period
  }
  const payload = await apiFetch('/prodottiDashboard.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

export const fetchProdottiFatturazione = async ({ token, period, signal } = {}) => {
  const params = {}
  if (period) {
    params.period = period
  }
  const payload = await apiFetch('/prodottiFatturazione.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

export const fetchNatureIva = async ({ token, signal } = {}) => {
  const response = await apiFetch('/natureIvaList.php', { token, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const fetchIvaList = async ({ token, signal } = {}) => {
  const response = await apiFetch('/ivaList.php', { token, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const createProdotto = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/prodotti/create.php', { method: 'POST', token, body, signal })
  return response
}

export const updateProdotto = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/prodotti/update.php', { method: 'POST', token, body, signal })
  return response
}

export const deleteProdotto = async ({ token, id_prodotto, id, signal } = {}) => {
  const prodId = id_prodotto ?? id
  const parsedId = prodId !== undefined && prodId !== null ? Number(prodId) : NaN
  if (!parsedId || Number.isNaN(parsedId)) {
    throw new Error('ID prodotto non valido')
  }
  const response = await apiFetch('/prodotti/delete.php', {
    method: 'POST',
    token,
    body: { id: parsedId },
    signal,
  })
  return response
}

export const fetchProdottoDetail = async ({ token, id_prodotto, signal } = {}) => {
  const params = { id: id_prodotto }
  const response = await apiFetch('/prodotti/detail.php', { token, params, signal })
  return response
}

export const saveCategoriaProdotto = async ({ token, id_categoria, nome, signal } = {}) => {
  const body = { id_categoria, nome }
  const response = await apiFetch('/prodotti/categorie/save.php', { method: 'POST', token, body, signal })
  return response
}

export const fetchVariazioni = async ({ token, signal } = {}) => {
  const response = await apiFetch('/prodotti/variazioni/list.php', { token, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const saveVariazione = async ({ token, id_variazione, nome, prezzo, categoria, codice, signal } = {}) => {
  const body = { id_variazione, nome, prezzo, categoria, codice }
  const response = await apiFetch('/prodotti/variazioni/save.php', { method: 'POST', token, body, signal })
  return response
}

export const deleteVariazione = async ({ token, id_variazione, signal } = {}) => {
  const body = { id_variazione }
  const response = await apiFetch('/prodotti/variazioni/delete.php', { method: 'POST', token, body, signal })
  return response
}

export const fetchProdottoVariazioni = async ({ token, id_prodotto, signal } = {}) => {
  const params = { id_prodotto }
  const response = await apiFetch('/prodotti/variazioni/prodotto.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const linkProdottoVariazione = async ({ token, id_prodotto, id_variazione, delta, signal } = {}) => {
  const body = { id_prodotto, id_variazione, action: 'link', delta }
  const response = await apiFetch('/prodotti/variazioni/prodotto.php', { method: 'POST', token, body, signal })
  return response
}

export const unlinkProdottoVariazione = async ({ token, id_prodotto, id_variazione, signal } = {}) => {
  const body = { id_prodotto, id_variazione, action: 'unlink' }
  const response = await apiFetch('/prodotti/variazioni/prodotto.php', { method: 'POST', token, body, signal })
  return response
}

export const saveProdottoVariazioneDelta = async ({ token, id_prodotto, id_variazione, delta, signal } = {}) => {
  const body = { id_prodotto, id_variazione, action: 'set', delta }
  const response = await apiFetch('/prodotti/variazioni/prodotto.php', { method: 'POST', token, body, signal })
  return response
}

// Prezzi combinati (multi-variazione) per prodotto
export const fetchProdottoPrezziCombinati = async ({ token, id_prodotto, signal } = {}) => {
  const params = { id_prodotto }
  const response = await apiFetch('/prodotti/variazioni/prezzi.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const upsertProdottoPrezzoCombinato = async ({ token, id_prodotto, var_ids, prezzo, signal } = {}) => {
  const body = { action: 'upsert', id_prodotto, var_ids, prezzo }
  const response = await apiFetch('/prodotti/variazioni/prezzi.php', { method: 'POST', token, body, signal })
  return response
}

export const deleteProdottoPrezzoCombinato = async ({ token, id_prodotto, var_ids, signal } = {}) => {
  const body = { action: 'delete', id_prodotto, var_ids }
  const response = await apiFetch('/prodotti/variazioni/prezzi.php', { method: 'POST', token, body, signal })
  return response
}
