import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormCheck,
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
import { cilPlus, cilDescription } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import { fetchContratti } from '../../services/contratti'

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('it-IT')
}

const ContrattiList = () => {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { items: data } = await fetchContratti({
        token,
        q: search,
        onlyActive,
      })
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setError(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    load()
  }, [token, onlyActive])

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Contratti - Lista</h5>
        <CButton color="primary" variant="outline" onClick={() => navigate('/contratti/crea')}>
          <CIcon icon={cilPlus} className="me-2" /> Nuovo contratto
        </CButton>
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger">
            {error.message || 'Impossibile caricare i contratti.'}
          </CAlert>
        )}
        <CRow className="g-3 align-items-end mb-3">
          <CCol md={6}>
            <CFormInput
              value={search}
              placeholder="Cerca per titolo, codice o cliente"
              onChange={(e) => setSearch(e.target.value)}
            />
          </CCol>
          <CCol md={3}>
            <CFormCheck
              id="onlyActive"
              label="Solo attivi"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
          </CCol>
          <CCol md={3} className="text-end">
            <CButton color="secondary" variant="outline" onClick={load} disabled={loading}>
              {loading ? <CSpinner size="sm" className="me-2" /> : null}
              Aggiorna
            </CButton>
          </CCol>
        </CRow>

        {loading ? (
          <div className="py-4 text-center">
            <CSpinner />
          </div>
        ) : items.length === 0 ? (
          <CAlert color="info" className="mb-0">
            Nessun contratto disponibile.
          </CAlert>
        ) : (
          <CTable hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell>Titolo</CTableHeaderCell>
                <CTableHeaderCell>Codice</CTableHeaderCell>
                <CTableHeaderCell>Inizio</CTableHeaderCell>
                <CTableHeaderCell>Fine</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Rinnovo</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Attivo</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.map((row) => (
                <CTableRow key={row.id_contratto}>
                  <CTableDataCell>{row.ragione_sociale || '-'}</CTableDataCell>
                  <CTableDataCell>{row.titolo}</CTableDataCell>
                  <CTableDataCell>{row.codice || '-'}</CTableDataCell>
                  <CTableDataCell>{formatDate(row.data_inizio)}</CTableDataCell>
                  <CTableDataCell>{formatDate(row.data_fine)}</CTableDataCell>
                  <CTableDataCell className="text-center">
                    {Number(row.rinnovo_automatico) === 1 ? 'Si' : 'No'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {Number(row.attivo) === 1 ? 'Si' : 'No'}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton
                      color="link"
                      size="sm"
                      onClick={() => navigate(`/contratti/dettagli?id=${row.id_contratto}`)}
                    >
                      <CIcon icon={cilDescription} />
                    </CButton>
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

export default ContrattiList

