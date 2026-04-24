import { apiFetch } from './apiClient'

// Normalizza i metadati di paginazione anche quando l'API restituisce un array semplice.
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

// Recupera lista anagrafiche con filtri, ordinamento e paginazione.
export const fetchAnagrafiche = async ({
  token,
  search,
  signal,
  page,
  pageSize,
  sortBy,
  sortDirection,
  tipologie,
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
  if (Array.isArray(tipologie) && tipologie.length > 0) {
    payload.tipologie = tipologie
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

// Recupera KPI dashboard anagrafiche (periodo/solo attive).
export const fetchAnagraficheDashboard = async ({ token, onlyActive, period, signal } = {}) => {
  const params = {}
  if (onlyActive != null) {
    params.only_active = onlyActive ? 1 : 0
  }
  if (period) {
    params.period = period
  }
  const payload = await apiFetch('/anagraficheDashboard.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

// Recupera archivio anagrafiche con paginazione e filtri.
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

// Recupera il dettaglio completo di una singola anagrafica.
export const fetchAnagraficaDetail = async ({ token, id, kpiPeriod, signal } = {}) => {
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID anagrafica mancante o non valido per il dettaglio.')
  }

  const params = { id: numericId }
  if (kpiPeriod) {
    params.kpi_period = kpiPeriod
  }

  const response = await apiFetch('/anagraficheDetail.php', {
    token,
    params,
    signal,
  })

  return response ?? {}
}

// Aggiorna testata/fiscale/contatti/sedi e rilegge il dettaglio aggiornato.
export const updateAnagraficaDetail = async ({
  token,
  id,
  kpiPeriod,
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

  // Normalizza contatti in una lista di operazioni [{ action, ... }]
  if (contatti) {
    let operations = []
    if (Array.isArray(contatti)) {
      // Se non c'è action, interpreta come update
      operations = contatti.map((op) => (op && typeof op === 'object' && 'action' in op ? op : { action: 'update', ...op }))
    } else if (typeof contatti === 'object') {
      const { create, update, delete: del } = contatti
      if (Array.isArray(create)) operations.push(...create.map((c) => ({ action: 'create', ...c })))
      if (Array.isArray(update)) operations.push(...update.map((u) => ({ action: 'update', ...u })))
      if (Array.isArray(del)) {
        operations.push(
          ...del.map((d) => (typeof d === 'number' ? { action: 'delete', id_contatto: d } : { action: 'delete', ...d })),
        )
      }
    }
    if (operations.length > 0) {
      payload.contatti = operations
    }
  }

  // Normalizza sedi in una lista di operazioni [{ action, ... }]
  if (sedi) {
    let operations = []
    if (Array.isArray(sedi)) {
      operations = sedi.map((op) => (op && typeof op === 'object' && 'action' in op ? op : { action: 'update', ...op }))
    } else if (typeof sedi === 'object') {
      const { create, update, delete: del } = sedi
      if (Array.isArray(create)) operations.push(...create.map((s) => ({ action: 'create', ...s })))
      if (Array.isArray(update)) operations.push(...update.map((s) => ({ action: 'update', ...s })))
      if (Array.isArray(del)) {
        operations.push(
          ...del.map((d) => (typeof d === 'number' ? { action: 'delete', id_sede: d } : { action: 'delete', ...d })),
        )
      }
    }
    if (operations.length > 0) {
      payload.sedi = operations
    }
  }

  // Esegue update e poi ricarica il dettaglio per restituire i dati aggiornati
  await apiFetch('/anagraficheUpdate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  const detail = await fetchAnagraficaDetail({ token, id: numericId, kpiPeriod, signal })
  return detail ?? { ok: true }
}

// Crea una nuova anagrafica.
export const createAnagrafica = async ({ token, body, signal } = {}) => {
  const response = await apiFetch('/anagraficheCreate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
  return response
}

// Riattiva una anagrafica archiviata.
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

// Elenca le tipologie anagrafiche configurate.
export const fetchTipologieAnagrafiche = async ({ token, signal } = {}) => {
  const response = await apiFetch('/tipologieAnagraficheList.php', { token, signal })
  return Array.isArray(response?.items) ? response.items : []
}

// Elenca i regimi fiscali disponibili.
export const fetchRegimiFiscali = async ({ token, signal } = {}) => {
  const response = await apiFetch('/regimiFiscaliList.php', { token, signal })
  return Array.isArray(response?.items) ? response.items : []
}

// Elenca le tipologie di sede configurate.
export const fetchTipologieSedi = async ({ token, signal } = {}) => {
  const response = await apiFetch('/tipologieSediList.php', { token, signal })
  return Array.isArray(response?.items) ? response.items : []
}
