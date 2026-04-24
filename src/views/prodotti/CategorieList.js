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
import { fetchCategorieProdotti, saveCategoriaProdotto } from '../../services/prodotti'
import BottomToast from '../../components/BottomToast'
import PermissionButton from '../../components/PermissionButton'

// CRUD minimale categorie prodotto con edit inline tramite form unico.
const CategorieList = () => {
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [editRow, setEditRow] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  // Mostra un toast temporaneo di esito operazione.
  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000)
  }

  // Carica elenco categorie dal backend.
  const load = async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await fetchCategorieProdotti({ token, signal })
      setItems(items)
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401 && logout) { logout(); return }
      setError(e)
    } finally { setLoading(false) }
  }

  // Caricamento iniziale categorie.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [token])

  // Apre il form in modalita creazione.
  const startCreate = () => { setEditRow(null); setName(''); setFormVisible(true) }
  // Apre il form in modalita modifica.
  const startEdit = (row) => { setEditRow(row); setName(row.nome || ''); setFormVisible(true) }
  // Chiude il form e resetta i campi.
  const cancel = () => { setEditRow(null); setName(''); setFormVisible(false) }

  // Salva categoria (nuova o esistente) e aggiorna la tabella.
  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await saveCategoriaProdotto({ token, id_categoria: editRow?.id_categoria, nome: String(name).trim() })
      await load()
      cancel()
      showToast('Categoria salvata', 'success')
    } catch (e2) { setError(e2); showToast(e2.message || 'Errore salvataggio', 'error') } finally { setSaving(false) }
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Prodotti - Categorie</h5>
            <PermissionButton
              color="primary"
              variant="outline"
              onClick={startCreate}
              permission="prod.create"
              data-testid="create"
            >
              Nuova categoria
            </PermissionButton>
          </div>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error.message || 'Errore'}</CAlert>}
          {formVisible && (
            <CForm onSubmit={save} className="mb-4">
              <CRow className="g-2 align-items-end">
                <CCol md={6}>
                  <CFormInput placeholder="Nome categoria" value={name} onChange={(e) => setName(e.target.value)} required />
                </CCol>
                <CCol md="auto">
                  <PermissionButton
                    type="submit"
                    color="primary"
                    disabled={saving || String(name).trim() === ''}
                    permission="prod.write"
                    data-testid="save"
                  >
                    Salva
                  </PermissionButton>
                </CCol>
                <CCol md="auto">
                  <CButton color="secondary" variant="outline" onClick={cancel}>Annulla</CButton>
                </CCol>
              </CRow>
            </CForm>
          )}
          {loading && (<div className="d-flex justify-content-center py-5"><CSpinner /></div>)}
          {!loading && (
            <CTable hover responsive data-testid="table">
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Nome</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((r) => (
                  <CTableRow key={r.id_categoria} data-testid={`row-${r.id_categoria}`}>
                    <CTableDataCell>{r.id_categoria}</CTableDataCell>
                    <CTableDataCell>{r.nome}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <PermissionButton
                        color="secondary"
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(r)}
                        permission="prod.write"
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

export default CategorieList


