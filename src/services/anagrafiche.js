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
