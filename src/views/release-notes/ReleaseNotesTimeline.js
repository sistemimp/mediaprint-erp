import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormCheck,
  CFormInput,
  CRow,
  CSpinner,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import usePermissions from '../../hooks/usePermissions'
import { useNavigate } from 'react-router-dom'
import { createReleaseNote, fetchReleaseNotes } from '../../services/releaseNotes'
import HtmlEditor from '../../components/HtmlEditor'

// Formatta data nota nel formato breve italiano.
const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Formatta orario nota nel formato HH:mm locale.
const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// Timeline release notes con vista pubblica e inserimento note per admin.
const ReleaseNotesTimeline = () => {
  const { token, logout, user } = useAuth()
  const { has } = usePermissions()
  const canOpenTickets = has('bug.read')
  const navigate = useNavigate()

  const isAdmin = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : []
    return roles.some((role) => String(role.code || '').toLowerCase() === 'admin')
  }, [user])

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ titolo: '', versione: '', contenuto: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [editorMode, setEditorMode] = useState('visual')

  // Carica le note rilasciate dal backend.
  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items: list } = await fetchReleaseNotes({ token })
        setItems(list)
      } catch (e) {
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, logout])

  // Auto-hide del messaggio di successo dopo salvataggio.
  useEffect(() => {
    if (!success) return undefined
    const timer = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  // Aggiorna un campo del form amministratore.
  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Salva una nuova nota rilascio e aggiorna la timeline.
  const handleSubmit = async () => {
    if (!token || !isAdmin) return
    setSaving(true)
    setError(null)
    try {
      await createReleaseNote({
        token,
        body: {
          titolo: form.titolo,
          versione: form.versione || null,
          contenuto: form.contenuto,
        },
      })
      setForm({ titolo: '', versione: '', contenuto: '' })
      setSuccess('Nota aggiunta.')
      const { items: list } = await fetchReleaseNotes({ token })
      setItems(list)
      setFormOpen(false)
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  // Raggruppa le note per versione (fallback "Senza versione").
  const grouped = useMemo(() => {
    const groups = []
    const map = new Map()
    items.forEach((note) => {
      const key = note.versione && String(note.versione).trim() !== '' ? String(note.versione) : 'Senza versione'
      if (!map.has(key)) {
        const entry = { version: key, items: [] }
        map.set(key, entry)
        groups.push(entry)
      }
      map.get(key).items.push(note)
    })
    return groups
  }, [items])

  const currentVersion = String(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '').trim()
  const normalizeVersion = (value) => String(value || '').trim().toLowerCase()
  const latestNoteKey = useMemo(() => {
    if (!items.length) return null
    let latest = items[0]
    let latestTime = new Date(latest.created_at || 0).getTime() || 0
    for (const note of items) {
      const t = new Date(note.created_at || 0).getTime() || 0
      if (t >= latestTime) {
        latest = note
        latestTime = t
      }
    }
    return latest?.id_note ? `note-${latest.id_note}` : null
  }, [items])

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const normalizeHtmlContent = (value) => {
    const raw = String(value ?? '')
    const hasTags = /<[^>]+>/.test(raw)
    if (hasTags) return raw
    return escapeHtml(raw).replace(/\n/g, '<br/>')
  }

  const getPlainText = (value) => String(value ?? '').replace(/<[^>]*>/g, '').trim()

  // Apre una finestra stampabile con contenuto nota normalizzato in HTML.
  const handlePrintNote = (note, versionLabel) => {
    const title = escapeHtml(note?.titolo || 'Nota')
    const author = escapeHtml(note?.created_by_name || 'Sistema')
    const date = escapeHtml(formatDate(note?.created_at))
    const time = escapeHtml(formatTime(note?.created_at))
    const content = normalizeHtmlContent(note?.contenuto)
    const version = escapeHtml(versionLabel || '')

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 6px; font-size: 20px; }
            .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
            .content { font-size: 14px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">${version ? `Versione: ${version} &middot; ` : ''}${date} ${time} &middot; ${author}</div>
          <div class="content">${content}</div>
        </body>
      </html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <CContainer fluid>
      <CCard className="mb-4">
        <CCardBody className="d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <div className="text-uppercase text-body-secondary small">Mediaprint ERP</div>
            <h2 className="mb-1">Note di aggiornamento</h2>
            <p className="text-body-secondary mb-0">
              Timeline completa delle evoluzioni rilasciate, dalla più recente alla prima.
            </p>
          </div>
          {canOpenTickets ? (
            <CButton color="warning" variant="outline" onClick={() => navigate('/tickets/lista')}>
              Lista ticket
            </CButton>
          ) : null}
        </CCardBody>
      </CCard>

      {isAdmin ? (
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Note amministratore</div>
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              onClick={() => setFormOpen((prev) => !prev)}
            >
              {formOpen ? 'Chiudi inserimento' : 'Inserisci nota'}
            </CButton>
          </CCardHeader>
          {formOpen ? (
            <CCardBody>
              {success ? <CAlert color="success">{success}</CAlert> : null}
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormInput
                    label="Titolo"
                    name="titolo"
                    value={form.titolo}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    label="Versione"
                    name="versione"
                    value={form.versione}
                    onChange={handleChange}
                    placeholder="Es. 2.5.1"
                  />
                </CCol>
                <CCol xs={12}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Contenuto</label>
                    <CFormCheck
                      type="switch"
                      id="release-notes-html-mode"
                      label="HTML"
                      checked={editorMode === 'html'}
                      onChange={(e) => setEditorMode(e.target.checked ? 'html' : 'visual')}
                    />
                  </div>
                  {editorMode === 'html' ? (
                    <textarea
                      className="form-control font-monospace"
                      rows={8}
                      value={form.contenuto}
                      onChange={(e) => setForm((prev) => ({ ...prev, contenuto: e.target.value }))}
                      placeholder="<p>Scrivi la nota...</p>"
                    />
                  ) : (
                    <HtmlEditor
                      value={form.contenuto}
                      onChange={(value) => setForm((prev) => ({ ...prev, contenuto: value }))}
                      placeholder="Scrivi la nota..."
                      minHeight={180}
                    />
                  )}
                </CCol>
                <CCol xs={12} className="d-flex justify-content-end">
                  <CButton
                    color="primary"
                    onClick={handleSubmit}
                    disabled={saving || !form.titolo.trim() || !getPlainText(form.contenuto)}
                  >
                    {saving ? <CSpinner size="sm" /> : 'Salva nota'}
                  </CButton>
                </CCol>
              </CRow>
            </CCardBody>
          ) : null}
        </CCard>
      ) : null}

      {error ? (
        <CAlert color="danger">
          {error.message || 'Errore durante il caricamento delle note.'}
        </CAlert>
      ) : null}

      {loading ? (
        <div className="text-center">
          <CSpinner color="primary" />
        </div>
      ) : items.length === 0 ? (
        <CAlert color="light">Nessuna nota disponibile.</CAlert>
      ) : (
        <div className="border-start border-2 border-secondary-subtle ps-4">
          <CAccordion
            key={latestNoteKey || 'notes-accordion'}
            activeItemKey={latestNoteKey || undefined}
          >
            {grouped.map((group) => (
              <div key={group.version} className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <CBadge
                    color={
                      group.version === 'Senza versione'
                        ? 'secondary'
                        : normalizeVersion(group.version) === normalizeVersion(currentVersion)
                          ? 'success'
                          : 'info'
                    }
                  >
                    {group.version === 'Senza versione' ? group.version : `Versione ${group.version}`}
                  </CBadge>
                  <span className="text-body-secondary small">
                    {group.items.length} note
                  </span>
                </div>
                {group.items.map((note) => {
                  const itemKey = `note-${note.id_note}`
                  const versionLabel = group.version === 'Senza versione' ? '' : `Versione ${group.version}`
                  return (
                    <div key={note.id_note} className="position-relative mb-4">
                      <span
                        className="position-absolute top-0 translate-middle bg-body border border-2 border-secondary-subtle rounded-circle"
                        style={{ width: 14, height: 14, left: '-1.4rem' }}
                      ></span>
                      <div className="d-flex flex-column flex-md-row gap-3">
                        <div className="text-md-end text-body-secondary small" style={{ minWidth: 160 }}>
                          <div className="fw-semibold">{formatDate(note.created_at)}</div>
                          <div>{formatTime(note.created_at)}</div>
                        </div>
                        <div className="flex-grow-1">
                          <CAccordionItem itemKey={itemKey}>
                            <CAccordionHeader>
                              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 w-100 pe-2">
                                <h5 className="mb-0">{note.titolo}</h5>
                                <span className="text-body-secondary small">
                                  {note.created_by_name || 'Sistema'}
                                </span>
                              </div>
                            </CAccordionHeader>
                            <CAccordionBody>
                              <div className="d-flex justify-content-end mb-2">
                                <CButton
                                  color="secondary"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintNote(note, versionLabel)}
                                >
                                  Stampa nota
                                </CButton>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: normalizeHtmlContent(note.contenuto) }} />
                            </CAccordionBody>
                          </CAccordionItem>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </CAccordion>
        </div>
      )}
    </CContainer>
  )
}

export default ReleaseNotesTimeline
