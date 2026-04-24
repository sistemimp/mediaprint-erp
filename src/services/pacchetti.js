import { apiFetch } from './apiClient'

// Recupera elenco pacchetti con ricerca/filtro attivi.
export const fetchPacchetti = async ({ token, signal, q, onlyActive } = {}) => {
  const params = { q }
  if (onlyActive != null) params.only_active = onlyActive ? 1 : 0
  const res = await apiFetch('/Pacchetti/list.php', { method: 'GET', token, params, signal })
  return { items: Array.isArray(res?.items) ? res.items : [] }
}

// Recupera dettaglio completo del pacchetto e relative righe.
export const fetchPacchettoDetail = async ({ token, signal, id }) => {
  const res = await apiFetch('/Pacchetti/detail.php', { method: 'GET', token, params: { id }, signal })
  return { data: res?.data || null, righe: Array.isArray(res?.righe) ? res.righe : [] }
}

// Crea o aggiorna un pacchetto.
export const savePacchetto = async ({ token, signal, ...payload }) => {
  const res = await apiFetch('/Pacchetti/save.php', { method: 'POST', token, body: payload, signal })
  return { id_pacchetto: res?.id_pacchetto }
}

// Elimina un pacchetto.
export const deletePacchetto = async ({ token, signal, id }) => {
  const res = await apiFetch('/Pacchetti/delete.php', { method: 'POST', token, body: { id }, signal })
  return res
}
