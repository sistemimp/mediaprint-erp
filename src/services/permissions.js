import { apiFetch } from './apiClient'

export const fetchPermissions = async ({ token, signal } = {}) => {
  const response = await apiFetch('/permissionsList.php', { token, signal })
  return Array.isArray(response?.data) ? response.data : []
}
