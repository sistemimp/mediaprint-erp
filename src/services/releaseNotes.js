import { apiFetch } from './apiClient'

// Recupera l'elenco note di rilascio ordinate lato backend.
export const fetchReleaseNotes = async ({ token, signal } = {}) => {
  const res = await apiFetch('/releaseNotesList.php', { method: 'GET', token, signal })
  return { items: Array.isArray(res?.items) ? res.items : [] }
}

// Crea una nuova release note (endpoint amministrativo).
export const createReleaseNote = async ({ token, body, signal } = {}) =>
  apiFetch('/releaseNotesCreate.php', { method: 'POST', token, body, signal })
