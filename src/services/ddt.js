import { apiFetch } from './apiClient'

// Recupera l'elenco DDT con limite opzionale.
export const fetchDdtList = async ({ token, limit, id_anagrafica, signal } = {}) => {
  const params = {}
  if (limit !== undefined && limit !== null) {
    params.limit = limit
  }
  if (id_anagrafica !== undefined && id_anagrafica !== null) {
    params.id_anagrafica = id_anagrafica
  }

  const response = await apiFetch('/ddtList.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : []

  return { items }
}

// Recupera KPI dashboard DDT per periodo.
export const fetchDdtDashboard = async ({ token, period, signal } = {}) => {
  const params = {}
  if (period) {
    params.period = period
  }
  const payload = await apiFetch('/ddtDashboard.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

// Recupera la lista causali disponibili per i documenti DDT.
export const fetchDdtCausali = async ({ token, signal } = {}) => {
  const response = await apiFetch('/ddtCausaliList.php', {
    token,
    signal,
  })

  const rawItems = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : []

  return rawItems
    .map((item) => {
      const id = Number(item?.id_causale ?? item?.id ?? 0)
      if (!Number.isFinite(id) || id <= 0) {
        return null
      }
      return {
        id_causale: id,
        id,
        code: String(item?.code ?? item?.codice ?? ''),
        label: String(item?.label ?? item?.nome ?? '').trim() || `Causale #${id}`,
      }
    })
    .filter(Boolean)
}

// Recupera le destinazioni predefinite configurate per DDT.
export const fetchDdtDestinazioni = async ({ token, signal } = {}) => {
  const response = await apiFetch('/ddtDestinazioni.php', {
    token,
    signal,
  })

  const items = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : []

  return items
}

// Emette un nuovo DDT a partire da un preventivo.
export const emitPreventivoDdt = async ({
  token,
  id,
  data_ddt,
  id_causale,
  note,
  id_serie,
  signal,
} = {}) => {
  const payload = {
    id_preventivo: Number(id) || id,
    data_ddt: data_ddt || undefined,
    id_causale: Number(id_causale) > 0 ? Number(id_causale) : undefined,
    note: typeof note === 'string' && note.trim() !== '' ? note.trim() : undefined,
    id_serie: Number(id_serie) > 0 ? Number(id_serie) : undefined,
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  const response = await apiFetch('/preventiviEmitDdt.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

// Recupera il dettaglio completo di un DDT.
export const fetchDdtDetail = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/ddtDetail.php', {
    token,
    params: { id },
    signal,
  })

  return {
    data: response?.data ?? null,
  }
}

// Aggiorna i dati principali e le righe del DDT.
export const updateDdtDetail = async ({
  token,
  id,
  data_ddt,
  id_causale,
  note,
  id_anagrafica,
  id_sede_destinazione,
  id_destinazione_predefinita,
  destinazione_merce,
  aspetto,
  numero_colli,
  cura_trasporto,
  data_trasporto,
  vettore,
  stato_documento,
  righe,
  signal,
} = {}) => {
  const payload = {
    id_ddt: Number(id) || id,
  }

  if (id_anagrafica !== undefined) {
    const numeric = Number(id_anagrafica)
    if (Number.isFinite(numeric) && numeric > 0) {
      payload.id_anagrafica = numeric
    }
  }

  if (data_ddt !== undefined) {
    payload.data_ddt = data_ddt
  }

  if (id_causale !== undefined) {
    const numeric = Number(id_causale)
    payload.id_causale = Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  if (note !== undefined) {
    payload.note = note
  }

  if (id_sede_destinazione !== undefined) {
    const numeric = Number(id_sede_destinazione)
    payload.id_sede_destinazione = Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  if (destinazione_merce !== undefined) {
    payload.destinazione_merce = destinazione_merce
  }

  if (aspetto !== undefined) {
    payload.aspetto = aspetto
  }

  if (numero_colli !== undefined) {
    const numeric = Number(numero_colli)
    payload.numero_colli = Number.isFinite(numeric) ? numeric : null
  }

  if (cura_trasporto !== undefined) {
    payload.cura_trasporto = cura_trasporto
  }

  if (data_trasporto !== undefined) {
    payload.data_trasporto = data_trasporto
  }

  if (vettore !== undefined) {
    payload.vettore = vettore
  }

  if (id_destinazione_predefinita !== undefined) {
    const numeric = Number(id_destinazione_predefinita)
    payload.id_destinazione_predefinita = Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  if (stato_documento !== undefined) {
    const numeric = Number(stato_documento)
    payload.stato_documento = numeric === 2 ? 2 : 1
  }

  if (Array.isArray(righe)) {
    payload.righe = righe
  }

  const response = await apiFetch('/ddtUpdate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response?.data ?? null
}
