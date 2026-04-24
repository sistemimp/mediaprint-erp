import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
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
import { cilCog, cilPencil, cilPlus, cilReload } from '@coreui/icons'
import PermissionButton from '../../components/PermissionButton'
import { useAuth } from '../../context/AuthContext'
import { fetchCategorieProdotti } from '../../services/prodotti'
import {
  createMagazzinoMovement,
  fetchMacchine,
  fetchMagazzinoStock,
  saveMacchina,
  updateMagazzinoStockConfig,
} from '../../services/magazzino'

// Tipi macchina disponibili per filtro/form.
const MACHINE_TYPES = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'stampante', label: 'Stampante' },
  { value: 'imbustatrice', label: 'Imbustatrice' },
  { value: 'cellophanatrice', label: 'Cellophanatrice' },
]

// Stati macchina disponibili.
const MACHINE_STATES = [
  { value: 'attiva', label: 'Attiva' },
  { value: 'ferma', label: 'Ferma' },
  { value: 'manutenzione', label: 'In manutenzione' },
  { value: 'dismessa', label: 'Dismessa' },
]

// Metadati UI per stato scorta.
const STOCK_STATUS_UI = {
  ok: { color: 'success', label: 'OK' },
  basso: { color: 'warning', label: 'Scorta bassa' },
  esaurito: { color: 'danger', label: 'Esaurito' },
  non_gestito: { color: 'secondary', label: 'Non gestito' },
}

// Valori iniziali form macchina.
const emptyMachineForm = {
  id_macchina: null,
  codice: '',
  nome: '',
  tipo: 'stampante',
  marca: '',
  modello: '',
  seriale: '',
  reparto: '',
  stato: 'attiva',
  capacita_oraria: '',
  data_installazione: '',
  data_ultima_manutenzione: '',
  data_prossima_manutenzione: '',
  note: '',
  attiva: 1,
}

