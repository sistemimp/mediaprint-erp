import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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
import { cilArrowLeft, cilReload } from '@coreui/icons'

import { fetchAnagraficaDetail } from '../../services/anagrafiche'
import { useAuth } from '../../context/AuthContext'

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return currencyFormatter.format(numeric)
  }

  return value
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('it-IT')
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

const formatAddress = ({ indirizzo, cap, citta, provincia, nazione }) => {
  const segments = []
  const primaryLine = [indirizzo].filter(Boolean).join(' ')
  if (primaryLine) {
    segments.push(primaryLine)
  }

  const locality = [cap, citta, provincia ? `(${provincia})` : null]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (locality) {
    segments.push(locality)
  }

  if (nazione) {
    segments.push(nazione)
  }

  return segments.length ? segments.join(' - ') : '-'
}

const getStatusBadge = (value) => {
  if (!value) {
    return <CBadge color="secondary">-</CBadge>
  }

  const normalised = String(value).toLowerCase()
  const color = normalised === 'attiva' ? 'success' : normalised === 'disattiva' ? 'secondary' : 'primary'

  return (
    <CBadge color={color} className="text-uppercase">
      {normalised}
    </CBadge>
  )
}

const renderValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return <span className="text-body-secondary">-</span>
  }

  if (typeof value === 'string' && /\r|\n/.test(value)) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
  }

  return value
}

const DetailField = ({ label, value }) => (
  <div className="bg-body-tertiary border rounded px-3 py-2 h-100">
    <div className="text-body-secondary text-uppercase small fw-semibold">{label}</div>
    <div className="mt-1">{renderValue(value)}</div>
  </div>
)

const AnagraficaDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const locationStateId =
    location && typeof location.state === 'object' && location.state !== null
      ? location.state.id
      : null

  const queryId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('id')
  }, [location.search])

  const recordId = useMemo(() => {
    const candidate = locationStateId ?? queryId
    const numeric = Number(candidate)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
    return null
  }, [locationStateId, queryId])

  useEffect(() => {
    setDetail(null)
    setError(null)
  }, [recordId])

  useEffect(() => {
    if (!token || !recordId) {
      return
    }

    const controller = new AbortController()

    const loadDetail = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchAnagraficaDetail({
          token,
          id: recordId,
          signal: controller.signal,
        })

        setDetail(data)
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return
        }

        if (fetchError.status === 401 && logout) {
          logout()
          return
        }

        setError(fetchError)
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    loadDetail()

    return () => {
      controller.abort()
    }
  }, [token, recordId, refreshIndex, logout])

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/anagrafica/lista')
  }

  const handleRefresh = () => {
    setRefreshIndex((value) => value + 1)
  }

  const baseFields = useMemo(() => {
    if (!detail?.anagrafica) {
      return []
    }

    const anagrafica = detail.anagrafica
    const isPa = Number(anagrafica.is_pa) === 1
    const isActive = Number(anagrafica.is_active) === 1

    return [
      { label: 'ID Anagrafica', value: anagrafica.id_anagrafica },
      { label: 'Stato', value: getStatusBadge(anagrafica.stato) },
      { label: 'Partita IVA', value: anagrafica.piva },
      { label: 'Codice fiscale', value: anagrafica.codice_fiscale },
      { label: 'Indirizzo', value: formatAddress(anagrafica) },
      { label: 'Email', value: anagrafica.email },
      { label: 'Telefono', value: anagrafica.telefono },
      { label: 'Tipologia (ID)', value: anagrafica.id_tipologia },
      { label: 'Pubblica amministrazione', value: isPa ? 'Si' : 'No' },
      { label: 'Attiva', value: isActive ? 'Si' : 'No' },
      { label: 'Creato il', value: formatDateTime(anagrafica.created_at) },
      { label: 'Aggiornato il', value: formatDateTime(anagrafica.updated_at) },
    ]
  }, [detail])

  const fiscaleFields = useMemo(() => {
    if (!detail?.fiscale) {
      return []
    }

    const fiscale = detail.fiscale

    return [
      { label: 'PEC', value: fiscale.pec },
      { label: 'Codice SDI', value: fiscale.codice_sdi },
      { label: 'IBAN', value: fiscale.iban },
      { label: 'Banca', value: fiscale.banca },
      { label: 'Modalita di pagamento', value: fiscale.modalita_pagamento },
      { label: 'Giorni pagamento', value: fiscale.giorni_pagamento },
      { label: 'ID condizione pagamento', value: fiscale.id_cond_pagamento },
    ]
  }, [detail])

  const parsedOtherData = useMemo(() => {
    if (!detail?.fiscale?.altri_dati) {
      return null
    }

    try {
      return JSON.stringify(JSON.parse(detail.fiscale.altri_dati), null, 2)
    } catch (_error) {
      return detail.fiscale.altri_dati
    }
  }, [detail])

  const preventivi = detail?.preventivi ?? []
  const ddt = detail?.ddt ?? []
  const fatture = detail?.fatture ?? []
  const contatti = detail?.contatti ?? []

  const errorMessage = error?.payload?.message ?? error?.message

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
        <div>
          <h2 className="h5 mb-1">Dettaglio anagrafica</h2>
          <p className="text-body-secondary mb-0">
            {recordId ? `ID ${recordId}` : 'Seleziona un record valido dalla lista per visualizzare i dettagli.'}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <CButton color="secondary" variant="outline" onClick={handleGoBack}>
            <CIcon icon={cilArrowLeft} className="me-2" /> Torna indietro
          </CButton>
          <CButton color="primary" variant="outline" onClick={handleRefresh} disabled={loading || !recordId}>
            <CIcon icon={cilReload} className="me-2" /> Aggiorna
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {!recordId && (
          <CAlert color="warning" className="mb-0">
            Nessun identificativo fornito. Scegli una anagrafica dalla lista per visualizzarne i dettagli.
          </CAlert>
        )}

        {recordId && loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {recordId && !loading && errorMessage && (
          <CAlert color="danger">{errorMessage}</CAlert>
        )}

        {recordId && !loading && !errorMessage && detail && (
          <div className="d-flex flex-column gap-4">
            <section>
              <h3 className="h6 mb-3">Informazioni generali</h3>
              <CRow className="g-3">
                {baseFields.map((field) => (
                  <CCol key={field.label} md={6} xl={4}>
                    <DetailField label={field.label} value={field.value} />
                  </CCol>
                ))}
              </CRow>
              {detail.anagrafica?.note && (
                <CAlert color="info" className="mt-3 mb-0">
                  <div className="text-body-secondary text-uppercase small fw-semibold mb-2">Note</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{detail.anagrafica.note}</div>
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">Dati fiscali</h3>
              {fiscaleFields.length > 0 ? (
                <CRow className="g-3">
                  {fiscaleFields.map((field) => (
                    <CCol key={field.label} md={6} xl={4}>
                      <DetailField label={field.label} value={field.value} />
                    </CCol>
                  ))}
                </CRow>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun dato fiscale registrato per questa anagrafica.
                </CAlert>
              )}
              {parsedOtherData && (
                <CAlert color="secondary" className="mt-3 mb-0">
                  <div className="text-body-secondary text-uppercase small fw-semibold mb-2">Altri dati</div>
                  {parsedOtherData.startsWith('{') || parsedOtherData.startsWith('[') ? (
                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{parsedOtherData}</pre>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{parsedOtherData}</div>
                  )}
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">Contatti associati</h3>
              {contatti.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Nome</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Ruolo</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Telefono</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Cellulare</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Email</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Sede</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-center">
                        Predefinito
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {contatti.map((contatto) => {
                      const fullName = [contatto.nome, contatto.cognome].filter(Boolean).join(' ').trim()
                      const sede =
                        contatto.sede_denominazione || contatto.sede_indirizzo
                          ? [
                              contatto.sede_denominazione,
                              contatto.sede_indirizzo,
                              [contatto.sede_cap, contatto.sede_comune].filter(Boolean).join(' '),
                              contatto.sede_provincia ? `(${contatto.sede_provincia})` : null,
                            ]
                              .filter(Boolean)
                              .join(' - ')
                          : '-'
                      const isDefault = Boolean(contatto.is_predefinita || contatto.is_predefinito)

                      return (
                        <CTableRow key={`${contatto.id_contatto}-${contatto.id_sede ?? 'no-sede'}`}>
                          <CTableDataCell>{fullName || '-'}</CTableDataCell>
                          <CTableDataCell>{contatto.ruolo || '-'}</CTableDataCell>
                          <CTableDataCell>{contatto.telefono || '-'}</CTableDataCell>
                          <CTableDataCell>{contatto.cellulare || '-'}</CTableDataCell>
                          <CTableDataCell>{contatto.email || '-'}</CTableDataCell>
                          <CTableDataCell>{sede}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {isDefault ? <CBadge color="primary">Si</CBadge> : <span className="text-body-secondary">No</span>}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun contatto associato.
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">Preventivi correlati</h3>
              {preventivi.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale imponibile</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale IVA</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Stato</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {preventivi.map((preventivo) => (
                      <CTableRow key={preventivo.id_preventivo}>
                        <CTableDataCell>
                          {preventivo.anno_preventivo}/{preventivo.numero_documento}
                        </CTableDataCell>
                        <CTableDataCell>{formatDate(preventivo.data_preventivo)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(preventivo.totale_imponibile)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(preventivo.totale_iva)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(preventivo.totale)}</CTableDataCell>
                        <CTableDataCell>
                          {preventivo.stato_label ? (
                            <CBadge color="secondary">{preventivo.stato_label}</CBadge>
                          ) : (
                            <span className="text-body-secondary">-</span>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun preventivo disponibile.
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">DDT correlati</h3>
              {ddt.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Tot. pezzi</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Tot. peso (kg)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {ddt.map((documento) => {
                      const pezziValue = Number(documento.totale_pezzi)
                      const pezziDisplay = Number.isFinite(pezziValue)
                        ? pezziValue
                        : documento.totale_pezzi ?? '-'
                      const pesoValue = Number(documento.totale_peso_kg)
                      const pesoDisplay = Number.isFinite(pesoValue) ? pesoValue.toFixed(3) : '-'

                      return (
                        <CTableRow key={documento.id_ddt}>
                          <CTableDataCell>
                            {documento.anno}/{documento.numero_documento}
                          </CTableDataCell>
                          <CTableDataCell>{formatDate(documento.data_ddt)}</CTableDataCell>
                          <CTableDataCell>{pezziDisplay}</CTableDataCell>
                          <CTableDataCell>{pesoDisplay}</CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessun DDT disponibile.
                </CAlert>
              )}
            </section>

            <section>
              <h3 className="h6 mb-3">Fatture correlate</h3>
              {fatture.length > 0 ? (
                <CTable hover responsive size="sm">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Numero</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Data</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale imponibile</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale IVA</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Totale</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Saldo</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Stato</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {fatture.map((fattura) => (
                      <CTableRow key={fattura.id_fattura}>
                        <CTableDataCell>
                          {fattura.anno}/{fattura.numero_documento}
                        </CTableDataCell>
                        <CTableDataCell>{formatDate(fattura.data_fattura)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(fattura.totale_imponibile)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(fattura.totale_iva)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(fattura.totale)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(fattura.saldo)}</CTableDataCell>
                        <CTableDataCell>
                          {fattura.stato_label ? (
                            <CBadge color="secondary">{fattura.stato_label}</CBadge>
                          ) : (
                            <span className="text-body-secondary">-</span>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <CAlert color="info" className="mb-0">
                  Nessuna fattura disponibile.
                </CAlert>
              )}
            </section>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AnagraficaDetail
