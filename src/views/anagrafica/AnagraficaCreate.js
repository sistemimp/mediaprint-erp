import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createAnagrafica } from '../../services/anagrafiche'
import BottomToast from '../../components/BottomToast'

// Form creazione anagrafica minima con feedback toast.
const AnagraficaCreate = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [form, setForm] = useState({
    ragione_sociale: '',
    piva: '',
    codice_fiscale: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  // Mostra toast temporaneo per esiti operazione.
  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  // Aggiorna il campo form modificato.
  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Invia richiesta creazione e reindirizza al dettaglio.
  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        ragione_sociale: String(form.ragione_sociale || '').trim(),
        piva: form.piva || null,
        codice_fiscale: form.codice_fiscale || null,
      }
      const resp = await createAnagrafica({ token, body })
      const id = resp?.id_anagrafica
      if (id) {
        showToast('Anagrafica creata', 'success')
        window.setTimeout(() => {
          navigate(`/anagrafica/dettagli?id=${id}`, { replace: true, state: { id } })
        }, 800)
      }
    } catch (e) {
      if (e.status === 401 && logout) { logout(); return }
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Anagrafica - Crea nuova</h5>
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={onSubmit}>
          {error && <CAlert color="danger">{error.message || 'Errore di salvataggio'}</CAlert>}
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Ragione sociale</CFormLabel>
              <CFormInput name="ragione_sociale" value={form.ragione_sociale} onChange={onChange} required />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Partita IVA</CFormLabel>
              <CFormInput name="piva" value={form.piva} onChange={onChange} />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Codice Fiscale</CFormLabel>
              <CFormInput name="codice_fiscale" value={form.codice_fiscale} onChange={onChange} />
            </CCol>
            
          </CRow>
          <div className="mt-4 d-flex gap-2">
            <CButton type="submit" color="primary" disabled={saving}>
              {saving ? (<><CSpinner size="sm" className="me-2" /> Salvataggio...</>) : 'Salva'}
            </CButton>
            <CButton color="secondary" variant="outline" onClick={() => navigate('/anagrafica/lista')}>Annulla</CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
    
    <BottomToast open={toast.open} type={toast.type} message={toast.message} />
    </>
  )
}

export default AnagraficaCreate
