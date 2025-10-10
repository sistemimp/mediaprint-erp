import { apiFetch } from './apiClient'

export const fetchLatestPreventivi = async ({ token, signal, limit } = {}) => {
  const params = {}
  if (limit) {
    params.limit = limit
  }

  const response = await apiFetch('/preventiviList.php', {
    token,
    params,
    signal,
  })

  const items = Array.isArray(response) ? response : (response?.data ?? [])
  return { items }
}

export const createPreventivo = async ({
  token,
  id_preventivo,
  id_anagrafica,
  data_preventivo,
  note,
  righe,
  totals,
  send,
  signal,
} = {}) => {
  const payload = {
    id_preventivo,
    id_anagrafica,
    data_preventivo,
    note,
    righe,
    // backend persiste solo testata per ora: passiamo i totali
    totale_imponibile: totals?.imponibile ?? 0,
    totale_sconto: totals?.sconto ?? 0,
    totale_iva: totals?.totaleIva ?? 0,
    totale: totals?.totale ?? 0,
    send: send ? 1 : 0,
  }

  const response = await apiFetch('/preventiviCreate.php', {
    method: 'POST',
    token,
    body: payload,
    signal,
  })

  return response ?? {}
}

export const fetchPreventivoDetail = async ({ token, id, signal } = {}) => {
  const response = await apiFetch('/preventiviDetail.php', {
    token,
    params: { id },
    signal,
  })
  const data = response?.data ?? null
  const editable = !!response?.meta?.editable
  const righe = Array.isArray(response?.righe) ? response.righe : []
  return { data, editable, righe }
}
