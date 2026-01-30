import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

const base64UrlToBuffer = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + padding
  const binary = window.atob(base64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i)
  }
  return buffer
}

const bufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    login,
    loading,
    error,
    isAuthenticated,
    mfaChallenge,
    passkeyChallenge,
    requestPasskeyChallenge,
    verifyPasskeyCredential,
    verifyMfaCode,
    clearMfaChallenge,
  } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [mfaError, setMfaError] = useState(null)
  const [otpCountdown, setOtpCountdown] = useState(30)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyError, setPasskeyError] = useState(null)
  const mfaMethod = mfaChallenge?.method?.toLowerCase() ?? ''

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
  const handlePasskeyFlow = async () => {
    if (!navigator?.credentials?.get) {
      setPasskeyError('Passkey non supportate da questo browser.')
      return
    }
    setPasskeyError(null)
    setPasskeyLoading(true)
    try {
      const { challenge_token, publicKey } =
        passkeyChallenge ?? (await requestPasskeyChallenge())
      const options = {
        ...publicKey,
        challenge: base64UrlToBuffer(publicKey.challenge),
        allowCredentials: (publicKey.allowCredentials ?? []).map((credential) => ({
          ...credential,
          id: base64UrlToBuffer(credential.id),
        })),
      }
      const credential = await navigator.credentials.get({ publicKey: options })
      if (!credential) {
        throw new Error('Nessuna credenziale passkey ottenuta.')
      }
      await verifyPasskeyCredential({
        challengeToken: challenge_token,
        credential: {
          id: credential.id,
          rawId: bufferToBase64Url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
            authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
            signature: bufferToBase64Url(credential.response.signature),
            userHandle: credential.response.userHandle
              ? bufferToBase64Url(credential.response.userHandle)
              : null,
          },
        },
      })
    } catch (err) {
      setPasskeyError(err?.message || 'Verifica passkey fallita.')
    } finally {
      setPasskeyLoading(false)
    }
  }


  const handleMfaSubmit = useCallback(
    async (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault()
      }
      if (!otpCode) {
        setMfaError('Inserisci il codice OTP.')
        return
      }
      setMfaError(null)
      try {
        await verifyMfaCode(otpCode)
      } catch (submitError) {
        setMfaError(submitError.message)
      }
    },
    [otpCode, verifyMfaCode],
  )

  useEffect(() => {
    if (!mfaChallenge) {
      setOtpCode('')
      setOtpCountdown(30)
      return
    }
    if (otpCode.length === 6) {
      handleMfaSubmit()
    }
  }, [mfaChallenge, otpCode, handleMfaSubmit])

  useEffect(() => {
    if (!mfaChallenge) {
      return
    }
    const interval = setInterval(() => {
      setOtpCountdown((prev) => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [mfaChallenge])

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
                      <CButton color="primary" className="px-4" type="submit" disabled={loading || Boolean(mfaChallenge)}>
                        {loading ? 'Accesso...' : 'Login'}
                      </CButton>
                    </CCol>
                    <CCol xs={6} className="text-end">
                      <Link to="/reset-password">
                        <CButton color="link" className="px-0" disabled={loading || Boolean(mfaChallenge)}>
                          Password dimenticata?
                        </CButton>
                      </Link>
                    </CCol>
                  </CRow>
                  {mfaChallenge && (
                    <>
                  <hr className="my-4" />
                  <div className="mb-3">
                    <strong>Autenticazione a due fattori</strong>
                    <p className="text-body-secondary mb-0">
                      Inserisci il codice {mfaChallenge.method?.toUpperCase() || 'OTP'} generato dalla tua app.
                    </p>
                    {mfaChallenge.account?.username && (
                      <p className="text-body-secondary mb-0 small">Account: {mfaChallenge.account.username}</p>
                    )}
                  </div>
                  {['passkey', 'both'].includes(mfaMethod) && (
                    <div className="mb-3">
                      <CButton
                        color="primary"
                        className="w-100 mb-2"
                        onClick={handlePasskeyFlow}
                        disabled={passkeyLoading || loading}
                      >
                        {passkeyLoading ? 'Verifica passkey...' : 'Usa la passkey registrata'}
                      </CButton>
                      <p className="text-body-secondary small mb-2">
                        Usa la passkey salvata su iCloud, Google Password Manager o Windows Hello per autorizzare l&apos;accesso senza digitare il codice.
                      </p>
                      {passkeyError && (
                        <CAlert color="danger" className="mb-0">
                          {passkeyError}
                        </CAlert>
                      )}
                    </div>
                  )}
                  {mfaChallenge.qrUri && (
                    <div className="text-center mb-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          mfaChallenge.qrUri,
                        )}`}
                        alt="QR MFA"
                        className="border rounded"
                        width="200"
                        height="200"
                      />
                      <p className="small text-muted mt-2 mb-0">
                        Scansiona il QR con l&apos;app di autenticazione per aggiungere il passcode.
                      </p>
                      <p className="small mt-2">
                        <a
                          href={mfaChallenge.qrUri}
                          className="text-decoration-underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri direttamente l&apos;app di autenticazione sul tuo telefono
                        </a>
                      </p>
                    </div>
                  )}
                  {mfaError && (
                    <CAlert color="danger" className="mb-3">
                      {mfaError}
                    </CAlert>
                  )}
                  <CInputGroup className="mb-3">
                        <CInputGroupText>
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                      <CFormInput
                        placeholder="Codice 6 cifre"
                        maxLength={6}
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                        disabled={loading}
                      />
                    </CInputGroup>
                    <p className="text-body-secondary mb-3 small">
                      Codice valido ancora per {otpCountdown}s
                    </p>
                      <CRow className="g-2">
                        <CCol xs={6}>
                          <CButton color="success" className="w-100" onClick={handleMfaSubmit} disabled={loading}>
                            {loading ? 'Validazione...' : 'Verifica codice'}
                          </CButton>
                        </CCol>
                        <CCol xs={6}>
                          <CButton
                            color="secondary"
                            className="w-100"
                            onClick={() => {
                              clearMfaChallenge()
                              setOtpCode('')
                              setMfaError(null)
                            }}
                            disabled={loading}
                          >
                            Riprova login
                          </CButton>
                        </CCol>
                      </CRow>
                    </>
                  )}
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
