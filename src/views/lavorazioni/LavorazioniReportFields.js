import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilPen, cilTrash } from '@coreui/icons'
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
import {
  deleteLavorazioneReportField,
  fetchLavorazioneReportFields,
  saveLavorazioneReportField,
} from '../../services/lavorazioni'

const DEFAULT_FORM = {
  idField: null,
  fieldCode: '',
  label: '',
  description: '',
  ordering: 100,
  isVisible: true,
}

const ReportFieldsConfig = () => {
  const [fields, setFields] = useState([])
  const [affrancature, setAffrancature] = useState([])
  const [selectedAffrancatura, setSelectedAffrancatura] = useState('')
  const [formState, setFormState] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [alert, setAlert] = useState(null)
  const [listError, setListError] = useState(null)

  const loadFields = useCallback(async (affrancaturaId) => {
    setLoading(true)
    setListError(null)
    try {
      const response = await fetchLavorazioneReportFields({
        affrancaturaId: affrancaturaId || undefined,
      })
      setAffrancature(response.affrancature || [])
      setFields(response.fields || [])
    } catch (error) {
      setListError(error?.message || 'Impossibile caricare i campi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFields(selectedAffrancatura)
  }, [selectedAffrancatura, loadFields])

  const handleAffrancaturaChange = (event) => {
    setSelectedAffrancatura(event.target.value)
    setFormState(DEFAULT_FORM)
    setAlert(null)
  }

  const handleFormChange = (field) => (event) => {
    const value = field === 'ordering' ? Number(event.target.value || 0) : event.target.value
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSwitchChange = (event) => {
    const nextValue = event?.target?.checked
    if (typeof nextValue === 'boolean') {
      setFormState((prev) => ({
        ...prev,
        isVisible: nextValue,
      }))
    }
  }

  const handleFormReset = () => {
    setFormState(DEFAULT_FORM)
    setAlert(null)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setAlert(null)
    try {
      await saveLavorazioneReportField({
        fieldId: formState.idField,
        affrancaturaId: selectedAffrancatura || undefined,
        fieldCode: formState.fieldCode,
        label: formState.label,
        description: formState.description,
        ordering: formState.ordering,
        isVisible: formState.isVisible,
      })
      setAlert({ type: 'success', message: 'Campo salvato con successo.' })
      handleFormReset()
      await loadFields(selectedAffrancatura)
    } catch (error) {
      setAlert({ type: 'danger', message: error?.message || 'Errore durante il salvataggio.' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (field) => {
    setFormState({
      idField: field.id_field,
      fieldCode: field.field_code ?? '',
      label: field.label ?? '',
      description: field.description ?? '',
      ordering: field.ordering ?? 100,
      isVisible: field.is_visible ?? true,
    })
    setAlert(null)
  }

  const handleDelete = async (field) => {
    if (!window.confirm('Confermi l’eliminazione del campo selezionato?')) {
      return
    }
    setDeletingId(field.id_field)
    setAlert(null)
    try {
      await deleteLavorazioneReportField({ fieldId: field.id_field })
      setAlert({ type: 'success', message: 'Campo eliminato con successo.' })
      await loadFields(selectedAffrancatura)
    } catch (error) {
      setAlert({ type: 'danger', message: error?.message || 'Errore durante l’eliminazione.' })
    } finally {
      setDeletingId(null)
    }
  }

  const affrancatureMap = useMemo(() => {
    const map = { '': 'Configurazione generica' }
    affrancature.forEach((item) => {
      const key = String(item?.id_affrancatura ?? '')
      const prefix = item?.operatore_label ? `${item.operatore_label} • ` : ''
      map[key] = `${prefix}${item?.label || `Affrancatura ${key}`}`
    })
    return map
  }, [affrancature])

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <div className="d-flex flex-column gap-1">
          <strong>Configurazione campi report spedizioni</strong>
          <span className="text-body-secondary small">
            Definisci come vengono etichettati i campi della reportistica per ogni tipo di affrancatura.
          </span>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="align-items-end mb-4">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="affrancatura-select">Affrancatura</CFormLabel>
            <CFormSelect
              id="affrancatura-select"
              value={selectedAffrancatura}
              onChange={handleAffrancaturaChange}
            >
              <option value="">Configurazione generica</option>
              {affrancature.map((item) => (
                <option key={item.id_affrancatura} value={String(item.id_affrancatura)}>
                  {affrancatureMap[String(item.id_affrancatura ?? '')] || item.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={6} className="text-md-end mt-3 mt-md-0">
            <CButton color="outline-secondary" onClick={handleFormReset} disabled={saving}>
              Ripristina form
            </CButton>
          </CCol>
        </CRow>
        {listError && (
          <CAlert color="danger" className="mb-4">
            {listError}
          </CAlert>
        )}
        {alert && (
          <CAlert color={alert.type} className="mb-4">
            {alert.message}
          </CAlert>
        )}
        <CForm onSubmit={handleSave}>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel htmlFor="field-code">Codice campo</CFormLabel>
              <CFormInput
                id="field-code"
                placeholder="Esempio: tipo_spedizione"
                value={formState.fieldCode}
                onChange={handleFormChange('fieldCode')}
                required
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="field-label">Etichetta visualizzata</CFormLabel>
              <CFormInput
                id="field-label"
                placeholder="Titolo leggibile per l'interfaccia"
                value={formState.label}
                onChange={handleFormChange('label')}
                required
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel htmlFor="field-description">Descrizione (opzionale)</CFormLabel>
              <CFormTextarea
                id="field-description"
                rows={2}
                value={formState.description}
                onChange={handleFormChange('description')}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="field-ordering">Ordinamento</CFormLabel>
              <CFormInput
                id="field-ordering"
                type="number"
                min="0"
                max="1000"
                value={formState.ordering}
                onChange={handleFormChange('ordering')}
              />
            </CCol>
            <CCol md={3} className="d-flex align-items-center">
              <CFormCheck
                type="checkbox"
                id="field-visible"
                label="Visibile"
                checked={!!formState.isVisible}
                onChange={handleSwitchChange}
              />
            </CCol>
            <CCol md={6} className="d-flex align-items-end gap-2 flex-wrap">
              <CButton color="primary" type="submit" disabled={saving}>
                {saving ? 'Salvataggio...' : formState.idField ? 'Aggiorna campo' : 'Salva campo'}
              </CButton>
              <CButton color="secondary" type="button" onClick={handleFormReset} disabled={saving}>
                Annulla
              </CButton>
            </CCol>
          </CRow>
        </CForm>
        <div className="mt-5">
          <h6 className="mb-3">Campi disponibili</h6>
          {loading ? (
            <div className="text-body-secondary">
              <CSpinner size="sm" className="me-2" />
              Caricamento...
            </div>
          ) : fields.length === 0 ? (
            <CAlert color="light">Nessun campo configurato per questa selezione.</CAlert>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Affrancatura</CTableHeaderCell>
                  <CTableHeaderCell>Codice</CTableHeaderCell>
                  <CTableHeaderCell>Etichetta</CTableHeaderCell>
                  <CTableHeaderCell>Descrizione</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Visibile</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Ordinamento</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {fields.map((field) => {
                  const affKey = String(field.id_affrancatura ?? '')
                  return (
                    <CTableRow key={field.id_field}>
                      <CTableDataCell>{affrancatureMap[affKey] || 'Generale'}</CTableDataCell>
                      <CTableDataCell>{field.field_code}</CTableDataCell>
                      <CTableDataCell>{field.label}</CTableDataCell>
                      <CTableDataCell>{field.description || '-'}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        {field.is_visible ? 'Si' : 'No'}
                      </CTableDataCell>
                      <CTableDataCell className="text-center">{field.ordering}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CButton
                          color="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(field)}
                        >
                          <CIcon icon={cilPen} />
                        </CButton>
                        <CButton
                          color="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(field)}
                          disabled={deletingId === field.id_field}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ReportFieldsConfig
