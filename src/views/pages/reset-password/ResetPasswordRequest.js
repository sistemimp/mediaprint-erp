import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeClosed } from '@coreui/icons'

import { requestPasswordReset } from '../../../services/passwordReset'

const ResetPasswordRequest = () => {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage(null)
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset({ identifier })
      setStatusMessage(
        "Ti abbiamo inviato una password temporanea all'indirizzo email registrato. Usala entro 24 ore e cambia subito la password.",
      )
    } catch (submitError) {
      setError(submitError.message || "Si è verificato un errore durante l'invio.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>Ripristina password</h1>
                    <p className="text-body-secondary">
                      Inserisci username o email e ti invieremo una password temporanea via email.
                    </p>
                    {statusMessage && (
                      <CAlert color="success" className="mb-3">
                        {statusMessage}
                      </CAlert>
                    )}
                    {error && (
                      <CAlert color="danger" className="mb-3">
                        {error}
                      </CAlert>
                    )}
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilEnvelopeClosed} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Username o email"
                        autoComplete="username"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        disabled={loading}
                      />
                    </CInputGroup>
                    <div className="d-flex justify-content-between align-items-center">
                      <Link to="/login">
                        <CButton color="link" className="px-0" disabled={loading}>
                          Torna al login
                        </CButton>
                      </Link>
                      <CButton color="primary" type="submit" disabled={loading}>
                        {loading ? 'Invio...' : 'Invia email'}
                      </CButton>
                    </div>
                  </CForm>
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Assistenza utente</h2>
                    <p>Se non hai ricevuto l'email controlla lo spam o contatta l'amministratore.</p>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ResetPasswordRequest
