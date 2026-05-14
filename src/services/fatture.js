import { apiFetch, buildApiUrl, getStoredToken, uploadToApi } from './apiClient'

// Recupera l'elenco fatture con filtri opzionali.
export const fetchFattureList = async ({ token, limit, date_from, date_to, is_acquisto, id_anagrafica, signal } = {}) => {
  const params = {}
  if (limit !== undefined && limit !== null) {
    params.limit = limit
  }
  if (date_from) {
    params.date_from = date_from
  }
  if (date_to) {
    params.date_to = date_to
  }
  if (is_acquisto !== undefined) {
    params.is_acquisto = is_acquisto ? 1 : 0
  }
  if (id_anagrafica !== undefined && id_anagrafica !== null) {
    params.id_anagrafica = id_anagrafica
  }

  const response = await apiFetch('/fattureList.php', {
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

// Recupera KPI dashboard fatture.
export const fetchFattureDashboard = async ({ token, period, is_acquisto, signal } = {}) => {
  const params = {}
  if (period) {
    params.period = period
  }
  if (is_acquisto !== undefined) {
    params.is_acquisto = is_acquisto ? 1 : 0
  }
  const payload = await apiFetch('/fattureDashboard.php', { token, params, signal })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}

// Recupera il dettaglio singola fattura.
export const fetchFatturaDetail = async ({ token, id, is_acquisto, signal } = {}) => {
  const response = await apiFetch('/fattureDetail.php', {
    token,
    params: { id, ...(is_acquisto !== undefined ? { is_acquisto: is_acquisto ? 1 : 0 } : {}) },
    signal,
  })

  return {
    data: response?.data ?? null,
  }
}

// Recupera configurazioni utili alla gestione fatture (stati, sezionali, metodi).
export const fetchFattureConfig = async ({ token, is_acquisto, signal } = {}) => {
  const params = {}
  if (is_acquisto !== undefined) {
    params.is_acquisto = is_acquisto ? 1 : 0
  }
  const response = await apiFetch('/fattureConfig.php', {
    token,
    params,
    signal,
  })

  return {
    sezionali: Array.isArray(response?.sezionali) ? response.sezionali : [],
    tipi: Array.isArray(response?.tipi) ? response.tipi : [],
    stati: Array.isArray(response?.stati) ? response.stati : [],
    metodi_pagamento: Array.isArray(response?.metodi_pagamento) ? response.metodi_pagamento : [],
    modalita_pagamento: Array.isArray(response?.modalita_pagamento) ? response.modalita_pagamento : [],
  }
}

// Emette una fattura partendo da un preventivo.
export const emitPreventivoFattura = async ({
  token,
  id,
  data_fattura,
  id_sezionale,
  id_tipo_fatt,
  id_stato_fatt,
  note,
  righe_ids,
  is_acquisto,
  signal,
} = {}) => {
  const payload = {
    id_preventivo: Number(id) || id,
    data_fattura: data_fattura || undefined,
    id_sezionale: Number(id_sezionale) || undefined,
    id_tipo_fatt: Number(id_tipo_fatt) || undefined,
    id_stato_fatt: Number(id_stato_fatt) || undefined,
    note: typeof note === 'string' && note.trim() !== '' ? note.trim() : undefined,
    righe_ids: Array.isArray(righe_ids) && righe_ids.length > 0 ? righe_ids : undefined,
    is_acquisto: is_acquisto !== undefined ? (is_acquisto ? 1 : 0) : undefined,
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  const response = await apiFetch('/preventiviEmitFattura.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

// Aggiorna testata e righe della fattura.
export const updateFatturaDetail = async ({
  token,
  id,
  data_fattura,
  id_stato_fatt,
  id_sezionale,
  note,
  saldo,
  righe,
  cliente_pec,
  cliente_codice_sdi,
  cliente_iban,
  cliente_banca,
  cliente_modalita_pagamento,
  cliente_id_cond_pagamento,
  cliente_giorni_pagamento,
  ricalcola_saldi,
  signal,
} = {}) => {
  const payload = {
    id_fattura: Number(id) || id,
  }

  if (data_fattura !== undefined) {
    payload.data_fattura = data_fattura
  }

  if (id_stato_fatt !== undefined) {
    const numeric = Number(id_stato_fatt)
    payload.id_stato_fatt = Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }

  if (id_sezionale !== undefined) {
    const numeric = Number(id_sezionale)
    if (Number.isFinite(numeric) && numeric > 0) {
      payload.id_sezionale = numeric
    }
  }

  if (note !== undefined) {
    payload.note = note
  }

  if (saldo !== undefined) {
    if (saldo === null || saldo === '') {
      payload.saldo = null
    } else {
      const numericSaldo = Number(saldo)
      payload.saldo = Number.isFinite(numericSaldo) ? numericSaldo : null
    }
  }

  if (Array.isArray(righe)) {
    payload.righe = righe.map((row) => {
      const normalized = {
        descrizione: row.descrizione,
        quantita: row.quantita,
        prezzo_unitario: row.prezzo_unitario,
      }
      if (row.sconto !== undefined) {
        normalized.sconto = row.sconto
      }
      if (row.aliquota_iva !== undefined) {
        normalized.aliquota_iva = row.aliquota_iva
      }
      if (row.id_prodotto !== undefined) {
        normalized.id_prodotto = row.id_prodotto
      }
      if (row.id_sdi_natura_iva !== undefined) {
        normalized.id_sdi_natura_iva = row.id_sdi_natura_iva
      }
      return normalized
    })
  }

  if (cliente_pec !== undefined) {
    payload.cliente_pec = cliente_pec
  }
  if (cliente_codice_sdi !== undefined) {
    payload.cliente_codice_sdi = cliente_codice_sdi
  }
  if (cliente_iban !== undefined) {
    payload.cliente_iban = cliente_iban
  }
  if (cliente_banca !== undefined) {
    payload.cliente_banca = cliente_banca
  }
  if (cliente_modalita_pagamento !== undefined) {
    payload.cliente_modalita_pagamento = cliente_modalita_pagamento
  }
  if (cliente_id_cond_pagamento !== undefined) {
    payload.cliente_id_cond_pagamento = cliente_id_cond_pagamento
  }
  if (cliente_giorni_pagamento !== undefined) {
    payload.cliente_giorni_pagamento = cliente_giorni_pagamento
  }
  if (ricalcola_saldi !== undefined) {
    payload.ricalcola_saldi = ricalcola_saldi ? 1 : 0
  }

  const response = await apiFetch('/fattureUpdate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response?.data ?? null
}

// Recupera i pagamenti collegati alla fattura e i totali calcolati.
export const fetchFatturaPagamenti = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/fatturePagamentiList.php', {
    token,
    params: { id },
    signal,
  })

  const items = Array.isArray(response?.items) ? response.items : []
  return {
    items,
    totale_pagato: Number(response?.totale_pagato) || 0,
    totale_documento: Number(response?.totale_documento) || 0,
    saldo_residuo: Number(response?.saldo_residuo) || 0,
  }
}

// Recupera il log cambi stato della fattura con paginazione.
export const fetchFatturaStatusLog = async ({ token, id, limit, offset, signal } = {}) => {
  const params = { id }
  if (limit !== undefined) {
    params.limit = limit
  }
  if (offset !== undefined) {
    params.offset = offset
  }

  const response = await apiFetch('/fattureStatusLog.php', {
    token,
    params,
    signal,
  })

  if (Array.isArray(response?.items)) {
    return { items: response.items, meta: response?.meta ?? null }
  }

  if (Array.isArray(response)) {
    return { items: response, meta: null }
  }

  return { items: [] }
}

// Registra o aggiorna un pagamento associato alla fattura.
export const saveFatturaPagamento = async ({
  token,
  id_fattura,
  id_pagamento,
  data_pagamento,
  importo,
  id_metodo,
  id_mp,
  note,
  importo_documento,
  import_uid,
  signal,
} = {}) => {
  const payload = {
    id_fattura: Number(id_fattura) || undefined,
    id_pagamento: Number(id_pagamento) || undefined,
    data_pagamento: data_pagamento || undefined,
    id_metodo: Number(id_metodo) || undefined,
    id_mp: Number(id_mp) || undefined,
    note: typeof note === 'string' && note.trim() !== '' ? note : undefined,
  }

  if (importo !== undefined && importo !== null && importo !== '') {
    payload.importo = importo
  }
  if (importo_documento !== undefined && importo_documento !== null && importo_documento !== '') {
    payload.importo_documento = importo_documento
  }
  if (typeof import_uid === 'string' && import_uid.trim() !== '') {
    payload.import_uid = import_uid.trim()
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  const response = await apiFetch('/fatturePagamentiSave.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response?.data ?? null
}

// Elimina un pagamento collegato alla fattura.
export const deleteFatturaPagamento = async ({
  token,
  id_fattura,
  id_pagamento,
  signal,
} = {}) => {
  const payload = {
    id_fattura: Number(id_fattura) || undefined,
    id_pagamento: Number(id_pagamento) || undefined,
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  return apiFetch('/fatturePagamentiDelete.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })
}

// Esporta la fattura in XML (tracciato SDI) restituendo blob e filename.
export const exportFatturaXml = async ({ token, id, signal } = {}) => {
  const fatturaId = Number(id) || 0
  if (!fatturaId) {
    throw new Error('ID fattura mancante per l\'esportazione XML.')
  }

  const url = buildApiUrl('/fattureExportXml.php', { id: fatturaId })
  const headers = {}
  const resolvedToken = token || getStoredToken()
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
    headers['X-Authorization'] = `Bearer ${resolvedToken}`
    headers['X-Access-Token'] = resolvedToken
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    signal,
  })

  if (!response.ok) {
    let message = `Errore ${response.status}`
    try {
      const payload = await response.json()
      if (payload?.message) {
        message = payload.message
      }
    } catch (_error) {
      // ignore parse errors
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  let filename = `fattura-${fatturaId}.xml`
  const disposition = response.headers.get('Content-Disposition')
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i)
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim() || filename
    }
  }

  return { blob, filename }
}

// Importa una o piu fatture da file XML.
export const importFatturaXml = async ({ token, files, is_acquisto, signal } = {}) => {
  const normalized = files
    ? Array.isArray(files)
      ? files.filter(Boolean)
      : [files]
    : []
  if (normalized.length === 0) {
    throw new Error('Selezionare almeno un file XML SdI da importare.')
  }
  const formData = new FormData()
  normalized.forEach((file) => {
    formData.append('file[]', file, file.name)
  })

  const payload = await uploadToApi('/fattureImportXml.php', {
    token,
    formData,
    params: is_acquisto !== undefined ? { is_acquisto: is_acquisto ? 1 : 0 } : undefined,
    signal,
  })

  return payload ?? {}
}

// Costruisce la URL download del PDF fattura.
export const buildFatturaPdfUrl = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null
  }
  const params = new URLSearchParams({
    id_fattura: numericId,
    j_username: 'gestionaleMp',
    j_password: 'gestionaleMp',
  })
  return `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Fatture.pdf?${params.toString()}`
}
