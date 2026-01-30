import { apiFetch } from './apiClient'

export const fetchReleaseNotes = async ({ token, signal } = {}) => {
  const res = await apiFetch('/releaseNotesList.php', { method: 'GET', token, signal })
  return { items: Array.isArray(res?.items) ? res.items : [] }
}

export const createReleaseNote = async ({ token, body, signal } = {}) =>
  apiFetch('/releaseNotesCreate.php', { method: 'POST', token, body, signal })
