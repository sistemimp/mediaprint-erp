import { apiFetch, buildApiUrl, getStoredToken } from './apiClient'

// Recupera le email ricevute oggi (sincronizzate lato backend).
export const fetchCrmEmailToday = async ({ token, signal } = {}) =>
  apiFetch('/crmEmailToday.php', { method: 'GET', token, signal })

// Esegue la ricerca archivio email con filtri testuali e paginazione.
export const fetchCrmEmailArchive = async ({
  token,
  signal,
  sender = '',
  subject = '',
  anagrafica = '',
  conversationKey = '',
  page = 1,
  pageSize = 100,
} = {}) => {
  const query = {
    sender: String(sender || '').trim(),
    subject: String(subject || '').trim(),
    anagrafica: String(anagrafica || '').trim(),
    conversation_key: String(conversationKey || '').trim(),
    page: String(Number(page) > 0 ? Number(page) : 1),
    page_size: String(Number(pageSize) > 0 ? Number(pageSize) : 100),
  }
  return apiFetch('/crmEmailSearch.php', { method: 'GET', token, signal, params: query })
}

// Carica il dettaglio completo di una email per ID.
export const fetchCrmEmailDetail = async ({ idEmail, token, signal } = {}) => {
  if (!idEmail) {
    throw new Error('ID email non valido.')
  }
  return apiFetch('/crmEmailDetail.php', {
    method: 'GET',
    token,
    signal,
    params: { id_email: String(idEmail) },
  })
}

// Collega una email a una anagrafica esistente.
export const linkCrmEmailAnagrafica = async ({ idEmail, idAnagrafica, token, signal } = {}) => {
  if (!idEmail || !idAnagrafica) {
    throw new Error('Parametri collegamento anagrafica non validi.')
  }
  return apiFetch('/crmEmailLinkAnagrafica.php', {
    method: 'POST',
    token,
    signal,
    body: {
      id_email: Number(idEmail),
      id_anagrafica: Number(idAnagrafica),
    },
  })
}

// Collega una email a un ticket, con eventuale sezione gestionale.
export const linkCrmEmailTicket = async ({
  idEmail,
  idTicket,
  sectionType = '',
  sectionId = null,
  token,
  signal,
} = {}) => {
  if (!idEmail || !idTicket) {
    throw new Error('Parametri collegamento ticket non validi.')
  }
  return apiFetch('/crmEmailLinkTicket.php', {
    method: 'POST',
    token,
    signal,
    body: {
      id_email: Number(idEmail),
      id_ticket: Number(idTicket),
      section_type: String(sectionType || '').trim(),
      section_id:
        sectionId === null || sectionId === undefined || String(sectionId).trim() === ''
          ? null
          : Number(sectionId),
    },
  })
}

// Invia una risposta alla email selezionata via endpoint CRM.
export const replyCrmEmail = async ({
  idEmail,
  body,
  subject = '',
  cc = [],
  token,
  signal,
} = {}) => {
  if (!idEmail) {
    throw new Error('ID email non valido.')
  }
  if (!String(body || '').trim()) {
    throw new Error('Testo risposta non valido.')
  }

  return apiFetch('/crmEmailReply.php', {
    method: 'POST',
    token,
    signal,
    body: {
      id_email: Number(idEmail),
      body: String(body || '').trim(),
      subject: String(subject || '').trim(),
      cc: Array.isArray(cc) ? cc : [],
    },
  })
}

// Scarica un singolo allegato email gestendo auth token e filename risposta.
export const downloadCrmEmailAttachment = async ({ idEmail, attachment, token, signal } = {}) => {
  const resolvedToken = token || getStoredToken()
  if (!resolvedToken) {
    throw new Error('Sessione non valida.')
  }
  if (!idEmail || !attachment) {
    throw new Error('Parametri download allegato non validi.')
  }

  const url = buildApiUrl('/crmEmailAttachmentDownload.php', {
    id_email: String(idEmail),
    attachment,
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      'X-Authorization': `Bearer ${resolvedToken}`,
      'X-Access-Token': resolvedToken,
    },
    signal,
  })

  if (!response.ok) {
    let message = `Errore ${response.status}`
    try {
      const payload = await response.json()
      if (payload?.message) {
        message = payload.message
      }
    } catch (_ignored) {
      // keep default message
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/i)
  const filename = match?.[1] || attachment || `attachment-${idEmail}`
  return { blob, filename }
}

// Scarica gli allegati selezionati in ZIP tramite endpoint dedicato.
export const downloadCrmEmailAttachmentsZip = async ({
  idEmail,
  attachments = [],
  token,
  signal,
} = {}) => {
  const resolvedToken = token || getStoredToken()
  if (!resolvedToken) {
    throw new Error('Sessione non valida.')
  }
  if (!idEmail) {
    throw new Error('ID email non valido.')
  }

  const url = buildApiUrl('/crmEmailAttachmentsZipDownload.php')
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      'X-Authorization': `Bearer ${resolvedToken}`,
      'X-Access-Token': resolvedToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id_email: idEmail,
      attachments,
    }),
    signal,
  })

  if (!response.ok) {
    let message = `Errore ${response.status}`
    try {
      const payload = await response.json()
      if (payload?.message) {
        message = payload.message
      }
    } catch (_ignored) {
      // keep default message
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/i)
  const filename = match?.[1] || `email-${idEmail}-allegati.zip`
  return { blob, filename }
}
