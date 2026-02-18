import { apiFetch } from './apiClient'

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

export const fetchAcquistiRichiestaDetail = async ({ token, id, signal } = {}) => {
  const params = { id }
  return apiFetch('/acquistiRichiesteDetail.php', { method: 'GET', token, params, signal })
}

export const createAcquistiRichiesta = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteCreate.php', { method: 'POST', token, body, signal })

export const updateAcquistiRichiesta = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteUpdate.php', { method: 'POST', token, body, signal })

export const createAcquistiRichiestaComment = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiesteCommentCreate.php', { method: 'POST', token, body, signal })

export const linkAcquistiRichiestaPreventivo = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiestePreventivoLink.php', { method: 'POST', token, body, signal })

export const unlinkAcquistiRichiestaPreventivo = async ({ token, body, signal } = {}) =>
  apiFetch('/acquistiRichiestePreventivoUnlink.php', { method: 'POST', token, body, signal })
