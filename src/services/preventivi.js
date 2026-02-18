import { apiFetch } from './apiClient'

export const fetchLatestPreventivi = async ({ token, signal, limit, is_acquisto } = {}) => {
  const params = {}
  if (limit) {
    params.limit = limit
  }
  if (is_acquisto !== undefined) {
    params.is_acquisto = is_acquisto ? 1 : 0
  }

  const response = await apiFetch('/preventiviList.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  return { items }
}

export const fetchPreventiviDashboard = async ({ token, period, is_acquisto, signal } = {}) => {
  const params = {}
  if (period) {
    params.period = period
  }
  if (is_acquisto !== undefined) {
    params.is_acquisto = is_acquisto ? 1 : 0
  }
  const payload = await apiFetch('/preventiviDashboard.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

export const fetchPreventiviArchivio = async ({ token, signal, page, pageSize, search, sortBy, sortDirection, is_acquisto } = {}) => {
  const params = {}
  if (page) params.page = page
  if (pageSize) params.per_page = pageSize
  if (search) params.search = search
  if (sortBy) params.sort_by = sortBy
  if (sortDirection) params.sort_direction = sortDirection
  if (is_acquisto !== undefined) params.is_acquisto = is_acquisto ? 1 : 0

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
  id_mittente,
  data_preventivo,
  note,
  oggetto,
  oggetti,
  riferimento_cliente,
  cig,
  determine,
  contatti,
  righe,
  totals,
  send,
  is_acquisto,
  signal,
} = {}) => {
  const payload = {
    id_preventivo,
    id_anagrafica,
    id_mittente,
    data_preventivo,
    note,
    oggetto,
    oggetto_preventivo: oggetto,
    oggetti,
    riferimento_cliente,
    cig,
    determine,
    contatti: Array.isArray(contatti) ? contatti : undefined,
    righe,
    // backend persiste solo testata per ora: passiamo i totali
    totale_imponibile: totals?.imponibile ?? 0,
    totale_sconto: totals?.sconto ?? 0,
    totale_iva: totals?.totaleIva ?? 0,
    totale: totals?.totale ?? 0,
    send: send ? 1 : 0,
    is_acquisto: is_acquisto !== undefined ? (is_acquisto ? 1 : 0) : undefined,
  }

  const response = await apiFetch('/preventiviCreate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

export const fetchPreventivoDetail = async ({ token, id, is_acquisto, signal } = {}) => {
  const response = await apiFetch('/preventiviDetail.php', {
    token,
    params: { id, ...(is_acquisto !== undefined ? { is_acquisto: is_acquisto ? 1 : 0 } : {}) },
    signal,
  })
  const data = response?.data ?? null
  const editable = !!response?.meta?.editable
  const righe = Array.isArray(response?.righe) ? response.righe : []
  const cig = Array.isArray(response?.cig) ? response.cig : []
  const determine = Array.isArray(response?.determine) ? response.determine : []
  const contatti = Array.isArray(response?.contatti) ? response.contatti : []
  const linkedDdt = Array.isArray(response?.linked_ddt) ? response.linked_ddt : []
  const linkedFatture = Array.isArray(response?.linked_fatture) ? response.linked_fatture : []
  const linkedLavorazioni = Array.isArray(response?.linked_lavorazioni)
    ? response.linked_lavorazioni
    : (Array.isArray(response?.data?.lavorazioni) ? response.data.lavorazioni : [])
  const statuses = Array.isArray(response?.meta?.statuses) ? response.meta.statuses : []
  const currentStatus = response?.meta?.current_status ?? null
  const revisions = Array.isArray(response?.meta?.revisions) ? response.meta.revisions : []
  const stockAlerts = Array.isArray(response?.stock_alerts) ? response.stock_alerts : []
  return { data, editable, righe, stockAlerts, cig, determine, contatti, linkedDdt, linkedFatture, linkedLavorazioni, statuses, currentStatus, revisions }
}

// Opzioni per la multi-select "Oggetto preventivo"
export const fetchPreventivoOggettiOptions = async ({ token, signal } = {}) => {
  const response = await apiFetch('/preventiviOggettiList.php', {
    token,
    signal,
  })
  const items = Array.isArray(response) ? response : (response?.data ?? [])
  // Normalizza in { id, value, label }
  const options = items
    .map((it) => {
      const rawValue = it?.id_oggetto ?? it?.id ?? it?.value ?? null
      const numericValue = Number(rawValue)
      const label = String(it?.label ?? it?.nome ?? '').trim()
      if (!Number.isFinite(numericValue) || numericValue <= 0 || label === '') {
        return null
      }
      return {
        id: numericValue,
        id_oggetto: numericValue,
        value: String(numericValue),
        label,
        attivo: Number(it?.attivo ?? it?.active ?? 1) === 1 ? 1 : 0,
        ordering: Number.isFinite(Number(it?.ordering)) ? Number(it?.ordering) : null,
      }
    })
    .filter(Boolean)
  return options
}

// Crea una nuova opzione "oggetto preventivo" nel DB
export const createPreventivoOggettoOption = async ({ token, label, active = true, signal } = {}) => {
  const response = await apiFetch('/preventiviOggettiCreate.php', {
    method: 'POST',
    token,
    body: {
      label: String(label || ''),
      attivo: active ? 1 : 0,
    },
    signal,
  })
  const data = response?.data ?? response ?? null
  if (!data) return null
  const id = data?.id_oggetto ?? data?.id ?? null
  if (id == null) {
    throw new Error('Creazione opzione oggetto fallita: ID non restituito dal server.')
  }
  const labelText = data?.label ?? String(label || '')
  const ordering = Number.isFinite(Number(data?.ordering)) ? Number(data?.ordering) : null
  const attivo = Number(data?.attivo ?? (active ? 1 : 0)) === 1 ? 1 : 0
  return {
    id,
    id_oggetto: id,
    value: String(id),
    label: labelText,
    ordering,
    attivo,
  }
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

export const updatePreventivoStatus = async ({ token, id, statusCode, operatorName, note, signal } = {}) => {
  const numericId = Number(id)
  const payload = {
    stato: statusCode,
  }
  if (Number.isFinite(numericId) && numericId > 0) {
    payload.id = numericId
  } else if (id) {
    payload.id = id
  }
  if (operatorName) {
    payload.operatore = operatorName
  }
  if (note) {
    payload.note = note
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

export const sendPreventivoEmail = async ({ token, id, to, cc, subject, message, revisionNote, revisionOperator, signal } = {}) => {
  const numericId = Number(id)
  const body = {
    id_preventivo: Number.isFinite(numericId) && numericId > 0 ? numericId : id,
    to,
    cc,
    subject,
    message,
    revision_note: revisionNote,
    revision_operator: revisionOperator,
  }

  const response = await apiFetch('/preventiviSendEmail.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return response ?? { ok: false }
}

export const fetchPreventivoRevisionDetail = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  const params = {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : id,
  }

  const response = await apiFetch('/preventiviRevisionDetail.php', {
    token,
    params,
    signal,
  })

  const revision = response?.revision ?? null
  return { revision }
}

export const fetchPreventiviRevisionsSummary = async ({ token, ids = [], signal } = {}) => {
  const validIds = Array.isArray(ids)
    ? ids.map((value) => {
        const num = Number(value)
        return Number.isFinite(num) && num > 0 ? num : null
      }).filter(Number.isFinite)
    : []

  const response = await apiFetch('/preventiviRevisionsSummary.php', {
    method: 'POST',
    token,
    body: { ids: validIds },
    signal,
  })

  const data = Array.isArray(response?.data) ? response.data : []
  return { data }
}

export const generateLavorazioneFromPreventivo = async ({
  token,
  id,
  titolo,
  descrizione,
  note,
  priorita,
  signal,
} = {}) => {
  const numericId = Number(id)
  const body = {
    id_preventivo: Number.isFinite(numericId) && numericId > 0 ? numericId : id,
    titolo,
    descrizione,
    note,
    priorita,
  }

  const response = await apiFetch('/preventiviGenerateLavorazione.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return response ?? {}
}
