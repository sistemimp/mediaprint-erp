import { apiFetch } from './apiClient'

const sanitizeParams = (params = {}) => {
  const clean = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }
    if (typeof value === 'string' && value.trim() === '') {
      return
    }
    clean[key] = value
  })
  return clean
}

const defaultPagination = {
  page: 1,
  page_size: 25,
  total_items: 0,
  total_pages: 1,
}

export const fetchLavorazioniDashboard = async ({
  token,
  periodo,
  reparto,
  stato,
  signal,
} = {}) => {
  const params = sanitizeParams({
    periodo,
    reparto,
    stato,
  })

  const payload = await apiFetch('/lavorazioniDashboard.php', {
    token,
    params,
    signal,
  })

  return payload ?? {}
}

export const fetchLavorazioniList = async ({
  token,
  page = 1,
  pageSize = 20,
  search,
  stato,
  reparto,
  operatore,
  periodo,
  sort,
  signal,
} = {}) => {
  const params = sanitizeParams({
    page,
    page_size: pageSize,
    search,
    stato,
    reparto,
    operatore,
    periodo,
    sort,
  })

  const payload = await apiFetch('/lavorazioniList.php', {
    token,
    params,
    signal,
  })

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pagination: payload?.pagination ?? defaultPagination,
    filters: payload?.filters ?? {},
    summary: payload?.summary ?? null,
  }
}

export const fetchLavorazioneDetail = async ({ token, id, signal } = {}) => {
  if (!id) {
    throw new Error('ID lavorazione mancante')
  }

  const payload = await apiFetch('/lavorazioniDetail.php', {
    token,
    params: { id },
    signal,
  })

  return payload ?? null
}

export const updateLavorazioneStatus = async ({ token, id, stato, signal } = {}) => {
  if (!id) {
    throw new Error('ID lavorazione mancante')
  }
  if (!stato) {
    throw new Error('Nuovo stato lavorazione mancante')
  }

  const body = {
    id_lavorazione: id,
    stato,
  }

  const payload = await apiFetch('/lavorazioniStatus.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? { ok: true }
}

export const fetchLavorazioneActivityTemplates = async ({ token, signal } = {}) => {
  const payload = await apiFetch('/lavorazioniActivityTemplates.php', {
    token,
    signal,
  })

  if (Array.isArray(payload)) {
    return payload
  }

  return Array.isArray(payload?.items) ? payload.items : []
}

export const createLavorazioneActivity = async ({
  token,
  idLavorazione,
  templateId,
  titolo,
  descrizione,
  priorita,
  dataScadenza,
  note,
  repartoId,
  operatori,
  signal,
} = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }

  const body = {
    id_lavorazione: idLavorazione,
    id_template: templateId || undefined,
    titolo: titolo || undefined,
    descrizione: descrizione || undefined,
    priorita: priorita || undefined,
    data_scadenza: dataScadenza || undefined,
    note: note || undefined,
    id_reparto: repartoId || undefined,
    operatori: Array.isArray(operatori) ? operatori : undefined,
  }

  const payload = await apiFetch('/lavorazioniActivityCreate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
}

export const fetchLavorazioniAssignmentsConfig = async ({ token, signal } = {}) => {
  const payload = await apiFetch('/lavorazioniAssignmentsConfig.php', {
    token,
    signal,
  })

  return {
    reparti: Array.isArray(payload?.reparti) ? payload.reparti : [],
    operatori: Array.isArray(payload?.operatori) ? payload.operatori : [],
  }
}

export const assignLavorazione = async ({ token, idLavorazione, repartoId, operatori, signal } = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }

  const body = {
    id_lavorazione: idLavorazione,
  }

  if (repartoId !== undefined) {
    body.id_reparto = repartoId || null
  }

  if (Array.isArray(operatori)) {
    body.operatori = operatori
  }

  return apiFetch('/lavorazioniAssign.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const assignLavorazioneActivity = async ({
  token,
  idAttivita,
  repartoId,
  operatori,
  signal,
} = {}) => {
  if (!idAttivita) {
    throw new Error('ID attivita mancante')
  }

  const body = {
    id_attivita: idAttivita,
  }

  if (repartoId !== undefined) {
    body.id_reparto = repartoId || null
  }

  if (Array.isArray(operatori)) {
    body.operatori = operatori
  }

  return apiFetch('/lavorazioniActivityAssign.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const notifyLavorazioneOperators = async ({
  token,
  idLavorazione,
  idAttivita,
  titolo,
  messaggio,
  operatori,
  signal,
} = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }

  const body = {
    id_lavorazione: idLavorazione,
    titolo: titolo || undefined,
    messaggio,
  }

  if (idAttivita) {
    body.id_attivita = idAttivita
  }

  if (Array.isArray(operatori)) {
    body.operatori = operatori
  }

  return apiFetch('/lavorazioniNotifyOperators.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}

export const fetchLavorazioneNotifications = async ({
  token,
  accountId,
  limit = 10,
  onlyUnread = false,
  signal,
} = {}) => {
  if (!accountId) {
    throw new Error('ID account mancante')
  }

  const params = sanitizeParams({
    id_account: accountId,
    limit,
    only_unread: onlyUnread ? 1 : undefined,
  })

  return apiFetch('/lavorazioniNotifications.php', {
    token,
    params,
    signal,
  })
}

export const markLavorazioneNotificationsRead = async ({ token, accountId, notificationIds, signal } = {}) => {
  if (!accountId) {
    throw new Error('ID account mancante')
  }
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Nessuna notifica da aggiornare')
  }

  const body = {
    id_account: accountId,
    id_notifiche: notificationIds,
  }

  return apiFetch('/lavorazioniNotificationsRead.php', {
    method: 'POST',
    token,
    body,
    signal,
  })
}
