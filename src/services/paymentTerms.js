import { apiFetch } from './apiClient'

export const fetchPaymentTerms = async ({ token, signal } = {}) => {
  const response = await apiFetch('/paymentTermsList.php', {
    token,
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}
