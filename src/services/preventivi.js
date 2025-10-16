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
  oggetto,
  oggetti,
  riferimento_cliente,
  cig,
  determine,
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
    oggetto,
    oggetto_preventivo: oggetto,
    oggetti,
    riferimento_cliente,
    cig,
    determine,
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
  const cig = Array.isArray(response?.cig) ? response.cig : []
  const determine = Array.isArray(response?.determine) ? response.determine : []
  const statuses = Array.isArray(response?.meta?.statuses) ? response.meta.statuses : []
  const currentStatus = response?.meta?.current_status ?? null
  return { data, editable, righe, cig, determine, statuses, currentStatus }
}

// Opzioni per la multi-select "Oggetto preventivo"
export const fetchPreventivoOggettiOptions = async ({ token, signal } = {}) => {
  const response = await apiFetch('/preventiviOggettiList.php', {
    token,
    signal,
  })
  const items = Array.isArray(response) ? response : (response?.data ?? [])
  // Normalizza in { value, label }
  const options = items.map((it) => ({
    value: it?.id_oggetto ?? it?.id ?? null,
    label: it?.label ?? it?.nome ?? '',
  })).filter((o) => o.value != null && String(o.label || '').trim() !== '')
  return options
}

// Crea una nuova opzione "oggetto preventivo" nel DB
export const createPreventivoOggettoOption = async ({ token, label, signal } = {}) => {
  const response = await apiFetch('/preventiviOggettiCreate.php', {
    method: 'POST',
    token,
    body: { label: String(label || '') },
    signal,
  })
  const data = response?.data ?? response ?? null
  if (!data) return null
  const id = data?.id_oggetto ?? data?.id ?? null
  const out = id != null ? { value: id, label: data?.label ?? String(label || '') } : null
  return out
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

export const updatePreventivoStatus = async ({ token, id, statusCode, signal } = {}) => {
  const numericId = Number(id)
  const payload = {
    stato: statusCode,
  }
  if (Number.isFinite(numericId) && numericId > 0) {
    payload.id = numericId
  } else if (id) {
    payload.id = id
  }

  const response = await apiFetch('/preventiviStatus.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  const data = response?.data ?? null
  const statuses = Array.isArray(response?.meta?.statuses) ? response.meta.statuses : []
  const currentStatus = response?.meta?.current_status ?? null
  const editable = !!response?.meta?.editable

  return { data, statuses, currentStatus, editable }
}

// Salva un log del cambio stato (best-effort; non blocca il flusso se fallisce)
export const logPreventivoStatusChange = async ({ token, id, fromStatus, toStatus, note, description, context, userId, userName, signal } = {}) => {
  const numericId = Number(id)
  const body = {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : id,
    from_status: fromStatus ?? null,
    to_status: toStatus ?? null,
    note: note ?? null,
    description: description ?? note ?? null,
    context: context ?? null,
    user_id: userId ?? null,
    user_name: userName ?? null,
    at: new Date().toISOString(),
  }

  try {
    const resp = await apiFetch('/preventiviStatusLog.php', {
      method: 'POST',
      token,
      body,
      signal,
    })
    return resp ?? { ok: true }
  } catch (_e) {
    // Non propagare: il log non deve impedire l'uso dell'app
    return { ok: false }
  }
}

// Legge lo storico dei cambi stato del preventivo
export const fetchPreventivoStatusLog = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  const params = {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : id,
  }

  const response = await apiFetch('/preventiviStatusLog.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response?.items)
    ? response.items
    : (Array.isArray(response?.data)
      ? response.data
      : (Array.isArray(response)
        ? response
        : []))

  return { items }
}

// Alias semantico per log generico di eventi stato preventivo
export const logPreventivoEvent = async (args = {}) => {
  return logPreventivoStatusChange(args)
}
