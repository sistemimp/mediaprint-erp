import { apiFetch, buildApiUrl, getStoredToken } from './apiClient'

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

export const fetchLavorazioneActivityTemplates = async ({ token, all = false, signal } = {}) => {
  const payload = await apiFetch('/lavorazioniActivityTemplates.php', {
    token,
    params: all ? { all: 1 } : undefined,
    signal,
  })

  if (Array.isArray(payload)) {
    return payload
  }

  return Array.isArray(payload?.items) ? payload.items : []
}

export const saveLavorazioneActivityTemplate = async ({
  token,
  idTemplate,
  titolo,
  descrizione,
  priorita,
  repartoId,
  durataGiorni,
  attivo,
  ordering,
  signal,
} = {}) => {
  const body = {
    id_template: idTemplate || undefined,
    titolo: titolo || undefined,
    descrizione: descrizione ?? undefined,
    priorita: priorita || undefined,
    id_reparto: repartoId !== undefined ? repartoId : undefined,
    durata_predefinita_giorni: durataGiorni !== undefined ? durataGiorni : undefined,
    attivo: attivo !== undefined ? (attivo ? 1 : 0) : undefined,
    ordering: ordering !== undefined ? ordering : undefined,
  }

  const payload = await apiFetch('/lavorazioniActivityTemplatesSave.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
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

export const updateLavorazioneInfo = async ({
  token,
  idLavorazione,
  note,
  titolo,
  descrizione,
  stato,
  priorita,
  repartoId,
  dataInizioPrevista,
  dataFinePrevista,
  dataAvvioReale,
  signal,
} = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }

  const body = {
    id_lavorazione: idLavorazione,
  }

  if (note !== undefined) {
    body.note = note
  }
  if (titolo !== undefined) {
    body.titolo = titolo
  }
  if (descrizione !== undefined) {
    body.descrizione = descrizione
  }
  if (stato !== undefined) {
    body.stato = stato
  }
  if (priorita !== undefined) {
    body.priorita = priorita
  }
  if (repartoId !== undefined) {
    body.id_reparto = repartoId
  }
  if (dataInizioPrevista !== undefined) {
    body.data_inizio_prevista = dataInizioPrevista
  }
  if (dataFinePrevista !== undefined) {
    body.data_fine_prevista = dataFinePrevista
  }
  if (dataAvvioReale !== undefined) {
    body.data_avvio_reale = dataAvvioReale
  }

  const payload = await apiFetch('/lavorazioniUpdate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
}

export const notifyLavorazioneOperators = async ({
  token,
  idLavorazione,
  idAttivita,
  createdBy,
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
    created_by: createdBy ?? undefined,
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

export const updateLavorazioneActivityStatus = async ({
  token,
  idAttivita,
  stato,
  percentuale,
  createdBy,
  signal,
} = {}) => {
  if (!idAttivita) {
    throw new Error('ID attivita mancante')
  }
  if (!stato) {
    throw new Error('Stato attivita mancante')
  }

  const body = {
    id_attivita: idAttivita,
    stato,
  }
  if (percentuale !== undefined && percentuale !== null) {
    body.percentuale = percentuale
  }
  if (createdBy !== undefined && createdBy !== null) {
    body.created_by = createdBy
  }

  const payload = await apiFetch('/lavorazioniActivityStatus.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
}

export const updateLavorazioneActivityReport = async ({
  token,
  idAttivita,
  dataAvvio,
  dataFine,
  operatoreId,
  note,
  signal,
} = {}) => {
  if (!idAttivita) {
    throw new Error('ID attivita mancante')
  }

  const body = {
    id_attivita: idAttivita,
    data_avvio: dataAvvio ?? undefined,
    data_fine: dataFine ?? undefined,
    id_operatore: operatoreId ?? undefined,
    note: note ?? undefined,
  }

  const payload = await apiFetch('/lavorazioniActivityReport.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
}

export const deleteLavorazioneActivity = async ({ token, idAttivita, signal } = {}) => {
  if (!idAttivita) {
    throw new Error('ID attività mancante')
  }

  const body = {
    id_attivita: idAttivita,
  }

  const payload = await apiFetch('/lavorazioniActivityDelete.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
}

export const updateLavorazioneActivity = async ({
  token,
  idAttivita,
  titolo,
  descrizione,
  priorita,
  dataScadenza,
  note,
  repartoId,
  quantitaPrevista,
  signal,
} = {}) => {
  if (!idAttivita) {
    throw new Error('ID attivita mancante')
  }

  const body = {
    id_attivita: idAttivita,
  }

  if (titolo !== undefined) {
    body.titolo = titolo
  }
  if (descrizione !== undefined) {
    body.descrizione = descrizione
  }
  if (priorita !== undefined) {
    body.priorita = priorita
  }
  if (dataScadenza !== undefined) {
    body.data_scadenza = dataScadenza
  }
  if (note !== undefined) {
    body.note = note
  }
  if (repartoId !== undefined) {
    body.id_reparto = repartoId
  }
  if (quantitaPrevista !== undefined) {
    body.quantita_prevista = quantitaPrevista
  }

  const payload = await apiFetch('/lavorazioniActivityUpdate.php', {
    method: 'POST',
    token,
    body,
    signal,
  })

  return payload ?? {}
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

export const fetchLavorazioneDocuments = async ({ token, idLavorazione, signal } = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }
  const payload = await apiFetch('/lavorazioniDocuments.php', {
    token,
    params: { id_lavorazione: idLavorazione },
    signal,
  })
  return payload ?? {}
}

export const fetchLavorazioneFiles = async ({ token, idLavorazione, signal } = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }
  const payload = await apiFetch('/lavorazioniFilesList.php', {
    token,
    params: { id_lavorazione: idLavorazione },
    signal,
  })
  return Array.isArray(payload?.items) ? payload.items : []
}

export const uploadLavorazioneFile = async ({
  token,
  idLavorazione,
  file,
  titolo,
  categoria,
  note,
  createdBy,
  signal,
} = {}) => {
  if (!idLavorazione) {
    throw new Error('ID lavorazione mancante')
  }
  if (!file) {
    throw new Error('File mancante')
  }

  const formData = new FormData()
  formData.append('id_lavorazione', idLavorazione)
  if (titolo) formData.append('titolo', titolo)
  if (categoria) formData.append('categoria', categoria)
  if (note) formData.append('note', note)
  if (createdBy) formData.append('created_by', createdBy)
  formData.append('file', file)

  const url = buildApiUrl('/lavorazioniFilesUpload.php')
  const headers = {}
  const resolvedToken = token || getStoredToken()
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
    headers['X-Authorization'] = `Bearer ${resolvedToken}`
    headers['X-Access-Token'] = resolvedToken
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
    signal,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch (_error) {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.message || `Errore ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload ?? {}
}