// Dashboard operativa magazzino: scorte, movimenti rapidi e macchine.
const MagazzinoPage = () => {
  const { token, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('scorte')

  const [stockItems, setStockItems] = useState([])
  const [stockCategoryOptions, setStockCategoryOptions] = useState([])
  const [unitaMisuraOptions, setUnitaMisuraOptions] = useState([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState(null)
  const [stockFilters, setStockFilters] = useState({
    q: '',
    id_categoria: '',
    only_alerts: false,
    include_unmanaged: true,
  })

  const [stockConfigModalOpen, setStockConfigModalOpen] = useState(false)
  const [stockConfigTarget, setStockConfigTarget] = useState(null)
  const [stockConfigForm, setStockConfigForm] = useState({
    gestione_magazzino: true,
    soglia_scorta: '',
    id_unita: '',
  })
  const [stockConfigSaving, setStockConfigSaving] = useState(false)

  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementTarget, setMovementTarget] = useState(null)
  const [movementForm, setMovementForm] = useState({ tipo: 'carico', quantita: '', note: '' })
  const [movementSaving, setMovementSaving] = useState(false)

  const [machineItems, setMachineItems] = useState([])
  const [machineLoading, setMachineLoading] = useState(false)
  const [machineError, setMachineError] = useState(null)
  const [machineFilters, setMachineFilters] = useState({ tipo: '', showInactive: false })
  const [machineModalOpen, setMachineModalOpen] = useState(false)
  const [machineForm, setMachineForm] = useState(emptyMachineForm)
  const [machineSaving, setMachineSaving] = useState(false)

  const [feedback, setFeedback] = useState(null)
  const stockRequestRef = useRef(0)

  // Auto-hide dei messaggi feedback.
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  // Carica scorte prodotto con filtri correnti.
  const loadStock = useCallback(async () => {
    if (!token) return
    const requestId = stockRequestRef.current + 1
    stockRequestRef.current = requestId
    setStockLoading(true)
    setStockError(null)
    try {
      const { items, unitaMisuraOptions: units } = await fetchMagazzinoStock({
        token,
        q: stockFilters.q,
        id_categoria: stockFilters.id_categoria ? Number(stockFilters.id_categoria) : undefined,
        only_alerts: stockFilters.only_alerts,
        include_unmanaged: stockFilters.include_unmanaged,
      })
      if (requestId !== stockRequestRef.current) {
        return
      }
      const selectedCategoryId = stockFilters.id_categoria ? Number(stockFilters.id_categoria) : null
      const selectedCategoryName =
        selectedCategoryId && Array.isArray(stockCategoryOptions)
          ? stockCategoryOptions.find((entry) => Number(entry?.id_categoria) === selectedCategoryId)?.nome || null
          : null
      const normalizedItems = Array.isArray(items) ? items : []
      const filteredItems =
        selectedCategoryId && selectedCategoryId > 0
          ? normalizedItems.filter((item) => {
              const rowCategoryId = Number(item?.id_categoria || 0)
              if (rowCategoryId > 0) {
                return rowCategoryId === selectedCategoryId
              }
              if (!selectedCategoryName) {
                return false
              }
              return String(item?.categoria || '').trim() === String(selectedCategoryName).trim()
            })
          : normalizedItems

      setStockItems(filteredItems)
      setUnitaMisuraOptions(Array.isArray(units) ? units : [])
    } catch (error) {
      if (requestId !== stockRequestRef.current) {
        return
      }
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setStockError(error)
    } finally {
      if (requestId !== stockRequestRef.current) {
        return
      }
      setStockLoading(false)
    }
  }, [
    token,
    logout,
    stockFilters.q,
    stockFilters.id_categoria,
    stockFilters.only_alerts,
    stockFilters.include_unmanaged,
    stockCategoryOptions,
  ])

  // Carica categorie prodotto per filtro scorte.
  useEffect(() => {
    if (!token) return
    const loadCategories = async () => {
      try {
        const { items } = await fetchCategorieProdotti({ token })
        setStockCategoryOptions(Array.isArray(items) ? items : [])
      } catch (error) {
        if (error?.status === 401 && logout) {
          logout()
        }
      }
    }
    loadCategories()
  }, [token, logout])

  // Carica elenco macchine in base ai filtri selezionati.
  const loadMachines = useCallback(async () => {
    if (!token) return
    setMachineLoading(true)
    setMachineError(null)
    try {
      const { items } = await fetchMacchine({
        token,
        tipo: machineFilters.tipo || undefined,
        all: machineFilters.showInactive,
      })
      setMachineItems(Array.isArray(items) ? items : [])
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setMachineError(error)
    } finally {
      setMachineLoading(false)
    }
  }, [token, logout, machineFilters.tipo, machineFilters.showInactive])

  // Trigger iniziale/refresh scorte.
  useEffect(() => {
    loadStock()
  }, [loadStock])

  // Trigger iniziale/refresh macchine.
  useEffect(() => {
    loadMachines()
  }, [loadMachines])

  // Riepilogo contatori scorte per stato.
  const stockSummary = useMemo(() => {
    const summary = { total: stockItems.length, ok: 0, basso: 0, esaurito: 0, non_gestito: 0 }
    stockItems.forEach((item) => {
      const status = item?.stock_status || 'ok'
      if (status === 'basso') summary.basso += 1
      else if (status === 'esaurito') summary.esaurito += 1
      else if (status === 'non_gestito') summary.non_gestito += 1
      else summary.ok += 1
    })
    return summary
  }, [stockItems])

  // Raggruppa scorte per categoria per rendering tabella.
  const stockGroupedByCategory = useMemo(() => {
    const sorted = [...stockItems].sort((a, b) => {
      const catA = String(a?.categoria || 'Senza categoria').toLocaleLowerCase()
      const catB = String(b?.categoria || 'Senza categoria').toLocaleLowerCase()
      const catCmp = catA.localeCompare(catB)
      if (catCmp !== 0) return catCmp
      const nameA = String(a?.nome || '').toLocaleLowerCase()
      const nameB = String(b?.nome || '').toLocaleLowerCase()
      return nameA.localeCompare(nameB)
    })

    const map = new Map()
    sorted.forEach((item) => {
      const category = String(item?.categoria || 'Senza categoria')
      if (!map.has(category)) {
        map.set(category, [])
      }
      map.get(category).push(item)
    })

    return Array.from(map.entries())
  }, [stockItems])

  // Apre il modal configurazione scorta del prodotto.
  const openConfigModal = (item) => {
    setStockConfigTarget(item)
    setStockConfigForm({
      gestione_magazzino: true,
      soglia_scorta: item?.soglia_scorta ?? '',
      id_unita: item?.id_unita ?? '',
    })
    setStockConfigModalOpen(true)
  }

  // Salva configurazione magazzino del prodotto.
  const submitStockConfig = async (event) => {
    event.preventDefault()
    if (!stockConfigTarget?.id_prodotto) return
    setStockConfigSaving(true)
    try {
      await updateMagazzinoStockConfig({
        token,
        body: {
          id_prodotto: stockConfigTarget.id_prodotto,
          gestione_magazzino: stockConfigForm.gestione_magazzino ? 1 : 0,
          soglia_scorta: stockConfigForm.soglia_scorta === '' ? null : Number(stockConfigForm.soglia_scorta),
          id_unita: stockConfigForm.id_unita === '' ? null : Number(stockConfigForm.id_unita),
        },
      })
      setStockConfigModalOpen(false)
      setFeedback({ color: 'success', message: 'Configurazione magazzino aggiornata.' })
      await loadStock()
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setFeedback({
        color: 'danger',
        message: error?.payload?.message || error?.message || 'Errore durante il salvataggio configurazione.',
      })
    } finally {
      setStockConfigSaving(false)
    }
  }

  // Apre modal inserimento movimento per prodotto.
  const openMovementModal = (item) => {
    setMovementTarget(item)
    setMovementForm({ tipo: 'carico', quantita: '', note: '' })
    setMovementModalOpen(true)
  }

  // Registra movimento (carico/scarico/rettifica).
  const submitMovement = async (event) => {
    event.preventDefault()
    if (!movementTarget?.id_prodotto) return
    setMovementSaving(true)
    try {
      await createMagazzinoMovement({
        token,
        body: {
          id_prodotto: movementTarget.id_prodotto,
          tipo: movementForm.tipo,
          quantita: Number(movementForm.quantita || 0),
          note: movementForm.note || null,
        },
      })
      setMovementModalOpen(false)
      setFeedback({ color: 'success', message: 'Movimento registrato con successo.' })
      await loadStock()
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setFeedback({
        color: 'danger',
        message: error?.payload?.message || error?.message || 'Errore durante la registrazione movimento.',
      })
    } finally {
      setMovementSaving(false)
    }
  }

  // Apre modal creazione macchina.
  const openMachineCreate = () => {
    setMachineForm(emptyMachineForm)
    setMachineModalOpen(true)
  }

  // Apre modal modifica macchina esistente.
  const openMachineEdit = (item) => {
    setMachineForm({
      ...emptyMachineForm,
      ...item,
      capacita_oraria: item?.capacita_oraria ?? '',
      data_installazione: item?.data_installazione || '',
      data_ultima_manutenzione: item?.data_ultima_manutenzione || '',
      data_prossima_manutenzione: item?.data_prossima_manutenzione || '',
      attiva: Number(item?.attiva ?? 1) === 1 ? 1 : 0,
    })
    setMachineModalOpen(true)
  }

  // Salva creazione/aggiornamento macchina.
  const submitMachine = async (event) => {
    event.preventDefault()
    setMachineSaving(true)
    try {
      await saveMacchina({
        token,
        body: {
          ...machineForm,
          id_macchina: machineForm.id_macchina || undefined,
          capacita_oraria: machineForm.capacita_oraria === '' ? null : Number(machineForm.capacita_oraria),
        },
      })
      setMachineModalOpen(false)
      setFeedback({
        color: 'success',
        message: machineForm.id_macchina ? 'Macchina aggiornata.' : 'Macchina creata.',
      })
      await loadMachines()
    } catch (error) {
      if (error?.status === 401 && logout) {
        logout()
        return
      }
      setFeedback({
        color: 'danger',
        message: error?.payload?.message || error?.message || 'Errore durante il salvataggio macchina.',
      })
    } finally {
      setMachineSaving(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Magazzino</h5>
          <small className="text-body-secondary">Gestione scorte e censimento macchine</small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={loadStock} disabled={stockLoading}>
            <CIcon icon={cilReload} className="me-2" />
            Aggiorna scorte
          </CButton>
          <CButton color="secondary" variant="outline" onClick={loadMachines} disabled={machineLoading}>
            <CIcon icon={cilReload} className="me-2" />
            Aggiorna macchine
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CNav variant="tabs" className="mb-3">
          <CNavItem>
            <CNavLink active={activeTab === 'scorte'} onClick={() => setActiveTab('scorte')}>
              Scorte
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink active={activeTab === 'macchine'} onClick={() => setActiveTab('macchine')}>
              Macchine
            </CNavLink>
          </CNavItem>
        </CNav>

        {feedback && <CAlert color={feedback.color || 'info'}>{feedback.message}</CAlert>}

        {activeTab === 'scorte' && (
          <>
            <CRow className="g-2 mb-3">
              <CCol md={6}>
                <CFormInput
                  value={stockFilters.q}
                  placeholder="Cerca articolo per nome o codice"
                  onChange={(event) => setStockFilters((prev) => ({ ...prev, q: event.target.value }))}
                />
              </CCol>
              <CCol md={3}>
                <CFormSelect
                  value={stockFilters.id_categoria}
                  onChange={(event) => setStockFilters((prev) => ({ ...prev, id_categoria: event.target.value }))}
                >
                  <option value="">Tutte le categorie</option>
                  {stockCategoryOptions.map((category) => (
                    <option key={category.id_categoria} value={category.id_categoria}>
                      {category.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3} className="d-flex align-items-center">
                <CFormCheck
                  id="stock-only-alerts"
                  label="Mostra solo alert"
                  checked={stockFilters.only_alerts}
                  onChange={(event) => setStockFilters((prev) => ({ ...prev, only_alerts: event.target.checked }))}
                />
              </CCol>
              <CCol md={12}>
                <div className="small text-body-secondary mt-2">
                  Totale: {stockSummary.total} | OK: {stockSummary.ok} | Basse: {stockSummary.basso} | Esaurite:{' '}
                  {stockSummary.esaurito} | Non gestite: {stockSummary.non_gestito}
                </div>
              </CCol>
            </CRow>
            <CRow className="g-2 mb-3">
              <CCol md={6} className="d-flex align-items-center">
                <CFormCheck
                  id="stock-include-unmanaged"
                  label="Includi prodotti non gestiti"
                  checked={stockFilters.include_unmanaged}
                  onChange={(event) =>
                    setStockFilters((prev) => ({ ...prev, include_unmanaged: event.target.checked }))
                  }
                />
              </CCol>
            </CRow>

            {stockLoading && (
              <div className="d-flex justify-content-center py-5">
                <CSpinner />
              </div>
            )}
            {!stockLoading && stockError && (
              <CAlert color="danger">{stockError?.message || 'Errore caricamento scorte.'}</CAlert>
            )}
            {!stockLoading && !stockError && (
              <CTable responsive hover>
                <CTableHead className="mp-table-head">
                  <CTableRow>
                    <CTableHeaderCell>Codice</CTableHeaderCell>
                    <CTableHeaderCell>Articolo</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Giacenza</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Soglia</CTableHeaderCell>
                    <CTableHeaderCell>UM</CTableHeaderCell>
                    <CTableHeaderCell>Stato</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stockGroupedByCategory.length === 0 && (
                    <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center text-body-secondary py-4">
                        Nessun articolo configurato per il magazzino.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                  {stockGroupedByCategory.map(([category, rows]) => (
                    <React.Fragment key={category}>
                      <CTableRow className="mp-group-row">
                        <CTableDataCell colSpan={7} className="fw-semibold">
                          {category}
                        </CTableDataCell>
                      </CTableRow>
                      {rows.map((item) => {
                        const statusUi = STOCK_STATUS_UI[item.stock_status] || STOCK_STATUS_UI.ok
                        return (
                          <CTableRow key={item.id_prodotto}>
                            <CTableDataCell>{item.codice || '-'}</CTableDataCell>
                            <CTableDataCell>{item.nome}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              {item.stock_status === 'non_gestito' ? '∞' : (item.giacenza_attuale ?? 0)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {item.stock_status === 'non_gestito' ? '0' : (item.soglia_scorta ?? '-')}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.stock_status === 'non_gestito' ? '-' : (item.unita_misura_label || item.unita_misura || '-')}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={statusUi.color}>{statusUi.label}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <PermissionButton
                                  color="secondary"
                                  variant="outline"
                                  size="sm"
                                  permission="prod.write"
                                  onClick={() => openConfigModal(item)}
                                >
                                  <CIcon icon={cilCog} className="me-1" />
                                  Configura
                                </PermissionButton>
                                <PermissionButton
                                  color="primary"
                                  variant="outline"
                                  size="sm"
                                  permission="prod.write"
                                  onClick={() => openMovementModal(item)}
                                  disabled={item.stock_status === 'non_gestito'}
                                >
                                  <CIcon icon={cilReload} className="me-1" />
                                  Movimento
                                </PermissionButton>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </>
        )}

        {activeTab === 'macchine' && (
          <>
            <CRow className="g-2 mb-3">
              <CCol md={4}>
                <CFormSelect
                  value={machineFilters.tipo}
                  onChange={(event) => setMachineFilters((prev) => ({ ...prev, tipo: event.target.value }))}
                >
                  {MACHINE_TYPES.map((typeOption) => (
                    <option key={typeOption.value || 'all'} value={typeOption.value}>
                      {typeOption.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4} className="d-flex align-items-center">
                <CFormCheck
                  id="machine-show-inactive"
                  label="Includi macchine non attive"
                  checked={machineFilters.showInactive}
                  onChange={(event) => setMachineFilters((prev) => ({ ...prev, showInactive: event.target.checked }))}
                />
              </CCol>
              <CCol md={4} className="text-end">
                <PermissionButton color="primary" permission="job.write" onClick={openMachineCreate}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Nuova macchina
                </PermissionButton>
              </CCol>
            </CRow>

            {machineLoading && (
              <div className="d-flex justify-content-center py-5">
                <CSpinner />
              </div>
            )}
            {!machineLoading && machineError && (
              <CAlert color="danger">{machineError?.message || 'Errore caricamento macchine.'}</CAlert>
            )}
            {!machineLoading && !machineError && (
              <CTable responsive hover>
                <CTableHead className="mp-table-head">
                  <CTableRow>
                    <CTableHeaderCell>Codice</CTableHeaderCell>
                    <CTableHeaderCell>Nome</CTableHeaderCell>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell>Reparto</CTableHeaderCell>
                    <CTableHeaderCell>Stato</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Capacità/h</CTableHeaderCell>
                    <CTableHeaderCell>Pross. manutenzione</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {machineItems.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={8} className="text-center text-body-secondary py-4">
                        Nessuna macchina censita.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                  {machineItems.map((item) => (
                    <CTableRow key={item.id_macchina}>
                      <CTableDataCell>{item.codice}</CTableDataCell>
                      <CTableDataCell>{item.nome}</CTableDataCell>
                      <CTableDataCell>{item.tipo}</CTableDataCell>
                      <CTableDataCell>{item.reparto || '-'}</CTableDataCell>
                      <CTableDataCell>{item.stato || '-'}</CTableDataCell>
                      <CTableDataCell className="text-end">{item.capacita_oraria ?? '-'}</CTableDataCell>
                      <CTableDataCell>{item.data_prossima_manutenzione || '-'}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <PermissionButton
                          color="secondary"
                          variant="outline"
                          size="sm"
                          permission="job.write"
                          onClick={() => openMachineEdit(item)}
                        >
                          <CIcon icon={cilPencil} className="me-1" />
                          Modifica
                        </PermissionButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </>
        )}
      </CCardBody>

      <CModal visible={stockConfigModalOpen} onClose={() => setStockConfigModalOpen(false)}>
        <CForm onSubmit={submitStockConfig}>
          <CModalHeader>
            <CModalTitle>Configura scorta prodotto</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <p className="small text-body-secondary">
              {stockConfigTarget?.codice ? `${stockConfigTarget.codice} - ` : ''}
              {stockConfigTarget?.nome || ''}
            </p>
            <CFormCheck
              id="cfg-gestione-magazzino"
              className="mb-3"
              label="Gestione magazzino attiva"
              checked={stockConfigForm.gestione_magazzino}
              onChange={(event) =>
                setStockConfigForm((prev) => ({ ...prev, gestione_magazzino: event.target.checked }))
              }
            />
            <CRow className="g-2">
              <CCol md={6}>
                <CFormLabel>Soglia minima</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.001"
                  value={stockConfigForm.soglia_scorta}
                  onChange={(event) => setStockConfigForm((prev) => ({ ...prev, soglia_scorta: event.target.value }))}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Unità di misura</CFormLabel>
                <CFormSelect
                  value={stockConfigForm.id_unita}
                  onChange={(event) => setStockConfigForm((prev) => ({ ...prev, id_unita: event.target.value }))}
                >
                  <option value="">Seleziona...</option>
                  {unitaMisuraOptions.map((unit) => (
                    <option key={unit.id_unita} value={unit.id_unita}>
                      {unit.label} ({unit.code})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setStockConfigModalOpen(false)}>
              Annulla
            </CButton>
            <PermissionButton type="submit" color="primary" permission="prod.write" disabled={stockConfigSaving}>
              {stockConfigSaving ? <CSpinner size="sm" /> : 'Salva'}
            </PermissionButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={movementModalOpen} onClose={() => setMovementModalOpen(false)}>
        <CForm onSubmit={submitMovement}>
          <CModalHeader>
            <CModalTitle>Registra movimento</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <p className="small text-body-secondary">
              {movementTarget?.codice ? `${movementTarget.codice} - ` : ''}
              {movementTarget?.nome || ''}
            </p>
            <CRow className="g-2">
              <CCol md={5}>
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect
                  value={movementForm.tipo}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, tipo: event.target.value }))}
                >
                  <option value="carico">Carico</option>
                  <option value="scarico">Scarico</option>
                  <option value="rettifica">Rettifica (nuova giacenza)</option>
                </CFormSelect>
              </CCol>
              <CCol md={7}>
                <CFormLabel>{movementForm.tipo === 'rettifica' ? 'Nuova giacenza' : 'Quantità'}</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.001"
                  min={movementForm.tipo === 'rettifica' ? undefined : '0.001'}
                  required
                  value={movementForm.quantita}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, quantita: event.target.value }))}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Note</CFormLabel>
                <CFormInput
                  value={movementForm.note}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Motivazione movimento"
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setMovementModalOpen(false)}>
              Annulla
            </CButton>
            <PermissionButton type="submit" color="primary" permission="prod.write" disabled={movementSaving}>
              {movementSaving ? <CSpinner size="sm" /> : 'Conferma'}
            </PermissionButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={machineModalOpen} onClose={() => setMachineModalOpen(false)} size="lg">
        <CForm onSubmit={submitMachine}>
          <CModalHeader>
            <CModalTitle>{machineForm.id_macchina ? 'Modifica macchina' : 'Nuova macchina'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-2">
              <CCol md={4}>
                <CFormLabel>Codice</CFormLabel>
                <CFormInput
                  required
                  value={machineForm.codice}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, codice: event.target.value }))}
                />
              </CCol>
              <CCol md={8}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput
                  required
                  value={machineForm.nome}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, nome: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect
                  value={machineForm.tipo}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, tipo: event.target.value }))}
                >
                  {MACHINE_TYPES.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Stato</CFormLabel>
                <CFormSelect
                  value={machineForm.stato}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, stato: event.target.value }))}
                >
                  {MACHINE_STATES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Capacità oraria</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={machineForm.capacita_oraria}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, capacita_oraria: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Marca</CFormLabel>
                <CFormInput
                  value={machineForm.marca}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, marca: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Modello</CFormLabel>
                <CFormInput
                  value={machineForm.modello}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, modello: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Seriale</CFormLabel>
                <CFormInput
                  value={machineForm.seriale}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, seriale: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Reparto</CFormLabel>
                <CFormInput
                  value={machineForm.reparto}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, reparto: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Data installazione</CFormLabel>
                <CFormInput
                  type="date"
                  value={machineForm.data_installazione}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, data_installazione: event.target.value }))}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Ultima manutenzione</CFormLabel>
                <CFormInput
                  type="date"
                  value={machineForm.data_ultima_manutenzione}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, data_ultima_manutenzione: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Prossima manutenzione</CFormLabel>
                <CFormInput
                  type="date"
                  value={machineForm.data_prossima_manutenzione}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, data_prossima_manutenzione: event.target.value }))
                  }
                />
              </CCol>
              <CCol md={8}>
                <CFormLabel>Note</CFormLabel>
                <CFormInput
                  value={machineForm.note}
                  onChange={(event) => setMachineForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck
                  id="machine-active"
                  label="Macchina attiva"
                  checked={Number(machineForm.attiva) === 1}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, attiva: event.target.checked ? 1 : 0 }))
                  }
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setMachineModalOpen(false)}>
              Annulla
            </CButton>
            <PermissionButton type="submit" color="primary" permission="job.write" disabled={machineSaving}>
              {machineSaving ? <CSpinner size="sm" /> : 'Salva'}
            </PermissionButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CCard>
  )
}

export default MagazzinoPage
