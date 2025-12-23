import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilPlus, cilPencil, cilReload, cilSend, cilTrash } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  fetchAccountAnagraficheOptions,
  fetchAccountContattiOptions,
  fetchAccountRoles,
  resetAccountPassword,
  sendWelcomeEmail,
  updateAccount,
} from '../../services/accounts'

const emptyForm = {
  id_account: null,
  username: '',
  email: '',
  account_type: 'operatore',
  id_ruolo: '',
  id_contatto: '',
  is_active: 1,
  must_change_pwd: 0,
  password: '',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('it-IT')
}

const AccountsList = () => {
  const { token, logout } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [filters, setFilters] = useState({ search: '', accountType: '', status: 'all' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [anagraficheOptions, setAnagraficheOptions] = useState([])
  const [selectedAnagrafiche, setSelectedAnagrafiche] = useState([])
  const [defaultAnagrafica, setDefaultAnagrafica] = useState('')
  const [anagraficaSearch, setAnagraficaSearch] = useState('')
  const [anagraficaPage, setAnagraficaPage] = useState(0)
  const [contattiOptions, setContattiOptions] = useState([])
  const [contattiSearch, setContattiSearch] = useState('')
  const [contattiPage, setContattiPage] = useState(0)
  const [selectedContatti, setSelectedContatti] = useState([])
  const [primaryContatto, setPrimaryContatto] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [resettingId, setResettingId] = useState(null)
  const [reactivatingId, setReactivatingId] = useState(null)
  const [anagraficaWarning, setAnagraficaWarning] = useState(null)
  const [sendingWelcomeId, setSendingWelcomeId] = useState(null)

  const defaultRoleId = useMemo(() => {
    if (!roles.length) return ''
    const preferred = roles.find((r) => Number(r.id_ruolo) === 3)
    return preferred ? String(preferred.id_ruolo) : String(roles[0].id_ruolo)
  }, [roles])

  const anagraficheMap = useMemo(() => {
    const map = {}
    anagraficheOptions.forEach((item) => {
      map[String(item.id_anagrafica)] = item.ragione_sociale || `ID ${item.id_anagrafica}`
    })
    return map
  }, [anagraficheOptions])

  const filteredAnagrafiche = useMemo(() => {
    if (!anagraficaSearch || anagraficaSearch.trim() === '') {
      return anagraficheOptions
    }
    const needle = anagraficaSearch.trim().toLowerCase()
    return anagraficheOptions.filter((item) => {
      const label = `${item.ragione_sociale || ''} ${item.id_anagrafica || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [anagraficheOptions, anagraficaSearch])

  const anagraficaPageSize = 5
  const anagraficaTotalPages = Math.max(1, Math.ceil(filteredAnagrafiche.length / anagraficaPageSize))
  const anagraficaPageIndex = Math.min(anagraficaPage, anagraficaTotalPages - 1)
  const pagedAnagrafiche = useMemo(() => {
    const start = anagraficaPageIndex * anagraficaPageSize
    return filteredAnagrafiche.slice(start, start + anagraficaPageSize)
  }, [filteredAnagrafiche, anagraficaPageIndex, anagraficaPageSize])

  const anagraficaPaginationItems = useMemo(() => {
    const totalPages = anagraficaTotalPages
    const currentPage = anagraficaPageIndex
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx)
    }
    const pages = [0, totalPages - 1]
    for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
      if (i > 0 && i < totalPages - 1) {
        pages.push(i)
      }
    }
    const sorted = Array.from(new Set(pages)).sort((a, b) => a - b)
    const out = []
    sorted.forEach((page, idx) => {
      if (idx > 0 && page - sorted[idx - 1] > 1) {
        out.push('ellipsis')
      }
      out.push(page)
    })
    return out
  }, [anagraficaTotalPages, anagraficaPageIndex])

  const loadRoles = useCallback(async (signal) => {
    try {
      const list = await fetchAccountRoles({ token, signal })
      setRoles(Array.isArray(list) ? list : [])
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    }
  }, [token, logout])

  const loadAccounts = useCallback(async (signal) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const status = filters.status === 'all' ? null : (filters.status === 'inactive' ? 0 : 1)
      const response = await fetchAccounts({
        token,
        search: filters.search,
        accountType: filters.accountType || null,
        isActive: status,
        signal,
      })
      setAccounts(response.items || [])
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
  }, [token, filters, logout])

  const loadAnagraficheOptions = useCallback(async (signal, accountId) => {
    if (!token) return
    try {
      const payload = await fetchAccountAnagraficheOptions({ token, accountId, signal })
      const items = Array.isArray(payload?.items) ? payload.items : []
      const selected = Array.isArray(payload?.selected) ? payload.selected.map((id) => String(id)) : []
      const defaultId = payload?.default_id ? String(payload.default_id) : ''
      setAnagraficheOptions(items)
      setSelectedAnagrafiche(selected)
      if (selected.length > 0) {
        if (defaultId && selected.includes(defaultId)) {
          setDefaultAnagrafica(defaultId)
        } else {
          setDefaultAnagrafica(selected[0])
        }
      } else {
        setDefaultAnagrafica('')
      }
      if (accountId) {
        setFormData((prev) => ({ ...prev, id_contatto: prev.id_contatto || '' }))
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    }
  }, [token, logout])

  const loadContattiOptions = useCallback(async (signal, anagrafiche) => {
    if (!token) return
    try {
      if (!Array.isArray(anagrafiche) || anagrafiche.length === 0) {
        setContattiOptions([])
        setSelectedContatti([])
        setPrimaryContatto('')
        return
      }
      const payload = await fetchAccountContattiOptions({ token, anagrafiche, accountId: formData.id_account, signal })
      const items = Array.isArray(payload?.items) ? payload.items : []
      setContattiOptions(items)
      const selected = Array.isArray(payload?.selected) ? payload.selected.map((id) => String(id)) : []
      const primary = payload?.primary_id ? String(payload.primary_id) : ''
      const availableIds = items.map((item) => String(item.id_contatto))
      const filteredSelected = selected.filter((id) => availableIds.includes(id))
      setSelectedContatti(filteredSelected)
      if (primary && availableIds.includes(primary)) {
        setPrimaryContatto(primary)
      } else if (filteredSelected.length > 0) {
        setPrimaryContatto(filteredSelected[0])
      } else {
        setPrimaryContatto('')
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    }
  }, [token, logout, formData.id_account])

  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()
    loadRoles(controller.signal)
    return () => controller.abort()
  }, [token, loadRoles])

  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()
    loadAccounts(controller.signal)
    return () => controller.abort()
  }, [token, loadAccounts])

  useEffect(() => {
    if (!modalOpen || formData.account_type !== 'cliente') return undefined
    const controller = new AbortController()
    loadAnagraficheOptions(controller.signal, formData.id_account)
    return () => controller.abort()
  }, [modalOpen, formData.account_type, formData.id_account, loadAnagraficheOptions])

  useEffect(() => {
    if (!modalOpen || formData.account_type !== 'cliente') return undefined
    const controller = new AbortController()
    loadContattiOptions(controller.signal, selectedAnagrafiche.map(Number))
    return () => controller.abort()
  }, [modalOpen, formData.account_type, selectedAnagrafiche, loadContattiOptions])

  useEffect(() => {
    if (!feedback || feedback.persist) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const openCreateModal = () => {
    setFormData({
      ...emptyForm,
      id_ruolo: defaultRoleId,
    })
    setAnagraficheOptions([])
    setSelectedAnagrafiche([])
    setDefaultAnagrafica('')
    setAnagraficaSearch('')
    setAnagraficaPage(0)
    setContattiOptions([])
    setContattiSearch('')
    setContattiPage(0)
    setSelectedContatti([])
    setPrimaryContatto('')
    setAnagraficaWarning(null)
    setModalOpen(true)
  }

  const openEditModal = (account) => {
    setFormData({
      id_account: account.id_account,
      username: account.username || '',
      email: account.email || '',
      account_type: account.account_type || 'operatore',
      id_ruolo: account.id_ruolo ? String(account.id_ruolo) : defaultRoleId,
      id_contatto: account.id_contatto ? String(account.id_contatto) : '',
      is_active: Number(account.is_active) === 1 ? 1 : 0,
      must_change_pwd: Number(account.must_change_pwd) === 1 ? 1 : 0,
      password: '',
    })
    setAnagraficheOptions([])
    setSelectedAnagrafiche([])
    setDefaultAnagrafica('')
    setAnagraficaSearch('')
    setAnagraficaPage(0)
    setContattiOptions([])
    setContattiSearch('')
    setContattiPage(0)
    setSelectedContatti([])
    setPrimaryContatto('')
    setAnagraficaWarning(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setFormData(emptyForm)
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    if (name === 'account_type' && value !== 'cliente') {
      setSelectedAnagrafiche([])
      setDefaultAnagrafica('')
      setContattiOptions([])
      setSelectedContatti([])
      setPrimaryContatto('')
      setAnagraficaWarning(null)
    }
  }

  const toggleAnagrafica = (id) => {
    const stringId = String(id)
    setSelectedAnagrafiche((prev) => {
      if (prev.includes(stringId)) {
        const next = prev.filter((value) => value !== stringId)
        if (next.length === 0) {
          setDefaultAnagrafica('')
          setAnagraficaWarning(null)
        } else if (!next.includes(defaultAnagrafica)) {
          setDefaultAnagrafica(next[0])
        }
        return next
      }
      const next = [...prev, stringId]
      if (!defaultAnagrafica) {
        setDefaultAnagrafica(stringId)
      }
      return next
    })
  }

  const toggleContatto = (id) => {
    const stringId = String(id)
    setSelectedContatti((prev) => {
      if (prev.includes(stringId)) {
        const next = prev.filter((value) => value !== stringId)
        if (primaryContatto && primaryContatto === stringId) {
          setPrimaryContatto(next[0] || '')
        }
        return next
      }
      const next = [...prev, stringId]
      if (!primaryContatto) {
        setPrimaryContatto(stringId)
      }
      return next
    })
    setAnagraficaWarning(null)
  }

  const filteredContatti = useMemo(() => {
    if (!contattiSearch || contattiSearch.trim() === '') {
      return contattiOptions
    }
    const needle = contattiSearch.trim().toLowerCase()
    return contattiOptions.filter((item) => {
      const label = `${item.nome || ''} ${item.ragione_sociale || ''} ${item.email || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [contattiOptions, contattiSearch])

  const contattiPageSize = 5
  const contattiTotalPages = Math.max(1, Math.ceil(filteredContatti.length / contattiPageSize))
  const contattiPageIndex = Math.min(contattiPage, contattiTotalPages - 1)
  const pagedContatti = useMemo(() => {
    const start = contattiPageIndex * contattiPageSize
    return filteredContatti.slice(start, start + contattiPageSize)
  }, [filteredContatti, contattiPageIndex, contattiPageSize])

  const contattiPaginationItems = useMemo(() => {
    const totalPages = contattiTotalPages
    const currentPage = contattiPageIndex
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx)
    }
    const pages = [0, totalPages - 1]
    for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
      if (i > 0 && i < totalPages - 1) {
        pages.push(i)
      }
    }
    const sorted = Array.from(new Set(pages)).sort((a, b) => a - b)
    const out = []
    sorted.forEach((page, idx) => {
      if (idx > 0 && page - sorted[idx - 1] > 1) {
        out.push('ellipsis')
      }
      out.push(page)
    })
    return out
  }, [contattiTotalPages, contattiPageIndex])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (formData.account_type === 'cliente' && selectedAnagrafiche.length === 0) {
        throw new Error('Seleziona almeno una anagrafica per account cliente.')
      }
      if (formData.account_type === 'cliente' && selectedAnagrafiche.length > 0 && !primaryContatto) {
        setAnagraficaWarning('Seleziona un contatto per associare le anagrafiche.')
        throw new Error('Seleziona un contatto per associare le anagrafiche.')
      }

      if (formData.id_account) {
        await updateAccount({
          token,
          body: {
            id_account: formData.id_account,
            username: formData.username,
            email: formData.email,
            account_type: formData.account_type,
            id_ruolo: Number(formData.id_ruolo) || undefined,
            id_contatto: formData.account_type === 'cliente' ? (Number(primaryContatto) || null) : null,
            is_active: formData.is_active,
            must_change_pwd: formData.must_change_pwd,
            anagrafiche: formData.account_type === 'cliente' ? selectedAnagrafiche.map(Number) : undefined,
            anagrafica_predefinita: formData.account_type === 'cliente' ? (Number(defaultAnagrafica) || undefined) : undefined,
            contatti: formData.account_type === 'cliente' ? selectedContatti.map(Number) : undefined,
            contatto_predefinito: formData.account_type === 'cliente' ? (Number(primaryContatto) || undefined) : undefined,
          },
        })
        setFeedback({ message: 'Account aggiornato.', color: 'success' })
      } else {
        const response = await createAccount({
          token,
          body: {
            username: formData.username,
            email: formData.email,
            account_type: formData.account_type,
            id_ruolo: Number(formData.id_ruolo) || undefined,
            id_contatto: formData.account_type === 'cliente' ? (Number(primaryContatto) || null) : null,
            is_active: formData.is_active,
            must_change_pwd: formData.must_change_pwd,
            password: formData.password,
            anagrafiche: formData.account_type === 'cliente' ? selectedAnagrafiche.map(Number) : undefined,
            anagrafica_predefinita: formData.account_type === 'cliente' ? (Number(defaultAnagrafica) || undefined) : undefined,
            contatti: formData.account_type === 'cliente' ? selectedContatti.map(Number) : undefined,
            contatto_predefinito: formData.account_type === 'cliente' ? (Number(primaryContatto) || undefined) : undefined,
          },
        })
        const generated = response?.generated_password
        if (generated) {
          setFeedback({
            message: `Account creato. Password temporanea: ${generated}`,
            color: 'success',
            persist: true,
          })
        } else {
          setFeedback({ message: 'Account creato.', color: 'success' })
        }
      }
      setModalOpen(false)
      await loadAccounts()
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

  const handleDelete = async (accountId) => {
    const confirmed = window.confirm('Vuoi disattivare questo account?')
    if (!confirmed) return
    setDeletingId(accountId)
    setError(null)
    try {
      await deleteAccount({ token, id: accountId })
      setFeedback({ message: 'Account disattivato.', color: 'success' })
      await loadAccounts()
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReactivate = async (accountId) => {
    const confirmed = window.confirm('Vuoi riattivare questo account?')
    if (!confirmed) return
    setReactivatingId(accountId)
    setError(null)
    try {
      await updateAccount({ token, body: { id_account: accountId, is_active: 1 } })
      setFeedback({ message: 'Account riattivato.', color: 'success' })
      await loadAccounts()
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setReactivatingId(null)
    }
  }

  const handleResetPassword = async (accountId) => {
    const confirmed = window.confirm('Vuoi resettare la password di questo account?')
    if (!confirmed) return
    setResettingId(accountId)
    setError(null)
    try {
      const response = await resetAccountPassword({ token, id: accountId })
      setFeedback({
        message: `Password reimpostata: ${response?.password || 'generata'}`,
        color: 'warning',
        persist: true,
      })
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setResettingId(null)
    }
  }

  const handleSendWelcome = async (account) => {
    if (!account?.email) {
      setError(new Error('Email account non valida.'))
      return
    }
    const confirmed = window.confirm('Vuoi inviare l email di benvenuto con password temporanea?')
    if (!confirmed) return
    setSendingWelcomeId(account.id_account)
    setError(null)
    try {
      await sendWelcomeEmail({ token, id: account.id_account })
      setFeedback({ message: 'Email di benvenuto inviata.', color: 'success' })
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setSendingWelcomeId(null)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Account - Gestione</h5>
            <small className="text-body-secondary">Crea, modifica, disattiva e resetta password</small>
          </div>
          <CButton color="primary" variant="outline" onClick={openCreateModal}>
            <CIcon icon={cilPlus} className="me-2" />
            Nuovo account
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CForm className="mb-3">
          <CRow className="g-2 align-items-end">
            <CCol md={4}>
              <CFormInput
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Cerca per username o email..."
              />
            </CCol>
            <CCol md={3}>
              <CFormSelect name="accountType" value={filters.accountType} onChange={handleFilterChange}>
                <option value="">Tutti i tipi</option>
                <option value="operatore">Operatore</option>
                <option value="cliente">Cliente</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="active">Attivi</option>
                <option value="inactive">Disattivi</option>
                <option value="all">Tutti</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CForm>

        {feedback && (
          <CAlert
            color={feedback.color || 'success'}
            dismissible
            onClose={() => setFeedback(null)}
            className="mb-3"
          >
            {feedback.message}
          </CAlert>
        )}

        {loading && (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Errore nel caricamento account.'}</CAlert>
        )}

        {!loading && !error && (
          <CTable hover responsive>
            <CTableHead color="light">
              <CTableRow className="align-middle">
                <CTableHeaderCell>Username</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Tipo</CTableHeaderCell>
                <CTableHeaderCell>Ruolo</CTableHeaderCell>
                <CTableHeaderCell>Stato</CTableHeaderCell>
                <CTableHeaderCell>Ultimo accesso</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {accounts.map((row) => (
                <CTableRow key={row.id_account} className="align-middle">
                  <CTableDataCell>{row.username || '-'}</CTableDataCell>
                  <CTableDataCell>{row.email || '-'}</CTableDataCell>
                  <CTableDataCell className="text-capitalize">{row.account_type || '-'}</CTableDataCell>
                  <CTableDataCell>{row.role_label || '-'}</CTableDataCell>
                  <CTableDataCell>
                    {Number(row.is_active) === 1 ? (
                      <CBadge color="success">Attivo</CBadge>
                    ) : (
                      <CBadge color="secondary">Disattivo</CBadge>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>{formatDateTime(row.last_login)}</CTableDataCell>
                  <CTableDataCell className="text-center">
                    <div className="d-flex justify-content-center gap-2">
                      <CButton color="link" size="sm" className="p-0" onClick={() => openEditModal(row)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="warning"
                        size="sm"
                        variant="outline"
                        className="p-0"
                        title="Reset password"
                        onClick={() => handleResetPassword(row.id_account)}
                        disabled={resettingId === row.id_account}
                      >
                        {resettingId === row.id_account ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
                      </CButton>
                      <CButton
                        color="info"
                        size="sm"
                        variant="outline"
                        className="p-0"
                        title="Invia email di benvenuto"
                        onClick={() => handleSendWelcome(row)}
                        disabled={!row.email || sendingWelcomeId === row.id_account}
                      >
                        {sendingWelcomeId === row.id_account ? <CSpinner size="sm" /> : <CIcon icon={cilSend} />}
                      </CButton>
                      {Number(row.is_active) === 1 ? (
                        <CButton
                          color="danger"
                          size="sm"
                          variant="outline"
                          className="p-0"
                          title="Disattiva"
                          onClick={() => handleDelete(row.id_account)}
                          disabled={deletingId === row.id_account}
                        >
                          {deletingId === row.id_account ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} />}
                        </CButton>
                      ) : (
                        <CButton
                          color="success"
                          size="sm"
                          variant="outline"
                          className="p-0"
                          title="Riattiva"
                          onClick={() => handleReactivate(row.id_account)}
                          disabled={reactivatingId === row.id_account}
                        >
                          {reactivatingId === row.id_account ? <CSpinner size="sm" /> : <CIcon icon={cilCheckCircle} />}
                        </CButton>
                      )}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>

      <CModal alignment="center" visible={modalOpen} onClose={closeModal} className="accounts-modal">
        <CModalHeader>
          <CModalTitle>{formData.id_account ? 'Modifica account' : 'Nuovo account'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleSave}>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormInput
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  type="email"
                />
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  label="Tipo account"
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleFormChange}
                >
                  <option value="operatore">Operatore</option>
                  <option value="cliente">Cliente</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  label="Ruolo"
                  name="id_ruolo"
                  value={formData.id_ruolo}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Seleziona ruolo</option>
                  {roles.map((role) => (
                    <option key={role.id_ruolo} value={String(role.id_ruolo)}>
                      {role.label || role.code}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              {formData.account_type === 'cliente' && (
                <CCol md={12}>
                  <label className="form-label">Anagrafiche associate</label>
                  {anagraficaWarning && (
                    <CAlert color="warning" className="py-2">
                      {anagraficaWarning}
                    </CAlert>
                  )}
                  <CFormInput
                    placeholder="Cerca anagrafica..."
                    value={anagraficaSearch}
                    onChange={(e) => {
                      setAnagraficaSearch(e.target.value)
                      setAnagraficaPage(0)
                    }}
                    className="mb-2"
                  />
                  <div className="border rounded">
                    <CTable small hover responsive className="mb-0">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: '40px' }}></CTableHeaderCell>
                          <CTableHeaderCell>Anagrafica</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pagedAnagrafiche.map((item) => {
                          const id = String(item.id_anagrafica)
                          const checked = selectedAnagrafiche.includes(id)
                          return (
                            <CTableRow key={id} className="align-middle">
                              <CTableDataCell>
                                <CFormCheck
                                  checked={checked}
                                  onChange={() => toggleAnagrafica(id)}
                                />
                              </CTableDataCell>
                              <CTableDataCell>
                                {item.ragione_sociale || `ID ${item.id_anagrafica}`}
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })}
                        {filteredAnagrafiche.length === 0 && (
                          <CTableRow>
                            <CTableDataCell colSpan={2}>
                              Nessuna anagrafica trovata.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
                  </div>
                  {filteredAnagrafiche.length > anagraficaPageSize && (
                    <CPagination size="sm" className="mt-2 mb-0">
                      <CPaginationItem
                        aria-label="Pagina precedente"
                        disabled={anagraficaPageIndex <= 0}
                        onClick={() => setAnagraficaPage(Math.max(0, anagraficaPageIndex - 1))}
                      >
                        &laquo;
                      </CPaginationItem>
                      {anagraficaPaginationItems.map((item, index) =>
                        item === 'ellipsis' ? (
                          <CPaginationItem key={`ellipsis-${index}`} disabled>
                            &hellip;
                          </CPaginationItem>
                        ) : (
                          <CPaginationItem
                            key={item}
                            active={item === anagraficaPageIndex}
                            onClick={() => setAnagraficaPage(item)}
                          >
                            {item + 1}
                          </CPaginationItem>
                        ),
                      )}
                      <CPaginationItem
                        aria-label="Pagina successiva"
                        disabled={anagraficaPageIndex >= anagraficaTotalPages - 1}
                        onClick={() => setAnagraficaPage(Math.min(anagraficaTotalPages - 1, anagraficaPageIndex + 1))}
                      >
                        &raquo;
                      </CPaginationItem>
                    </CPagination>
                  )}
                  <div className="form-text">Seleziona una o piu anagrafiche da associare al cliente.</div>
                </CCol>
              )}
              {formData.account_type === 'cliente' && (
                <CCol md={12}>
                  <label className="form-label">Contatti disponibili</label>
                  <CFormInput
                    placeholder="Cerca contatto..."
                    value={contattiSearch}
                    onChange={(e) => {
                      setContattiSearch(e.target.value)
                      setContattiPage(0)
                    }}
                    className="mb-2"
                  />
                  <div className="border rounded">
                    <CTable small hover responsive className="mb-0">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: '40px' }}></CTableHeaderCell>
                          <CTableHeaderCell style={{ width: '60px' }}>Primario</CTableHeaderCell>
                          <CTableHeaderCell>Contatto</CTableHeaderCell>
                          <CTableHeaderCell>Anagrafica</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                          <CTableHeaderCell>Ruolo</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pagedContatti.map((item) => {
                          const id = String(item.id_contatto)
                          const isSelected = selectedContatti.includes(id)
                          return (
                            <CTableRow key={id} className="align-middle">
                              <CTableDataCell>
                                <CFormCheck
                                  checked={isSelected}
                                  onChange={() => toggleContatto(id)}
                                />
                              </CTableDataCell>
                              <CTableDataCell>
                                <CFormCheck
                                  type="radio"
                                  name="contatto_primary"
                                  value={id}
                                  checked={primaryContatto === id}
                                  onChange={() => setPrimaryContatto(id)}
                                  disabled={!isSelected}
                                />
                              </CTableDataCell>
                              <CTableDataCell>{item.nome || 'Contatto'}</CTableDataCell>
                              <CTableDataCell>{item.ragione_sociale || 'Anagrafica'}</CTableDataCell>
                              <CTableDataCell>{item.email || '-'}</CTableDataCell>
                              <CTableDataCell>{item.ruolo || '-'}</CTableDataCell>
                            </CTableRow>
                          )
                        })}
                        {filteredContatti.length === 0 && (
                          <CTableRow>
                            <CTableDataCell colSpan={6}>Nessun contatto disponibile.</CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
                  </div>
                  {filteredContatti.length > contattiPageSize && (
                    <CPagination size="sm" className="mt-2 mb-0">
                      <CPaginationItem
                        aria-label="Pagina precedente"
                        disabled={contattiPageIndex <= 0}
                        onClick={() => setContattiPage(Math.max(0, contattiPageIndex - 1))}
                      >
                        &laquo;
                      </CPaginationItem>
                      {contattiPaginationItems.map((item, index) =>
                        item === 'ellipsis' ? (
                          <CPaginationItem key={`ellipsis-${index}`} disabled>
                            &hellip;
                          </CPaginationItem>
                        ) : (
                          <CPaginationItem
                            key={item}
                            active={item === contattiPageIndex}
                            onClick={() => setContattiPage(item)}
                          >
                            {item + 1}
                          </CPaginationItem>
                        ),
                      )}
                      <CPaginationItem
                        aria-label="Pagina successiva"
                        disabled={contattiPageIndex >= contattiTotalPages - 1}
                        onClick={() => setContattiPage(Math.min(contattiTotalPages - 1, contattiPageIndex + 1))}
                      >
                        &raquo;
                      </CPaginationItem>
                    </CPagination>
                  )}
                  <div className="form-text">Mostra i contatti disponibili sulle anagrafiche selezionate.</div>
                </CCol>
              )}
              {formData.account_type === 'cliente' && (
                <CCol md={6}>
                  <CFormSelect
                    label="Anagrafica predefinita"
                    value={defaultAnagrafica}
                    onChange={(e) => setDefaultAnagrafica(e.target.value)}
                    disabled={selectedAnagrafiche.length === 0}
                  >
                    <option value="">Seleziona</option>
                    {selectedAnagrafiche.map((id) => (
                      <option key={id} value={id}>
                        {anagraficheMap[id] || `ID ${id}`}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
              {!formData.id_account && (
                <CCol md={12}>
                  <CFormInput
                    label="Password iniziale"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    type="text"
                    placeholder="Se vuoto, verra generata automaticamente"
                  />
                </CCol>
              )}
              <CCol md={6}>
                <CFormCheck
                  label="Account attivo"
                  name="is_active"
                  checked={Number(formData.is_active) === 1}
                  onChange={handleFormChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormCheck
                  label="Forza cambio password"
                  name="must_change_pwd"
                  checked={Number(formData.must_change_pwd) === 1}
                  onChange={handleFormChange}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeModal} disabled={saving}>
            Annulla
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <CSpinner size="sm" /> : 'Salva'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default AccountsList
