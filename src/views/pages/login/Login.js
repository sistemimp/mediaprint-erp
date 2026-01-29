import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

import { useAuth } from '../../../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error, isAuthenticated } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState(null)

  const targetPath = useMemo(() => {
    const redirectPath = location.state?.from?.pathname
    return redirectPath && redirectPath !== '/login' ? redirectPath : '/dashboard'
  }, [location.state])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(targetPath, { replace: true })
    }
  }, [isAuthenticated, navigate, targetPath])

  useEffect(() => {
    if (error) {
      setFormError(error.message)
    } else {
      setFormError(null)
    }
  }, [error])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username || !password) {
      setFormError('Inserisci sia username che password.')
      return
    }

    try {
      await login({ username, password })
    } catch (submitError) {
      setFormError(submitError.message)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <h1>Login</h1>
                  <p className="text-body-secondary">Accedi al tuo account</p>
                  {formError && (
                    <CAlert color="danger" className="mb-3">
                      {formError}
                    </CAlert>
                  )}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Username"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      disabled={loading}
                    />
                  </CInputGroup>
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                    />
                  </CInputGroup>
                  <CRow>
                    <CCol xs={6}>
                      <CButton color="primary" className="px-4" type="submit" disabled={loading}>
                        {loading ? 'Accesso...' : 'Login'}
                      </CButton>
                    </CCol>
                      <CCol xs={6} className="text-end">
                        <Link to="/reset-password">
                          <CButton color="link" className="px-0" disabled={loading}>
                            Password dimenticata?
                          </CButton>
                        </Link>
                      </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
