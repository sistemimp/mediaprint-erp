import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import { fetchPermissions } from '../../services/permissions'
import { uploadProfileAvatar } from '../../services/profileAvatar'
import avatar8 from './../../assets/images/avatars/8.jpg'

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

const Profile = () => {
  const { user, token, logout, avatarUrl, refreshAvatar } = useAuth()
  const [permissionsCatalog, setPermissionsCatalog] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsError, setPermissionsError] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [avatarSuccess, setAvatarSuccess] = useState(null)

  const displayName = useMemo(() => {
    if (!user) {
      return 'Account'
    }

    return user.name || user.username || user.email || 'Account'
  }, [user])

  const roles = Array.isArray(user?.roles) ? user.roles : []
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  const lastLogin = useMemo(() => formatDateTime(user?.lastLogin), [user?.lastLogin])
  const grantedPermissionCodes = useMemo(
    () => new Set(permissions.map((permission) => permission.code)),
    [permissions],
  )

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
        if (error?.name === 'AbortError') {
          return
        }
        if (error?.status === 401 && logout) {
          logout()
          return
        }
        if (active) {
          setPermissionsError(error)
        }
      } finally {
        if (active) {
          setPermissionsLoading(false)
        }
      }
    }

    loadPermissions()

    return () => {
      active = false
      controller.abort()
    }
  }, [logout, token])

  useEffect(() => {
    if (!selectedAvatar) {
      setAvatarPreview(null)
      return
    }

    const previewUrl = URL.createObjectURL(selectedAvatar)
    setAvatarPreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [selectedAvatar])

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null
    setAvatarError(null)
    setAvatarSuccess(null)
    setSelectedAvatar(file)
  }

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

  return (
    <CRow className="g-4">
      <CCol xs={12} xl={6}>
        <CCard>
          <CCardHeader>Informazioni account</CCardHeader>
          <CCardBody>
            <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
              <CAvatar size="xl" src={avatarPreview || avatarUrl || avatar8} />
              <div className="flex-grow-1">
                <div className="mb-2 fw-semibold">Immagine profilo</div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <CFormInput
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                  <CButton
                    color="primary"
                    disabled={!selectedAvatar || avatarUploading}
                    onClick={handleAvatarUpload}
                  >
                    {avatarUploading ? 'Caricamento...' : 'Carica immagine'}
                  </CButton>
                </div>
                <div className="text-body-secondary small mt-2">
                  Formati supportati: JPG, PNG, WebP. Dimensione consigliata: 512x512.
                </div>
                {avatarError ? (
                  <CAlert color="danger" className="mt-2 mb-0">
                    {avatarError.message || 'Errore nel caricamento immagine.'}
                  </CAlert>
                ) : null}
                {avatarSuccess ? (
                  <CAlert color="success" className="mt-2 mb-0">
                    {avatarSuccess}
                  </CAlert>
                ) : null}
              </div>
            </div>
            <div className="mb-3">
              <h5 className="mb-1">{displayName}</h5>
              <div className="text-body-secondary small">{user?.email || 'Email non disponibile'}</div>
            </div>
            <CListGroup flush>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">ID account</span>
                <span className="fw-semibold">{user?.id ?? 'N/D'}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">Username</span>
                <span className="fw-semibold">{user?.username || 'N/D'}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">Tipo account</span>
                <span className="fw-semibold text-capitalize">{user?.accountType || 'N/D'}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">Ultimo accesso</span>
                <span className="fw-semibold">{lastLogin}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">Cambio password richiesto</span>
                <span className="fw-semibold">{user?.mustChangePassword ? 'Si' : 'No'}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between align-items-center">
                <span className="text-body-secondary">MFA attiva</span>
                <span className="fw-semibold">{user?.hasMfa ? 'Si' : 'No'}</span>
              </CListGroupItem>
            </CListGroup>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={12} xl={6}>
        <CCard className="mb-4">
          <CCardHeader>Ruoli</CCardHeader>
          <CCardBody className="d-flex flex-wrap gap-2">
            {roles.length > 0 ? (
              roles.map((role) => (
                <CBadge key={role.id || role.code} color="info" textColor="dark">
                  {role.label || role.code}
                </CBadge>
              ))
            ) : (
              <span className="text-body-secondary">Nessun ruolo assegnato</span>
            )}
          </CCardBody>
        </CCard>
        <CCard>
          <CCardHeader>Permessi</CCardHeader>
          <CCardBody>
            {permissionsLoading ? (
              <div className="py-3 text-center">
                <CSpinner size="sm" />
              </div>
            ) : permissionsError ? (
              <CAlert color="danger" className="mb-0">
                {permissionsError.message || 'Errore nel caricamento permessi.'}
              </CAlert>
            ) : permissionsCatalog.length > 0 ? (
              <CListGroup flush>
                {permissionsCatalog.map((permission) => {
                  const code = permission.code || ''
                  const label = permission.label || code || 'Permesso'
                  const description = code && label !== code ? ` (${code})` : ''
                  return (
                    <CListGroupItem key={permission.id || code}>
                      <CFormCheck
                        id={`perm-${permission.id || code}`}
                        label={
                          <span>
                            {label}
                            {description ? (
                              <span className="text-body-secondary">{description}</span>
                            ) : null}
                          </span>
                        }
                        checked={code ? grantedPermissionCodes.has(code) : false}
                        disabled
                        readOnly
                      />
                    </CListGroupItem>
                  )
                })}
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
