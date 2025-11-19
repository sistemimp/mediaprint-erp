import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

const buildContact = (overrides = {}, fallbackAnagraficaId = null) => ({
  id_contatto_prev: overrides.id_contatto_prev ?? null,
  id_contatto_anagrafica: overrides.id_contatto_anagrafica ?? null,
  id_anagrafica: overrides.id_anagrafica ?? fallbackAnagraficaId ?? null,
  nome: overrides.nome ?? '',
  ruolo: overrides.ruolo ?? '',
  telefono: overrides.telefono ?? '',
  cellulare: overrides.cellulare ?? '',
  email: overrides.email ?? '',
  origine: overrides.origine ?? 'manuale',
  _tmpId: overrides._tmpId ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
})

const PreventivoContattiTable = ({
  contatti = [],
  onChange = () => { },
  disabled = false,
  anagraficaContacts = [],
  canImport = false,
  currentAnagraficaId = null,
}) => {
  const [selectedImportId, setSelectedImportId] = useState('')

  const tableRows = useMemo(() => {
    return contatti.map((contact, idx) => ({
      ...contact,
      nome: contact.nome ?? '',
      ruolo: contact.ruolo ?? '',
      telefono: contact.telefono ?? '',
      cellulare: contact.cellulare ?? '',
      email: contact.email ?? '',

      origine:
        contact.origine ??
        (Number(contact.id_contatto_anagrafica ?? 0) > 0 ? 'anagrafica' : 'manuale'),
      _tmpId:
        contact._tmpId ??
        `row-${contact.id_contatto_prev ?? contact.id_contatto_anagrafica ?? idx}`,
    }))
  }, [contatti])

  const handleFieldChange = (index, field, value) => {
    onChange(
      contatti.map((contact, idx) => (idx === index ? { ...contact, [field]: value } : contact)),
    )
  }

  const handleAddManual = () => {
    onChange(contatti.concat(buildContact({}, Number(currentAnagraficaId) || null)))
  }

  const handleRemove = (index) => {
    onChange(contatti.filter((_, idx) => idx !== index))
  }

  const selectedNumericImportId = Number(selectedImportId) || 0
  const selectedContact = selectedNumericImportId
    ? anagraficaContacts.find(
      (c) => Number(c?.id_contatto ?? c?.id ?? 0) === selectedNumericImportId,
    )
    : null

  const handleImport = () => {
    if (!selectedContact) return
    const alreadyImported = contatti.some(
      (c) => Number(c.id_contatto_anagrafica ?? 0) === selectedNumericImportId,
    )
    if (alreadyImported) {
      setSelectedImportId('')
      return
    }
    onChange(
      contatti.concat(
        buildContact(
          {
            nome: selectedContact.nome ?? '',
            ruolo: selectedContact.ruolo ?? '',
            telefono: selectedContact.telefono ?? '',
            cellulare: selectedContact.cellulare ?? '',
            email: selectedContact.email ?? '',

            id_contatto_anagrafica: selectedContact.id_contatto ?? selectedContact.id ?? null,
            id_anagrafica: selectedContact.id_anagrafica ?? null,
            origine: 'anagrafica',
          },
          Number(currentAnagraficaId) || null,
        ),
      ),
    )
    setSelectedImportId('')
  }

  const hasContacts = tableRows.length > 0

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <div>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            disabled={disabled}
            type="button"
            onClick={handleAddManual}
          >
            Aggiungi contatto manuale
          </CButton>
        </div>
        <div className="d-flex gap-2 align-items-end flex-wrap">
          <div className="d-flex flex-column">
            <CFormLabel className="mb-1">Importa da anagrafica</CFormLabel>
            <CFormSelect
              size="sm"
              disabled={disabled || !canImport || anagraficaContacts.length === 0}
              value={selectedImportId}
              onChange={(e) => setSelectedImportId(e.target.value)}
            >
              <option value="">Seleziona contatto</option>
              {anagraficaContacts.map((contact, index) => {
                const value = contact.id_contatto ?? contact.id
                if (value == null) {
                  return null
                }
                const label =
                  contact.nome ||
                  contact.ruolo ||
                  contact.email ||
                  contact.telefono ||
                  `Contatto #${value}`
                return (
                  <option key={`${value}-${index}`} value={value}>
                    {label}
                  </option>
                )
              })}
            </CFormSelect>
          </div>
          <CButton
            size="sm"
            color="primary"
            type="button"
            disabled={
              disabled ||
              !canImport ||
              !selectedContact ||
              contatti.some(
                (c) => Number(c.id_contatto_anagrafica ?? 0) === selectedNumericImportId,
              )
            }
            onClick={handleImport}
          >
            Importa
          </CButton>
        </div>
      </div>
      {hasContacts ? (
        <CTable responsive hover align="middle" className="mb-0">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell>Nome</CTableHeaderCell>
              <CTableHeaderCell style={{ width: 140 }}>Ruolo</CTableHeaderCell>
              <CTableHeaderCell style={{ width: 140 }}>Telefono</CTableHeaderCell>
              <CTableHeaderCell style={{ width: 140 }}>Cellulare</CTableHeaderCell>
              <CTableHeaderCell>Email</CTableHeaderCell>
              <CTableHeaderCell>Origine</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {tableRows.map((contact, index) => (
              <CTableRow key={contact._tmpId ?? contact.id_contatto_prev ?? index}>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    value={contact.nome}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'nome', e.target.value)}
                    placeholder="Nome e cognome"
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    value={contact.ruolo}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'ruolo', e.target.value)}
                    placeholder="Ruolo"
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    value={contact.telefono}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'telefono', e.target.value)}
                    placeholder="Telefono"
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    value={contact.cellulare}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'cellulare', e.target.value)}
                    placeholder="Cellulare"
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    type="email"
                    value={contact.email}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'email', e.target.value)}
                    placeholder="Email"
                  />
                </CTableDataCell>

                <CTableDataCell className="text-center">
                  <CBadge color={contact.origine === 'anagrafica' ? 'info' : 'secondary'}>
                    {contact.origine === 'anagrafica' ? 'Anagrafica' : 'Manuale'}
                  </CBadge>
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  <CButton
                    size="sm"
                    color="danger"
                    variant="ghost"
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRemove(index)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      ) : (
        <CAlert color="info" className="mb-0">
          Nessun contatto associato al preventivo.
        </CAlert>
      )
      }
    </div >
  )
}

export default PreventivoContattiTable
