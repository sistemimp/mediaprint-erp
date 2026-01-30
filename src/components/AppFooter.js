import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CFooter,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import InstantMessagingWidget from './InstantMessagingWidget'
import { useAuth } from '../context/AuthContext'
import { createTicket } from '../services/tickets'
import { formatSupportDebugJson } from '../services/supportLogs'

const AppFooter = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportSaving, setSupportSaving] = useState(false)
  const [supportError, setSupportError] = useState(null)
  const [supportSuccess, setSupportSuccess] = useState(null)
  const [supportData, setSupportData] = useState({
    titolo: '',
    descrizione: '',
    modulo: '',
    priorita: 'media',
    url: '',
  })
  useEffect(() => {
    if (!supportOpen) {
      return
    }
    setSupportError(null)
    setSupportSuccess(null)
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    setSupportData((prev) => ({
      ...prev,
      url: prev.url || currentUrl,
      modulo: prev.modulo || (location?.pathname ? location.pathname.replace('/', '') : ''),
    }))
  }, [location?.pathname, supportOpen])

  useEffect(() => {
    if (!supportSuccess) return undefined
    const timer = window.setTimeout(() => setSupportSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [supportSuccess])

  const handleSupportChange = (event) => {
    const { name, value } = event.target
    setSupportData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSupportSubmit = async () => {
    if (!token) return
    setSupportSaving(true)
    setSupportError(null)
    try {
      const descriptionPayload = formatSupportDebugJson(supportData.descrizione)
      await createTicket({
        token,
        body: {
          titolo: supportData.titolo,
          descrizione: descriptionPayload,
          modulo: supportData.modulo || null,
          url: supportData.url || null,
          priorita: supportData.priorita,
          stato: 'aperto',
        },
      })
      setSupportSuccess('Ticket creato correttamente.')
      setSupportData({
        titolo: '',
        descrizione: '',
        modulo: '',
        priorita: 'media',
        url: supportData.url,
      })
      setSupportOpen(false)
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setSupportError(e)
    } finally {
      setSupportSaving(false)
    }
  }

  return (
    <CFooter className="px-4">
      <div>
        <a href="https://mediaprint.it" target="_blank" rel="noopener noreferrer">
          Mediaprint S.r.l.
        </a>
        <span className="ms-1">&copy; {new Date().getFullYear()}.</span>
        <button
          type="button"
          className="btn btn-link p-0 ms-2 text-body-secondary small"
          onClick={() => navigate('/release-notes')}
          aria-label="Apri note di aggiornamento"
        >
          v{__APP_VERSION__}
        </button>
      </div>
      <div className="ms-auto d-flex align-items-center gap-2">
        <CButton
          color="warning"
          variant="outline"
          size="sm"
          onClick={() => setSupportOpen(true)}
        >
          Supporto
        </CButton>
        <div className="footer-chat-slot">
          <InstantMessagingWidget showLabel />
        </div>
      </div>
      <CModal visible={supportOpen} onClose={() => setSupportOpen(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>Apri ticket di supporto</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {supportSuccess ? <CAlert color="success">{supportSuccess}</CAlert> : null}
          {supportError ? (
            <CAlert color="danger">
              {supportError.message || 'Errore durante la creazione del ticket.'}
            </CAlert>
          ) : null}
          <CFormInput
            className="mb-3"
            label="Titolo"
            name="titolo"
            value={supportData.titolo}
            onChange={handleSupportChange}
          />
          <CFormTextarea
            className="mb-3"
            label="Descrizione"
            name="descrizione"
            rows={4}
            value={supportData.descrizione}
            onChange={handleSupportChange}
          />
          <CFormSelect
            className="mb-3"
            label="Priorità"
            name="priorita"
            value={supportData.priorita}
            onChange={handleSupportChange}
          >
            <option value="bassa">Bassa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </CFormSelect>
          <CFormInput
            className="mb-3"
            label="Modulo"
            name="modulo"
            value={supportData.modulo}
            onChange={handleSupportChange}
            placeholder="Esempio: preventivi, fatture..."
          />
          <CFormInput
            label="URL pagina"
            name="url"
            value={supportData.url}
            onChange={handleSupportChange}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="light" variant="outline" onClick={() => setSupportOpen(false)}>
            Annulla
          </CButton>
          <CButton
            color="warning"
            onClick={handleSupportSubmit}
            disabled={supportSaving || !supportData.titolo.trim()}
          >
            {supportSaving ? <CSpinner size="sm" /> : 'Apri ticket'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CFooter>
  )
}

export default React.memo(AppFooter)
