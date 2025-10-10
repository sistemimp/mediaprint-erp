import React, { useEffect, useState } from 'react'
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
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createProdotto, fetchCategorieProdotti } from '../../services/prodotti'

const ProdottiCreate = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ codice: '', nome: '', id_categoria: '', prezzo_listino: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const { items } = await fetchCategorieProdotti({ token, signal: controller.signal })
        setCategories(items)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) { logout(); return }
        setError(e)
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [token, logout])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        codice: form.codice || null,
        nome: String(form.nome || '').trim(),
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        prezzo_listino: form.prezzo_listino ? Number(form.prezzo_listino) : null,
      }
      const resp = await createProdotto({ token, body })
      const id = resp?.id_prodotto
      if (id) {
        navigate(`/prodotti/dettagli?id=${id}`)
      }
    } catch (e) {
      if (e.status === 401 && logout) { logout(); return }
      setError(e)
    } finally { setSaving(false) }
  }

  return (
    <CCard>
      <CCardHeader>
        <h5 className="mb-0">Prodotti - Crea nuovo</h5>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        )}
        {!loading && (
          <CForm onSubmit={onSubmit}>
            {error && <CAlert color="danger">{error.message || 'Errore di salvataggio'}</CAlert>}
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Codice</CFormLabel>
                <CFormInput name="codice" value={form.codice} onChange={onChange} />
              </CCol>
              <CCol md={8}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={onChange} required />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect name="id_categoria" value={form.id_categoria} onChange={onChange}>
                  <option value="">Seleziona...</option>
                  {categories.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Prezzo listino</CFormLabel>
                <CFormInput name="prezzo_listino" value={form.prezzo_listino} onChange={onChange} type="number" step="0.01" />
              </CCol>
            </CRow>
            <div className="mt-4 d-flex gap-2">
              <CButton type="submit" color="primary" disabled={saving}>Salva</CButton>
              <CButton color="secondary" variant="outline" onClick={() => navigate('/prodotti/lista')}>Annulla</CButton>
            </div>
          </CForm>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProdottiCreate

