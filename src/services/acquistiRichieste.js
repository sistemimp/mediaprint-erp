import { apiFetch } from './apiClient'

// Recupera la lista richieste acquisto con filtri opzionali.
export const fetchAcquistiRichieste = async ({ token, signal, q, stato, priorita, assignedTo, createdBy } = {}) => {
  const params = {
    q,
    stato,
    priorita,
    assigned_to: assignedTo,
    created_by: createdBy,
  }
  const res = await apiFetch('/acquistiRichiesteList.php', { method: 'GET', token, params, signal })
  return { items: Array.isArray(res?.items) ? res.items : [] }
}

// Recupera il dettaglio richiesta acquisto (header + commenti).
export const fetchAcquistiRichiestaDetail = async ({ token, id, signal } = {}) => {
  const params = { id }
  return apiFetch('/acquistiRichiesteDetail.php', { method: 'GET', token, params, signal })
}

// Crea una nuova richiesta acquisto.
export const createAcquistiRichiesta = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteCreate.php', { method: 'POST', token, body, signal })

// Aggiorna una richiesta acquisto esistente.
export const updateAcquistiRichiesta = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteUpdate.php', { method: 'POST', token, body, signal })

// Aggiunge un commento alla richiesta acquisto.
export const createAcquistiRichiestaComment = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteCommentCreate.php', { method: 'POST', token, body, signal })

// Collega un preventivo a una richiesta acquisto.
export const linkAcquistiRichiestaPreventivo = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiestePreventivoLink.php', { method: 'POST', token, body, signal })

// Scollega un preventivo da una richiesta acquisto.
export const unlinkAcquistiRichiestaPreventivo = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiestePreventivoUnlink.php', { method: 'POST', token, body, signal })
