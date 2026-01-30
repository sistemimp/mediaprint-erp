import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
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
  CFormTextarea,
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
  fetchLavorazioneActivityTemplates,
  fetchLavorazioniAssignmentsConfig,
  saveLavorazioneActivityTemplate,
} from '../../services/lavorazioni'
import BottomToast from '../../components/BottomToast'
import PermissionButton from '../../components/PermissionButton'

const priorityOptions = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
]

const buildForm = (row) => ({
  titolo: row?.titolo ?? '',
  descrizione: row?.descrizione ?? '',
  priorita: row?.priorita ?? 'medium',
  id_reparto: row?.id_reparto ? String(row.id_reparto) : '',
  durata_predefinita_giorni:
    row?.durata_predefinita_giorni !== null && row?.durata_predefinita_giorni !== undefined
      ? String(row.durata_predefinita_giorni)
      : '',
  attivo: row?.attivo === undefined ? true : Number(row.attivo) === 1,
  ordering: row?.ordering !== null && row?.ordering !== undefined ? String(row.ordering) : '100',
})

const LavorazioniTemplates = () => {
  const { token, logout } = useAuth()
  const [items, setItems] = useState([])
  const [reparti, setReparti] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(buildForm(null))
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  const repartoMap = useMemo(() => {
    const map = {}
    reparti.forEach((rep) => {
      if (!rep?.id) return
      map[Number(rep.id)] = rep.label || rep.code || `ID ${rep.id}`
    })
    return map
  }, [reparti])

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  const load = async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLavorazioneActivityTemplates({ token, all: true, signal })
      setItems(Array.isArray(data) ? data : [])
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

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetchLavorazioniAssignmentsConfig({ token, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setReparti(Array.isArray(data?.reparti) ? data.reparti : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare i reparti:', err)
      })
    return () => controller.abort()
  }, [token])

  const startCreate = () => {
    setEditRow(null)
    setForm(buildForm(null))
    setFormVisible(true)
  }

  const startEdit = (row) => {
    setEditRow(row)
    setForm(buildForm(row))
    setFormVisible(true)
  }

  const cancel = () => {
    setEditRow(null)
    setForm(buildForm(null))
    setFormVisible(false)
  }

  const handleFieldChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleToggle = (event) => {
    const checked = event?.target ? event.target.checked : Boolean(event)
    setForm((prev) => ({ ...prev, attivo: checked }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await saveLavorazioneActivityTemplate({
        token,
        idTemplate: editRow?.id_template,
        titolo: form.titolo?.trim(),
        descrizione: form.descrizione?.trim() || null,
        priorita: form.priorita,
        repartoId: form.id_reparto ? Number(form.id_reparto) : null,
        durataGiorni: form.durata_predefinita_giorni ? Number(form.durata_predefinita_giorni) : null,
        attivo: form.attivo,
        ordering: form.ordering !== '' ? Number(form.ordering) : undefined,
      })
      await load()
      cancel()
      showToast('Template salvato', 'success')
    } catch (e) {
      setError(e)
      showToast(e.message || 'Errore salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Lavorazioni - Template attivita</h5>
            <PermissionButton
              color="primary"
              variant="outline"
              onClick={startCreate}
              permission="job.create"
            >
              Nuovo template
            </PermissionButton>
          </div>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error.message || 'Errore'}</CAlert>}
          {formVisible && (
            <CForm onSubmit={save} className="mb-4">
              <CRow className="g-3 align-items-end">
                <CCol md={4}>
                  <CFormLabel>Titolo</CFormLabel>
                  <CFormInput
                    placeholder="Titolo template"
                    value={form.titolo}
                    onChange={handleFieldChange('titolo')}
                    required
                    disabled={saving}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Priorita</CFormLabel>
                  <CFormSelect value={form.priorita} onChange={handleFieldChange('priorita')} disabled={saving}>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Reparto predefinito</CFormLabel>
                  <CFormSelect value={form.id_reparto} onChange={handleFieldChange('id_reparto')} disabled={saving}>
                    <option value="">Nessun reparto</option>
                    {reparti.map((rep, index) => {
                      const idValue = rep?.id ? String(rep.id) : ''
                      const keyValue = rep?.id ?? rep?.code ?? `${rep?.label || 'reparto'}-${index}`
                      return (
                        <option key={keyValue} value={idValue}>
                          {rep?.label || rep?.code || idValue || 'Reparto'}
                        </option>
                      )
                    })}
                  </CFormSelect>
                </CCol>
                <CCol md={8}>
                  <CFormLabel>Descrizione</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={form.descrizione}
                    onChange={handleFieldChange('descrizione')}
                    disabled={saving}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Durata (giorni)</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    value={form.durata_predefinita_giorni}
                    onChange={handleFieldChange('durata_predefinita_giorni')}
                    disabled={saving}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Ordinamento</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    value={form.ordering}
                    onChange={handleFieldChange('ordering')}
                    disabled={saving}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormCheck
                    id="template-attivo"
                    label="Attivo"
                    checked={form.attivo}
                    onChange={handleToggle}
                    disabled={saving}
                  />
                </CCol>
                <CCol md="auto">
                  <PermissionButton
                    type="submit"
                    color="primary"
                    disabled={saving || form.titolo.trim() === ''}
                    permission="job.write"
                  >
                    Salva
                  </PermissionButton>
                </CCol>
                <CCol md="auto">
                  <CButton color="secondary" variant="outline" onClick={cancel} disabled={saving}>
                    Annulla
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          )}
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <CSpinner />
            </div>
          )}
          {!loading && (
            <CTable hover responsive>
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Titolo</CTableHeaderCell>
                  <CTableHeaderCell>Priorita</CTableHeaderCell>
                  <CTableHeaderCell>Reparto</CTableHeaderCell>
                  <CTableHeaderCell>Durata</CTableHeaderCell>
                  <CTableHeaderCell>Attivo</CTableHeaderCell>
                  <CTableHeaderCell>Ordine</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((row) => (
                  <CTableRow key={row.id_template}>
                    <CTableDataCell>{row.id_template}</CTableDataCell>
                    <CTableDataCell>{row.titolo}</CTableDataCell>
                    <CTableDataCell>{row.priorita}</CTableDataCell>
                    <CTableDataCell>{repartoMap[row.id_reparto] || '-'}</CTableDataCell>
                    <CTableDataCell>
                      {row.durata_predefinita_giorni !== null && row.durata_predefinita_giorni !== undefined
                        ? row.durata_predefinita_giorni
                        : '-'}
                    </CTableDataCell>
                    <CTableDataCell>{Number(row.attivo) === 1 ? 'Si' : 'No'}</CTableDataCell>
                    <CTableDataCell>{row.ordering ?? 100}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <PermissionButton
                        color="secondary"
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(row)}
                        permission="job.write"
                      >
                        Modifica
                      </PermissionButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
      <BottomToast open={toast.open} type={toast.type} message={toast.message} />
    </>
  )
}

export default LavorazioniTemplates
