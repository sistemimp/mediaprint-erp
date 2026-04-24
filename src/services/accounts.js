import { apiFetch } from './apiClient'

// Normalizza metadati paginazione anche con payload array semplice.
const normaliseMeta = (response, fallbackItems) => {
  if (!response || Array.isArray(response)) {
    const total = fallbackItems.length
    return {
      total,
      per_page: fallbackItems.length,
      current_page: 1,
      last_page: 1,
      from: total > 0 ? 1 : 0,
      to: total,
    }
  }

  return (
    response.meta ?? {
      total: fallbackItems.length,
      per_page: fallbackItems.length,
      current_page: 1,
      last_page: 1,
      from: fallbackItems.length > 0 ? 1 : 0,
      to: fallbackItems.length,
    }
  )
}

// Recupera elenco account con filtri, sorting e paginazione.
export const fetchAccounts = async ({
  token,
  search,
  accountType,
  isActive,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
} = {}) => {
  const params = {}

  if (search) params.search = search
  if (accountType) params.account_type = accountType
  if (isActive !== null && isActive !== undefined) params.is_active = isActive
  if (page) params.page = page
  if (pageSize) params.per_page = pageSize
  if (sortBy) params.sort_by = sortBy
  if (sortDirection) params.sort_direction = sortDirection

  const response = await apiFetch('/accountsList.php', { token, params, signal })
  const items = Array.isArray(response) ? response : (response?.data ?? [])
  const meta = normaliseMeta(response, items)

  return { items, meta }
}

// Recupera i ruoli account disponibili.
export const fetchAccountRoles = async ({ token, signal } = {}) => {
  const response = await apiFetch('/accountsRolesList.php', { token, signal })
  return Array.isArray(response?.data) ? response.data : []
}

// Recupera dettaglio account e permessi.
export const fetchAccountDetail = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID account non valido.')
  }
  const params = { id: numericId }
  return apiFetch('/accountsDetail.php', { token, params, signal })
}

// Aggiorna i permessi effettivi di un account.
export const updateAccountPermissions = async ({ token, id, permissions, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID account non valido.')
  }
  const body = { id_account: numericId, permissions }
  return apiFetch('/accountsPermissionsUpdate.php', { method: 'POST', token, body, signal })
}

// Recupera anagrafiche selezionabili per account cliente.
export const fetchAccountAnagraficheOptions = async ({ token, accountId, signal } = {}) => {
  const params = {}
  if (accountId) params.id_account = accountId
  return apiFetch('/accountsAnagrafiche.php', { token, params, signal })
}

// Recupera contatti associabili alle anagrafiche selezionate.
export const fetchAccountContattiOptions = async ({ token, anagrafiche, accountId, signal } = {}) => {
  const params = {}
  if (Array.isArray(anagrafiche) && anagrafiche.length > 0) {
    params.anagrafiche = anagrafiche.join(',')
  }
  if (accountId) {
    params.id_account = accountId
  }
  return apiFetch('/accountsContattiList.php', { token, params, signal })
}

// Crea un nuovo account.
export const createAccount = async ({ token, body, signal } = {}) =>
  apiFetch('/accountsCreate.php', { method: 'POST', token, body, signal })

// Aggiorna un account esistente.
export const updateAccount = async ({ token, body, signal } = {}) =>
  apiFetch('/accountsUpdate.php', { method: 'POST', token, body, signal })

// Elimina/disattiva un account.
export const deleteAccount = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID account non valido.')
  }
  return apiFetch('/accountsDelete.php', { method: 'POST', token, body: { id: numericId }, signal })
}

// Resetta password account (opzionalmente impostando una password specifica).
export const resetAccountPassword = async ({ token, id, password, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID account non valido.')
  }
  const body = { id: numericId }
  if (password) {
    body.password = password
  }
  return apiFetch('/accountsResetPassword.php', { method: 'POST', token, body, signal })
}

// Invia email di benvenuto/account setup.
export const sendWelcomeEmail = async ({ token, id, signal } = {}) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('ID account non valido.')
  }
  return apiFetch('/accountsWelcomeEmail.php', { method: 'POST', token, body: { id: numericId }, signal })
}
