import { apiFetch } from './apiClient'

const ensureIdentifier = (value) => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new Error('Email o username obbligatori.')
  }
  return trimmed
}

const ensurePassword = (value) => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new Error('Password obbligatoria.')
  }
  return trimmed
}

export const requestPasswordReset = async ({ identifier } = {}) => {
  const payload = {
    identifier: ensureIdentifier(identifier),
  }
  return apiFetch('/passwordResetRequest.php', {
    method: 'POST',
    body: payload,
  })
}

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
