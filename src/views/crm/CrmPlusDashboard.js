import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CBadge,
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

import { useAuth } from '../../context/AuthContext'
import { fetchAnagraficheDashboard } from '../../services/anagrafiche'
import { fetchLatestPreventivi } from '../../services/preventivi'
import { fetchFattureList } from '../../services/fatture'
import { fetchLavorazioniList } from '../../services/lavorazioni'

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

// Formatta un valore numerico in EUR.
const formatCurrency = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '-'
  }
  return currencyFormatter.format(numeric)
}

// Formatta un intero con separatori locali.
const formatInteger = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '-'
  }
  return numeric.toLocaleString('it-IT')
}

// Parsing data robusto con fallback null.
const parseDateValue = (value) => {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

// Formatta una data nel formato breve italiano.
const formatDate = (value) => {
  const parsed = parseDateValue(value)
  if (!parsed) {
    return '-'
  }
  return parsed.toLocaleDateString('it-IT')
}

// Mappa stato preventivo in bucket di pipeline commerciale.
const getStatusBucket = (row) => {
  const raw = String(row?.stato_label || row?.stato_code || '')
    .trim()
    .toLowerCase()
  if (!raw) {
    return 'Da lavorare'
  }
  if (raw.includes('accett')) {
    return 'Chiusi - Accettati'
  }
  if (raw.includes('rifiut') || raw.includes('pers')) {
    return 'Chiusi - Persi'
  }
  if (raw.includes('bozza')) {
    return 'Bozza'
  }
  if (raw.includes('inviat') || raw.includes('propost')) {
    return 'Inviati'
  }
  return 'Da lavorare'
}

// Costruisce riferimento leggibile del preventivo.
const getPreventivoReference = (row) => {
  const year = row?.anno_preventivo ?? row?.anno ?? '-'
  const number = row?.numero_documento ?? row?.numero_preventivo ?? row?.id_preventivo ?? '-'
  return `${year}/${number}`
}

// Costruisce riferimento leggibile della fattura.
const getFatturaReference = (row) => {
  const year = row?.anno ?? '-'
  const number = row?.numero_documento ?? row?.numero_fattura ?? row?.id_fattura ?? '-'
  return `${year}/${number}`
}

// Costruisce riferimento leggibile della lavorazione.
const getLavorazioneReference = (row) => {
  if (row?.codice) {
    return row.codice
  }
  const numericId = Number(row?.id_lavorazione)
  if (Number.isFinite(numericId) && numericId > 0) {
    return `JOB-${numericId}`
  }
  return '-'
}

// Dashboard CRM commerciale con KPI e ultime entita operative.
const CrmPlusDashboard = () => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [anagraficaKpi, setAnagraficaKpi] = useState(null)
  const [preventivi, setPreventivi] = useState([])
  const [fatture, setFatture] = useState([])
  const [lavorazioni, setLavorazioni] = useState([])

  // Carica in parallelo KPI anagrafiche, preventivi, fatture e lavorazioni.
  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Sessione non valida. Effettua nuovamente il login.')
      return
    }

    const controller = new AbortController()
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [anagraficaResult, preventiviResult, fattureResult, lavorazioniResult] =
          await Promise.allSettled([
            fetchAnagraficheDashboard({ token, period: 'monthly', signal: controller.signal }),
            fetchLatestPreventivi({ token, limit: 120, signal: controller.signal }),
            fetchFattureList({ token, limit: 120, signal: controller.signal }),
            fetchLavorazioniList({ token, page: 1, pageSize: 120, signal: controller.signal }),
          ])

        if (!active) {
          return
        }

        const failures = [
          anagraficaResult,
          preventiviResult,
          fattureResult,
          lavorazioniResult,
        ].filter((item) => item.status === 'rejected')

        if (anagraficaResult.status === 'fulfilled') {
          setAnagraficaKpi(anagraficaResult.value?.kpi ?? null)
        } else {
          setAnagraficaKpi(null)
        }

        if (preventiviResult.status === 'fulfilled') {
          setPreventivi(
            Array.isArray(preventiviResult.value?.items) ? preventiviResult.value.items : [],
          )
        } else {
          setPreventivi([])
        }

        if (fattureResult.status === 'fulfilled') {
          setFatture(Array.isArray(fattureResult.value?.items) ? fattureResult.value.items : [])
        } else {
          setFatture([])
        }

        if (lavorazioniResult.status === 'fulfilled') {
          setLavorazioni(
            Array.isArray(lavorazioniResult.value?.items) ? lavorazioniResult.value.items : [],
          )
        } else {
          setLavorazioni([])
        }

        if (failures.length === 4) {
          setError('Impossibile caricare i dati CRM. Verifica i permessi o la connessione API.')
        }
      } catch (loadError) {
        if (!active || loadError?.name === 'AbortError') {
          return
        }
        setError(loadError?.message || 'Errore durante il caricamento della dashboard CRM.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
      controller.abort()
    }
  }, [token])

  // Aggrega i preventivi per stato pipeline e ordina per volume.
  const pipelineRows = useMemo(() => {
    const counters = new Map()
    preventivi.forEach((row) => {
      const bucket = getStatusBucket(row)
      counters.set(bucket, (counters.get(bucket) ?? 0) + 1)
    })

    const data = Array.from(counters.entries()).map(([status, count]) => ({ status, count }))
    data.sort((a, b) => b.count - a.count)
    return data
  }, [preventivi])

  // Calcola KPI sintetici da dataset caricati.
  const kpi = useMemo(() => {
    const totalePreventivi = preventivi.reduce((sum, row) => sum + (Number(row?.totale) || 0), 0)
    const saldoFatture = fatture.reduce((sum, row) => sum + (Number(row?.saldo) || 0), 0)
    const fattureScadute = fatture.filter((row) => Number(row?.saldo) > 0).length

    return {
      clientiTotali: anagraficaKpi?.totale_generale ?? 0,
      clientiNuoviPeriodo: anagraficaKpi?.nuovi_mese_corrente ?? 0,
      valorePreventivi: totalePreventivi,
      saldoAperto: saldoFatture,
      opportunitaAperte: pipelineRows
        .filter((row) => !row.status.toLowerCase().includes('chiusi'))
        .reduce((sum, row) => sum + row.count, 0),
      fattureScadute,
    }
  }, [anagraficaKpi, fatture, pipelineRows, preventivi])

  // Seleziona gli ultimi 10 preventivi aggiornati.
  const latestPreventivi = useMemo(() => {
    return [...preventivi]
      .sort((a, b) => {
        const first =
          parseDateValue(a?.updated_at || a?.data_preventivo || a?.created_at)?.getTime() ?? 0
        const second =
          parseDateValue(b?.updated_at || b?.data_preventivo || b?.created_at)?.getTime() ?? 0
        return second - first
      })
      .slice(0, 10)
  }, [preventivi])

  // Seleziona le ultime 10 fatture aggiornate.
  const latestFatture = useMemo(() => {
    return [...fatture]
      .sort((a, b) => {
        const first =
          parseDateValue(a?.updated_at || a?.data_fattura || a?.created_at)?.getTime() ?? 0
        const second =
          parseDateValue(b?.updated_at || b?.data_fattura || b?.created_at)?.getTime() ?? 0
        return second - first
      })
      .slice(0, 10)
  }, [fatture])

  // Seleziona le ultime 10 lavorazioni aggiornate.
  const latestLavorazioni = useMemo(() => {
    return [...lavorazioni]
      .sort((a, b) => {
        const first =
          parseDateValue(
            a?.updated_at || a?.data_fine_prevista || a?.data_inizio_prevista || a?.created_at,
          )?.getTime() ?? 0
        const second =
          parseDateValue(
            b?.updated_at || b?.data_fine_prevista || b?.data_inizio_prevista || b?.created_at,
          )?.getTime() ?? 0
        return second - first
      })
      .slice(0, 10)
  }, [lavorazioni])

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="h4 mb-1">CRM</h2>
          <p className="text-body-secondary mb-0">
            Vista commerciale unificata per clienti, opportunita e incassi.
          </p>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" className="mb-4">
          {error}
        </CAlert>
      )}

      <CRow className="g-3 mb-4">
        <CCol sm={6} xl={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Clienti totali
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : formatInteger(kpi.clientiTotali)}
              </div>
              <div className="small text-body-secondary mt-2">
                Nuovi periodo: {loading ? '-' : formatInteger(kpi.clientiNuoviPeriodo)}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} xl={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Pipeline aperta
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : formatInteger(kpi.opportunitaAperte)}
              </div>
              <div className="small text-body-secondary mt-2">
                Valore preventivi: {formatCurrency(kpi.valorePreventivi)}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} xl={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Saldo aperto
              </div>
              <div className="fs-4 fw-semibold mt-2">
                {loading ? <CSpinner size="sm" /> : formatCurrency(kpi.saldoAperto)}
              </div>
              <div className="small text-body-secondary mt-2">
                Fatture con saldo: {loading ? '-' : formatInteger(kpi.fattureScadute)}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} xl={3}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold">
                Accessi rapidi
              </div>
              <div className="d-flex flex-column gap-2 mt-2">
                <Link to="/anagrafica/lista" className="text-decoration-none">
                  Lista clienti
                </Link>
                <Link to="/preventivi/lista" className="text-decoration-none">
                  Opportunita / Preventivi
                </Link>
                <Link to="/fatture/lista" className="text-decoration-none">
                  Fatture e incassi
                </Link>
                <Link to="/crm/comunicazioni" className="text-decoration-none">
                  Comunicazioni e chiamate
                </Link>
                <Link to="/crm/stati-lavorazione" className="text-decoration-none">
                  Stati di lavorazione
                </Link>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4">
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardHeader>Pipeline opportunita</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : pipelineRows.length === 0 ? (
                <div className="text-body-secondary small">Nessun preventivo disponibile.</div>
              ) : (
                <CTable small hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Opportunita</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {pipelineRows.map((row) => (
                      <CTableRow key={row.status}>
                        <CTableDataCell>{row.status}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatInteger(row.count)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={7}>
          <CCard className="h-100">
            <CCardHeader>Ultimi 10 preventivi</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : latestPreventivi.length === 0 ? (
                <div className="text-body-secondary small">Nessun preventivo disponibile.</div>
              ) : (
                <CTable small hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Riferimento</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {latestPreventivi.map((row) => (
                      <CTableRow key={`prev-${row.id_preventivo}`}>
                        <CTableDataCell>
                          {formatDate(row.updated_at || row.data_preventivo || row.created_at)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/preventivi/dettagli?id=${row.id_preventivo}`}
                            className="text-decoration-none"
                          >
                            {getPreventivoReference(row)}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/preventivi/dettagli?id=${row.id_preventivo}`}
                            className="text-decoration-none"
                          >
                            {row.ragione_sociale || '-'}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>{row.stato_label || row.stato_code || '-'}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatCurrency(row.totale)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4 mt-1">
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Ultime 10 fatture</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : latestFatture.length === 0 ? (
                <div className="text-body-secondary small">Nessuna fattura disponibile.</div>
              ) : (
                <CTable small hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Riferimento</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Importo</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {latestFatture.map((row) => (
                      <CTableRow key={`fatt-${row.id_fattura}`}>
                        <CTableDataCell>
                          {formatDate(row.updated_at || row.data_fattura || row.created_at)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/fatture/dettagli?id=${row.id_fattura}`}
                            className="text-decoration-none"
                          >
                            {getFatturaReference(row)}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/fatture/dettagli?id=${row.id_fattura}`}
                            className="text-decoration-none"
                          >
                            {row.cliente_ragione_sociale || '-'}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>{row.stato_label || 'Registrata'}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatCurrency(row.totale)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="h-100">
            <CCardHeader>Ultime 10 lavorazioni</CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : latestLavorazioni.length === 0 ? (
                <div className="text-body-secondary small">Nessuna lavorazione disponibile.</div>
              ) : (
                <CTable small hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Riferimento</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Stato</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {latestLavorazioni.map((row) => (
                      <CTableRow key={`lav-${row.id_lavorazione}`}>
                        <CTableDataCell>
                          {formatDate(
                            row.updated_at ||
                              row.data_fine_prevista ||
                              row.data_inizio_prevista ||
                              row.created_at,
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/lavorazioni/dettaglio?id=${row.id_lavorazione}`}
                            className="text-decoration-none"
                          >
                            {getLavorazioneReference(row)}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>
                          <Link
                            to={`/lavorazioni/dettaglio?id=${row.id_lavorazione}`}
                            className="text-decoration-none"
                          >
                            {row.cliente || '-'}
                          </Link>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="primary">{row.stato_label || row.stato || '-'}</CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CrmPlusDashboard
