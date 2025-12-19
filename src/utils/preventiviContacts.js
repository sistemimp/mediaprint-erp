export const normalizePreventivoContact = (contact, fallbackAnagraficaId = null) => {
  if (!contact || typeof contact !== 'object') return null
  const asString = (value) => (value == null ? '' : String(value)).trim()
  const idPrev = Number(contact.id_contatto_prev ?? contact.id ?? 0)
  const idContattoAnagrafica = Number(contact.id_contatto_anagrafica ?? contact.id_contatto ?? 0)
  const idAnagrafica = Number(contact.id_anagrafica ?? fallbackAnagraficaId ?? 0)
  const origineRaw = String(
    contact.origine ?? (idContattoAnagrafica > 0 ? 'anagrafica' : 'manuale'),
  ).toLowerCase()
  return {
    id_contatto_prev: Number.isFinite(idPrev) && idPrev > 0 ? idPrev : null,
    id_contatto_anagrafica:
      Number.isFinite(idContattoAnagrafica) && idContattoAnagrafica > 0 ? idContattoAnagrafica : null,
    id_anagrafica: Number.isFinite(idAnagrafica) && idAnagrafica > 0 ? idAnagrafica : null,
    nome: asString(contact.nome),
    ruolo: asString(contact.ruolo),
    telefono: asString(contact.telefono),
    cellulare: asString(contact.cellulare),
    email: asString(contact.email),
    note: asString(contact.note),
    origine: origineRaw === 'anagrafica' ? 'anagrafica' : 'manuale',
    _tmpId: contact._tmpId ?? `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
}

export const serializePreventivoContacts = (contacts, fallbackAnagraficaId = null) => {
  if (!Array.isArray(contacts)) return []
  return contacts
    .map((contact) => {
      const nome = String(contact.nome ?? '').trim()
      const ruolo = String(contact.ruolo ?? '').trim()
      const telefono = String(contact.telefono ?? '').trim()
      const cellulare = String(contact.cellulare ?? '').trim()
      const email = String(contact.email ?? '').trim()
      const note = String(contact.note ?? '').trim()
      if (!nome && !ruolo && !telefono && !cellulare && !email && !note) {
        return null
      }
      const idContattoAnagrafica = Number(contact.id_contatto_anagrafica ?? 0)
      const idAnagraficaCandidate = Number(contact.id_anagrafica ?? fallbackAnagraficaId ?? 0)
      const idAnagrafica =
        Number.isFinite(idAnagraficaCandidate) && idAnagraficaCandidate > 0
          ? idAnagraficaCandidate
          : null
      const origineRaw = String(
        contact.origine ?? (idContattoAnagrafica > 0 ? 'anagrafica' : 'manuale'),
      ).toLowerCase()
      const origine = origineRaw === 'anagrafica' ? 'anagrafica' : 'manuale'
      return {
        nome,
        ruolo,
        telefono,
        cellulare,
        email,
        note,
        origine,
        id_contatto_anagrafica: idContattoAnagrafica > 0 ? idContattoAnagrafica : undefined,
        id_anagrafica: idAnagrafica ?? undefined,
      }
    })
    .filter(Boolean)
}
