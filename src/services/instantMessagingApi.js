import { apiFetch } from './apiClient'

// Recupera l'elenco account disponibili nel modulo messaggistica.
export const listImAccounts = async () => {
  const response = await apiFetch('/imAccountsList.php')
  return response?.data ?? []
}

// Recupera i thread IM visibili all'utente corrente.
export const listImThreads = async () => {
  const response = await apiFetch('/imThreadsList.php')
  return response?.data ?? []
}

// Crea un nuovo thread con uno o piu account partecipanti.
export const createImThread = async (accountIds) => {
  const ids = Array.isArray(accountIds) ? accountIds : [accountIds]
  const response = await apiFetch('/imThreadCreate.php', {
    method: 'POST',
    body: { id_accounts: ids },
  })
  return response?.data ?? null
}

// Carica i messaggi di un thread con supporto paginazione backward.
export const listImMessages = async ({ threadId, limit = 200, beforeId = null }) => {
  const response = await apiFetch('/imMessagesList.php', {
    params: {
      id_thread: threadId,
      limit,
      before_id: beforeId ?? undefined,
    },
  })
  return response?.data ?? []
}

// Invia un nuovo messaggio nel thread indicato.
export const sendImMessage = async ({ threadId, body }) => {
  const response = await apiFetch('/imMessagesSend.php', {
    method: 'POST',
    body: { id_thread: threadId, body },
  })
  return response?.data ?? null
}

// Marca il thread come letto per l'utente corrente.
export const markImThreadRead = async (threadId) => {
  await apiFetch('/imThreadRead.php', {
    method: 'POST',
    body: { id_thread: threadId },
  })
}
