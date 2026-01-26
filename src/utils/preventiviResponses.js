export const getPreventivoIdFromResponse = (result) => {
  const candidates = [
    result?.id_preventivo,
    result?.id,
    result?.preventivo?.id_preventivo,
    result?.preventivo?.id,
    result?.data?.id_preventivo,
    result?.data?.id,
    result?.payload?.id_preventivo,
    result?.payload?.data?.id_preventivo,
    result?.payload?.id,
    result?.data?.preventivo?.id_preventivo,
    result?.data?.preventivo?.id,
  ]

  for (const candidate of candidates) {
    const numeric = Number(candidate)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
  }

  return null
}
