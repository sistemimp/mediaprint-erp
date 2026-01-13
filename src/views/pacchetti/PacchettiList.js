import React, { useEffect, useMemo, useState } from 'react'
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
import CIcon from '@coreui/icons-react'
import { cilDescription, cilPlus } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchPacchetti } from '../../services/pacchetti'
import PermissionButton from '../../components/PermissionButton'

const PacchettiList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items: rows } = await fetchPacchetti({ token, signal: controller.signal, q, onlyActive })
        setItems(rows)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) { logout(); return }
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, q, onlyActive, logout])

  const sorted = useMemo(() => {
    const out = [...items]
    out.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
    return out
  }, [items])

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Pacchetti - Lista</h5>
            <small className="text-body-secondary">Cerca per nome o codice</small>
          </div>
          <PermissionButton
            color="primary"
            variant="outline"
            onClick={() => navigate('/pacchetti/crea')}
            permission="pack.create"
          >
            <CIcon icon={cilPlus} className="me-2" />
            Nuovo pacchetto
          </PermissionButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CForm className="mb-3">
          <CRow className="g-2 align-items-end">
            <CCol md={6}>
              <CFormInput placeholder="Cerca..." value={q} onChange={(e) => setQ(e.target.value)} />
            </CCol>
            <CCol md={3}>
              <div className="form-check">
                <input id="onlyActive" type="checkbox" className="form-check-input" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                <label htmlFor="onlyActive" className="form-check-label">Solo attivi</label>
              </div>
            </CCol>
          </CRow>
        </CForm>

        {loading && (
          <div className="d-flex justify-content-center py-5"><CSpinner /></div>
        )}

        {!loading && error && (
          <CAlert color="danger">{error.message || 'Impossibile caricare i pacchetti.'}</CAlert>
        )}

        {!loading && !error && (
          <CTable hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Codice</CTableHeaderCell>
                <CTableHeaderCell>Nome</CTableHeaderCell>
                <CTableHeaderCell>Stato</CTableHeaderCell>
                <CTableHeaderCell>Aggiornato</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {sorted.map((p) => (
                <CTableRow key={p.id_pacchetto}>
                  <CTableDataCell>{p.codice || '-'}</CTableDataCell>
                  <CTableDataCell>{p.nome}</CTableDataCell>
                  <CTableDataCell>{Number(p.attivo) === 1 ? 'attivo' : 'disattivo'}</CTableDataCell>
                  <CTableDataCell className="d-flex justify-content-between align-items-center">
                    <span>{p.updated_at || '-'}</span>
                    <PermissionButton
                      color="link"
                      size="sm"
                      className="p-0"
                      onClick={() => navigate(`/pacchetti/dettagli?id=${p.id_pacchetto}`)}
                      permission="pack.read"
                    >
                      <CIcon icon={cilDescription} />
                    </PermissionButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PacchettiList
