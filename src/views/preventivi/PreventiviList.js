import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CAlert,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDescription, cilEnvelopeClosed, cilPlus, cilPrint, cilZoom } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import PermissionButton from '../../components/PermissionButton'
import {
  fetchLatestPreventivi,
  fetchPreventiviArchivio,
  reactivatePreventivo,
  archivePreventivo,
  sendPreventivoEmail,
  fetchPreventivoDetail,
  fetchPreventivoRevisionDetail,
  fetchPreventiviRevisionsSummary,
} from '../../services/preventivi'
import HtmlEditor from '../../components/HtmlEditor'

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : String(value)
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT')
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('it-IT')
}

const buildPreventivoPdfUrl = (id) => {
  const numericId = Number(id)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  return `https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Preventivi.pdf?id_preventivo=${numericId}&j_username=gestionaleMp&j_password=gestionaleMp`
}

const pickLineValue = (line, keys = []) => {
  if (!line || !keys.length) return undefined
  for (const key of keys) {
    const value = line[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

const getLineQuantity = (line) => {
  const raw = pickLineValue(line, ['quantita', 'quantità', 'qta', 'qty', 'quantity'])
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

const getLineDescription = (line) => {
  return pickLineValue(line, ['descrizione', 'nome_prodotto', 'description']) ?? '-'
}

const getLinePrice = (line) => {
  const raw = pickLineValue(line, ['prezzo', 'prezzo_unitario', 'price', 'pu']) ?? 0
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

const getLineDiscount = (line) => {
  const raw = pickLineValue(line, ['sconto', 'discount']) ?? 0
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

const getLineVatPercent = (line) => {
  const raw = pickLineValue(line, ['iva', 'vat', 'aliquota']) ?? null
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : null
}

const getLineTotal = (line) => {
  const raw = pickLineValue(line, ['totale', 'importo', 'prezzo_totale'])
  if (raw !== undefined && raw !== null) {
    const numeric = Number(raw)
    if (Number.isFinite(numeric)) return numeric
  }
  const qty = getLineQuantity(line)
  const price = getLinePrice(line)
  return qty * price
}

const formatVatLabel = (line) => {
  const percent = getLineVatPercent(line)
  if (percent === null) return '-'
  const fixed = percent.toFixed(2).replace('.', ',')
  return `${fixed}%`
}

  const renderLinesTable = (lines, emptyMessage) => {
    const normalized = Array.isArray(lines) ? lines : []
    if (normalized.length === 0) {
      return <div className="small text-body-secondary">{emptyMessage}</div>
    }
    return (
      <div className="table-responsive" style={{ maxHeight: 'calc(90vh - 380px)' }}>
        <CTable small className="mb-0 align-middle">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="text-nowrap">Qtd.</CTableHeaderCell>
              <CTableHeaderCell>Descrizione</CTableHeaderCell>
              <CTableHeaderCell className="text-nowrap">Prezzo</CTableHeaderCell>
              <CTableHeaderCell className="text-nowrap">IVA</CTableHeaderCell>
              <CTableHeaderCell className="text-nowrap">Sconto</CTableHeaderCell>
              <CTableHeaderCell className="text-end text-nowrap">Importo</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {normalized.map((line, idx) => (
              <CTableRow key={`${line.id_riga ?? line.id ?? idx}-${idx}`}>
                <CTableDataCell className="text-nowrap">{getLineQuantity(line)}</CTableDataCell>
                <CTableDataCell>{getLineDescription(line)}</CTableDataCell>
                <CTableDataCell className="text-nowrap">{formatCurrency(getLinePrice(line))}</CTableDataCell>
                <CTableDataCell className="text-nowrap">{formatVatLabel(line)}</CTableDataCell>
                <CTableDataCell className="text-nowrap">{formatCurrency(getLineDiscount(line))}</CTableDataCell>
                <CTableDataCell className="text-end text-nowrap">{formatCurrency(getLineTotal(line))}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>
    )
  }

const PreventiviList = () => {
  const navigate = useNavigate()
  const { token, logout, user } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const perPageOptions = [10, 25, 50, 100]
  const [sorts, setSorts] = useState([{ field: 'data', dir: 'desc' }])
  const [groupBy, setGroupBy] = useState('none') // none | giorno | mese | stato | cliente
  const [viewMode, setViewMode] = useState('attivi') // attivi | archiviati
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [emailModalVisible, setEmailModalVisible] = useState(false)
  const [emailModalLoading, setEmailModalLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', subject: '', body: '' })
  const [emailError, setEmailError] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(null)
  const [emailTarget, setEmailTarget] = useState(null)
  const [revisionDetailModalVisible, setRevisionDetailModalVisible] = useState(false)
  const [revisionDetailModalLoading, setRevisionDetailModalLoading] = useState(false)
  const [revisionDetailModalError, setRevisionDetailModalError] = useState(null)
  const [revisionDetailModalData, setRevisionDetailModalData] = useState(null)
  const [expandedRevisions, setExpandedRevisions] = useState({})
  const revisionDetailData = revisionDetailModalData?.payload?.detail?.data ?? {}
  const revisionDetailDocumentNumber = revisionDetailData.anno_preventivo
    ? `${revisionDetailData.anno_preventivo}/${revisionDetailData.numero_documento ?? '-'}`
    : (revisionDetailData.numero_documento ? String(revisionDetailData.numero_documento) : '-')
  const revisionDetailClientLabel =
    revisionDetailData.cliente_ragione_sociale ?? revisionDetailData.ragione_sociale ?? '-'
  const revisionDetailClientIdentifiers = [
    revisionDetailData.cliente_piva ? `P.IVA ${revisionDetailData.cliente_piva}` : null,
    revisionDetailData.cliente_codice_fiscale ? `CF ${revisionDetailData.cliente_codice_fiscale}` : null,
  ]
    .filter(Boolean)
    .join(' • ')
  const revisionLines = Array.isArray(revisionDetailModalData?.payload?.detail?.righe)
    ? revisionDetailModalData.payload.detail.righe
    : []
  const [currentPreventivoDetail, setCurrentPreventivoDetail] = useState(null)
  const [currentPreventivoLines, setCurrentPreventivoLines] = useState([])
  const currentPreventivoDocumentNumber = currentPreventivoDetail
    ? (currentPreventivoDetail.anno_preventivo
      ? `${currentPreventivoDetail.anno_preventivo}/${currentPreventivoDetail.numero_documento ?? '-'}`
      : (currentPreventivoDetail.numero_documento ? String(currentPreventivoDetail.numero_documento) : '-'))
    : '-'
  const currentPreventivoClientLabel = currentPreventivoDetail?.cliente_ragione_sociale
    ?? currentPreventivoDetail?.ragione_sociale
    ?? '-'
  const currentPreventivoClientIdentifiers = currentPreventivoDetail
    ? [
      currentPreventivoDetail.cliente_piva ? `P.IVA ${currentPreventivoDetail.cliente_piva}` : null,
      currentPreventivoDetail.cliente_codice_fiscale ? `CF ${currentPreventivoDetail.cliente_codice_fiscale}` : null,
    ].filter(Boolean).join(' • ')
    : ''
  const currentPreventivoTotals = {
    imponibile: currentPreventivoDetail?.totale_imponibile ?? currentPreventivoDetail?.totale ?? null,
    iva: currentPreventivoDetail?.totale_iva ?? null,
    totale: currentPreventivoDetail?.totale ?? currentPreventivoDetail?.totale_imponibile ?? null,
  }
  const currentPreventivoDocumentLabel = currentPreventivoDetail
    ? (currentPreventivoDocumentNumber !== '-' ? currentPreventivoDocumentNumber : `Preventivo #${currentPreventivoDetail.id_preventivo ?? '-'}`)
    : '-'
  const currentPreventivoUpdatedLabel = currentPreventivoDetail?.updated_at
    ? formatDateTime(currentPreventivoDetail.updated_at)
    : 'Data non disponibile'
  const [revisionSummaries, setRevisionSummaries] = useState({})
  const handleOpenRevisionDetail = useCallback(
    async (revisionId, preventivoId) => {
      if (!token) return
      const numericRevisionId = Number(revisionId)
      if (!Number.isFinite(numericRevisionId) || numericRevisionId <= 0) return
      setRevisionDetailModalVisible(true)
      setRevisionDetailModalLoading(true)
      setRevisionDetailModalError(null)
      setRevisionDetailModalData(null)
      setCurrentPreventivoDetail(null)
      setCurrentPreventivoLines([])
      try {
        const { revision } = await fetchPreventivoRevisionDetail({
          token,
          id: numericRevisionId,
        })
        setRevisionDetailModalData(revision ?? null)
        const numericPreventivoId = Number(preventivoId)
        if (Number.isFinite(numericPreventivoId) && numericPreventivoId > 0) {
          try {
            const detailResult = await fetchPreventivoDetail({
              token,
              id: numericPreventivoId,
            })
            setCurrentPreventivoDetail(detailResult?.data ?? null)
            setCurrentPreventivoLines(Array.isArray(detailResult?.righe) ? detailResult.righe : [])
          } catch (detailError) {
            // Silently ignore; comparison is best-effort.
          }
        }
      } catch (error) {
        if (error?.status === 401 && logout) {
          logout()
          return
        }
        setRevisionDetailModalError(error)
      } finally {
        setRevisionDetailModalLoading(false)
      }
    },
    [fetchPreventivoDetail, fetchPreventivoRevisionDetail, logout, token],
  )

  const toggleRevisionRows = useCallback((id) => {
    if (!id) return
    setExpandedRevisions((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleRowClick = useCallback(
    (id, event) => {
      if (!id) return
      const target = event?.target
      if (target?.closest && target.closest('button, a')) {
        return
      }
      toggleRevisionRows(id)
    },
    [toggleRevisionRows],
  )

  const handleCloseRevisionModal = useCallback(() => {
    setRevisionDetailModalVisible(false)
    setRevisionDetailModalError(null)
    setRevisionDetailModalData(null)
    setCurrentPreventivoDetail(null)
    setCurrentPreventivoLines([])
  }, [])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (viewMode === 'archiviati') {
          const first = await fetchPreventiviArchivio({
            token,
            signal: controller.signal,
            page: 1,
            pageSize: 100,
            sortBy: 'data_preventivo',
            sortDirection: 'desc',
          })
          let all = Array.isArray(first.items) ? [...first.items] : []
          const totalPages = Math.max(first?.meta?.pages ?? first?.meta?.last_page ?? 1, 1)
          const perPage = first?.meta?.per_page ?? (all.length || 100)
          if (totalPages > 1) {
            for (let p = 2; p <= totalPages; p += 1) {
              if (controller.signal.aborted) break
              const pageRes = await fetchPreventiviArchivio({
                token,
                signal: controller.signal,
                page: p,
                pageSize: perPage,
                sortBy: 'data_preventivo',
                sortDirection: 'desc',
              })
              if (Array.isArray(pageRes.items) && pageRes.items.length > 0) {
                all = all.concat(pageRes.items)
              }
            }
          }
          setItems(all)
        } else {
          const { items: data = [] } = await fetchLatestPreventivi({
            token,
            signal: controller.signal,
          })
          setItems(Array.isArray(data) ? data : [])
        }
        setPage(0)
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setError(e)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, logout, viewMode, refreshIndex])

  const total = items.length
  const totalPages = Math.max(Math.ceil(total / rowsPerPage), 1)

  const sortedItems = useMemo(() => {
    const out = [...items]
    const getter = (row, field) => {
      if (field === 'cliente') return String(row.ragione_sociale || '')
      if (field === 'documento') return `${row.anno_preventivo ?? ''}/${row.numero_documento ?? ''}`
      if (field === 'data') return String(row.data_preventivo || row.created_at || '')
      if (field === 'riferimento') return String(row.riferimento_cliente || '')
      if (field === 'totale') return Number(row.totale || 0)
      if (field === 'stato') return String(row.stato_label || row.stato_code || '')
      return ''
    }
    out.sort((a, b) => {
      for (const s of sorts) {
        const av = getter(a, s.field)
        const bv = getter(b, s.field)
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? (av - bv)
          : String(av).toLocaleLowerCase().localeCompare(String(bv).toLocaleLowerCase())
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return out
  }, [items, sorts])

  const groupedFlat = useMemo(() => {
    if (groupBy === 'none') return sortedItems.map((it) => ({ type: 'item', data: it }))

    const groups = []
    const index = new Map()
    const getDate = (v) => {
      const d = new Date(v)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const keyAndLabel = (row) => {
      if (groupBy === 'cliente') {
        const label = row.ragione_sociale || '-'
        return { key: `cliente:${label}`, label }
      }
      if (groupBy === 'stato') {
        const label = row.stato_label || row.stato_code || '-'
        return { key: `stato:${label}`, label }
      }
      const base = row.data_preventivo || row.created_at
      const d = getDate(base)
      if (!d) return { key: 'data:-', label: '-' }
      if (groupBy === 'giorno') {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return { key: `day:${y}-${m}-${day}`, label: `${day}/${m}/${y}` }
      }
      if (groupBy === 'mese') {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        return { key: `month:${y}-${m}`, label: `${m}/${y}` }
      }
      return { key: 'data:-', label: '-' }
    }

    for (const row of sortedItems) {
      const { key, label } = keyAndLabel(row)
      let g = index.get(key)
      if (!g) {
        g = { type: 'group', key, label, count: 0, rows: [] }
        index.set(key, g)
        groups.push(g)
      }
      g.count += 1
      g.rows.push({ type: 'item', data: row })
    }
    // Flatten preserving group order from sortedItems
    const flat = []
    for (const g of groups) {
      flat.push({ type: 'group', label: g.label, count: g.count })
      flat.push(...g.rows)
    }
    return flat
  }, [sortedItems, groupBy])

  const pageItems = useMemo(() => {
    const start = page * rowsPerPage
    return groupedFlat.slice(start, start + rowsPerPage)
  }, [groupedFlat, page, rowsPerPage])

  const visiblePreventivoIds = useMemo(() => {
    return pageItems
      .filter((entry) => entry.type === 'item')
      .map((entry) => Number(entry.data?.id_preventivo))
      .filter((id) => Number.isFinite(id) && id > 0)
  }, [pageItems])

  const toggleSort = (field, shiftKey = false) => {
    setSorts((prev) => {
      if (!shiftKey) {
        const existing = prev.find((s) => s.field === field)
        if (existing && prev.length === 1) {
          return [{ field, dir: existing.dir === 'asc' ? 'desc' : 'asc' }]
        }
        return [{ field, dir: 'asc' }]
      }
      const idx = prev.findIndex((s) => s.field === field)
      if (idx === -1) return [...prev, { field, dir: 'asc' }]
      const copy = [...prev]
      copy[idx] = { field, dir: copy[idx].dir === 'asc' ? 'desc' : 'asc' }
      return copy
    })
  }

  const sortIndicator = (field) => {
    const idx = sorts.findIndex((s) => s.field === field)
    if (idx === -1) return ''
    const dir = sorts[idx].dir === 'asc' ? '▲' : '▼'
    return ` ${dir}(${idx + 1})`
  }

  const paginationItems = useMemo(() => {
    const current = page + 1
    const pages = []
    for (let p = 1; p <= totalPages; p += 1) pages.push(p)
    return pages
  }, [page, totalPages])

  useEffect(() => {
    if (!token) {
      setRevisionSummaries({})
      return
    }
    if (visiblePreventivoIds.length === 0) {
      setRevisionSummaries({})
      return
    }
    const controller = new AbortController()
    let active = true
    const loadSummaries = async () => {
      try {
        const { data } = await fetchPreventiviRevisionsSummary({
          token,
          ids: visiblePreventivoIds,
          signal: controller.signal,
        })
        if (!active) return
        const mapping = {}
        if (Array.isArray(data)) {
          data.forEach((entry) => {
            const key = Number(entry?.id_preventivo)
            if (Number.isFinite(key) && key > 0) {
              mapping[key] = Array.isArray(entry.revisions) ? entry.revisions : []
            }
          })
        }
        setRevisionSummaries(mapping)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
        }
      }
    }
    loadSummaries()
    return () => {
      active = false
      controller.abort()
    }
  }, [token, visiblePreventivoIds, logout])

  const handleView = (id) => {
    if (!id) return
    navigate(`/preventivi/dettagli?id=${id}`)
  }

  const handleRestore = async (id) => {
    if (!id || !token) return
    const confirmed = window.confirm(`Confermi il ripristino del preventivo archiviato ${id}?\nVerrà assegnata una nuova numerazione.`)
    if (!confirmed) return
    try {
      const res = await reactivatePreventivo({ token, id })
      // Dopo ripristino, torna alla vista attivi e mostra il nuovo record
      setViewMode('attivi')
      setRefreshIndex((v) => v + 1)
      const newId = res?.id_preventivo
      if (newId) {
        navigate(`/preventivi/dettagli?id=${newId}`)
      }
    } catch (e) {
      if (e?.status === 401 && logout) {
        logout()
        return
      }
      alert(e?.payload?.message || e?.message || 'Ripristino non riuscito')
    }
  }

  const handleArchive = async (id) => {
    if (!id || !token) return
    const confirmed = window.confirm(`Confermi l'archiviazione del preventivo ${id}?`)
    if (!confirmed) return
    try {
      await archivePreventivo({ token, id })
      setRefreshIndex((v) => v + 1)
    } catch (e) {
      if (e?.status === 401 && logout) {
        logout()
        return
      }
      alert(e?.payload?.message || e?.message || 'Archiviazione non riuscita')
    }
  }

  const handlePrintPDF = (preventivoId) => {
    if (typeof window === 'undefined') return
    const url = buildPreventivoPdfUrl(preventivoId)
    if (!url) return
    window.open(url, '_blank', 'noopener')
  }

  const handleOpenEmailModal = useCallback(
    async (row) => {
      if (!token) return
      const rawId = typeof row === 'object' ? row?.id_preventivo ?? row?.id : row
      const numericId = Number(rawId)
      if (!Number.isFinite(numericId) || numericId <= 0) return
      setEmailModalVisible(true)
      setEmailModalLoading(true)
      setEmailError(null)
      setEmailSuccess(null)
      setEmailForm({ to: '', cc: '', subject: '', body: '' })
      setEmailTarget({
        id: numericId,
        numero: typeof row === 'object' ? row?.numero_documento : null,
        anno: typeof row === 'object' ? row?.anno_preventivo : null,
        cliente: typeof row === 'object' ? row?.ragione_sociale : null,
      })
      try {
        const detail = await fetchPreventivoDetail({ token, id: numericId })
        const header = detail?.data ?? {}
        const contatti = Array.isArray(detail?.contatti) ? detail.contatti : []
        const seen = new Set()
        const emails = []
        const pushEmail = (value) => {
          const email = String(value || '').trim()
          if (!email) return
          const key = email.toLowerCase()
          if (seen.has(key)) return
          seen.add(key)
          emails.push(email)
        }
        contatti.forEach((contact) => pushEmail(contact?.email))
        pushEmail(header?.email)
        pushEmail(header?.email_cliente)
        const numeroDoc = header?.numero_documento ?? row?.numero_documento ?? null
        const annoDoc = header?.anno_preventivo ?? row?.anno_preventivo ?? null
        const clienteLabel = header?.ragione_sociale ?? row?.ragione_sociale ?? 'Cliente'
        const numeroDisplay = numeroDoc ? `${numeroDoc}${annoDoc ? `/${annoDoc}` : ''}` : `ID ${numericId}`
        const docDate = header?.data_preventivo
          ? (() => {
            const parsed = new Date(header.data_preventivo)
            return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT')
          })()
          : null
        const descrizione = String(header?.oggetto || 'la lavorazione richiesta').trim()
        const pdfLink = buildPreventivoPdfUrl(numericId)
        const operatorName = user?.name || user?.username || 'MediaPrint S.r.l.'
        const totalFormatted = formatCurrency(header?.totale ?? row?.totale ?? 0)
        const subjectSegments = []
        if (numeroDoc) {
          subjectSegments.push(`Preventivo ${numeroDoc}${annoDoc ? `/${annoDoc}` : ''}`)
        } else if (annoDoc) {
          subjectSegments.push(`Preventivo ${annoDoc}`)
        } else {
          subjectSegments.push(`Preventivo ${numeroDisplay}`)
        }
        if (clienteLabel) subjectSegments.push(clienteLabel)
        const subject = subjectSegments.join(' - ')
        const bodyLines = [
          `Gentile ${clienteLabel},<br>`,
          '',
          `Nel seguente link trova il preventivo n. ${numeroDisplay}${docDate ? ` del ${docDate}` : ''} relativo a ${descrizione}.<br><br>`,
          pdfLink ? `<a href="${pdfLink}">Scarica Preventivo #${numeroDisplay}</a><br><br> ` : '',
          `Totale documento: ${totalFormatted}.<br><br>`,
          'Restiamo a disposizione per qualsiasi chiarimento.<br>',
          '<br>',
          'Cordiali saluti,<br>',
          operatorName,
        ].filter(Boolean)
        setEmailForm({
          to: emails.join(', '),
          cc: '',
          subject,
          body: bodyLines.join('\n'),
        })
        setEmailTarget({
          id: numericId,
          numero: numeroDoc,
          anno: annoDoc,
          cliente: clienteLabel,
        })
      } catch (e) {
        if (e?.status === 401 && logout) {
          logout()
          return
        }
        setEmailError(e)
      } finally {
        setEmailModalLoading(false)
      }
    },
    [token, logout, user],
  )

  const handleCloseEmailModal = () => {
    if (emailSending) return
    setEmailModalVisible(false)
    setEmailModalLoading(false)
    setEmailTarget(null)
    setEmailForm({ to: '', cc: '', subject: '', body: '' })
    setEmailError(null)
    setEmailSuccess(null)
  }

  const handleEmailFieldChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setEmailForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSendPreventivoEmail = async (event) => {
    event?.preventDefault?.()
    if (!token || !emailTarget?.id) return
    const sanitizedTo = String(emailForm.to || '').trim()
    if (sanitizedTo === '') {
      setEmailError(new Error('Indicare almeno un destinatario.'))
      return
    }
    setEmailSending(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      const response = await sendPreventivoEmail({
        token,
        id: emailTarget.id,
        to: emailForm.to,
        cc: emailForm.cc,
        subject: emailForm.subject,
        message: emailForm.body,
        revisionNote: emailForm.subject,
        revisionOperator: user?.username ?? user?.email ?? undefined,
      })
      if (!response?.ok) {
        const error = new Error(response?.message || 'Invio email non riuscito.')
        error.payload = response
        throw error
      }
      setEmailSuccess(response?.message || 'Email inviata con successo.')
    } catch (e) {
      if (e?.status === 401 && logout) {
        logout()
        return
      }
      setEmailError(e)
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Preventivi - Elenco {viewMode === 'archiviati' ? '(archiviati)' : ''}</h5>
              <small className="text-body-secondary">
                {viewMode === 'archiviati' ? 'Archivio preventivi, ordinati per data decrescente' : 'Ordinati per data decrescente'}
              </small>
            </div>
            <div className="d-flex gap-3 align-items-center">
              <div className="btn-group" role="group" aria-label="Seleziona elenco">
                <CButton
                  color={viewMode === 'attivi' ? 'primary' : 'secondary'}
                  variant={viewMode === 'attivi' ? 'solid' : 'outline'}
                  onClick={() => setViewMode('attivi')}
                  disabled={loading || viewMode === 'attivi'}
                >
                  Attivi
                </CButton>
                <CButton
                  color={viewMode === 'archiviati' ? 'primary' : 'secondary'}
                  variant={viewMode === 'archiviati' ? 'solid' : 'outline'}
                  onClick={() => setViewMode('archiviati')}
                  disabled={loading || viewMode === 'archiviati'}
                >
                  Archivio
                </CButton>
              </div>
              <div className="d-flex align-items-center">
                <span className="me-2 text-body-secondary">Raggruppa per</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 150 }}
                  value={groupBy}
                  onChange={(e) => { setGroupBy(e.target.value); setPage(0) }}
                >
                  <option value="none">Nessuno</option>
                  <option value="giorno">Giorno</option>
                  <option value="mese">Mese</option>
                  <option value="stato">Stato</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              <div className="d-flex align-items-center">
                <span className="me-2 text-body-secondary">Righe per pagina</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 100 }}
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
                >
                  {perPageOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
                <PermissionButton
                  color="primary"
                  variant="outline"
                  onClick={() => navigate('/preventivi/crea')}
                  permission="prev.create"
                >
                  <CIcon icon={cilPlus} className="me-2" />
                  Nuovo preventivo
                </PermissionButton>
            </div>
          </div>
        </CCardHeader>
        <CCardBody>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <CSpinner color="primary" />
            </div>
          )}

          {!loading && error && (
            <CAlert color="danger">{error.message || 'Impossibile caricare i preventivi.'}</CAlert>
          )}

          {!loading && !error && total === 0 && (
            <CAlert color="warning">Nessun preventivo disponibile.</CAlert>
          )}

          {!loading && !error && total > 0 && (
            <>
              <CTable hover responsive>
                <CTableHead color="light">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('cliente', e.shiftKey)} className="text-nowrap">
                      Cliente{sortIndicator('cliente')}
                    </CTableHeaderCell>
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('documento', e.shiftKey)} className="text-nowrap">
                      Documento{sortIndicator('documento')}
                    </CTableHeaderCell>
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('data', e.shiftKey)} className="text-nowrap">
                      Data{sortIndicator('data')}
                    </CTableHeaderCell>
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('riferimento', e.shiftKey)} className="text-nowrap">
                      Rif. cliente{sortIndicator('riferimento')}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-nowrap">Imponibile</CTableHeaderCell>
                    <CTableHeaderCell className="text-nowrap">IVA</CTableHeaderCell>
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('totale', e.shiftKey)} className="text-nowrap">
                      Totale{sortIndicator('totale')}
                    </CTableHeaderCell>
                    <CTableHeaderCell role="button" onClick={(e) => toggleSort('stato', e.shiftKey)} className="text-center text-nowrap">
                      Stato{sortIndicator('stato')}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-center text-nowrap">Azioni</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {pageItems.map((row, idx) => {
                    if (row.type === 'group') {
                      return (
                        <CTableRow key={`g-${idx}`} className="table-secondary">
                          <CTableDataCell colSpan={9} className="fw-semibold">
                            {row.label} — {row.count} elementi
                          </CTableDataCell>
                        </CTableRow>
                      )
                    }
                    const r = row.data
                    const rowRevisions = Array.isArray(revisionSummaries[r.id_preventivo])
                      ? revisionSummaries[r.id_preventivo]
                      : []
                    const latestRevision = rowRevisions[0] ?? null
                    const latestRevisionLabel = latestRevision
                      ? (latestRevision.label || `Rev.${latestRevision.numero_revision}`)
                      : null
                    const isExpanded = Boolean(expandedRevisions[r.id_preventivo])
                    return (
                      <React.Fragment key={r.id_preventivo ?? idx}>
                        <CTableRow
                          role="button"
                          onClick={(event) => handleRowClick(r.id_preventivo, event)}
                          className="align-middle"
                          style={{ cursor: 'pointer' }}
                          aria-expanded={isExpanded}
                        >
                          <CTableDataCell>
                            {r.ragione_sociale || '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            {(r.anno_preventivo ?? '-')}/{r.numero_documento ?? '-'}
                            {latestRevisionLabel && (
                              <CBadge color="info" className="ms-2 text-dark" shape="rounded-pill">
                                {latestRevisionLabel}
                              </CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>{formatDate(r.data_preventivo)}</CTableDataCell>
                          <CTableDataCell>{r.riferimento_cliente || '-'}</CTableDataCell>
                          <CTableDataCell>{formatCurrency(r.totale_imponibile)}</CTableDataCell>
                          <CTableDataCell>{formatCurrency(r.totale_iva)}</CTableDataCell>
                          <CTableDataCell>{formatCurrency(r.totale)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {r.stato_label ? (
                              <CBadge color="secondary">{r.stato_label}</CBadge>
                            ) : (
                              <span className="text-body-secondary">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <div className="d-inline-flex gap-1 flex-wrap justify-content-center">
                              <PermissionButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => handleView(r.id_preventivo)}
                                title="Apri dettaglio"
                                permission="prev.read"
                              >
                                <CIcon icon={cilDescription} />
                              </PermissionButton>
                              <PermissionButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => handlePrintPDF(r.id_preventivo)}
                                title="Stampa PDF"
                                permission="prev.read"
                              >
                                <CIcon icon={cilPrint} />
                              </PermissionButton>
                              <PermissionButton
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => handleOpenEmailModal(r)}
                                title="Invia PDF via email"
                                permission="prev.write"
                              >
                                <CIcon icon={cilEnvelopeClosed} />
                              </PermissionButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                    {isExpanded && rowRevisions.length > 0 && (
                      <CTableRow key={`rev-${r.id_preventivo}`} className="border-start-0 border-end-0">
                        <CTableDataCell colSpan={9} className="pt-0 pb-2">
                          <div className="d-flex flex-column gap-1 small text-body-secondary">
                            {rowRevisions.map((rev) => (
                              <div className="d-flex flex-wrap gap-3 align-items-baseline" key={rev.id_revisione}>
                                <span className="fw-semibold text-dark">{rev.label || `Rev.${rev.numero_revision}`}</span>
                                <span>Imponibile: {formatCurrency(rev.totale_imponibile)}</span>
                                <span>IVA: {formatCurrency(rev.totale_iva)}</span>
                                <span>Totale: {formatCurrency(rev.totale)}</span>
                                <span className="text-muted">({formatDate(rev.created_at)})</span>
                                <PermissionButton
                                  color="link"
                                  size="sm"
                                  className="p-0"
                                  onClick={() => handleOpenRevisionDetail(rev.id_revisione, r.id_preventivo)}
                                  title="Apri dettaglio revisione"
                                  permission="prev.read"
                                >
                                  <CIcon icon={cilZoom} />
                                </PermissionButton>
                              </div>
                            ))}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </React.Fragment>
                    )
                  })}
                </CTableBody>
              </CTable>

              <CRow className="mt-3 align-items-center">
                <CCol className="text-body-secondary">
                  Mostrando {Math.min(total, page * rowsPerPage + 1)} -
                  {' '}
                  {Math.min(total, (page + 1) * rowsPerPage)} di {total} risultati
                </CCol>
                <CCol className="d-flex justify-content-end">
                  <CPagination className="mb-0" size="sm">
                    <CPaginationItem
                      aria-label="Pagina precedente"
                      disabled={page <= 0}
                      onClick={() => page > 0 && setPage(page - 1)}
                    >
                      &laquo;
                    </CPaginationItem>
                    {paginationItems.map((p) => (
                      <CPaginationItem key={p} active={p === page + 1} onClick={() => setPage(p - 1)}>
                        {p}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      aria-label="Pagina successiva"
                      disabled={page >= totalPages - 1}
                      onClick={() => page < totalPages - 1 && setPage(page + 1)}
                    >
                      &raquo;
                    </CPaginationItem>
                  </CPagination>
                </CCol>
              </CRow>
            </>
          )}
        </CCardBody>
      </CCard>
      <CModal
        visible={emailModalVisible}
        onClose={handleCloseEmailModal}
        alignment="center"
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Invia preventivo via email</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {emailTarget && (
            <div className="mb-3 small text-body-secondary">
              Documento:{' '}
              <strong>
                {emailTarget.numero ? `${emailTarget.numero}${emailTarget.anno ? `/${emailTarget.anno}` : ''}` : emailTarget.id}
              </strong>
              {emailTarget.cliente ? ` - ${emailTarget.cliente}` : ''}
            </div>
          )}
          {emailModalLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {!emailModalLoading && (
            <>
              {emailError && (
                <CAlert color="danger" className="mb-3">
                  {emailError?.payload?.message || emailError.message || 'Errore durante il caricamento del preventivo.'}
                </CAlert>
              )}
              {emailSuccess && (
                <CAlert color="success" className="mb-3">
                  {emailSuccess}
                </CAlert>
              )}
              <CForm id="preventivi-list-email-form" onSubmit={handleSendPreventivoEmail}>
                <div className="mb-3">
                  <CFormLabel htmlFor="preventivi-email-to">Destinatari</CFormLabel>
                  <CFormInput
                    id="preventivi-email-to"
                    type="text"
                    placeholder="es: cliente@example.com"
                    value={emailForm.to}
                    onChange={handleEmailFieldChange('to')}
                    disabled={emailSending}
                  />
                  <small className="text-body-secondary">Separare gli indirizzi con virgola.</small>
                </div>
                <div className="mb-3">
                  <CFormLabel htmlFor="preventivi-email-cc">CC (facoltativo)</CFormLabel>
                  <CFormInput
                    id="preventivi-email-cc"
                    type="text"
                    value={emailForm.cc}
                    onChange={handleEmailFieldChange('cc')}
                    disabled={emailSending}
                  />
                </div>
                <div className="mb-3">
                  <CFormLabel htmlFor="preventivi-email-subject">Oggetto</CFormLabel>
                  <CFormInput
                    id="preventivi-email-subject"
                    type="text"
                    value={emailForm.subject}
                    onChange={handleEmailFieldChange('subject')}
                    disabled={emailSending}
                  />
                </div>
                <div className="mb-3">
                  <CFormLabel htmlFor="preventivi-email-body">Messaggio</CFormLabel>
                  <HtmlEditor
                    value={emailForm.body}
                    onChange={(html) => setEmailForm((prev) => ({ ...prev, body: html }))}
                    disabled={emailSending}
                    placeholder="Scrivi il messaggio da inviare al cliente..."
                    minHeight={200}
                  />
                  <small className="text-body-secondary">Il messaggio supporta la formattazione HTML di base.</small>
                </div>
              </CForm>
            </>
          )}
        </CModalBody>
        {!emailModalLoading && (
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={handleCloseEmailModal} disabled={emailSending}>
              Chiudi
            </CButton>
            <PermissionButton
              color="primary"
              type="submit"
              form="preventivi-list-email-form"
              disabled={emailSending}
              permission="prev.write"
            >
              {emailSending ? 'Invio in corso...' : 'Invia email'}
            </PermissionButton>
          </CModalFooter>
        )}
      </CModal>
      <CModal
        visible={revisionDetailModalVisible}
        onClose={handleCloseRevisionModal}
        size="lg"
        backdrop="static"
        className="preventivi-revision-modal"
      >
        <CModalHeader>
          <CModalTitle>Dettaglio revisione</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {revisionDetailModalLoading && (
            <div className="d-flex justify-content-center py-4">
              <CSpinner />
            </div>
          )}
          {!revisionDetailModalLoading && revisionDetailModalError && (
            <CAlert color="danger">{revisionDetailModalError.message || 'Impossibile caricare la revisione.'}</CAlert>
          )}
          {!revisionDetailModalLoading && !revisionDetailModalError && revisionDetailModalData && (
            <>
              <div className="row g-4 mb-4">
              <div className="col-12 col-lg-6">
                <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-body-secondary small">Revisione salvata</div>
                        <div className="fw-semibold">
                          {revisionDetailModalData.label || `Rev.${revisionDetailModalData.numero_revision}`}
                        </div>
                      </div>
                      <div className="text-body-secondary small text-end">
                        {formatDateTime(revisionDetailModalData.created_at)}
                      </div>
                    </div>
                    <div className="text-body-secondary small mt-3">Cliente</div>
                    <div className="fw-semibold">{revisionDetailClientLabel}</div>
                    {revisionDetailClientIdentifiers && (
                      <div className="small text-body-secondary">{revisionDetailClientIdentifiers}</div>
                    )}
                    <div className="text-body-secondary small mt-3">Documento</div>
                    <div className="fw-semibold">{revisionDetailDocumentNumber}</div>
                    <div className="row g-2 mt-3">
                      <div className="col">
                        <div className="text-body-secondary small">Imponibile</div>
                        <div className="fw-semibold">
                          {formatCurrency(revisionDetailData.totale_imponibile ?? revisionDetailData.totale ?? 0)}
                        </div>
                      </div>
                      <div className="col">
                        <div className="text-body-secondary small">IVA</div>
                        <div className="fw-semibold">{formatCurrency(revisionDetailData.totale_iva ?? 0)}</div>
                      </div>
                      <div className="col">
                        <div className="text-body-secondary small">Totale</div>
                        <div className="fw-semibold">
                          {formatCurrency(revisionDetailData.totale ?? revisionDetailData.totale_imponibile ?? 0)}
                        </div>
                      </div>
                    </div>
                    <div className="text-body-secondary small mt-4">Righe revisione</div>
                    {renderLinesTable(revisionLines, 'Nessuna riga salvata.')}
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-body-secondary small">Versione corrente</div>
                        <div className="fw-semibold">{currentPreventivoDocumentLabel}</div>
                      </div>
                      <div className="text-body-secondary small text-end">
                        {currentPreventivoUpdatedLabel}
                      </div>
                    </div>
                    <div className="text-body-secondary small mt-3">Cliente</div>
                    <div className="fw-semibold">{currentPreventivoClientLabel}</div>
                    {currentPreventivoClientIdentifiers && (
                      <div className="small text-body-secondary">{currentPreventivoClientIdentifiers}</div>
                    )}
                    {currentPreventivoDetail ? (
                      <div className="row g-2 mt-3">
                        <div className="col">
                          <div className="text-body-secondary small">Imponibile</div>
                          <div className="fw-semibold">
                            {formatCurrency(currentPreventivoTotals.imponibile ?? 0)}
                          </div>
                        </div>
                        <div className="col">
                          <div className="text-body-secondary small">IVA</div>
                          <div className="fw-semibold">{formatCurrency(currentPreventivoTotals.iva ?? 0)}</div>
                        </div>
                        <div className="col">
                          <div className="text-body-secondary small">Totale</div>
                          <div className="fw-semibold">{formatCurrency(currentPreventivoTotals.totale ?? 0)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-body-secondary small mt-3">
                        Dati correnti non disponibili.
                      </div>
                    )}
                    <div className="text-body-secondary small mt-4">Righe correnti</div>
                    {renderLinesTable(currentPreventivoLines, 'Nessuna riga disponibile.')}
                  </div>
                </div>
              </div>
            </>
          )}
          {!revisionDetailModalLoading && !revisionDetailModalError && !revisionDetailModalData && (
            <CAlert color="info">Nessun dato disponibile per la revisione selezionata.</CAlert>
          )}
        </CModalBody>
        <CModalFooter className="justify-content-end">
          <CButton color="secondary" variant="outline" onClick={handleCloseRevisionModal}>
            Chiudi
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PreventiviList
