import { apiFetch } from './apiClient'

// Valida e normalizza l'identificativo utente (email o username).
const ensureIdentifier = (value) => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new Error('Email o username obbligatori.')
  }
  return trimmed
}

// Valida e normalizza una password non vuota.
const ensurePassword = (value) => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new Error('Password obbligatoria.')
  }
  return trimmed
}

// Richiede l'avvio del reset password per l'identificativo indicato.
export const requestPasswordReset = async ({ identifier } = {}) => {
  const payload = {
    identifier: ensureIdentifier(identifier),
  }
  return apiFetch('/passwordResetRequest.php', {
    method: 'POST',
    body: payload,
  })
}

// Completa il reset/cambio password usando token e conferma.
export const changePassword = async ({ password, passwordConfirmation, token } = {}) => {
  const payload = {
    password: ensurePassword(password),
    password_confirmation: ensurePassword(passwordConfirmation),
  }
  return apiFetch('/passwordResetChange.php', {
    method: 'POST',
    token,
    body: payload,
  })
}
