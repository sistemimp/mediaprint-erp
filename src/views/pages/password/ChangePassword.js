import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { cilLockLocked } from '@coreui/icons'

import { changePassword } from '../../../services/passwordReset'
import { useAuth } from '../../../context/AuthContext'

const ChangePassword = () => {
  const navigate = useNavigate()
  const { token, updateUserSnapshot } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await changePassword({
        password,
        passwordConfirmation: confirm,
        token,
      })
      if (result?.user) {
        updateUserSnapshot(result.user)
      }
      setSuccessMessage('Password aggiornata. Reindirizzamento in corso...')
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 800)
    } catch (submitError) {
      setError(submitError.message || 'Impossibile aggiornare la password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>Nuova password</h1>
                    <p className="text-body-secondary">
                      Sei entrato con una password temporanea. Inserisci una nuova password per continuare.
                    </p>
                    {error && (
                      <CAlert color="danger" className="mb-3">
                        {error}
                      </CAlert>
                    )}
                    {successMessage && (
                      <CAlert color="success" className="mb-3">
                        {successMessage}
                      </CAlert>
                    )}
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Nuova password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                      />
                    </CInputGroup>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Conferma password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        disabled={loading}
                      />
                    </CInputGroup>
                    <div className="d-flex justify-content-end">
                      <CButton color="primary" type="submit" disabled={loading}>
                        {loading ? 'Salvataggio...' : 'Aggiorna password'}
                      </CButton>
                    </div>
                  </CForm>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ChangePassword
