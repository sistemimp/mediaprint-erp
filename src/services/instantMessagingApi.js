import { apiFetch } from './apiClient'

export const listImAccounts = async () => {
  const response = await apiFetch('/imAccountsList.php')
  return response?.data ?? []
}

export const listImThreads = async () => {
  const response = await apiFetch('/imThreadsList.php')
  return response?.data ?? []
}

export const createImThread = async (accountId) => {
  const response = await apiFetch('/imThreadCreate.php', {
    method: 'POST',
    body: { id_account: accountId },
  })
  return response?.data ?? null
}

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

export const sendImMessage = async ({ threadId, body }) => {
  const response = await apiFetch('/imMessagesSend.php', {
    method: 'POST',
    body: { id_thread: threadId, body },
  })
  return response?.data ?? null
}

export const markImThreadRead = async (threadId) => {
  await apiFetch('/imThreadRead.php', {
    method: 'POST',
    body: { id_thread: threadId },
  })
}
