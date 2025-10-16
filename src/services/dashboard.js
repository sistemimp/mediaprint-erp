import { apiFetch } from './apiClient'

export const fetchAnagraficheDash = async ({ token, onlyActive, signal } = {}) => {
  const params = {}
  if (onlyActive != null) params.only_active = onlyActive ? 1 : 0

  const response = await apiFetch('/dashboard.php', {
    token,
    params,
    signal,
  })

  if (!response.ok) throw new Error('Network error')
  const json = await response
  if (!json.ok) throw new Error(json.message || 'API error')
  return json // { ok, kpi, series, preventivi_mese_per_stato, ultimi_preventivi, top_clienti }
}
