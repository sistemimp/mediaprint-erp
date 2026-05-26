import { apiFetch } from './apiClient'

export const fetchPreventivoPublicDetail = async ({ token, signal } = {}) => {
  return apiFetch('/preventiviPublicDetail.php', {
    params: { token },
    signal,
    suppressAuthRedirect: true,
  })
}

export const sendPreventivoPublicOtp = async ({ body, signal } = {}) => {
  return apiFetch('/preventiviPublicSendOtp.php', {
    method: 'POST',
    body,
    signal,
    suppressAuthRedirect: true,
  })
}

export const verifyPreventivoPublicOtp = async ({ body, signal } = {}) => {
  return apiFetch('/preventiviPublicVerifyOtp.php', {
    method: 'POST',
    body,
    signal,
    suppressAuthRedirect: true,
  })
}
