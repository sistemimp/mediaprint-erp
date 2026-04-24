import { apiFetch } from './apiClient'

// Recupera i termini/modalita di pagamento configurati.
export const fetchPaymentTerms = async ({ token, signal } = {}) => {
  const response = await apiFetch('/paymentTermsList.php', {
    token,
    signal,
  })

  return {
    items: Array.isArray(response?.items) ? response.items : [],
  }
}
