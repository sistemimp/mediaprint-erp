import { apiFetch } from './apiClient'

export const fetchDashboardSales = async ({ token, signal, onlyActive, period } = {}) => {
  const params = {}
  if (onlyActive != null) {
    params.only_active = onlyActive ? 1 : 0
  }
  if (period) {
    params.period = period
  }

  const payload = await apiFetch('/dashboard.php', {
    token,
    signal,
    params,
  })

  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }

  return payload // { ok, kpi, series, sales }
}

export const fetchAnagraficheDash = async (options = {}) => {
  return fetchDashboardSales(options)
}

export const fetchNewClientsList = async ({ token, limit = 20, signal, period } = {}) => {
  const params = { limit: Math.max(1, Math.min(limit, 100)) }
  if (period) {
    params.period = period
  }
  const payload = await apiFetch('/dashboardNewClients.php', {
    token,
    signal,
    params,
  })
  if (!payload?.ok) {
    throw new Error(payload?.message || 'API error')
  }
  return payload
}
