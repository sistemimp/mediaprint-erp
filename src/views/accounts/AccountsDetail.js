import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CBadge,
  CButton,
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
import {
  fetchAccountAnagraficheOptions,
  fetchAccountContattiOptions,
  fetchAccountDetail,
  updateAccount,
  updateAccountPermissions,
} from '../../services/accounts'
import PermissionButton from '../../components/PermissionButton'

// Formatta data/ora in locale italiano.
const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('it-IT')
}

// Dettaglio account con gestione permessi granulari.
const AccountsDetail = () => {
  const { token, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Estrae id account dalla querystring.
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
  const [anagraficheOptions, setAnagraficheOptions] = useState([])
  const [selectedAnagraficheIds, setSelectedAnagraficheIds] = useState([])
  const [contattiOptions, setContattiOptions] = useState([])
  const [selectedContattiIds, setSelectedContattiIds] = useState([])
  const [primaryContattoId, setPrimaryContattoId] = useState(null)
  const [defaultAnagraficaId, setDefaultAnagraficaId] = useState(null)
  const [savingAssociations, setSavingAssociations] = useState(false)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [anagraficaSearch, setAnagraficaSearch] = useState('')
  const [anagraficaPage, setAnagraficaPage] = useState(0)

  const loadContattiForAnagrafiche = useCallback(
    async (anagraficheIds, signal) => {
      const payload = await fetchAccountContattiOptions({
        token,
        anagrafiche: anagraficheIds,
        accountId,
        signal,
      })
      const items = Array.isArray(payload?.items) ? payload.items : []
      const selectedIds = Array.isArray(payload?.selected)
        ? payload.selected.map(Number).filter((id) => Number.isFinite(id) && id > 0)
        : []
      return {
        items,
        selectedIds,
        primaryId: Number(payload?.primary_id || 0) || null,
      }
    },
    [accountId, token],
  )

  // Carica dettaglio account e catalogo permessi.
  useEffect(() => {
    if (!token || !accountId) return undefined
    const controller = new AbortController()
    const loadDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchAccountDetail({
          token,
          id: accountId,
          signal: controller.signal,
        })
        const accountDetail = response?.account ?? null
        setDetail(accountDetail)
        setCatalog(Array.isArray(response?.permissions_catalog) ? response.permissions_catalog : [])
        const rolePerms = Array.isArray(response?.role_permissions) ? response.role_permissions : []
        const effectivePerms = Array.isArray(response?.effective_permissions)
          ? response.effective_permissions
          : []
        setRolePreset(rolePerms)
        setSelected(effectivePerms)

        const anagrafichePayload = await fetchAccountAnagraficheOptions({
          token,
          accountId,
          signal: controller.signal,
        })
        const anagraficheItems = Array.isArray(anagrafichePayload?.items)
          ? anagrafichePayload.items
          : []
        const selectedAnagraficheIds = Array.isArray(anagrafichePayload?.selected)
          ? anagrafichePayload.selected.map(Number).filter((id) => Number.isFinite(id) && id > 0)
          : []
        const preferredAnagraficaId =
          Number(anagrafichePayload?.default_id || 0) > 0
            ? Number(anagrafichePayload.default_id)
            : (selectedAnagraficheIds[0] || null)
        setAnagraficheOptions(anagraficheItems)
        setSelectedAnagraficheIds(preferredAnagraficaId ? [preferredAnagraficaId] : [])
        setDefaultAnagraficaId(preferredAnagraficaId)

        const contattiPayload = await loadContattiForAnagrafiche(
          selectedAnagraficheIds,
          controller.signal,
        )
        const contattiItems = contattiPayload.items
        const selectedContattiIds = contattiPayload.selectedIds
        const primaryContattoId =
          contattiPayload.primaryId || Number(accountDetail?.id_contatto || 0) || null
        setContattiOptions(contattiItems)
        setSelectedContattiIds(selectedContattiIds)
        setPrimaryContattoId(primaryContattoId)
        const selectedContattiSet = new Set(selectedContattiIds)
        const selectedContatti = contattiItems.filter((item) =>
          selectedContattiSet.has(Number(item?.id_contatto)),
        )
        const linked =
          selectedContatti.find((item) => Number(item?.id_contatto) === primaryContattoId) ||
          selectedContatti[0] ||
          contattiItems.find(
            (item) => Number(item?.id_contatto) === Number(accountDetail?.id_contatto || 0),
          ) ||
          null
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
  }, [token, accountId, logout, loadContattiForAnagrafiche, refreshIndex])

  useEffect(() => {
    if (!token || !accountId) return undefined
    const controller = new AbortController()
    const load = async () => {
      try {
        const payload = await loadContattiForAnagrafiche(selectedAnagraficheIds, controller.signal)
        setContattiOptions(payload.items)
        setSelectedContattiIds((prev) => {
          const available = new Set(payload.items.map((item) => Number(item?.id_contatto)))
          const kept = prev.filter((id) => available.has(Number(id)))
          return kept.length > 0 ? kept : payload.selectedIds
        })
        setPrimaryContattoId((prev) => {
          const available = new Set(payload.items.map((item) => Number(item?.id_contatto)))
          if (prev && available.has(Number(prev))) return prev
          if (payload.primaryId && available.has(Number(payload.primaryId)))
            return payload.primaryId
          const fallback = payload.selectedIds[0]
          return fallback || null
        })
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    load()
    return () => controller.abort()
  }, [accountId, loadContattiForAnagrafiche, selectedAnagraficheIds, token])

  // Auto-hide feedback temporanei.
  useEffect(() => {
    if (!feedback || feedback.persist) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  // Set utilitario per check rapidi su permessi selezionati.
  const selectedSet = useMemo(() => new Set(selected), [selected])
  // Set permessi attivi che possono essere assegnati.
  const activeIds = useMemo(
    () =>
      new Set(
        catalog.filter((perm) => Number(perm.attivo) === 1).map((perm) => Number(perm.id_permesso)),
      ),
    [catalog],
  )

  // Filtro testuale sul catalogo permessi.
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

  // Toggle di un permesso nel set selezionato.
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

  // Salva permessi effettivi dell'account.
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

  // Costruisce preset permessi (admin/operator/client).
  const buildPreset = (type) => {
    const idsByCode = new Map(
      catalog
        .filter((perm) => Number(perm.attivo) === 1)
        .map((perm) => [String(perm.code || ''), Number(perm.id_permesso)]),
    )
    const modules = [
      'prod',
      'pack',
      'contr',
      'anag',
      'acct',
      'prev',
      'acqu',
      'ddt',
      'fatt',
      'pay',
      'job',
      'msg',
    ]
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

  // Applica preset derivato dal ruolo assegnato.
  const applyRolePreset = () => {
    setSelected(rolePreset)
  }

  const applyAdminPreset = () => setSelected(buildPreset('admin'))
  const applyOperatorPreset = () => setSelected(buildPreset('operator'))
  const applyClientPreset = () => setSelected(buildPreset('client'))
  const selectedAnagraficheSet = useMemo(
    () => new Set(selectedAnagraficheIds.map((id) => Number(id))),
    [selectedAnagraficheIds],
  )
  const selectedContattiSet = useMemo(
    () => new Set(selectedContattiIds.map((id) => Number(id))),
    [selectedContattiIds],
  )
  const filteredAnagrafiche = useMemo(() => {
    if (!anagraficaSearch || anagraficaSearch.trim() === '') return anagraficheOptions
    const needle = anagraficaSearch.trim().toLowerCase()
    return anagraficheOptions.filter((item) => {
      const label = `${item?.ragione_sociale || ''} ${item?.id_anagrafica || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [anagraficaSearch, anagraficheOptions])
  const anagraficaPageSize = 5
  const anagraficaTotalPages = Math.max(
    1,
    Math.ceil(filteredAnagrafiche.length / anagraficaPageSize),
  )
  const anagraficaPageIndex = Math.min(anagraficaPage, anagraficaTotalPages - 1)
  const pagedAnagrafiche = useMemo(() => {
    const start = anagraficaPageIndex * anagraficaPageSize
    return filteredAnagrafiche.slice(start, start + anagraficaPageSize)
  }, [anagraficaPageIndex, filteredAnagrafiche])
  const anagraficaPaginationItems = useMemo(() => {
    const totalPages = anagraficaTotalPages
    const currentPage = anagraficaPageIndex
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx)
    }
    const pages = [0, totalPages - 1]
    for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
      if (i > 0 && i < totalPages - 1) pages.push(i)
    }
    const sorted = Array.from(new Set(pages)).sort((a, b) => a - b)
    const out = []
    sorted.forEach((page, idx) => {
      if (idx > 0 && page - sorted[idx - 1] > 1) out.push('ellipsis')
      out.push(page)
    })
    return out
  }, [anagraficaPageIndex, anagraficaTotalPages])
  const associationRows = useMemo(() => {
    const grouped = new Map()
    contattiOptions.forEach((item) => {
      const contattoId = Number(item?.id_contatto || 0)
      if (!contattoId || !selectedContattiSet.has(contattoId)) return
      const anagId = Number(item?.id_anagrafica || 0)
      if (anagId <= 0) return
      if (!grouped.has(contattoId)) {
        grouped.set(contattoId, {
          id_contatto: contattoId,
          nome: item?.nome || '-',
          email: item?.email || '-',
          anagrafiche: [],
        })
      }
      const row = grouped.get(contattoId)
      const exists = row.anagrafiche.some((anag) => Number(anag.id_anagrafica) === anagId)
      if (!exists) {
        row.anagrafiche.push({
          id_anagrafica: anagId,
          ragione_sociale: item?.ragione_sociale || `ID ${anagId}`,
        })
      }
    })
    return Array.from(grouped.values()).map((row) => {
      const preferred =
        row.anagrafiche.find(
          (anag) => Number(anag.id_anagrafica) === Number(defaultAnagraficaId),
        ) ||
        row.anagrafiche[0] ||
        null
      return {
        id_contatto: row.id_contatto,
        nome: row.nome,
        email: row.email,
        id_anagrafica: preferred?.id_anagrafica || null,
        ragione_sociale: preferred?.ragione_sociale || '-',
      }
    })
  }, [contattiOptions, defaultAnagraficaId, selectedContattiSet])
  const toggleAnagrafica = (id) => {
    const numericId = Number(id)
    if (numericId <= 0) return
    setSelectedAnagraficheIds([numericId])
    setDefaultAnagraficaId(numericId)
  }

  const toggleContatto = (id) => {
    const numericId = Number(id)
    setSelectedContattiIds((prev) => {
      const set = new Set(prev.map((row) => Number(row)))
      if (set.has(numericId)) set.delete(numericId)
      else set.add(numericId)
      return Array.from(set)
    })
    setPrimaryContattoId((prev) => (Number(prev) === numericId ? null : prev))
  }

  const handleSaveAssociations = async () => {
    if (!accountId) return
    if (selectedAnagraficheIds.length === 0) {
      setError(new Error('Seleziona almeno una anagrafica.'))
      return
    }
    if (selectedContattiIds.length === 0) {
      setError(new Error('Seleziona almeno un contatto.'))
      return
    }
    const resolvedDefaultAnagrafica =
      Number(defaultAnagraficaId) > 0
        ? Number(defaultAnagraficaId)
        : Number(selectedAnagraficheIds[0])
    const resolvedPrimaryContatto =
      Number(primaryContattoId) > 0 ? Number(primaryContattoId) : Number(selectedContattiIds[0])
    setSavingAssociations(true)
    setError(null)
    try {
      await updateAccount({
        token,
        body: {
          id_account: accountId,
          id_contatto: resolvedPrimaryContatto,
          anagrafiche: selectedAnagraficheIds.map(Number),
          anagrafica_predefinita: resolvedDefaultAnagrafica,
          contatti: selectedContattiIds.map(Number),
          contatto_predefinito: resolvedPrimaryContatto,
        },
      })
      setFeedback({ message: 'Associazioni account aggiornate.', color: 'success' })
      setRefreshIndex((prev) => prev + 1)
    } catch (e) {
      if (e.status === 401 && logout) {
        logout()
        return
      }
      setError(e)
    } finally {
      setSavingAssociations(false)
    }
  }

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
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={applyAdminPreset}
            permission="acct.write"
          >
            Preset Amministratore
          </PermissionButton>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={applyOperatorPreset}
            permission="acct.write"
          >
            Preset Operatore interno
          </PermissionButton>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={applyClientPreset}
            permission="acct.write"
          >
            Preset Cliente
          </PermissionButton>
          <PermissionButton
            color="primary"
            onClick={handleSave}
            disabled={saving}
            permission="acct.write"
          >
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
          <div className="d-flex justify-content-center py-5">
            <CSpinner />
          </div>
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

            <CAccordion className="mb-4" alwaysOpen>
              <CAccordionItem itemKey="associazioni">
                <CAccordionHeader>Associazioni</CAccordionHeader>
                <CAccordionBody>
                  <CTable hover responsive className="mb-0">
                    <CTableHead className="mp-table-head">
                      <CTableRow>
                        <CTableHeaderCell>Contatto associato</CTableHeaderCell>
                        <CTableHeaderCell>Email</CTableHeaderCell>
                        <CTableHeaderCell>Anagrafica accessibile</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {associationRows.map((row) => (
                        <CTableRow
                          key={`assoc-${row.id_contatto}-${row.id_anagrafica}`}
                          className="align-middle"
                        >
                          <CTableDataCell>
                            <div className="fw-semibold">{row.nome}</div>
                            <small className="text-body-secondary">ID {row.id_contatto}</small>
                          </CTableDataCell>
                          <CTableDataCell>{row.email}</CTableDataCell>
                          <CTableDataCell>
                            <PermissionButton
                              color="secondary"
                              size="sm"
                              variant="outline"
                              permission="anag.read"
                              onClick={() =>
                                row.id_anagrafica &&
                                navigate(`/anagrafica/dettagli?id=${row.id_anagrafica}`)
                              }
                              disabled={!row.id_anagrafica}
                            >
                              {row.ragione_sociale || `ID ${row.id_anagrafica || '-'}`}
                            </PermissionButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      {associationRows.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={3}>
                            <span className="text-body-secondary">Nessun contatto associato</span>
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CAccordionBody>
              </CAccordionItem>

              <CAccordionItem itemKey="gestione-associazioni">
                <CAccordionHeader>Gestione associazioni</CAccordionHeader>
                <CAccordionBody>
                  <CRow className="g-3">
                    <CCol lg={6}>
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                        <div className="small text-body-secondary">Anagrafiche collegabili</div>
                        <CFormInput
                          size="sm"
                          style={{ maxWidth: '260px' }}
                          placeholder="Cerca anagrafica..."
                          value={anagraficaSearch}
                          onChange={(e) => {
                            setAnagraficaSearch(e.target.value)
                            setAnagraficaPage(0)
                          }}
                        />
                      </div>
                      <CTable hover responsive size="sm">
                        <CTableHead className="mp-table-head">
                          <CTableRow>
                            <CTableHeaderCell style={{ width: 70 }}>Sel.</CTableHeaderCell>
                            <CTableHeaderCell>Anagrafica</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {pagedAnagrafiche.map((item) => {
                            const id = Number(item?.id_anagrafica || 0)
                            const isSelected = selectedAnagraficheSet.has(id)
                            return (
                              <CTableRow key={`anag-${id}`} className="align-middle">
                                <CTableDataCell>
                                  <CFormCheck
                                    type="radio"
                                    name="selected_anagrafica_detail"
                                    checked={isSelected}
                                    onChange={() => toggleAnagrafica(id)}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>
                                  {item?.ragione_sociale || `ID ${id}`}
                                </CTableDataCell>
                              </CTableRow>
                            )
                          })}
                          {filteredAnagrafiche.length === 0 && (
                            <CTableRow>
                              <CTableDataCell colSpan={2}>
                                Nessuna anagrafica disponibile.
                              </CTableDataCell>
                            </CTableRow>
                          )}
                        </CTableBody>
                      </CTable>
                      {filteredAnagrafiche.length > anagraficaPageSize && (
                        <div className="d-flex justify-content-end">
                          <div className="d-flex align-items-center gap-1">
                            <CButton
                              size="sm"
                              color="light"
                              variant="outline"
                              disabled={anagraficaPageIndex <= 0}
                              onClick={() =>
                                setAnagraficaPage(Math.max(0, anagraficaPageIndex - 1))
                              }
                            >
                              ‹
                            </CButton>
                            {anagraficaPaginationItems.map((item, index) =>
                              item === 'ellipsis' ? (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="px-1 text-body-secondary"
                                >
                                  ...
                                </span>
                              ) : (
                                <CButton
                                  key={`page-${item}`}
                                  size="sm"
                                  color={item === anagraficaPageIndex ? 'primary' : 'light'}
                                  variant={item === anagraficaPageIndex ? undefined : 'outline'}
                                  onClick={() => setAnagraficaPage(item)}
                                >
                                  {item + 1}
                                </CButton>
                              ),
                            )}
                            <CButton
                              size="sm"
                              color="light"
                              variant="outline"
                              disabled={anagraficaPageIndex >= anagraficaTotalPages - 1}
                              onClick={() =>
                                setAnagraficaPage(
                                  Math.min(anagraficaTotalPages - 1, anagraficaPageIndex + 1),
                                )
                              }
                            >
                              ›
                            </CButton>
                          </div>
                        </div>
                      )}
                    </CCol>

                    <CCol lg={6}>
                      <div className="small text-body-secondary mb-2">Contatti collegabili</div>
                      <CTable hover responsive size="sm">
                        <CTableHead className="mp-table-head">
                          <CTableRow>
                            <CTableHeaderCell style={{ width: 70 }}>Sel.</CTableHeaderCell>
                            <CTableHeaderCell>Contatto</CTableHeaderCell>
                            <CTableHeaderCell>Email</CTableHeaderCell>
                            <CTableHeaderCell style={{ width: 110 }}>Primario</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {contattiOptions.map((item) => {
                            const id = Number(item?.id_contatto || 0)
                            const isSelected = selectedContattiSet.has(id)
                            return (
                              <CTableRow key={`cont-${id}`} className="align-middle">
                                <CTableDataCell>
                                  <CFormCheck
                                    checked={isSelected}
                                    onChange={() => toggleContatto(id)}
                                  />
                                </CTableDataCell>
                                <CTableDataCell>{item?.nome || `ID ${id}`}</CTableDataCell>
                                <CTableDataCell>{item?.email || '-'}</CTableDataCell>
                                <CTableDataCell>
                                  <CFormCheck
                                    type="radio"
                                    name="primary_contatto"
                                    checked={Number(primaryContattoId) === id}
                                    disabled={!isSelected}
                                    onChange={() => setPrimaryContattoId(id)}
                                  />
                                </CTableDataCell>
                              </CTableRow>
                            )
                          })}
                          {contattiOptions.length === 0 && (
                            <CTableRow>
                              <CTableDataCell colSpan={4}>
                                Nessun contatto disponibile per le anagrafiche selezionate.
                              </CTableDataCell>
                            </CTableRow>
                          )}
                        </CTableBody>
                      </CTable>
                    </CCol>
                  </CRow>
                  <div className="d-flex justify-content-end mt-3">
                    <PermissionButton
                      color="primary"
                      permission="acct.write"
                      onClick={handleSaveAssociations}
                      disabled={savingAssociations}
                    >
                      {savingAssociations ? <CSpinner size="sm" /> : 'Salva associazioni'}
                    </PermissionButton>
                  </div>
                </CAccordionBody>
              </CAccordionItem>
            </CAccordion>

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
                        {isActive ? (
                          <CBadge color="success">Si</CBadge>
                        ) : (
                          <CBadge color="secondary">No</CBadge>
                        )}
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
