import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilTrash, cilPlus, cilArrowLeft, cilEnvelopeClosed, cilCloudDownload } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import usePermissions from '../../hooks/usePermissions'
import { fetchAnagrafiche } from '../../services/anagrafiche'
import { buildApiUrl, getStoredToken } from '../../services/apiClient'
import {
  deleteContratto,
  deleteContrattoFile,
  fetchContrattoDetail,
  fetchContrattoFiles,
  fetchContrattoRevisionDetail,
  saveContratto,
  sendContrattoEmail,
  updateContrattoStatus,
  uploadContrattoFile,
} from '../../services/contratti'
import { fetchCategorieProdotti, fetchNatureIva, fetchProdotti, fetchProdottoPrezziCombinati, fetchProdottoVariazioni } from '../../services/prodotti'
import { fetchPacchettoDetail, fetchPacchetti } from '../../services/pacchetti'
import AnagraficaAutocomplete from '../../components/AnagraficaAutocomplete'
import HtmlEditor from '../../components/HtmlEditor'
import PermissionButton from '../../components/PermissionButton'

const createEmptyLine = () => ({
  id_prodotto: '',
  combo_key: '',
  descrizione: '',
  prezzo_unitario: 0,
  iva: 22,
  id_sdi_natura_iva: null,
  sconto_base: 0,
  sconti: [],
})

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('it-IT')
}

