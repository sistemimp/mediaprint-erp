import { apiFetch } from './apiClient'

const normaliseMeta = (response, fallbackItems) => {
  if (!response || Array.isArray(response)) {
    const total = fallbackItems.length
    return {
      total,
      per_page: fallbackItems.length,
      current_page: 1,
      last_page: 1,
      from: total > 0 ? 1 : 0,
      to: total,
    }
  }

  return (
    response.meta ??
    response.pagination ?? {
      total: fallbackItems.length,
      per_page: fallbackItems.length,
      current_page: 1,
      last_page: 1,
      from: fallbackItems.length > 0 ? 1 : 0,
      to: fallbackItems.length,
    }
  )
}

export const fetchAnagrafiche = async ({
  token,
  search,
  signal,
  page,
  pageSize,
  sortBy,
  sortDirection,
} = {}) => {
  const payload = {}

  if (search) {
    payload.search = search
  }

  if (page) {
    payload.page = page
  }

  if (pageSize) {
    payload.per_page = pageSize
  }

  if (sortBy) {
    payload.sort_by = sortBy
  }

  if (sortDirection) {
    payload.sort_direction = sortDirection
  }

  const response = await apiFetch('/anagraficheList.php', {
    token,
    params: payload,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  const meta = normaliseMeta(response, items)

  return {
    items,
    meta,
  }
}

export const fetchAnagraficheArchiviate = async ({
  token,
  search,
  signal,
  page,
  pageSize,
  sortBy,
  sortDirection,
} = {}) => {
  const payload = {}

  if (search) payload.search = search
  if (page) payload.page = page
  if (pageSize) payload.per_page = pageSize
  if (sortBy) payload.sort_by = sortBy
  if (sortDirection) payload.sort_direction = sortDirection

  const response = await apiFetch('/anagraficheArchiveList.php', {
    token,
    params: payload,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  const meta = normaliseMeta(response, items)

  return { items, meta }
}

export const fetchAnagraficaDetail = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID anagrafica mancante o non valido per il dettaglio.')
  }

  const response = await apiFetch('/anagraficheDetail.php', {
    token,
    params: { id: numericId },
    signal,
  })

  return response ?? {}
}

export const updateAnagraficaDetail = async ({
  token,
  id,
  anagrafica,
  fiscale,
  contatti,
  sedi,
  signal,
} = {}) => {
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("ID anagrafica mancante o non valido per l'aggiornamento.")
  }

  const payload = { id: numericId }

  if (anagrafica && Object.keys(anagrafica).length > 0) {
    payload.anagrafica = anagrafica
  }

  if (fiscale && Object.keys(fiscale).length > 0) {
    payload.fiscale = fiscale
  }

  // Support both array payload (update) and object payload (create/update/delete)
  if (Array.isArray(contatti) && contatti.length > 0) {
    payload.contatti = contatti
  } else if (contatti && typeof contatti === 'object' && contatti !== null) {
    const contattiPayload = {}
    if (Array.isArray(contatti.create) && contatti.create.length > 0) {
      contattiPayload.create = contatti.create
    }
    if (Array.isArray(contatti.update) && contatti.update.length > 0) {
      contattiPayload.update = contatti.update
    }
    if (Array.isArray(contatti.delete) && contatti.delete.length > 0) {
      contattiPayload.delete = contatti.delete
    }
    if (Object.keys(contattiPayload).length > 0) {
      payload.contatti = contattiPayload
    }
  }

  if (sedi && typeof sedi === 'object' && sedi !== null) {
    const sediPayload = {}
    if (Array.isArray(sedi.create) && sedi.create.length > 0) {
      sediPayload.create = sedi.create
    }
    if (Array.isArray(sedi.update) && sedi.update.length > 0) {
      sediPayload.update = sedi.update
    }
    if (Array.isArray(sedi.delete) && sedi.delete.length > 0) {
      sediPayload.delete = sedi.delete
    }
    if (Object.keys(sediPayload).length > 0) {
      payload.sedi = sediPayload
    }
  }

  const response = await apiFetch('/anagraficheUpdate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

export const createAnagrafica = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/anagraficheCreate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
  return response
}

export const reactivateAnagrafica = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID anagrafica mancante o non valido per il ripristino.')
  }

  const response = await apiFetch('/anagraficheReactivate.php', {
    method: 'POST',
    token,
    body: { id: numericId },
    signal,
  })

  return response ?? { ok: true }
}
