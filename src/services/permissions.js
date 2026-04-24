import { apiFetch } from './apiClient'

// Recupera il catalogo permessi applicativi disponibile per l'utente/sessione.
export const fetchPermissions = async ({ token, signal } = {}) => {
  const response = await apiFetch('/permissionsList.php', { token, signal })
  return Array.isArray(response?.data) ? response.data : []
}
