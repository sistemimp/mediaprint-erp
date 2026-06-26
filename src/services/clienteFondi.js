import { apiFetch } from './apiClient'

export const fetchClienteFondi = async ({ token, id_anagrafica, only_active = true, signal } = {}) => {
  const params = {}
  if (id_anagrafica) params.id_anagrafica = id_anagrafica
  params.only_active = only_active ? 1 : 0

  const response = await apiFetch('/clienteFondiList.php', {
    token,
    params,
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}

export const fetchClienteFondoMovimenti = async ({ token, id_fondo, limit = 200, signal } = {}) => {
  const response = await apiFetch('/clienteFondiMovimenti.php', {
    token,
    params: { id_fondo, limit },
    signal,
  })

  return {
    fondo: response?.fondo ?? null,
    items: Array.isArray(response?.items) ? response.items : [],
  }
}

export const createClienteFondoMovimento = async ({
  token,
  id_fondo,
  id_anagrafica,
  causale_code,
  causale_label,
  tipo_movimento,
  importo,
  note,
  riferimento_tipo,
  riferimento_id,
  id_fattura,
  id_lavorazione,
  id_pagamento,
  allocazioni,
  data_allocazione,
  signal,
} = {}) => {
  const payload = {
    id_fondo: id_fondo ? Number(id_fondo) : undefined,
    id_anagrafica: id_anagrafica ? Number(id_anagrafica) : undefined,
    causale_code: causale_code || undefined,
    causale_label: causale_label || undefined,
    tipo_movimento: tipo_movimento || undefined,
    importo: importo !== undefined && importo !== null && importo !== '' ? Number(importo) : undefined,
    note: typeof note === 'string' && note.trim() !== '' ? note.trim() : undefined,
    riferimento_tipo: riferimento_tipo || undefined,
    riferimento_id: riferimento_id ? Number(riferimento_id) : undefined,
    id_fattura: id_fattura ? Number(id_fattura) : undefined,
    id_lavorazione: id_lavorazione ? Number(id_lavorazione) : undefined,
    id_pagamento: id_pagamento ? Number(id_pagamento) : undefined,
    allocazioni: Array.isArray(allocazioni) ? allocazioni : undefined,
    data_allocazione: data_allocazione || undefined,
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || Number.isNaN(payload[key])) {
      delete payload[key]
    }
  })

  const response = await apiFetch('/clienteFondiMovimentoCreate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return {
    data: response?.data ?? null,
    fondo: response?.fondo ?? null,
  }
}
