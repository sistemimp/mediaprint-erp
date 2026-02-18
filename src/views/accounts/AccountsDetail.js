import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useAuth } from '../../context/AuthContext'
import { fetchAccountDetail, updateAccountPermissions } from '../../services/accounts'
import PermissionButton from '../../components/PermissionButton'

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('it-IT')
}

const AccountsDetail = () => {
  const { token, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const accountId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const raw = params.get('id') || params.get('id_account') || ''
    const numeric = Number(raw)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }, [location.search])

  const [detail, setDetail] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [rolePreset, setRolePreset] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!token || !accountId) return undefined
    const controller = new AbortController()
    const loadDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchAccountDetail({ token, id: accountId, signal: controller.signal })
        setDetail(response?.account ?? null)
        setCatalog(Array.isArray(response?.permissions_catalog) ? response.permissions_catalog : [])
        const rolePerms = Array.isArray(response?.role_permissions) ? response.role_permissions : []
        const effectivePerms = Array.isArray(response?.effective_permissions) ? response.effective_permissions : []
        setRolePreset(rolePerms)
        setSelected(effectivePerms)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [token, accountId, logout])

  useEffect(() => {
    if (!feedback || feedback.persist) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const activeIds = useMemo(
    () =>
      new Set(
        catalog
          .filter((perm) => Number(perm.attivo) === 1)
          .map((perm) => Number(perm.id_permesso)),
      ),
    [catalog],
  )

  const filteredCatalog = useMemo(() => {
    if (!search || search.trim() === '') {
      return catalog
    }
    const needle = search.trim().toLowerCase()
    return catalog.filter((perm) => {
      const label = `${perm.label || ''} ${perm.code || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [catalog, search])

  const togglePermission = (permId) => {
    if (!activeIds.has(permId)) {
      return
    }
    setSelected((prev) => {
      const set = new Set(prev)
      if (set.has(permId)) {
        set.delete(permId)
      } else {
        set.add(permId)
      }
      return Array.from(set)
    })
  }

  const handleSave = async () => {
    if (!accountId) return
    setSaving(true)
    setError(null)
    try {
      await updateAccountPermissions({ token, id: accountId, permissions: selected })
      setFeedback({ message: 'Permessi aggiornati.', color: 'success' })
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

  const buildPreset = (type) => {
    const idsByCode = new Map(
      catalog
        .filter((perm) => Number(perm.attivo) === 1)
        .map((perm) => [String(perm.code || ''), Number(perm.id_permesso)]),
    )
    const modules = ['prod', 'pack', 'contr', 'anag', 'acct', 'prev', 'acqu', 'ddt', 'fatt', 'pay', 'job', 'msg']
    const actions = ['read', 'write', 'create', 'delete']
    const out = []

    modules.forEach((moduleKey) => {
      actions.forEach((action) => {
        const code = `${moduleKey}.${action}`
        const id = idsByCode.get(code)
        if (!id) return
        if (type === 'admin') {
          out.push(id)
        } else if (type === 'operator') {
          if (action !== 'delete') out.push(id)
        } else if (type === 'client') {
          if (action === 'read') out.push(id)
        }
      })
    })

    return out
  }

  const applyRolePreset = () => {
    setSelected(rolePreset)
  }

  const applyAdminPreset = () => setSelected(buildPreset('admin'))
  const applyOperatorPreset = () => setSelected(buildPreset('operator'))
  const applyClientPreset = () => setSelected(buildPreset('client'))

  if (!accountId) {
    return (
      <CCard>
        <CCardHeader>Dettaglio account</CCardHeader>
        <CCardBody>
          <CAlert color="warning">ID account non valido.</CAlert>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/accounts/lista')}>
            Torna alla lista
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <div>
          <div className="fw-semibold">Dettaglio account</div>
          <small className="text-body-secondary">Gestione permessi specifici</small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <PermissionButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/accounts/lista')}
            permission="acct.read"
          >
            Torna alla lista
          </PermissionButton>
          <PermissionButton
            color="info"
            variant="outline"
            onClick={applyRolePreset}
            disabled={rolePreset.length === 0}
            permission="acct.write"
          >
            Preset ruolo
          </PermissionButton>
          <PermissionButton color="primary" variant="outline" onClick={applyAdminPreset} permission="acct.write">
            Preset Amministratore
          </PermissionButton>
          <PermissionButton color="primary" variant="outline" onClick={applyOperatorPreset} permission="acct.write">
            Preset Operatore interno
          </PermissionButton>
          <PermissionButton color="primary" variant="outline" onClick={applyClientPreset} permission="acct.write">
            Preset Cliente
          </PermissionButton>
          <PermissionButton color="primary" onClick={handleSave} disabled={saving} permission="acct.write">
            {saving ? <CSpinner size="sm" /> : 'Salva permessi'}
          </PermissionButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {feedback && (
          <CAlert color={feedback.color || 'success'} dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}

        {loading && (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Errore nel caricamento account.'}</CAlert>
        )}

        {!loading && !error && detail && (
          <>
            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <div className="text-body-secondary small">Username</div>
                <div className="fw-semibold">{detail.username || '-'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Email</div>
                <div className="fw-semibold">{detail.email || '-'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Tipo</div>
                <div className="fw-semibold text-capitalize">{detail.account_type || '-'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Ruolo</div>
                <div className="fw-semibold">{detail.role_label || detail.role_code || '-'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Stato</div>
                {Number(detail.is_active) === 1 ? (
                  <CBadge color="success">Attivo</CBadge>
                ) : (
                  <CBadge color="secondary">Disattivo</CBadge>
                )}
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Ultimo accesso</div>
                <div className="fw-semibold">{formatDateTime(detail.last_login)}</div>
              </CCol>
            </CRow>

            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
              <div className="fw-semibold">Permessi</div>
              <CFormInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca permesso..."
                style={{ maxWidth: '320px' }}
              />
            </div>

            <CTable data-testid="table" hover responsive>
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell style={{ width: '60px' }}>Attivo</CTableHeaderCell>
                  <CTableHeaderCell>Permesso</CTableHeaderCell>
                  <CTableHeaderCell>Codice</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '120px' }} className="text-center">
                    Abilitato
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredCatalog.map((perm) => {
                  const permId = Number(perm.id_permesso)
                  const isActive = Number(perm.attivo) === 1
                  return (
                    <CTableRow key={permId} className="align-middle">
                      <CTableDataCell>
                        {isActive ? <CBadge color="success">Si</CBadge> : <CBadge color="secondary">No</CBadge>}
                      </CTableDataCell>
                      <CTableDataCell>{perm.label || 'Permesso'}</CTableDataCell>
                      <CTableDataCell>{perm.code || '-'}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CFormCheck
                          checked={selectedSet.has(permId)}
                          disabled={!isActive}
                          onChange={() => togglePermission(permId)}
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
                {filteredCatalog.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={4}>Nessun permesso disponibile.</CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AccountsDetail



