import { apiFetch } from './apiClient'

// Recupera la lista ticket con filtri opzionali.
export const fetchTickets = async ({ token, signal, q, stato, priorita, assignedTo, createdBy } = {}) => {
  const params = {
    q,
    stato,
    priorita,
    assigned_to: assignedTo,
    created_by: createdBy,
  }
  const res = await apiFetch('/ticketsList.php', { method: 'GET', token, params, signal })
  return { items: Array.isArray(res?.items) ? res.items : [] }
}

// Recupera il dettaglio ticket (header + messaggi) per ID.
export const fetchTicketDetail = async ({ token, id, signal } = {}) => {
  const params = { id }
  return apiFetch('/ticketsDetail.php', { method: 'GET', token, params, signal })
}

// Crea un nuovo ticket.
export const createTicket = async ({ token, body, signal } = {}) =>
  apiFetch('/ticketsCreate.php', { method: 'POST', token, body, signal })

// Aggiorna i dati principali di un ticket esistente.
export const updateTicket = async ({ token, body, signal } = {}) =>
  apiFetch('/ticketsUpdate.php', { method: 'POST', token, body, signal })

// Aggiunge un commento al ticket.
export const createTicketComment = async ({ token, body, signal } = {}) =>
  apiFetch('/ticketsCommentCreate.php', { method: 'POST', token, body, signal })
