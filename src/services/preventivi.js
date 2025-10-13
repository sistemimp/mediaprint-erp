import { apiFetch } from './apiClient'

export const fetchLatestPreventivi = async ({ token, signal, limit } = {}) => {
  const params = {}
  if (limit) {
    params.limit = limit
  }

  const response = await apiFetch('/preventiviList.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  return { items }
}

export const fetchPreventiviArchivio = async ({ token, signal, page, pageSize, search, sortBy, sortDirection } = {}) => {
  const params = {}
  if (page) params.page = page
  if (pageSize) params.per_page = pageSize
  if (search) params.search = search
  if (sortBy) params.sort_by = sortBy
  if (sortDirection) params.sort_direction = sortDirection

  const response = await apiFetch('/preventiviArchiveList.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  const meta = response?.meta ?? {
    total: items.length,
    per_page: items.length,
    current_page: 1,
    last_page: 1,
    from: items.length > 0 ? 1 : 0,
    to: items.length,
  }

  return { items, meta }
}

export const createPreventivo = async ({
  token,
  id_preventivo,
  id_anagrafica,
  data_preventivo,
  note,
  righe,
  totals,
  send,
  signal,
} = {}) => {
  const payload = {
    id_preventivo,
    id_anagrafica,
    data_preventivo,
    note,
    righe,
    // backend persiste solo testata per ora: passiamo i totali
    totale_imponibile: totals?.imponibile ?? 0,
    totale_sconto: totals?.sconto ?? 0,
    totale_iva: totals?.totaleIva ?? 0,
    totale: totals?.totale ?? 0,
    send: send ? 1 : 0,
  }

  const response = await apiFetch('/preventiviCreate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

export const fetchPreventivoDetail = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/preventiviDetail.php', {
    token,
    params: { id },
    signal,
  })
  const data = response?.data ?? null
  const editable = !!response?.meta?.editable
  const righe = Array.isArray(response?.righe) ? response.righe : []
  return { data, editable, righe }
}

export const reactivatePreventivo = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID preventivo mancante o non valido per il ripristino.')
  }

  const response = await apiFetch('/preventiviReactivate.php', {
    method: 'POST',
    token,
    body: { id: numericId },
    signal,
  })

  return response ?? {}
}

export const archivePreventivo = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID preventivo mancante o non valido per l\'archiviazione.')
  }

  const response = await apiFetch('/preventiviArchive.php', {
    method: 'POST',
    token,
    body: { id: numericId },
    signal,
  })

  return response ?? { ok: true }
}