const formatFileSize = (value) => {
  const bytes = Number(value) || 0
  if (bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  const formatted = index === 0 ? Math.round(size) : size.toFixed(2)
  return `${formatted} ${units[index]}`
}

const ContrattiDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = Number(query.get('id') || 0)
  const { token, logout, user } = useAuth()
  const { has } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)

  const [editable, setEditable] = useState(true)
  const [statusOptions, setStatusOptions] = useState([])
  const [currentStatus, setCurrentStatus] = useState({ code: null, label: null })
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const [statusSuccess, setStatusSuccess] = useState(null)

  const [revisions, setRevisions] = useState([])
  const [revisionModalVisible, setRevisionModalVisible] = useState(false)
  const [revisionModalLoading, setRevisionModalLoading] = useState(false)
  const [revisionModalError, setRevisionModalError] = useState(null)
  const [revisionModalData, setRevisionModalData] = useState(null)
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState(null)
  const [filesVersion, setFilesVersion] = useState(0)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileUploadError, setFileUploadError] = useState(null)
  const [fileUploadSuccess, setFileUploadSuccess] = useState(null)
  const [fileDownloadError, setFileDownloadError] = useState(null)
  const [fileDeletingId, setFileDeletingId] = useState(null)
  const [fileDeleteError, setFileDeleteError] = useState(null)
  const [fileForm, setFileForm] = useState({ file: null })

  const [emailModalVisible, setEmailModalVisible] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(null)

  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [anagraficaOptions, setAnagraficaOptions] = useState([])
  const [anagraficaLoading, setAnagraficaLoading] = useState(false)
  const searchAbortRef = useRef(null)

  const [codice, setCodice] = useState('')
  const [titolo, setTitolo] = useState('')
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [dataFineManual, setDataFineManual] = useState(false)
  const [rinnovoAutomatico, setRinnovoAutomatico] = useState(false)
  const [attivo, setAttivo] = useState(true)
  const [testoLegale, setTestoLegale] = useState('')

  const [righe, setRighe] = useState([createEmptyLine()])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [stepperProdOptions, setStepperProdOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [selIva, setSelIva] = useState('')
  const [modalPrice, setModalPrice] = useState(0)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgModalOptions, setPkgModalOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)
  const canUploadContrattoFiles = has('contr.write')

  useEffect(() => {
    if (!id) {
      navigate('/contratti/lista', { replace: true })
    }
  }, [id, navigate])

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchContrattoDetail({ token, id, signal: controller.signal })
        const header = data?.contratto || {}
        const meta = data?.meta ?? {}
        setIdAnagrafica(String(header.id_anagrafica || ''))
        setCodice(header.codice || '')
        setTitolo(header.titolo || '')
        setRagioneSociale(header.ragione_sociale || '')
        setDataInizio(header.data_inizio || '')
        setDataFine(header.data_fine || '')
        setRinnovoAutomatico(Number(header.rinnovo_automatico) === 1)
        setAttivo(Number(header.attivo) === 1)
        setTestoLegale(header.testo_legale || '')
        setRighe(
          Array.isArray(data?.righe) && data.righe.length > 0
            ? data.righe.map((r) => ({
                id_prodotto: r.id_prodotto ?? '',
                combo_key: r.combo_key ?? '',
                descrizione: r.descrizione ?? '',
                prezzo_unitario: r.prezzo_unitario ?? 0,
                iva: r.iva ?? 22,
                id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                sconto_base: r.sconto_base ?? 0,
                sconti: Array.isArray(r.sconti) ? r.sconti : [],
              }))
            : [createEmptyLine()],
        )
        if (header.id_anagrafica && header.ragione_sociale) {
          setAnagraficaOptions((prev) => {
            const exists = prev.some(
              (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(header.id_anagrafica),
            )
            if (exists) return prev
            return [
              {
                id_anagrafica: header.id_anagrafica,
                ragione_sociale: header.ragione_sociale,
              },
              ...prev,
            ]
          })
        }
        const statuses = Array.isArray(meta?.statuses) ? meta.statuses : []
        setStatusOptions(statuses)
        const current = meta?.current_status ?? {}
        const currentCode = current?.code ?? header.stato_code ?? null
        const currentLabel = current?.label ?? header.stato_label ?? currentCode ?? null
        setCurrentStatus({
          code: currentCode,
          label: currentLabel,
        })
        setEditable(typeof meta?.editable === 'boolean' ? meta.editable : (currentCode ?? 'bozza') === 'bozza')
        setRevisions(Array.isArray(meta?.revisions) ? meta.revisions : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 401 && logout) {
          logout()
          return
        }
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token, id, logout, refreshCounter])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: prodotti }, { items: nature }, { items: cats }] = await Promise.all([
          fetchProdotti({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
          fetchCategorieProdotti({ token, signal: controller.signal }),
        ])
        setProdOptions(Array.isArray(prodotti) ? prodotti : [])
        setNaturaOptions(Array.isArray(nature) ? nature : [])
        setCatOptions(Array.isArray(cats) ? cats : [])
      } catch (_err) {
        setProdOptions([])
        setNaturaOptions([])
        setCatOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica prodotti per lo stepper in base a categoria/ricerca
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({ token, id_categoria: idcat, q: prodSearch, signal: controller.signal })
        setStepperProdOptions(Array.isArray(items) ? items : [])
      } catch (_e) {
        setStepperProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  // Carica variazioni e prezzi combinati per il prodotto selezionato nello stepper
  useEffect(() => {
    setProdVarOptions([])
    setProdComboMap({})
    setProdComboList([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    if (!token || !selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items) ? items.slice() : []
        sorted.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
        setProdVarOptions(sorted)
        const cmap = {}
        const rows = Array.isArray(combo?.items) ? combo.items : []
        rows.forEach((r) => { if (r?.combo_key) cmap[String(r.combo_key)] = Number(r.prezzo) || 0 })
        setProdComboMap(cmap)
        setProdComboList(rows)
      } catch (_e) {
        setProdVarOptions([])
        setProdComboMap({})
        setProdComboList([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selProd])

  // Aggiorna prezzo suggerito nel riepilogo del modal
  useEffect(() => {
    const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey = selectedComboKey && String(selectedComboKey).trim() !== ''
      ? selectedComboKey
      : (selectedVarIds
        .map((id) => Number(id) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .join('+'))
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const suggested = comboPrice != null ? comboPrice : base
    setModalPrice(suggested)
  }, [selProd, stepperProdOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  // Carica pacchetti nel modal
  useEffect(() => {
    if (!token || !pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({ token, q: pkgSearch, onlyActive: pkgOnlyActive, signal: controller.signal })
        setPkgModalOptions(Array.isArray(items) ? items : [])
      } catch (_e) {
        setPkgModalOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  useEffect(() => {
    if (!token || !pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      setPkgPreview([])
      if (!selPacchetto) return
      try {
        const { righe } = await fetchPacchettoDetail({ token, id: Number(selPacchetto), signal: controller.signal })
        setPkgPreview(Array.isArray(righe) ? righe : [])
      } catch (_e) {
        setPkgPreview([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    setFilesLoading(true)
    setFilesError(null)
    fetchContrattoFiles({
      token,
      id,
      signal: controller.signal,
    })
      .then((items) => {
        if (controller.signal.aborted) return
        setFiles(Array.isArray(items) ? items : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Impossibile caricare i file firmati del contratto:', err)
        setFilesError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFilesLoading(false)
        }
      })
    return () => controller.abort()
  }, [token, id, filesVersion, refreshCounter])

  const loadAnagrafiche = async (query) => {
    if (!token) return
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller
    setAnagraficaLoading(true)
    try {
      const { items } = await fetchAnagrafiche({
        token,
        search: query,
        page: 1,
        pageSize: 50,
        signal: controller.signal,
      })
      setAnagraficaOptions(Array.isArray(items) ? items : [])
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setAnagraficaOptions([])
    } finally {
      setAnagraficaLoading(false)
    }
  }

  const updateLine = (index, patch) => {
    setRighe((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleAddLine = () => {
    setRighe((rows) => rows.concat(createEmptyLine()))
  }

  const handleRemoveLine = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }

  const handleStatusChange = useCallback(async (nextCode) => {
    const safeCode = typeof nextCode === 'string' ? nextCode.trim().toLowerCase() : String(nextCode || '').trim().toLowerCase()
    if (!safeCode || !token || !id || statusUpdating) return
    setStatusError(null)
    setStatusSuccess(null)
    setStatusUpdating(true)
    const operatorName = user?.username || user?.name || user?.email || null
    const statusNote = safeCode === 'inviato' ? 'Invio manuale da timeline.' : null
    try {
      const result = await updateContrattoStatus({
        token,
        id,
        statusCode: safeCode,
        operatorName,
        note: statusNote,
      })
      const updatedStatuses = Array.isArray(result.statuses) ? result.statuses : statusOptions
      setStatusOptions(updatedStatuses || [])
      const resolvedCode = result.currentStatus?.code ?? safeCode
      let resolvedLabel = result.currentStatus?.label ?? null
      if (!resolvedLabel && Array.isArray(updatedStatuses)) {
        const match = updatedStatuses.find((s) => s?.code === resolvedCode)
        if (match) resolvedLabel = match.label ?? resolvedLabel
      }
      setCurrentStatus({
        code: resolvedCode ?? null,
        label: resolvedLabel ?? resolvedCode ?? null,
      })
      setEditable(typeof result.editable === 'boolean' ? result.editable : resolvedCode === 'bozza')
      setRevisions(Array.isArray(result.revisions) ? result.revisions : [])
      setStatusSuccess('Stato aggiornato correttamente.')
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setStatusError(err)
    } finally {
      setStatusUpdating(false)
    }
  }, [token, id, statusUpdating, logout, statusOptions, user])

  const handleOpenRevisionDetail = async (revisionId) => {
    const numericId = Number(revisionId)
    if (!Number.isFinite(numericId) || numericId <= 0) return
    setRevisionModalVisible(true)
    setRevisionModalLoading(true)
    setRevisionModalError(null)
    setRevisionModalData(null)
    try {
      const result = await fetchContrattoRevisionDetail({ token, id: numericId })
      setRevisionModalData(result?.revision ?? null)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setRevisionModalError(err)
    } finally {
      setRevisionModalLoading(false)
    }
  }

  const handleCloseRevisionModal = () => {
    setRevisionModalVisible(false)
    setRevisionModalError(null)
    setRevisionModalData(null)
  }

  const defaultEmailSubject = useMemo(() => {
    if (titolo && titolo.trim() !== '') return `Contratto ${titolo}`
    return id ? `Contratto ${id}` : 'Contratto'
  }, [titolo, id])

  const defaultEmailBody = useMemo(() => {
    const cliente = ragioneSociale && ragioneSociale.trim() !== '' ? ragioneSociale : 'Cliente'
    const contractTitle = titolo && titolo.trim() !== '' ? titolo : (id ? `Contratto ${id}` : 'contratto')
    return `<p>Gentile ${cliente},</p><p>in allegato trova il contratto <strong>${contractTitle}</strong>.</p><p>Restiamo a disposizione per ulteriori informazioni.</p><p>Cordiali saluti,<br />MediaPrint ERP</p>`
  }, [ragioneSociale, titolo, id])

  const handleOpenEmailModal = useCallback(() => {
    setEmailError(null)
    setEmailSuccess(null)
    setEmailModalVisible(true)
    setEmailTo((prev) => (prev && prev.trim() !== '' ? prev : ''))
    setEmailSubject((prev) => (prev && prev.trim() !== '' ? prev : defaultEmailSubject))
    setEmailBody((prev) => (prev && prev.trim() !== '' ? prev : defaultEmailBody))
  }, [defaultEmailSubject, defaultEmailBody])

  const handleCloseEmailModal = useCallback(() => {
    if (emailSending) return
    setEmailModalVisible(false)
  }, [emailSending])

  const handleSendContrattoEmail = useCallback(async () => {
    if (!token || !id) return
    const sanitizedTo = String(emailTo || '').trim()
    if (sanitizedTo === '') {
      setEmailError(new Error('Indicare almeno un destinatario.'))
      return
    }
    setEmailSending(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      const result = await sendContrattoEmail({
        token,
        id,
        to: emailTo,
        cc: emailCc,
        subject: emailSubject,
        message: emailBody,
        revisionNote: emailSubject,
        revisionOperator: user?.username ?? user?.email ?? undefined,
      })
      if (!result?.ok) {
        const error = new Error(result?.message || 'Invio email non riuscito.')
        error.payload = result
        throw error
      }
      setEmailSuccess('Email inviata con successo.')
      setEmailModalVisible(false)
      setRefreshCounter((count) => count + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setEmailError(err)
    } finally {
      setEmailSending(false)
    }
  }, [token, id, emailTo, emailCc, emailSubject, emailBody, logout, user])


  const handleFileInputChange = (event) => {
    const file = event?.target?.files?.[0] ?? null
    setFileForm({ file })
    setFileUploadError(null)
    setFileUploadSuccess(null)
  }

  const handleFileUpload = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
    if (!token || !id || !fileForm.file || !canUploadContrattoFiles) {
      return
    }
    setFileUploading(true)
    setFileUploadError(null)
    setFileUploadSuccess(null)
    try {
      await uploadContrattoFile({
        token,
        id,
        file: fileForm.file,
        createdBy: user?.id,
      })
      setFileUploadSuccess('File caricato correttamente.')
      setFileForm({ file: null })
      setFilesVersion((value) => value + 1)
    } catch (err) {
      console.error('Impossibile caricare il file firmato:', err)
      setFileUploadError(err)
    } finally {
      setFileUploading(false)
    }
  }

  const handleFileDownload = async (file) => {
    if (!file?.id_file) {
      return
    }
    const tokenValue = token || getStoredToken()
    if (!tokenValue) {
      return
    }
    setFileDownloadError(null)
    try {
      const url = buildApiUrl('/contrattiFilesDownload.php', { id: file.id_file })
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenValue}`,
          'X-Authorization': `Bearer ${tokenValue}`,
          'X-Access-Token': tokenValue,
        },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.message || `Errore ${response.status}`
        throw new Error(message)
      }
      const blob = await response.blob()
      const header = response.headers.get('content-disposition') || ''
      const match = header.match(/filename=\"?([^\";]+)\"?/i)
      const name = match?.[1] || file.original_name || file.file_name || 'documento.pdf'
      const urlBlob = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlBlob
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(urlBlob)
    } catch (err) {
      console.error('Impossibile scaricare il file firmato:', err)
      setFileDownloadError(err)
    }
  }

  const handleFileDelete = async (file) => {
    if (!file?.id_file || !token) {
      return
    }
    if (!window.confirm('Confermi l\'eliminazione di questo file dal database? Il PDF rimane disponibile sul server.')) {
      return
    }
    setFileDeleteError(null)
    setFileDeletingId(file.id_file)
    try {
      await deleteContrattoFile({ token, id: file.id_file })
      setFilesVersion((value) => value + 1)
    } catch (err) {
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      console.error('Impossibile eliminare il file dal database:', err)
      setFileDeleteError(err)
    } finally {
      setFileDeletingId(null)
    }
  }


  const syncDataFine = (value) => {
    const raw = String(value || '').trim()
    setDataInizio(raw)
  }

  useEffect(() => {
    if (!dataInizio || dataFineManual) {
      return
    }
    const dt = new Date(`${dataInizio}T00:00:00`)
    if (Number.isNaN(dt.getTime())) {
      return
    }
    dt.setFullYear(dt.getFullYear() + 1)
    const next = dt.toISOString().slice(0, 10)
    setDataFine(next)
  }, [dataInizio, dataFineManual])

  const handleDataFineChange = (value) => {
    const raw = String(value || '').trim()
    setDataFine(raw)
    setDataFineManual(raw !== '')
  }

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setSelIva('')
    setModalPrice(0)
  }

  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgModalOptions([])
    setPkgPreview([])
    setPkgOnlyActive(true)
  }

  const normalizeLines = (rows) => {
    const out = []
    rows.forEach((row) => {
      const idProd = Number(row.id_prodotto)
      if (!idProd || Number.isNaN(idProd)) return

      out.push({
        tipo_item: 'prodotto',
        id_prodotto: idProd,
        combo_key: row.combo_key ? String(row.combo_key) : null,
        descrizione: row.descrizione || null,
        prezzo_unitario: Number(row.prezzo_unitario) || 0,
        iva: row.iva !== '' && row.iva != null ? Number(row.iva) : null,
        id_sdi_natura_iva:
          row.id_sdi_natura_iva != null && row.id_sdi_natura_iva !== ''
            ? Number(row.id_sdi_natura_iva)
            : null,
        sconto_base: Number(row.sconto_base) || 0,
        sconti: (row.sconti || []).map((t) => ({
          quantita_min: Number(t.quantita_min) || 0,
          quantita_max: t.quantita_max !== '' && t.quantita_max != null ? Number(t.quantita_max) : null,
          sconto: Number(t.sconto) || 0,
        })),
      })
    })
    return out
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    const payload = {
      id_contratto: id,
      id_anagrafica: Number(idAnagrafica),
      codice: codice || null,
      titolo,
      testo_legale: testoLegale || null,
      data_inizio: dataInizio,
      data_fine: dataFine || null,
      rinnovo_automatico: rinnovoAutomatico ? 1 : 0,
      attivo: attivo ? 1 : 0,
      righe: normalizeLines(righe),
    }

    try {
      await saveContratto({ token, body: payload })
      setSaveSuccess('Contratto salvato.')
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Confermi l\'eliminazione definitiva del contratto?')) return
    setDeleting(true)
    try {
      await deleteContratto({ token, id })
      navigate('/contratti/lista')
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSaveError(err)
    } finally {
      setDeleting(false)
    }
  }

  const productsMap = useMemo(() => {
    const map = new Map()
    prodOptions.forEach((p) => map.set(Number(p.id_prodotto), p))
    return map
  }, [prodOptions])

  const uiDisabled = !editable || saving
  const isFinalCode = useCallback((code) => {
    const s = String(code || '').toLowerCase()
    return s === 'confermato' || s === 'rifiutato' || s === 'annullato'
  }, [])
  const visualStatusSteps = useMemo(() => ['Bozza', 'Inviato', 'Finale'], [])
  const activeVisualStatusStep = useMemo(() => {
    const code = String(currentStatus?.code || '').toLowerCase()
    if (code === 'bozza') return 1
    if (code === 'inviato') return 2
    if (isFinalCode(code)) return 3
    return 1
  }, [currentStatus, isFinalCode])
  const finalStatusOptions = useMemo(() => {
    const all = Array.isArray(statusOptions) ? statusOptions : []
    return all.filter((s) => {
      const c = String(s?.code || '').toLowerCase()
      return c && c !== 'bozza' && c !== 'inviato'
    })
  }, [statusOptions])
  const currentStatusLabel = currentStatus?.label ?? currentStatus?.code ?? '-'
  const revisionDetail = revisionModalData?.payload?.detail ?? null
  const revisionHeader = revisionDetail?.contratto ?? {}
  const revisionLines = Array.isArray(revisionDetail?.righe) ? revisionDetail.righe : []


  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody>
          <CAlert color="danger">{error.message || 'Contratto non trovato.'}</CAlert>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/contratti/lista')}>
            Torna alla lista
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Contratti - Dettagli</h5>
        <div className="d-flex gap-2">
          <CButton color="primary" variant="outline" onClick={handleOpenEmailModal} disabled={!token || loading}>
            <CIcon icon={cilEnvelopeClosed} className="me-2" /> Invia email
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/contratti/lista')}>
            <CIcon icon={cilArrowLeft} className="me-2" /> Lista contratti
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {saveError && (
          <CAlert color="danger">{saveError.message || 'Errore durante il salvataggio.'}</CAlert>
        )}
        {saveSuccess && (
          <CAlert color="success">{saveSuccess}</CAlert>
        )}
        {statusError && (
          <CAlert color="danger">{statusError.message || 'Errore durante l\'aggiornamento dello stato.'}</CAlert>
        )}
        {statusSuccess && (
          <CAlert color="success">{statusSuccess}</CAlert>
        )}
        {!editable && (
          <CAlert color="warning">
            Il contratto non è in stato bozza. La modifica è disabilitata.
          </CAlert>
        )}
        <CForm onSubmit={handleSubmit}>
          <section className="mb-4">
            {visualStatusSteps.length > 0 && (
              <div className="px-2 px-lg-3 py-3 border rounded bg-body-tertiary">
                <div className="d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3">
                  <div className="flex-grow-1 w-100">
                    <CStepper
                      className="w-100"
                      activeStepNumber={activeVisualStatusStep}
                      steps={visualStatusSteps}
                      linear={false}
                      validation={false}
                      onStepChange={(n) => {
                        const step = Number(n)
                        if (statusUpdating) return
                        if (step === activeVisualStatusStep) return
                        let nextCode = null
                        if (step === 1) nextCode = 'bozza'
                        if (step === 2) nextCode = 'inviato'
                        if (!nextCode) return
                        const currCode = String(currentStatus?.code || '').toLowerCase()
                        if (currCode === nextCode) return
                        handleStatusChange(nextCode)
                      }}
                    />
                  </div>
                  <div className="w-100 w-lg-auto align-self-center" style={{ minWidth: '220px', maxWidth: '320px' }}>
                    <CFormLabel className="small text-body-secondary">Stato finale</CFormLabel>
                    <CFormSelect
                      size="sm"
                      value={isFinalCode(currentStatus?.code) ? currentStatus.code : ''}
                      onChange={(e) => {
                        const next = e.target.value
                        if (!next) return
                        handleStatusChange(next)
                      }}
                      disabled={statusUpdating || finalStatusOptions.length === 0}
                    >
                      <option value="">Seleziona...</option>
                      {finalStatusOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>{opt.label ?? opt.code}</option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>
                <div className="mt-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">
                  <div>
                    <small className="text-body-secondary">
                      Stato attuale: <span className="fw-semibold">{currentStatusLabel}</span>
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {statusUpdating && <CSpinner size="sm" />}
                    <small className="text-body-secondary">Seleziona uno step per aggiornare manualmente lo stato.</small>
                  </div>
                </div>
              </div>
            )}
          </section>
          <fieldset disabled={uiDisabled}>
            <section className="mb-4">
            <CRow className="g-3">
              <CCol md={8}>
                <CFormLabel>Cliente</CFormLabel>
                <AnagraficaAutocomplete
                  items={anagraficaOptions}
                  value={idAnagrafica}
                  loading={anagraficaLoading}
                  disabled={uiDisabled}
                  onSearch={(q) => {
                    loadAnagrafiche(q)
                  }}
                  onChange={(value) => setIdAnagrafica(value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Codice</CFormLabel>
                <CFormInput value={codice} onChange={(e) => setCodice(e.target.value)} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Titolo</CFormLabel>
                <CFormInput required value={titolo} onChange={(e) => setTitolo(e.target.value)} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data inizio</CFormLabel>
                <CFormInput
                  type="date"
                  required
                  value={dataInizio}
                  onChange={(e) => syncDataFine(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Data fine</CFormLabel>
                <CFormInput
                  type="date"
                  value={dataFine}
                  onChange={(e) => handleDataFineChange(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormCheck
                  id="rinnovoAutomatico"
                  label="Rinnovo automatico"
                  checked={rinnovoAutomatico}
                  onChange={(e) => setRinnovoAutomatico(e.target.checked)}
                />
              </CCol>
              <CCol md={3}>
                <CFormCheck
                  id="attivo"
                  label="Attivo"
                  checked={attivo}
                  onChange={(e) => setAttivo(e.target.checked)}
                />
              </CCol>
            </CRow>
            </section>

            <section className="mb-4">
            <CFormLabel>Testo legale</CFormLabel>
            <HtmlEditor
              value={testoLegale}
              onChange={setTestoLegale}
              placeholder="Testo legale del contratto"
              minHeight={220}
              disabled={uiDisabled}
            />
            </section>

            <section className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 text-body-secondary">Righe contratto</h6>
              <div className="d-flex gap-2">
                <CButton color="secondary" variant="outline" size="sm" onClick={handleAddLine} type="button">
                  <CIcon icon={cilPlus} className="me-2" /> Aggiungi riga
                </CButton>
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => { resetProductModal(); setStepperOpen(true) }}
                  type="button"
                >
                  Selettore prodotti
                </CButton>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => { resetPkgModal(); setPkgOpen(true) }}
                  type="button"
                >
                  Inserisci righe pacchetto
                </CButton>
              </div>
            </div>
            <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Seleziona pacchetto</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CRow className="g-3 mb-3 align-items-end">
                  <CCol md={7}>
                    <CFormLabel>Ricerca</CFormLabel>
                    <CFormInput
                      placeholder="Nome o codice pacchetto"
                      value={pkgSearch}
                      onChange={(e) => setPkgSearch(e.target.value)}
                    />
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Pacchetto</CFormLabel>
                    <CFormSelect value={selPacchetto} onChange={(e) => setSelPacchetto(e.target.value)}>
                      <option value="">Seleziona.</option>
                      {pkgModalOptions.map((p) => (
                        <option key={p.id_pacchetto} value={p.id_pacchetto}>
                          {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={12}>
                    <div className="form-check mt-2">
                      <input
                        id="pkgOnlyActive"
                        type="checkbox"
                        className="form-check-input"
                        checked={pkgOnlyActive}
                        onChange={(e) => setPkgOnlyActive(e.target.checked)}
                      />
                      <label htmlFor="pkgOnlyActive" className="form-check-label">Solo attivi</label>
                    </div>
                  </CCol>
                </CRow>
                {pkgPreview.length > 0 && (
                  <div className="border rounded p-2">
                    <div className="fw-semibold mb-2">Righe del pacchetto</div>
                    <CTable data-testid="table" compact hover responsive>
                      <CTableHead className="mp-table-head">
                        <CTableRow>
                          <CTableHeaderCell>Descrizione</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Q.ta</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Sconto %</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pkgPreview.map((r, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{r.descrizione}</CTableDataCell>
                            <CTableDataCell className="text-end">{Number(r.quantita) || 1}</CTableDataCell>
                            <CTableDataCell className="text-end">{(Number(r.prezzo_unitario) || 0).toFixed(2)}</CTableDataCell>
                            <CTableDataCell className="text-end">{r.iva ?? '-'}</CTableDataCell>
                            <CTableDataCell className="text-end">{r.sconto ?? 0}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div />
                <div className="d-flex gap-2">
                  <CButton color="link" onClick={() => setPkgOpen(false)}>Annulla</CButton>
                  <CButton
                    color="primary"
                    disabled={!selPacchetto || pkgPreview.length === 0}
                    onClick={() => {
                      if (!selPacchetto || pkgPreview.length === 0) return
                      const newLines = pkgPreview
                        .map((r) => {
                          const idProd = Number(r.id_prodotto) || 0
                          if (idProd <= 0) return null
                          return {
                            id_prodotto: idProd,
                            combo_key: '',
                            descrizione: r.descrizione ?? '',
                            prezzo_unitario: Number(r.prezzo_unitario) || 0,
                            iva: r.iva != null ? Number(r.iva) : 22,
                            id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                            sconto_base: r.sconto != null ? Number(r.sconto) : 0,
                            sconti: [],
                          }
                        })
                        .filter(Boolean)
                      if (newLines.length === 0) return
                      setRighe((rows) => rows.concat(newLines))
                      setPkgOpen(false)
                    }}
                  >
                    Inserisci righe pacchetto
                  </CButton>
                </div>
              </CModalFooter>
            </CModal>

            <CModal visible={stepperOpen} onClose={() => setStepperOpen(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>Selettore prodotti</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CStepper
                  activeStepNumber={prodStep}
                  steps={['Categoria', 'Prodotto', 'Variazioni', 'Riepilogo']}
                  linear={false}
                  validation={false}
                  onStepChange={(n) => {
                    if (Number(n) === prodStep) return
                    if (n <= prodStep) {
                      setProdStep(n)
                      return
                    }
                    if (n === 2) {
                      setProdStep(2)
                      return
                    }
                    if (n === 3) {
                      if (!selProd) return
                      if (Array.isArray(prodComboList) && prodComboList.length > 0) {
                        setProdStep(3)
                      } else {
                        setProdStep(4)
                      }
                      return
                    }
                    if (n === 4) {
                      if (!selProd) return
                      setProdStep(4)
                    }
                  }}
                />
                {prodStep === 1 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CFormLabel>Categoria prodotto</CFormLabel>
                      <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)}>
                        <option value="">Tutte</option>
                        {catOptions.map((c) => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                )}
                {prodStep === 2 && (
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel>Prodotto</CFormLabel>
                      <CFormSelect
                        value={selProd}
                        onChange={(e) => {
                          const pid = e.target.value
                          setSelProd(pid)
                          const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(pid))
                          if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                        }}
                      >
                        <option value="">Seleziona...</option>
                        {stepperProdOptions.map((p) => (
                          <option key={p.id_prodotto} value={p.id_prodotto}>
                            {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Ricerca</CFormLabel>
                      <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                    </CCol>
                  </CRow>
                )}
                {prodStep === 3 && (
                  <CRow className="g-3">
                    {prodComboList.length > 0 ? (
                      <CCol md={12}>
                        <CFormLabel>Combinazioni</CFormLabel>
                        <CFormSelect
                          value={selectedComboKey}
                          onChange={(e) => {
                            const key = e.target.value
                            setSelectedComboKey(key)
                            const opt = prodComboList.find((r) => String(r.combo_key) === String(key))
                            if (!opt) { setSelectedVarIds([]); return }
                            const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                            setSelectedVarIds(ids)
                          }}
                          disabled={prodComboList.length === 0}
                        >
                          <option value="">Seleziona una combinazione.</option>
                          {prodComboList.map((r, idx) => {
                            const ids = Array.isArray(r.var_ids) ? r.var_ids : String(r.combo_key).split('+').map((x) => Number(x) || 0)
                            const groups = {}
                            ids.forEach((idv) => {
                              const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                              const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                              const nm = vv ? String(vv.nome) : String(idv)
                              if (!groups[cat]) groups[cat] = []
                              groups[cat].push(nm)
                            })
                            const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                            return (
                              <option key={r.combo_key || idx} value={r.combo_key}>
                                {label || r.combo_key}
                              </option>
                            )
                          })}
                        </CFormSelect>
                      </CCol>
                    ) : (
                      <CCol md={12}>
                        <CAlert color="info" className="mb-0">Nessuna variazione combinata definita per il prodotto selezionato.</CAlert>
                      </CCol>
                    )}
                  </CRow>
                )}
                {prodStep === 4 && (
                  <CRow className="g-3">
                    <CCol md={12}>
                      <div className="mb-2">
                        <strong>Prodotto:</strong> {(() => {
                          const p = stepperProdOptions.find((x) => String(x.id_prodotto) === String(selProd))
                          return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-'
                        })()}
                      </div>
                      {(() => {
                        const ids = selectedComboKey
                          ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        if (!ids || ids.length === 0) return null
                        const groups = {}
                        ids.forEach((idv) => {
                          const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                          const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                          const nm = vv ? String(vv.nome) : String(idv)
                          if (!groups[cat]) groups[cat] = []
                          groups[cat].push(nm)
                        })
                        const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                        return (<div className="mb-2"><strong>Variazioni:</strong> {label}</div>)
                      })()}
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} />
                    </CCol>
                  </CRow>
                )}
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <div>
                  {prodStep > 1 && (
                    <CButton color="secondary" variant="outline" onClick={() => setProdStep((s) => Math.max(1, s - 1))}>Indietro</CButton>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <CButton color="link" onClick={() => setStepperOpen(false)}>Annulla</CButton>
                  {prodStep < 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        if (prodStep === 1) { setProdStep(2); return }
                        if (prodStep === 2) {
                          if (!selProd) return
                          if (prodComboList.length === 0) { setProdStep(4); return }
                          setProdStep(3); return
                        }
                        if (prodStep === 3) { setProdStep(4); return }
                      }}
                      disabled={prodStep === 2 && !selProd}
                    >
                      Avanti
                    </CButton>
                  )}
                  {prodStep === 4 && (
                    <CButton
                      color="primary"
                      onClick={() => {
                        const prod = stepperProdOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        if (!prod) return
                        const ivaPerc = Number(selIva || prod.iva_percento || 22)
                        const comboIds = selectedComboKey
                          ? selectedComboKey.split('+').map((x) => Number(x) || 0).filter((n) => n > 0)
                          : selectedVarIds
                        let descr = prod.nome
                        if (comboIds && comboIds.length > 0) {
                          const groups = {}
                          comboIds.forEach((idv) => {
                            const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                            const cat = (vv && vv.categoria) ? String(vv.categoria) : 'Altro'
                            const nm = vv ? String(vv.nome) : String(idv)
                            if (!groups[cat]) groups[cat] = []
                            groups[cat].push(nm)
                          })
                          const label = Object.entries(groups).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join(' ; ')
                          descr = `${prod.nome} - ${label}`
                        }
                        const comboKey = Array.isArray(comboIds) && comboIds.length > 0
                          ? comboIds.map((idv) => Number(idv) || 0).filter((n) => n > 0).sort((a, b) => a - b).join('+')
                          : ''
                        const riga = {
                          id_prodotto: prod.id_prodotto,
                          combo_key: comboKey || null,
                          descrizione: descr,
                          prezzo_unitario: modalPrice,
                          iva: ivaPerc,
                          id_sdi_natura_iva: null,
                          sconto_base: 0,
                          sconti: [],
                        }
                        if (ivaPerc === 0) {
                          const natId = Number(prod.id_sdi_natura_iva) || 0
                          if (natId > 0) {
                            riga.id_sdi_natura_iva = natId
                          } else {
                            const nat = naturaOptions[0]
                            if (nat) riga.id_sdi_natura_iva = nat.id_natura
                          }
                        }
                        setRighe((rows) => rows.concat(riga))
                        setStepperOpen(false)
                      }}
                    >
                      Inserisci riga
                    </CButton>
                  )}
                </div>
              </CModalFooter>
            </CModal>
            <CTable data-testid="table" hover responsive>
              <CTableHead className="mp-table-head">
                <CTableRow className="align-middle">
                  <CTableHeaderCell>Prodotto</CTableHeaderCell>
                  <CTableHeaderCell>Descrizione</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 140 }}>Prezzo</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>IVA %</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 200 }}>Natura IVA</CTableHeaderCell>
                  <CTableHeaderCell className="text-end" style={{ width: 120 }}>Sconto %</CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: 80 }}>Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {righe.map((row, idx) => {
                  const requireNatura = Number(row.iva) === 0
                  return (
                    <React.Fragment key={`line-${idx}`}>
                      <CTableRow className="align-middle">
                        <CTableDataCell>
                          <CFormSelect
                            value={row.id_prodotto}
                            onChange={(e) => {
                              const idValue = e.target.value
                            const item = productsMap.get(Number(idValue))
                            updateLine(idx, {
                              id_prodotto: idValue,
                              combo_key: '',
                              descrizione: row.descrizione || item?.nome || '',
                            })
                          }}
                        >
                            <option value="">Seleziona prodotto</option>
                            {prodOptions.map((p) => (
                              <option key={p.id_prodotto} value={p.id_prodotto}>
                                {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                              </option>
                            ))}
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={row.descrizione}
                            onChange={(e) => updateLine(idx, { descrizione: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.prezzo_unitario}
                            onChange={(e) => updateLine(idx, { prezzo_unitario: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.iva}
                            onChange={(e) => updateLine(idx, { iva: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            value={row.id_sdi_natura_iva ?? ''}
                            disabled={!requireNatura}
                            onChange={(e) =>
                              updateLine(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })
                            }
                          >
                            <option value="">--</option>
                            {naturaOptions.map((n) => (
                              <option key={n.id_natura} value={n.id_natura}>
                                {n.code} - {n.label}
                              </option>
                            ))}
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CFormInput
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.sconto_base}
                            onChange={(e) => updateLine(idx, { sconto_base: e.target.value })}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton color="link" size="sm" onClick={() => handleRemoveLine(idx)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    </React.Fragment>
                  )
                })}
              </CTableBody>
            </CTable>
            </section>

            <div className="d-flex gap-2">
              <PermissionButton color="primary" type="submit" disabled={uiDisabled} permission="contr.write">
                {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
                Salva
              </PermissionButton>
            </div>
          </fieldset>
        <div className="d-flex gap-2 mt-2">
          <PermissionButton
            color="danger"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            permission="contr.delete"
          >
            {deleting ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilTrash} className="me-2" />}
            Elimina
          </PermissionButton>
        </div>
      </CForm>

      <section className="mt-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div>
            <h6 className="mb-1 text-body-secondary">PDF firmati</h6>
            <div className="small text-body-secondary">Carica una copia firmata del contratto.</div>
          </div>
        </div>
        {fileUploadError && (
          <CAlert color="danger">
            {fileUploadError?.payload?.message || fileUploadError.message || 'Impossibile caricare il file.'}
          </CAlert>
        )}
        {fileUploadSuccess && <CAlert color="success">{fileUploadSuccess}</CAlert>}
        {fileDownloadError && (
          <CAlert color="danger">
            {fileDownloadError?.payload?.message || fileDownloadError.message || 'Impossibile scaricare il file.'}
          </CAlert>
        )}
        {fileDeleteError && (
          <CAlert color="danger">
            {fileDeleteError?.payload?.message || fileDeleteError.message || 'Impossibile eliminare il file dal database.'}
          </CAlert>
        )}
        <CForm onSubmit={handleFileUpload} className="mb-3">
          <CRow className="g-3 align-items-end">
            <CCol xs={12} md={8}>
              <CFormLabel htmlFor="contratto-file">File PDF firmato</CFormLabel>
              <CFormInput
                id="contratto-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                disabled={!canUploadContrattoFiles || fileUploading}
              />
              <div className="form-text">Solo PDF firmati. Trascina o seleziona il file.</div>
              {fileForm.file && (
                <div className="small text-body-secondary mt-1">Selezionato: {fileForm.file.name}</div>
              )}
            </CCol>
            <CCol xs="auto">
              <PermissionButton
                color="primary"
                type="submit"
                permission="contr.write"
                disabled={!canUploadContrattoFiles || fileUploading || !fileForm.file}
              >
                {fileUploading ? (
                  <>
                    <CSpinner size="sm" className="me-2" /> Caricamento...
                  </>
                ) : (
                  'Carica file'
                )}
              </PermissionButton>
            </CCol>
          </CRow>
        </CForm>
        {filesError && (
          <CAlert color="danger">
            {filesError?.message || 'Impossibile caricare i file firmati.'}
          </CAlert>
        )}
        {filesLoading ? (
          <div className="text-center py-3">
            <CSpinner />
          </div>
        ) : files.length === 0 ? (
          <div className="small text-body-secondary">Nessun file caricato.</div>
        ) : (
          <CTable data-testid="table" hover responsive small>
            <CTableHead className="mp-table-head">
              <CTableRow>
                <CTableHeaderCell>File</CTableHeaderCell>
                <CTableHeaderCell>Dimensione</CTableHeaderCell>
                <CTableHeaderCell>Data</CTableHeaderCell>
                <CTableHeaderCell>Caricato da</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {files.map((file) => (
                <CTableRow key={file.id_file}>
                  <CTableDataCell>{file.original_name || file.file_name || 'Documento'}</CTableDataCell>
                  <CTableDataCell>{formatFileSize(file.size_bytes)}</CTableDataCell>
                  <CTableDataCell>{formatDateTime(file.created_at)}</CTableDataCell>
                  <CTableDataCell>{file.username || '-'}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <PermissionButton
                      color="link"
                      size="sm"
                      permission="contr.read"
                      onClick={() => handleFileDownload(file)}
                      aria-label="Scarica file firmato"
                    >
                      <CIcon icon={cilCloudDownload} />
                    </PermissionButton>
                    <PermissionButton
                      color="link"
                      size="sm"
                      className="ms-2 text-danger"
                      permission="contr.write"
                      onClick={() => handleFileDelete(file)}
                      disabled={fileDeletingId === file.id_file}
                      aria-label="Elimina dal database"
                    >
                      {fileDeletingId === file.id_file ? (
                        <CSpinner size="sm" className="me-1" />
                      ) : (
                        <CIcon icon={cilTrash} />
                      )}
                    </PermissionButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </section>

      <section className="mt-4">
        <h6 className="mb-3 text-body-secondary">Revisioni</h6>
          {revisions.length === 0 ? (
            <div className="small text-body-secondary">Nessuna revisione registrata.</div>
          ) : (
            <CTable data-testid="table" hover responsive>
              <CTableHead className="mp-table-head">
                <CTableRow>
                  <CTableHeaderCell>Revisione</CTableHeaderCell>
                  <CTableHeaderCell>Nota</CTableHeaderCell>
                  <CTableHeaderCell>Data</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Azioni</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {revisions.map((rev) => (
                  <CTableRow key={rev.id_revisione}>
                    <CTableDataCell>{rev.label || `Rev.${rev.numero_revision}`}</CTableDataCell>
                    <CTableDataCell>{rev.note || '-'}</CTableDataCell>
                    <CTableDataCell>{formatDateTime(rev.created_at)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      <PermissionButton
                        color="link"
                        size="sm"
                        onClick={() => handleOpenRevisionDetail(rev.id_revisione)}
                        permission="contr.read"
                      >
                        Dettaglio
                      </PermissionButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </section>

        <CModal visible={revisionModalVisible} onClose={handleCloseRevisionModal} size="lg" backdrop="static">
          <CModalHeader>
            <CModalTitle>Dettaglio revisione</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {revisionModalLoading && (
              <div className="text-center py-4">
                <CSpinner />
              </div>
            )}
            {!revisionModalLoading && revisionModalError && (
              <CAlert color="danger">
                {revisionModalError.message || 'Impossibile caricare il dettaglio della revisione.'}
              </CAlert>
            )}
            {!revisionModalLoading && !revisionModalError && revisionModalData && (
              <>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="fw-semibold">
                      Revisione {revisionModalData.label || `Rev.${revisionModalData.numero_revision ?? '-'}`}
                    </div>
                    <div className="text-body-secondary small">
                      {formatDateTime(revisionModalData.created_at)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="small text-body-secondary">Operatore</div>
                    <div className="fw-semibold">{revisionModalData.operatore || '-'}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="small text-body-secondary">Nota</div>
                  <div>{revisionModalData.note || '-'}</div>
                </div>
                {revisionHeader && (
                  <div className="mb-3">
                    <div className="small text-body-secondary">Contratto</div>
                    <div className="fw-semibold">{revisionHeader.titolo || '-'}</div>
                    <div className="text-body-secondary">
                      {revisionHeader.ragione_sociale || '-'}
                    </div>
                    <div className="text-body-secondary">
                      {revisionHeader.data_inizio || '-'} {revisionHeader.data_fine ? `→ ${revisionHeader.data_fine}` : ''}
                    </div>
                  </div>
                )}
                <div className="small text-body-secondary mb-2">Righe revisione</div>
                {revisionLines.length === 0 ? (
                  <div className="small text-body-secondary">Nessuna riga salvata.</div>
                ) : (
                  <CTable data-testid="table" small responsive>
                    <CTableHead className="mp-table-head">
                      <CTableRow>
                        <CTableHeaderCell>Descrizione</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Prezzo</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">IVA %</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Sconto %</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {revisionLines.map((line, idx) => (
                        <CTableRow key={`rev-line-${idx}`}>
                          <CTableDataCell>{line.descrizione || '-'}</CTableDataCell>
                          <CTableDataCell className="text-end">{line.prezzo_unitario ?? '-'}</CTableDataCell>
                          <CTableDataCell className="text-end">{line.iva ?? '-'}</CTableDataCell>
                          <CTableDataCell className="text-end">{line.sconto_base ?? '-'}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={handleCloseRevisionModal}>
              Chiudi
            </CButton>
          </CModalFooter>
        </CModal>

        <CModal visible={emailModalVisible} onClose={handleCloseEmailModal} size="lg" backdrop="static">
          <CModalHeader>
            <CModalTitle>Invia contratto via email</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {emailError && (
              <CAlert color="danger">
                {emailError?.payload?.message || emailError.message || 'Invio email non riuscito.'}
              </CAlert>
            )}
            {emailSuccess && <CAlert color="success">{emailSuccess}</CAlert>}
            <div className="mb-3">
              <CFormLabel>Destinatari</CFormLabel>
              <CFormInput
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="es. referente@cliente.it"
                disabled={emailSending}
              />
              <div className="form-text">Separare piu' email con virgola o punto e virgola.</div>
            </div>
            <div className="mb-3">
              <CFormLabel>CC (opzionale)</CFormLabel>
              <CFormInput
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="es. collega@azienda.it"
                disabled={emailSending}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Oggetto</CFormLabel>
              <CFormInput
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={emailSending}
              />
            </div>
            <div className="mb-0">
              <CFormLabel>Messaggio</CFormLabel>
              <HtmlEditor
                value={emailBody}
                onChange={setEmailBody}
                disabled={emailSending}
                placeholder="Scrivi il testo dell'email..."
                minHeight={260}
              />
              <div className="form-text">Il testo verra' inviato come corpo HTML del messaggio.</div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={handleCloseEmailModal} disabled={emailSending}>
              Annulla
            </CButton>
            <CButton color="primary" onClick={handleSendContrattoEmail} disabled={emailSending}>
              {emailSending ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Invio...
                </>
              ) : (
                <>
                  <CIcon icon={cilEnvelopeClosed} className="me-2" />
                  Invia email
                </>
              )}
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default ContrattiDetail



