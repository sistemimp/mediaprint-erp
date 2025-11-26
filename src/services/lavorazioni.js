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
