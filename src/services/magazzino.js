import { apiFetch } from './apiClient'

export const fetchMagazzinoStock = async ({
  token,
  q,
  only_alerts,
  include_unmanaged,
  id_categoria,
  signal,
} = {}) => {
  const params = {}
  if (q && String(q).trim() !== '') params.q = String(q).trim()
  if (only_alerts !== undefined) params.only_alerts = only_alerts ? 1 : 0
  if (include_unmanaged !== undefined) params.include_unmanaged = include_unmanaged ? 1 : 0
  if (id_categoria) params.id_categoria = id_categoria
  const response = await apiFetch('/magazzinoStockList.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  const unitaMisuraOptions = Array.isArray(response?.meta?.unita_misura_options)
    ? response.meta.unita_misura_options
    : []
  return { items, unitaMisuraOptions }
}

export const updateMagazzinoStockConfig = async ({ token, body, signal } = {}) => {
  return apiFetch('/magazzinoStockConfig.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const createMagazzinoMovement = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/magazzinoMovementCreate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  try {
    const movementType = String(body?.tipo || body?.tipo_movimento || '')
      .trim()
      .toLowerCase()
    if (movementType === 'carico' || movementType === 'scarico') {
      window.dispatchEvent(
        new CustomEvent('magazzino:movement-updated', {
          detail: {
            tipo_movimento: movementType,
            id_prodotto: body?.id_prodotto ?? body?.id_articolo ?? null,
            occurred_at: Date.now(),
          },
        }),
      )
    }
  } catch (_) {
    // no-op
  }

  return response
}

export const fetchMagazzinoMovements = async ({
  token,
  q,
  id_categoria,
  id_prodotto,
  tipo_movimento,
  date_from,
  date_to,
  limit,
  signal,
} = {}) => {
  const params = {}
  if (q && String(q).trim() !== '') params.q = String(q).trim()
  if (id_categoria) params.id_categoria = id_categoria
  if (id_prodotto) params.id_prodotto = id_prodotto
  if (tipo_movimento) params.tipo_movimento = tipo_movimento
  if (date_from) params.date_from = date_from
  if (date_to) params.date_to = date_to
  if (limit) params.limit = limit
  const response = await apiFetch('/magazzinoMovementList.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const fetchMagazzinoProductConsumptions = async ({
  token,
  id_prodotto,
  combo_key,
  id_variazione,
  id_articolo,
  signal,
} = {}) => {
  const params = {}
  if (id_prodotto) params.id_prodotto = id_prodotto
  if (combo_key !== undefined && combo_key !== null) params.combo_key = combo_key
  if (id_variazione !== undefined && id_variazione !== null) params.id_variazione = id_variazione
  if (id_articolo) params.id_articolo = id_articolo
  const response = await apiFetch('/magazzinoProductConsumptionList.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  const prodotti = Array.isArray(response?.meta?.prodotti) ? response.meta.prodotti : []
  const productVariations = Array.isArray(response?.meta?.product_variations)
    ? response.meta.product_variations
    : []
  const articoli = Array.isArray(response?.meta?.articoli) ? response.meta.articoli : []
  return { items, prodotti, productVariations, articoli }
}

export const saveMagazzinoProductConsumptions = async ({ token, body, signal } = {}) => {
  return apiFetch('/magazzinoProductConsumptionSave.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const createMagazzinoArticleWithProducts = async ({ token, body, signal } = {}) => {
  return apiFetch('/magazzinoArticleCreate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const fetchMacchine = async ({ token, tipo, all, signal } = {}) => {
  const params = {}
  if (tipo) params.tipo = tipo
  if (all !== undefined) params.all = all ? 1 : 0
  const response = await apiFetch('/macchineList.php', { token, params, signal })
  const items = Array.isArray(response?.items) ? response.items : []
  return { items }
}

export const fetchMacchinaDetail = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/macchineDetail.php', {
    token,
    params: { id },
    signal,
  })
  return { item: response?.item ?? null }
}

export const saveMacchina = async ({ token, body, signal } = {}) => {
  return apiFetch('/macchineSave.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}
