import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSwitch,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../services/apiClient'
import { fetchPermissions } from '../../services/permissions'
import { uploadProfileAvatar } from '../../services/profileAvatar'
import avatarPlaceholder from '../../assets/images/avatars/8.jpg'

// Normalizza una data in formato locale italiano, con fallback robusto.
const formatDateTime = (value) => {
  if (!value) {
    return 'N/D'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }
  return parsed.toLocaleString('it-IT')
}

// Converte una stringa base64url in byte array per le API WebAuthn.
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

// Converte un buffer binario in base64url per serializzare challenge e risposte WebAuthn.
const bufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const Profile = () => {
  const { user, token, logout, avatarUrl, refreshAvatar, updateUserSnapshot } = useAuth()
  const [permissionsCatalog, setPermissionsCatalog] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsError, setPermissionsError] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [avatarSuccess, setAvatarSuccess] = useState(null)
  const [otpSetup, setOtpSetup] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [setupError, setSetupError] = useState(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [passkeys, setPasskeys] = useState([])
  const [passkeysLoading, setPasskeysLoading] = useState(false)
  const [passkeysError, setPasskeysError] = useState(null)
  const [passkeyDeleting, setPasskeyDeleting] = useState(null)
  const [passkeyRegistering, setPasskeyRegistering] = useState(false)
  const [passkeyVerifying, setPasskeyVerifying] = useState(false)
  const [passkeyLabel, setPasskeyLabel] = useState('')
  const [passkeyActionSuccess, setPasskeyActionSuccess] = useState(null)
  const [passkeyActionError, setPasskeyActionError] = useState(null)
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableError, setDisableError] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState(null)
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(null)

  const displayName = useMemo(() => {
    if (!user) {
      return 'Account'
    }
    return user.name || user.username || user.email || 'Account'
  }, [user])

  const roles = Array.isArray(user?.roles) ? user.roles : []
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  const lastLogin = useMemo(() => formatDateTime(user?.lastLogin), [user?.lastLogin])
  const roleLabels = useMemo(
    () =>
      roles
        .map((role) => role.label || role.code)
        .filter((label) => typeof label === 'string' && label !== '')
        .join(', ') || 'N/D',
    [roles],
  )

  // Carica il catalogo completo dei permessi da mostrare in sola lettura nel profilo.
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const loadPermissions = async () => {
      setPermissionsLoading(true)
      setPermissionsError(null)
      try {
        const data = await fetchPermissions({ token, signal: controller.signal })
        if (!active) return
        setPermissionsCatalog(data)
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (error?.status === 401 && logout) {
          logout()
          return
        }
        if (active) setPermissionsError(error)
      } finally {
        if (active) setPermissionsLoading(false)
      }
    }
    loadPermissions()
    return () => {
      active = false
      controller.abort()
    }
  }, [logout, token])

  // Genera/revoca la preview locale del nuovo avatar selezionato.
  useEffect(() => {
    if (!selectedAvatar) {
      setAvatarPreview(null)
      return
    }
    const preview = URL.createObjectURL(selectedAvatar)
    setAvatarPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [selectedAvatar])

  // Aggiorna il file avatar scelto dall'utente e resetta gli alert precedenti.
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null
    setAvatarError(null)
    setAvatarSuccess(null)
    setSelectedAvatar(file)
  }

  // Invia il nuovo avatar al backend e ricarica l'immagine profilo in sessione.
  const handleAvatarUpload = async () => {
    if (!selectedAvatar || avatarUploading) {
      return
    }
    setAvatarUploading(true)
    setAvatarError(null)
    setAvatarSuccess(null)
    try {
      await uploadProfileAvatar({ token, file: selectedAvatar })
      setAvatarSuccess('Immagine profilo aggiornata.')
      setSelectedAvatar(null)
      await refreshAvatar()
    } catch (error) {
      setAvatarError(error)
    } finally {
      setAvatarUploading(false)
    }
  }

  // Recupera l'elenco passkey registrate per l'account corrente.
  const loadPasskeys = useCallback(async () => {
    if (!token) {
      setPasskeys([])
      return
    }
    setPasskeysLoading(true)
    setPasskeysError(null)
    try {
      const payload = await apiFetch('/authMfaPasskeysList.php', {
        method: 'POST',
        token,
      })
      setPasskeys(Array.isArray(payload?.passkeys) ? payload.passkeys : [])
    } catch (error) {
      setPasskeysError(error)
    } finally {
      setPasskeysLoading(false)
    }
  }, [token])

  // Esegue il caricamento iniziale delle passkey all'apertura pagina.
  useEffect(() => {
    loadPasskeys()
  }, [loadPasskeys])

  // Rimuove una passkey esistente e aggiorna la lista locale.
  const handleRemovePasskey = useCallback(
    async (credentialId) => {
      if (!token || !credentialId) {
        return
      }
      setPasskeyDeleting(credentialId)
      setPasskeyActionError(null)
      setPasskeyActionSuccess(null)
      try {
        await apiFetch('/authMfaRemovePasskey.php', {
          method: 'POST',
          token,
          body: { credential_id: credentialId },
        })
        await loadPasskeys()
        setPasskeyActionSuccess('Passkey rimossa con successo.')
      } catch (error) {
        setPasskeyActionError(error)
      } finally {
        setPasskeyDeleting(null)
      }
    },
    [loadPasskeys, token],
  )

  // Disattiva MFA lato server e riallinea lo snapshot utente nel contesto auth.
  const disableMfa = useCallback(async () => {
    if (!token) {
      return
    }
    setDisableError(null)
    setDisableLoading(true)
    try {
      await apiFetch('/authMfaDisable.php', {
        method: 'POST',
        token,
      })
      if (user) {
        updateUserSnapshot({
          ...user,
          hasMfa: false,
          mfa_method: 'none',
        })
      }
      setOtpSetup(null)
      setPasskeys([])
    } catch (error) {
      setDisableError(error)
    } finally {
      setDisableLoading(false)
    }
  }, [token, user, updateUserSnapshot])

  // Registra una nuova passkey usando challenge WebAuthn e conferma backend.
  const handleRegisterPasskey = useCallback(async () => {
    if (!token) {
      return
    }
    if (!navigator?.credentials?.create) {
      setPasskeyActionError('Passkey non supportate da questo browser.')
      return
    }
    setPasskeyActionError(null)
    setPasskeyActionSuccess(null)
    setPasskeyRegistering(true)
    try {
      const payload = await apiFetch('/authMfaPasskeyRegister.php', {
        method: 'POST',
        token,
        body: { label: passkeyLabel.trim() },
      })
      const { challenge_token: challengeToken, publicKey } = payload || {}
      if (!challengeToken || !publicKey || !publicKey.challenge || !publicKey.user?.id) {
        throw new Error('Risposta passkey non valida.')
      }
      const options = {
        ...publicKey,
        challenge: base64UrlToBuffer(publicKey.challenge),
        user: {
          ...publicKey.user,
          id: base64UrlToBuffer(publicKey.user.id),
        },
        excludeCredentials: (publicKey.excludeCredentials || []).map((credential) => ({
          ...credential,
          id: base64UrlToBuffer(credential.id),
        })),
      }
      const credential = await navigator.credentials.create({ publicKey: options })
      if (!credential) {
        throw new Error('Nessuna credenziale passkey ottenuta.')
      }
      const response = credential.response
      const transports = typeof response.getTransports === 'function' ? response.getTransports() : undefined
      const confirmPayload = await apiFetch('/authMfaPasskeyRegisterConfirm.php', {
        method: 'POST',
        token,
        body: {
          challenge_token: challengeToken,
          label: passkeyLabel.trim(),
          credential: {
            id: credential.id,
            rawId: bufferToBase64Url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64Url(response.clientDataJSON),
              attestationObject: bufferToBase64Url(response.attestationObject),
              transports,
            },
          },
        },
      })
      await loadPasskeys()
      setPasskeyLabel('')
      setPasskeyActionSuccess('Passkey registrata e verificata con successo.')
      if (confirmPayload?.mfa_method && user) {
        updateUserSnapshot({
          ...user,
          hasMfa: Boolean(confirmPayload.has_mfa ?? true),
          mfa_method: confirmPayload.mfa_method,
        })
      }
    } catch (error) {
      setPasskeyActionError(error)
    } finally {
      setPasskeyRegistering(false)
    }
  }, [loadPasskeys, passkeyLabel, token, updateUserSnapshot, user])

  // Esegue una challenge di verifica passkey per validare il dispositivo corrente.
  const handleVerifyPasskey = useCallback(async () => {
    if (!token) {
      return
    }
    if (!navigator?.credentials?.get) {
      setPasskeyActionError('Passkey non supportate da questo browser.')
      return
    }
    setPasskeyActionError(null)
    setPasskeyActionSuccess(null)
    setPasskeyVerifying(true)
    try {
      const payload = await apiFetch('/authMfaPasskeyVerifyChallenge.php', {
        method: 'POST',
        token,
      })
      const { challenge_token: challengeToken, publicKey } = payload || {}
      if (!challengeToken || !publicKey || !publicKey.challenge) {
        throw new Error('Risposta passkey non valida.')
      }
      const options = {
        ...publicKey,
        challenge: base64UrlToBuffer(publicKey.challenge),
        allowCredentials: (publicKey.allowCredentials || []).map((credential) => ({
          ...credential,
          id: base64UrlToBuffer(credential.id),
        })),
      }
      const credential = await navigator.credentials.get({ publicKey: options })
      if (!credential) {
        throw new Error('Nessuna credenziale passkey ottenuta.')
      }
      await apiFetch('/authMfaPasskeyVerify.php', {
        method: 'POST',
        token,
        body: {
          challenge_token: challengeToken,
          credential: {
            id: credential.id,
            rawId: bufferToBase64Url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
              authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
              signature: bufferToBase64Url(credential.response.signature),
              userHandle: credential.response.userHandle ? bufferToBase64Url(credential.response.userHandle) : null,
            },
          },
        },
      })
      setPasskeyActionSuccess('Passkey verificata correttamente.')
    } catch (error) {
      setPasskeyActionError(error)
    } finally {
      setPasskeyVerifying(false)
    }
  }, [token])

  const isOtpActive = Boolean(user?.hasMfa && ['otp', 'both'].includes(user?.mfa_method))

  // Richiede al backend i dati OTP (secret/uri) per configurare una nuova app autenticatore.
  const startOtpSetup = useCallback(async () => {
    if (!token) {
      return
    }
    setSetupError(null)
    setOtpSetup(null)
    setSetupLoading(true)
    try {
      const payload = await apiFetch('/authMfaSetupOtp.php', { method: 'POST', token })
      setOtpSetup(payload)
    } catch (err) {
      setSetupError(err)
    } finally {
      setSetupLoading(false)
    }
  }, [token])

  // Gestisce il toggle OTP: se attiva la disabilita, altrimenti avvia setup.
  const handleOtpToggle = useCallback(async () => {
    if (!token) {
      return
    }
    if (isOtpActive) {
      await disableMfa()
      return
    }
    await startOtpSetup()
  }, [disableMfa, isOtpActive, startOtpSetup, token])

  // Valida i requisiti minimi di complessita della nuova password.
  const validatePasswordComplexity = useCallback((value) => {
    if (value.length < 8) {
      return 'La nuova password deve contenere almeno 8 caratteri.'
    }
    if (!/[A-Za-z]/.test(value)) {
      return 'La nuova password deve contenere almeno una lettera.'
    }
    if (!/[0-9]/.test(value)) {
      return 'La nuova password deve contenere almeno un numero.'
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return 'La nuova password deve contenere almeno un carattere speciale.'
    }
    return null
  }, [])

  // Effettua il cambio password con validazioni client-side prima della chiamata API.
  const handlePasswordChange = useCallback(async () => {
    if (!token) {
      return
    }
    setPasswordChangeError(null)
    setPasswordChangeSuccess(null)
    if (currentPassword.trim() === '' || newPassword.trim() === '' || confirmPassword.trim() === '') {
      setPasswordChangeError('Compila tutti i campi richiesti.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Le nuove password non coincidono.')
      return
    }
    const complexityError = validatePasswordComplexity(newPassword)
    if (complexityError) {
      setPasswordChangeError(complexityError)
      return
    }
    setPasswordChangeLoading(true)
    try {
      await apiFetch('/passwordChange.php', {
        method: 'POST',
        token,
        body: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        },
      })
      setPasswordChangeSuccess('Password aggiornata correttamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordChangeError(error.message || 'Impossibile aggiornare la password.')
    } finally {
      setPasswordChangeLoading(false)
    }
  }, [confirmPassword, currentPassword, newPassword, token, validatePasswordComplexity])

  return (
    <CRow className="g-4">
      <CCol xs={12} xl={6}>
        <CCard>
          <CCardHeader>Informazioni account</CCardHeader>
          <CCardBody>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <CAvatar size="xl" src={avatarPreview || avatarUrl || avatarPlaceholder} />
                <div>
                  <h5 className="mb-1">{displayName}</h5>
                  <div className="text-body-secondary">{user?.email || 'Email non disponibile'}</div>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <CFormInput type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} disabled={avatarUploading} />
                <CButton color="primary" disabled={!selectedAvatar || avatarUploading} onClick={handleAvatarUpload}>
                  {avatarUploading ? 'Caricamento...' : 'Aggiorna avatar'}
                </CButton>
              </div>
              {avatarError && <CAlert color="danger">{avatarError.message || 'Errore nel caricamento'}</CAlert>}
              {avatarSuccess && <CAlert color="success">{avatarSuccess}</CAlert>}
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">ID account</span>
                  <span className="fw-semibold">{user?.id ?? 'N/D'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Username</span>
                  <span className="fw-semibold">{user?.username ?? 'N/D'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Tipo account</span>
                  <span className="fw-semibold text-capitalize">{user?.accountType ?? 'N/D'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Ruolo</span>
                  <span className="fw-semibold text-capitalize">{roleLabels}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Ultimo accesso</span>
                  <span className="fw-semibold">{lastLogin}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">MFA attiva</span>
                  <span className="fw-semibold">{user?.hasMfa ? 'Si' : 'No'}</span>
                </CListGroupItem>
              </CListGroup>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={12} xl={6}>
        <CCard className="mb-4">
          <CCardHeader>Sicurezza account</CCardHeader>
          <CCardBody className="d-flex flex-column gap-4">
            <div>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div>
                  <strong>OTP</strong>
                  <p className="text-body-secondary small mb-0">Configura l'autenticazione tramite app OTP.</p>
                  <div className="mt-2">
                    <CBadge color={isOtpActive ? 'success' : 'secondary'}>
                      {isOtpActive ? 'OTP attiva' : 'OTP non attiva'}
                    </CBadge>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <CFormSwitch
                    label={isOtpActive ? 'Attiva' : 'Disattiva'}
                    checked={isOtpActive}
                    onChange={handleOtpToggle}
                    disabled={setupLoading || confirmLoading || disableLoading || !token}
                  />
                </div>
              </div>
              {setupError && <CAlert color="danger">{setupError.message || 'Impossibile generare la configurazione OTP.'}</CAlert>}
              {isOtpActive && !otpSetup && (
                <CAlert color="info" className="mt-3">
                  OTP attiva. Per visualizzare la configurazione o registrare un nuovo dispositivo, rigenera la configurazione.
                  <div className="mt-2">
                    <CButton size="sm" color="primary" onClick={startOtpSetup} disabled={setupLoading || !token}>
                      Mostra configurazione
                    </CButton>
                  </div>
                </CAlert>
              )}
              {otpSetup && (
                <div className="d-flex flex-wrap gap-3 mt-3">
                  <div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpSetup.otpauth_uri)}`}
                      alt="QR OTP"
                      width={200}
                      height={200}
                      className="border rounded"
                    />
                  </div>
                  <div className="flex-grow-1 d-flex flex-column gap-2">
                    <span className="text-body-secondary small">Usa il QR oppure copia il link:</span>
                    <code className="text-break small">{otpSetup.otpauth_uri}</code>
                    <CFormInput
                      placeholder="Codice OTP (6 cifre)"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      disabled={confirmLoading}
                    />
                    {confirmError && <CAlert color="danger">{confirmError.message || 'Codice non valido.'}</CAlert>}
                    <div className="d-flex gap-2">
                      <CButton
                        color="success"
                        onClick={async () => {
                          if (!token || otpCode.trim() === '') return
                          setConfirmError(null)
                          setConfirmLoading(true)
                          try {
                            await apiFetch('/authMfaConfirmOtp.php', { method: 'POST', token, body: { code: otpCode } })
                            if (user) {
                              updateUserSnapshot({ ...user, hasMfa: true, mfa_method: 'otp' })
                            }
                            setOtpSetup(null)
                            setOtpCode('')
                          } catch (err) {
                            setConfirmError(err)
                          } finally {
                            setConfirmLoading(false)
                          }
                        }}
                        disabled={confirmLoading || otpCode.trim() === ''}
                      >
                        {confirmLoading ? 'Verifica...' : 'Conferma codice'}
                      </CButton>
                      <CButton
                        color="secondary"
                        onClick={() => {
                          setOtpSetup(null)
                          setOtpCode('')
                          setConfirmError(null)
                        }}
                        disabled={confirmLoading}
                      >
                        Annulla
                      </CButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {false && (
              <div>
                <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                  <div>
                    <strong>Passkey</strong>
                    <p className="text-body-secondary small mb-0">
                      Attiva e gestisci le passkey (Apple iCloud, Google Password Manager, Windows Hello) per l'accesso senza OTP.
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <CBadge color={user?.hasMfa ? 'success' : 'secondary'}>
                      {user?.mfa_method ? user.mfa_method.toUpperCase() : 'NONE'}
                    </CBadge>
                    <CButton size="sm" color="primary" onClick={loadPasskeys} disabled={passkeysLoading}>
                      {passkeysLoading ? 'Caricamento...' : 'Aggiorna elenco'}
                    </CButton>
                  </div>
                </div>
                <div className="mt-3 d-flex flex-column gap-2">
                  <div className="d-flex flex-column flex-lg-row gap-2">
                    <div className="flex-grow-1">
                      <label className="form-label small" htmlFor="passkey-label">
                        Etichetta passkey (opzionale)
                      </label>
                      <CFormInput
                        id="passkey-label"
                        placeholder="Es. Macbook ufficio"
                        value={passkeyLabel}
                        onChange={(event) => setPasskeyLabel(event.target.value)}
                        disabled={passkeyRegistering || passkeyVerifying}
                      />
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-end">
                      <CButton
                        size="sm"
                        color="primary"
                        onClick={handleRegisterPasskey}
                        disabled={passkeyRegistering || passkeyVerifying || !token}
                      >
                        {passkeyRegistering ? 'Registrazione...' : 'Attiva / Registra'}
                      </CButton>
                      <CButton
                        size="sm"
                        color="secondary"
                        onClick={handleVerifyPasskey}
                        disabled={passkeyVerifying || passkeyRegistering || passkeys.length === 0}
                      >
                        {passkeyVerifying ? 'Verifica...' : 'Verifica'}
                      </CButton>
                      {user?.hasMfa && (
                        <CButton size="sm" color="danger" onClick={disableMfa} disabled={disableLoading || !token}>
                          {disableLoading ? 'Disattiva...' : 'Disabilita'}
                        </CButton>
                      )}
                    </div>
                  </div>
                  <p className="text-body-secondary small mb-0">
                    La verifica conferma che il dispositivo può usare la passkey (iCloud, Google, Windows Hello) per l&apos;accesso.
                  </p>
                </div>
                {passkeyActionSuccess && <CAlert color="success" className="mt-3">{passkeyActionSuccess}</CAlert>}
                {passkeyActionError && (
                  <CAlert color="danger" className="mt-3">
                    {passkeyActionError.message || passkeyActionError}
                  </CAlert>
                )}
                {disableError && <CAlert color="danger" className="mt-3">{disableError.message || 'Errore durante la disattivazione della 2FA.'}</CAlert>}
                {passkeysError && <CAlert color="danger">{passkeysError.message || 'Errore nel recupero delle passkey.'}</CAlert>}
                {passkeys.length > 0 ? (
                  <CListGroup flush className="mt-3">
                    {passkeys.map((passkey) => (
                      <CListGroupItem key={passkey.credential_id}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between">
                          <div>
                            <strong>{passkey.label || 'Passkey'}</strong>
                            <div className="text-body-secondary small">
                              Registrata il {formatDateTime(passkey.created_at)} · {passkey.transports || 'N/D'}
                            </div>
                          </div>
                          <CButton
                            size="sm"
                            color="danger"
                            onClick={() => handleRemovePasskey(passkey.credential_id)}
                            disabled={passkeyDeleting === passkey.credential_id}
                          >
                            {passkeyDeleting === passkey.credential_id ? 'Rimozione...' : 'Rimuovi'}
                          </CButton>
                        </div>
                      </CListGroupItem>
                    ))}
                  </CListGroup>
                ) : (
                  <p className="text-body-secondary small mt-2">Non ci sono passkey registrate.</p>
                )}
              </div>
            )}
          </CCardBody>
        </CCard>
        <CCard>
          <CCardHeader>Cambio password</CCardHeader>
          <CCardBody>
            <CTable data-testid="table" responsive borderless className="mb-3">
              <CTableBody>
                <CTableRow>
                  <CTableDataCell className="fw-semibold">Password attuale</CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      disabled={passwordChangeLoading}
                    />
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell className="fw-semibold">Nuova password</CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={passwordChangeLoading}
                    />
                    <div className="text-body-secondary small mt-1">
                      Minimo 8 caratteri, con lettere, numeri e un carattere speciale.
                    </div>
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableDataCell className="fw-semibold">Conferma nuova</CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={passwordChangeLoading}
                    />
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
            {passwordChangeError && <CAlert color="danger">{passwordChangeError}</CAlert>}
            {passwordChangeSuccess && <CAlert color="success">{passwordChangeSuccess}</CAlert>}
            <div className="d-flex justify-content-end">
              <CButton color="primary" onClick={handlePasswordChange} disabled={passwordChangeLoading}>
                {passwordChangeLoading ? 'Salvataggio...' : 'Aggiorna password'}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={12} xl={6}>
        <CCard>
          <CCardHeader>Permessi</CCardHeader>
          <CCardBody>
            {permissionsLoading ? (
              <div className="py-3 text-center">
                <CSpinner size="sm" />
              </div>
            ) : permissionsError ? (
              <CAlert color="danger">{permissionsError.message || 'Errore durante il caricamento dei permessi.'}</CAlert>
            ) : permissionsCatalog.length > 0 ? (
              <CListGroup flush>
                {permissionsCatalog.map((permission) => (
                  <CListGroupItem key={permission.id || permission.code}>
                    <CFormSwitch
                      label={permission.label || permission.code || 'Permesso'}
                      checked={permission.code ? permissions.some((p) => p.code === permission.code) : false}
                      disabled
                      readOnly
                    />
                  </CListGroupItem>
                ))}
              </CListGroup>
            ) : (
              <span className="text-body-secondary">Nessun permesso disponibile</span>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Profile




