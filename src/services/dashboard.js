import { apiFetch } from './apiClient'

export const fetchAnagraficheDash = async ({
  token,
  search,
  signal,
  page,
  pageSize,
  sortBy,
  sortDirection,
} = {}) => {
  const payload = {}

  const response = await apiFetch('/dashboard.php', {
    token,
    params: payload,
    signal,
  })

  if (!response.ok) throw new Error('Network error')
  const json = await response
  if (!json.ok) throw new Error(json.message || 'API error')
  return json // { ok, kpi: {totale_generale, nuovi_mese_corrente, nuovi_mese_precedente, perc_change_mom}, series: [...] }
}
