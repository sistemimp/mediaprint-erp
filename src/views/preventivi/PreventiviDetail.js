/* eslint-disable prettier/prettier */
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
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { CStepper } from '@coreui/react-pro'
import AnagraficaAutocomplete from '../../components/AnagraficaAutocomplete'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilSave } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { fetchAnagrafiche, fetchAnagraficaDetail } from '../../services/anagrafiche'
import { createPreventivo, fetchPreventivoDetail, updatePreventivoStatus, logPreventivoStatusChange, fetchPreventivoStatusLog, fetchPreventivoOggettiOptions, createPreventivoOggettoOption } from '../../services/preventivi'
import { CMultiSelect } from '@coreui/react-pro'
import {
  fetchCategorieProdotti,
  fetchProdotti,
  fetchNatureIva,
  fetchProdottoVariazioni,
  fetchProdottoPrezziCombinati,
  fetchProdottoDetail,
} from '../../services/prodotti'
import { fetchPacchetti, fetchPacchettoDetail } from '../../services/pacchetti'

const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? currencyFormatter.format(n) : '-'
}

const useQuery = () => new URLSearchParams(useLocation().search)

const PreventiviDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = useQuery()
  const id = Number(query.get('id') || 0)
  const { token, logout, user } = useAuth()
  const prefill = location.state?.prefill ?? null
  const prefillAppliedRef = useRef(false)

  // Se non viene passato un ID valido, reindirizza alla lista
  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate('/preventivi/lista', { replace: true })
    }
  }, [id, navigate])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editable, setEditable] = useState(false)
  const [header, setHeader] = useState({ anno: null, numero: null, stato: null })
  const [statusOptions, setStatusOptions] = useState([])
  const [currentStatus, setCurrentStatus] = useState({ code: null, label: null })
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const [statusSuccess, setStatusSuccess] = useState(null)
  const [statusLog, setStatusLog] = useState([])
  const [statusLogLoading, setStatusLogLoading] = useState(false)
  const [statusLogError, setStatusLogError] = useState(null)
  const [statusTab, setStatusTab] = useState('timeline')

  // Dati generali
  const [clienteSearch, setClienteSearch] = useState('')
  const [loadingClienti, setLoadingClienti] = useState(false)
  const [allClientiOptions, setAllClientiOptions] = useState([])
  const [idAnagrafica, setIdAnagrafica] = useState('')
  const [clienteDisplay, setClienteDisplay] = useState({
    id: null,
    label: '',
    codiceCliente: null,
    piva: null,
    codiceFiscale: null,
  })
  const [dataPreventivo, setDataPreventivo] = useState('')
  const [note, setNote] = useState('')
  const [oggetto, setOggetto] = useState('')
  const [oggettiOptions, setOggettiOptions] = useState([])
  const [selectedOggetti, setSelectedOggetti] = useState([])
  const [rifCliente, setRifCliente] = useState('')
  // CIG / Determine
  const [cigList, setCigList] = useState([])
  const [newCig, setNewCig] = useState({ cig: '', data_cig: '', motivazione: '' })
  const [determineList, setDetermineList] = useState([])
  const [newDetermina, setNewDetermina] = useState({ determina: '', data_determina: '', motivazione: '' })

  // Righe
  const [righe, setRighe] = useState([])
  // Mappa id_prodotto -> nome categoria per raggruppamento righe
  const [prodCategoryMap, setProdCategoryMap] = useState({})

  // Stepper prodotti
  const [stepperOpen, setStepperOpen] = useState(false)
  const [prodStep, setProdStep] = useState(1)
  const [catOptions, setCatOptions] = useState([])
  const [prodOptions, setProdOptions] = useState([])
  const [naturaOptions, setNaturaOptions] = useState([])
  const [selCat, setSelCat] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [selProd, setSelProd] = useState('')
  // Variazioni prodotto selezionato
  const [prodVarOptions, setProdVarOptions] = useState([])
  const [selectedVarIds, setSelectedVarIds] = useState([])
  const [selectedComboKey, setSelectedComboKey] = useState('')
  const [prodComboMap, setProdComboMap] = useState({})
  const [prodComboList, setProdComboList] = useState([])
  const [selIva, setSelIva] = useState('')
  const [modalQty, setModalQty] = useState(1)
  const [modalPrice, setModalPrice] = useState(0)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [anagraficaDisabled, setAnagraficaDisabled] = useState(false)
  // Pacchetti (modal selezione)
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgOptions, setPkgOptions] = useState([])
  const [selPacchetto, setSelPacchetto] = useState('')
  const [pkgPreview, setPkgPreview] = useState([])
  const [pkgOnlyActive, setPkgOnlyActive] = useState(true)

  useEffect(() => {
    const currentId = Number(idAnagrafica || clienteDisplay.id || 0)
    if (!currentId) return
    const existing = allClientiOptions.find(
      (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === currentId,
    )
    if (!existing) return
    const nextLabel = existing.ragione_sociale ?? existing.ragioneSociale ?? ''
    const nextCodice = existing.codice_cliente ?? null
    const nextPiva = existing.piva ?? null
    const nextCf = existing.codice_fiscale ?? null
    setClienteDisplay((prev) => {
      if (
        prev.id === currentId &&
        prev.label === nextLabel &&
        prev.codiceCliente === nextCodice &&
        prev.piva === nextPiva &&
        prev.codiceFiscale === nextCf
      ) {
        return prev
      }
      return {
        id: currentId,
        label: nextLabel,
        codiceCliente: nextCodice,
        piva: nextPiva,
        codiceFiscale: nextCf,
      }
    })
  }, [allClientiOptions, idAnagrafica])

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) return

    if (prefill.id_anagrafica != null && prefill.id_anagrafica !== '') {
      setIdAnagrafica(String(prefill.id_anagrafica))
    }
    if (prefill.data_preventivo) {
      setDataPreventivo(prefill.data_preventivo)
    }
    if (prefill.note != null) {
      setNote(prefill.note)
    }
    if (prefill.oggetto != null) {
      setOggetto(prefill.oggetto)
    }
    if (Array.isArray(prefill.oggetti)) {
      setSelectedOggetti(prefill.oggetti.map((v) => String(v)))
    }
    
    if (prefill.riferimento_cliente != null) {
      setRifCliente(prefill.riferimento_cliente)
    }
    const label =
      prefill.cliente?.label ??
      prefill.clienteLabel ??
      null

    if (prefill.cliente && prefill.cliente.id) {
      setClienteDisplay((prev) => ({
        id: Number(prefill.cliente.id),
        label: prefill.cliente.label ?? label ?? prev.label ?? '',
        codiceCliente: prefill.cliente.codiceCliente ?? prev.codiceCliente,
        piva: prefill.cliente.piva ?? prev.piva,
        codiceFiscale: prefill.cliente.codiceFiscale ?? prev.codiceFiscale,
      }))
      setAllClientiOptions((prev) => {
        const exists = prev.some(
          (c) =>
            Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(prefill.cliente.id ?? 0),
        )
        if (exists) return prev
        return [
          {
            id_anagrafica: prefill.cliente.id,
            ragione_sociale: prefill.cliente.label ?? label ?? '--',
            codice_cliente: prefill.cliente.codiceCliente ?? null,
            piva: prefill.cliente.piva ?? null,
            codice_fiscale: prefill.cliente.codiceFiscale ?? null,
          },
          ...prev,
        ]
      })
    } else if (prefill.id_anagrafica && label) {
      setClienteDisplay((prev) => ({
        id: Number(prefill.id_anagrafica),
        label: label ?? prev.label ?? '',
        codiceCliente: prev.codiceCliente,
        piva: prev.piva,
        codiceFiscale: prev.codiceFiscale,
      }))
      setAllClientiOptions((prev) => {
        const exists = prev.some(
          (c) =>
            Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(prefill.id_anagrafica ?? 0),
        )
        if (exists) return prev
        return [
          {
            id_anagrafica: prefill.id_anagrafica,
            ragione_sociale: label,
            codice_cliente: null,
            piva: null,
            codice_fiscale: null,
          },
          ...prev,
        ]
      })
    }

    prefillAppliedRef.current = true
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [prefill, navigate, location.pathname, location.search])

  // Carica opzioni per multi-select Oggetto preventivo
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const opts = await fetchPreventivoOggettiOptions({ token, signal: controller.signal })
        setOggettiOptions(opts)
      } catch (_e) {
        setOggettiOptions([
          { value: 1, label: 'Stampa' },
          { value: 2, label: 'Imbustamento' },
          { value: 3, label: 'Cellophanatura' },
          { value: 4, label: 'Posta Digitale' },
        ])
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  // L'oggetto testuale è calcolato dal backend dalle etichette selezionate.

  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        setStatusError(null)
        setStatusSuccess(null)
        const { data, editable, righe: righeSrv, cig: cigSrv, determine: determineSrv, statuses, currentStatus: current } = await fetchPreventivoDetail({
          token,
          id,
          signal: controller.signal,
        })
        if (!data) throw new Error('Dettaglio non disponibile')
        setEditable(!!editable)
        setHeader({
          anno: data.anno_preventivo ?? null,
          numero: data.numero_documento ?? null,
          stato: data.stato_label ?? data.stato_code ?? null,
        })
        setStatusOptions(Array.isArray(statuses) ? statuses : [])
        if (current && (current.code || current.label)) {
          setCurrentStatus({
            code: current.code ?? null,
            label: current.label ?? data.stato_label ?? data.stato_code ?? null,
          })
        } else {
          setCurrentStatus({
            code: data.stato_code ?? null,
            label: data.stato_label ?? data.stato_code ?? null,
          })
        }
        if (data.id_anagrafica != null && data.id_anagrafica !== '') {
          setIdAnagrafica(String(data.id_anagrafica))
        }
        if (data.data_preventivo) {
          setDataPreventivo(data.data_preventivo)
        }
        if (data.note != null) {
          setNote(data.note)
        }
        const fetchedOggetto = data.oggetto ?? data.oggetto_preventivo ?? data.subject ?? null
        if (fetchedOggetto != null) {
          setOggetto(fetchedOggetto)
        }
        // Inizializza la multi-select "Oggetto preventivo" con i valori dal backend
        if (Array.isArray(data.oggetti)) {
          setSelectedOggetti(data.oggetti.map((v) => String(v)))
        }
        const fetchedRif =
          data.riferimento_cliente ?? data.riferimento ?? data.rif_cliente ?? null
        if (fetchedRif != null) {
          setRifCliente(fetchedRif)
        }
        if (data.id_anagrafica != null && data.id_anagrafica !== '') {
          const numericId = Number(data.id_anagrafica)
          const clienteLabel =
            data.cliente_ragione_sociale ??
            data.ragione_sociale ??
            null
          setClienteDisplay((prev) => ({
            id: Number.isFinite(numericId) && numericId > 0 ? numericId : prev.id,
            label: clienteLabel ?? prev.label ?? '',
            codiceCliente: data.cliente_codice_cliente ?? prev.codiceCliente ?? null,
            piva: data.cliente_piva ?? prev.piva ?? null,
            codiceFiscale: data.cliente_codice_fiscale ?? prev.codiceFiscale ?? null,
          }))
          setAllClientiOptions((prev) => {
            const list = Array.isArray(prev) ? prev : []
            if (!Number.isFinite(numericId) || numericId <= 0) {
              return list
            }
            const exists = list.some(
              (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === numericId,
            )
            if (exists) {
              return list
            }
            return [
              {
                id_anagrafica: numericId,
                ragione_sociale: clienteLabel ?? '--',
                codice_cliente: data.cliente_codice_cliente ?? null,
                piva: data.cliente_piva ?? null,
                codice_fiscale: data.cliente_codice_fiscale ?? null,
              },
              ...list,
            ]
          })
        }

        // Righe dal server -> mappa a forma UI (nessun fallback sintetico)
        if (Array.isArray(righeSrv)) {
          setRighe(

            righeSrv.map((r) => {
              const idCategoria =
                r.id_categoria ?? r.id_categoria_prodotto ?? r.id_categoria_prodotto_default ?? null
              const categoriaNome =
                r.categoria_nome ?? r.categoria ?? r.nome_categoria ?? r.nome_categoria_prodotto ?? null
              return {
                descrizione: r.descrizione ?? '',
                quantita: r.quantita ?? 1,
                prezzo: r.prezzo_unitario ?? 0,
                iva: r.iva ?? 22,
                sconto: r.sconto ?? 0,
                id_prodotto: r.id_prodotto ?? null,
                id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                id_categoria: idCategoria != null ? Number(idCategoria) : null,
                categoria_nome: categoriaNome != null ? String(categoriaNome) : undefined,
              }
            }),

          )
        } else {
          setRighe([])
        }
        // CIG / Determine dal server
        setCigList(Array.isArray(cigSrv) ? cigSrv.map((c) => ({
          id_cig: c.id_cig ?? undefined,
          cig: c.cig ?? '',
          data_cig: c.data_cig ?? '',
          motivazione: c.motivazione ?? '',
        })) : [])
        setDetermineList(Array.isArray(determineSrv) ? determineSrv.map((d) => ({
          id_determina: d.id_determina ?? undefined,
          determina: d.determina ?? '',
          data_determina: d.data_determina ?? '',
          motivazione: d.motivazione ?? '',
        })) : [])
      } catch (e) {
        if (e.name === 'AbortError') return
        if (e.status === 401 && logout) {
          logout()
          return
        }
        setLoadError(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token, id])

  // Carica storico cambi stato
  useEffect(() => {
    if (!token || !id) return
    const controller = new AbortController()
    const loadLog = async () => {
      setStatusLogLoading(true)
      setStatusLogError(null)
      try {
        const { items } = await fetchPreventivoStatusLog({ token, id, signal: controller.signal })
        const normalized = Array.isArray(items) ? items.slice() : []
        normalized.sort((a, b) => {
          const da = new Date(a?.at || a?.created_at || a?.timestamp || 0).getTime()
          const db = new Date(b?.at || b?.created_at || b?.timestamp || 0).getTime()
          return db - da
        })
        setStatusLog(normalized)
      } catch (e) {
        if (e?.name === 'AbortError') return
        setStatusLogError(e)
        setStatusLog([])
      } finally {
        setStatusLogLoading(false)
      }
    }
    loadLog()
    return () => controller.abort()
  }, [token, id])

  // Verifica se l'anagrafica associata Ã¨ disattiva per disabilitare attivitÃ 
  useEffect(() => {
    const run = async () => {
      try {
        const aid = Number(idAnagrafica)
        if (!token || !aid) {
          setAnagraficaDisabled(false)
          setClienteDisplay({
            id: null,
            label: '',
            codiceCliente: null,
            piva: null,
            codiceFiscale: null,
          })
          return
        }
        const det = await fetchAnagraficaDetail({ token, id: aid })
        const detailData = det?.anagrafica ?? det?.data ?? null
        if (detailData) {
          setClienteDisplay((prev) => ({
            id: Number(detailData.id_anagrafica ?? detailData.id ?? aid),
            label:
              detailData.ragione_sociale ??
              detailData.ragioneSociale ??
              prev.label ??
              '',
            codiceCliente: detailData.codice_cliente ?? prev.codiceCliente ?? null,
            piva: detailData.piva ?? detailData.partita_iva ?? prev.piva ?? null,
            codiceFiscale: detailData.codice_fiscale ?? prev.codiceFiscale ?? null,
          }))
        }
        const active =
          Number(det?.anagrafica?.is_active) === 1 &&
          String(det?.anagrafica?.stato || '').toLowerCase() === 'attiva'
        setAnagraficaDisabled(!active)
      } catch (_e) {
        setAnagraficaDisabled(false)
      }
    }
    run()
  }, [token, idAnagrafica])

  // Carica tutti i clienti una volta (come in Crea) e filtra in locale
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoadingClienti(true)
      try {
        const PAGE_SIZE = 100
        const first = await fetchAnagrafiche({
          token,
          signal: controller.signal,
          page: 1,
          pageSize: PAGE_SIZE,
          // no search: fetch all, filter locally
          sortBy: 'ragione_sociale',
          sortDirection: 'asc',
        })
        let allItems = Array.isArray(first.items) ? [...first.items] : []
        const totalPages = Math.max(first?.meta?.pages ?? first?.meta?.last_page ?? 1, 1)
        const perPage = first?.meta?.per_page ?? (allItems.length || PAGE_SIZE)
        if (totalPages > 1) {
          for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
            if (controller.signal.aborted) return
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
            })
            if (Array.isArray(pageItems) && pageItems.length > 0) {
              allItems = allItems.concat(pageItems)
            }
          }
        } else {
          // Fallback: continua se la prima pagina Ã¨ piena
          let nextPage = 2
          let safety = 0
          while (!controller.signal.aborted && allItems.length > 0 && allItems.length % perPage === 0 && safety < 100) {
            const { items: pageItems = [] } = await fetchAnagrafiche({
              token,
              signal: controller.signal,
              page: nextPage,
              pageSize: perPage,
              sortBy: 'ragione_sociale',
              sortDirection: 'asc',
            })
            if (!Array.isArray(pageItems) || pageItems.length === 0) break
            allItems = allItems.concat(pageItems)
            nextPage += 1
            safety += 1
            if (pageItems.length < perPage) break
          }
        }
        const mapById = new Map()
        for (const c of allItems) {
          const cid = c?.id_anagrafica ?? c?.id
          if (cid !== undefined && cid !== null && !mapById.has(cid)) {
            mapById.set(cid, c)
          }
        }
        const normalized = Array.from(mapById.values()).sort((a, b) => {
          const A = String(a?.ragione_sociale ?? '').toLowerCase()
          const B = String(b?.ragione_sociale ?? '').toLowerCase()
          return A.localeCompare(B)
        })
        setAllClientiOptions(normalized)
      } catch (e) {
        if (e.name === 'AbortError') return
        // Silenzia errori minori
        setAllClientiOptions([])
      } finally {
        setLoadingClienti(false)
      }
    }
    load()
    return () => controller.abort()
  }, [token])

  const clientiOptions = useMemo(() => {
    let list = Array.isArray(allClientiOptions) ? [...allClientiOptions] : []
    const currentId = clienteDisplay.id ?? (idAnagrafica ? Number(idAnagrafica) : null)
    if (
      currentId &&
      !list.some(
        (c) => Number(c?.id_anagrafica ?? c?.id ?? 0) === Number(currentId),
      )
    ) {
      list = [
        {
          id_anagrafica: currentId,
          ragione_sociale: clienteDisplay.label || '--',
          codice_cliente: clienteDisplay.codiceCliente ?? null,
          piva: clienteDisplay.piva ?? null,
          codice_fiscale: clienteDisplay.codiceFiscale ?? null,
        },
        ...list,
      ]
    }
    // Deduplica per id per evitare duplicati che possono confondere l'autocomplete
    const mapById = new Map()
    for (const c of list) {
      const cid = c?.id_anagrafica ?? c?.id
      if (cid == null) continue
      if (!mapById.has(cid)) mapById.set(cid, c)
    }
    list = Array.from(mapById.values())
    const q = (clienteSearch || '').trim().toLowerCase()
    if (q === '') return list
    const norm = (s) => String(s || '').toLowerCase()
    const qNoSep = q.replace(/[ .-]/g, '')
    return list.filter((c) => {
      const rs = norm(c.ragione_sociale)
      const piva = norm(c.piva).replace(/[ .-]/g, '')
      const cf = norm(c.codice_fiscale)
      const codice = norm(c.codice_cliente)
      return (
        rs.includes(q) ||
        piva.includes(qNoSep) ||
        cf.includes(q) ||
        (codice && codice.includes(q))
      )
    })
  }, [allClientiOptions, clienteSearch, clienteDisplay, idAnagrafica])

  // Opzioni giÃ  filtrate a monte; il componente si occupa solo del rendering/controllo

  // Carica categorie e nature IVA per stepper
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items: cats }, { items: nats }] = await Promise.all([
          fetchCategorieProdotti({ token, signal: controller.signal }),
          fetchNatureIva({ token, signal: controller.signal }),
        ])
        setCatOptions(cats)
        setNaturaOptions(nats)
      } catch (_e) { }
    }
    load()
    return () => controller.abort()
  }, [token])

  // Carica prodotti in base a categoria/ricerca
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const idcat = selCat ? Number(selCat) : undefined
        const { items } = await fetchProdotti({ token, id_categoria: idcat, q: prodSearch, signal: controller.signal })
        setProdOptions(items)
      } catch (_e) {
        setProdOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, selCat, prodSearch])

  // Risolve la categoria dei prodotti presenti nelle righe (per raggruppamento)
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const run = async () => {
      try {
        const ids = Array.from(new Set((Array.isArray(righe) ? righe : [])
          .map((r) => Number(r?.id_prodotto) || 0)
          .filter((n) => n > 0)))
        const missing = ids.filter((idp) => prodCategoryMap[idp] == null)
        if (missing.length === 0) return
        // Carica categorie se non presenti
        let cats = Array.isArray(catOptions) && catOptions.length > 0 ? catOptions : []
        if (cats.length === 0) {
          try {
            const { items } = await fetchCategorieProdotti({ token, signal: controller.signal })
            cats = Array.isArray(items) ? items : []
            if (cats.length > 0) setCatOptions(cats)
          } catch (_e) {
            cats = []
          }
        }
        const catNameById = {}
        cats.forEach((c) => { if (c?.id_categoria != null) catNameById[Number(c.id_categoria)] = String(c.nome || '') })
        const updates = {}
        for (const idp of missing) {
          try {
            const resp = await fetchProdottoDetail({ token, id_prodotto: idp, signal: controller.signal })
            const detail = resp?.item ?? resp?.data ?? resp ?? {}
            const idcat = Number(detail?.id_categoria) || 0
            const nameFromDetail = detail?.categoria_nome ?? detail?.categoria ?? detail?.nome_categoria
            const name =
              (nameFromDetail && String(nameFromDetail)) || (idcat && catNameById[idcat] ? catNameById[idcat] : 'Altro')
            updates[idp] = name || 'Altro'
          } catch (_e) {
            updates[idp] = 'Altro'
          }
        }
        if (Object.keys(updates).length > 0) {
          setProdCategoryMap((prev) => ({ ...prev, ...updates }))
        }
      } catch (_e) { }
    }
    run()
    return () => controller.abort()
  }, [token, righe, catOptions, prodCategoryMap])

  // Carica variazioni del prodotto selezionato + prezzi combinati
  useEffect(() => {
    setProdVarOptions([])
    setSelectedVarIds([])
    setSelectedComboKey('')
    setProdComboMap({})
    setProdComboList([])
    if (!token) return
    if (!selProd) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const [{ items }, combo] = await Promise.all([
          fetchProdottoVariazioni({ token, id_prodotto: Number(selProd), signal: controller.signal }),
          fetchProdottoPrezziCombinati({ token, id_prodotto: Number(selProd), signal: controller.signal }),
        ])
        const sorted = Array.isArray(items)
          ? [...items].sort((a, b) => String(a?.codice || '').localeCompare(String(b?.codice || '')) || String(a?.nome || '').localeCompare(String(b?.nome || '')))
          : []
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
    const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
    const base = Number(prod?.prezzo_listino) || 0
    const comboKey = selectedComboKey && String(selectedComboKey).trim() !== ''
      ? selectedComboKey
      : (selectedVarIds
        .map((id) => Number(id) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .join('+'))
    const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
    const delta = prodVarOptions
      .filter((v) => selectedVarIds.includes(v.id_variazione))
      .reduce((acc, v) => acc + (Number(v.delta_prezzo) || 0), 0)
    const suggested = comboPrice != null ? comboPrice : base + delta
    setModalPrice(suggested)
  }, [selProd, prodOptions, selectedComboKey, selectedVarIds, prodVarOptions, prodComboMap])

  const updateRiga = (index, patch) => {
    setRighe((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const handleAddRiga = () => {
    setRighe((rows) => rows.concat({ descrizione: '', quantita: 1, prezzo: 0, iva: 22, sconto: 0 }))
  }

  const resetProductModal = () => {
    setProdStep(1)
    setSelCat('')
    setProdSearch('')
    setSelProd('')
    setSelectedVarIds([])
    setSelectedComboKey('')
    setSelIva('')
    setModalQty(1)
    setModalPrice(0)
  }
  const resetPkgModal = () => {
    setPkgSearch('')
    setSelPacchetto('')
    setPkgOptions([])
    setPkgPreview([])
  }
  const handleRemoveRiga = (index) => {
    setRighe((rows) => rows.filter((_, i) => i !== index))
  }

  // Gestione CIG
  const addCig = () => {
    const code = String(newCig.cig || '').trim()
    if (!code) return
    setCigList((list) => [...list, { cig: code, data_cig: newCig.data_cig || '', motivazione: newCig.motivazione || '' }])
    setNewCig({ cig: '', data_cig: '', motivazione: '' })
  }
  const removeCig = (index) => setCigList((list) => list.filter((_, i) => i !== index))

  // Gestione Determine
  const addDetermina = () => {
    const num = String(newDetermina.determina || '').trim()
    if (!num) return
    setDetermineList((list) => [...list, { determina: num, data_determina: newDetermina.data_determina || '', motivazione: newDetermina.motivazione || '' }])
    setNewDetermina({ determina: '', data_determina: '', motivazione: '' })
  }
  const removeDetermina = (index) => setDetermineList((list) => list.filter((_, i) => i !== index))

  const totals = useMemo(() => {
    let imponibile = 0
    let totaleIva = 0
    for (const r of righe) {
      const q = Number(r.quantita) || 0
      const p = Number(r.prezzo) || 0
      const s = Number(r.sconto) || 0
      const aliq = Number(r.iva) || 0
      const rigaImpon = Math.max(0, q * p * (1 - s / 100))
      const rigaIva = rigaImpon * (aliq / 100)
      imponibile += rigaImpon
      totaleIva += rigaIva
    }
    const totale = imponibile + totaleIva
    return { imponibile, totaleIva, totale }
  }, [righe])

  // Carica pacchetti quando apro modal o modifico ricerca
  useEffect(() => {
    if (!token) return
    if (!pkgOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { items } = await fetchPacchetti({ token, q: pkgSearch, onlyActive: pkgOnlyActive, signal: controller.signal })
        setPkgOptions(items)
      } catch (_e) {
        setPkgOptions([])
      }
    }
    load()
    return () => controller.abort()
  }, [token, pkgOpen, pkgSearch, pkgOnlyActive])

  // Carica righe pacchetto selezionato
  useEffect(() => {
    if (!token || !pkgOpen) return
    if (!selPacchetto) { setPkgPreview([]); return }
    const controller = new AbortController()
    const loadDetail = async () => {
      try {
        const { righe } = await fetchPacchettoDetail({ token, id: Number(selPacchetto), signal: controller.signal })
        setPkgPreview(righe)
      } catch (_e) {
        setPkgPreview([])
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [token, pkgOpen, selPacchetto])

  const handleStatusChange = useCallback(async (nextCode) => {
    const safeCode = typeof nextCode === 'string' ? nextCode.trim().toLowerCase() : String(nextCode || '').trim().toLowerCase()
    if (!safeCode) return
    if (!token || !id) return
    if (statusUpdating) return
    const prevCode = String(currentStatus?.code || '').toLowerCase()
    const prevLabel = currentStatus?.label ?? prevCode
    setStatusError(null)
    setStatusSuccess(null)
    setStatusUpdating(true)
    try {
      const result = await updatePreventivoStatus({ token, id, statusCode: safeCode })
      const updatedStatuses = Array.isArray(result.statuses) ? result.statuses : null
      if (updatedStatuses) {
        setStatusOptions(updatedStatuses)
      }
      const resolvedCode = result.currentStatus?.code ?? safeCode
      let resolvedLabel = result.currentStatus?.label ?? null
      if (!resolvedLabel) {
        const sourceStatuses = updatedStatuses || statusOptions
        if (Array.isArray(sourceStatuses)) {
          const match = sourceStatuses.find((s) => s?.code === resolvedCode)
          if (match) {
            resolvedLabel = match.label ?? resolvedLabel
          }
        }
      }
      setCurrentStatus({
        code: resolvedCode ?? null,
        label: resolvedLabel ?? resolvedCode ?? null,
      })
      // best-effort: salva log cambio stato (non blocca il flusso)
      try {
        const description = `Cambio stato da ${prevLabel || prevCode || '-'} a ${resolvedLabel || resolvedCode || safeCode}`
        await logPreventivoStatusChange({
          token,
          id,
          fromStatus: prevLabel || prevCode || null,
          toStatus: resolvedLabel || resolvedCode || safeCode,
          note: description,
          description,
          userId: (user && (user.id || user.user_id)) || null,
          userName: (user && (user.username || user.name || user.nome)) || null,
          context: {
            preventivo_id: id,
            previous_code: prevCode || null,
            previous_label: prevLabel || null,
            new_code: resolvedCode || safeCode,
            new_label: resolvedLabel || null,
          },
        })
        try {
          const { items } = await fetchPreventivoStatusLog({ token, id })
          const normalized = Array.isArray(items) ? items.slice() : []
          normalized.sort((a, b) => {
            const da = new Date(a?.at || a?.created_at || a?.timestamp || 0).getTime()
            const db = new Date(b?.at || b?.created_at || b?.timestamp || 0).getTime()
            return db - da
          })
          setStatusLog(normalized)
        } catch (_e2) { }
      } catch (_e) { }
      if (result.data) {
        setHeader((prev) => ({
          ...prev,
          stato: result.data.stato_label ?? result.data.stato_code ?? prev?.stato ?? null,
        }))
      }
      if (typeof result.editable === 'boolean') {
        setEditable(result.editable)
      }
      setStatusSuccess('Stato aggiornato correttamente.')
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err?.status === 401 && logout) {
        logout()
        return
      }
      setStatusError(err)
    } finally {
      setStatusUpdating(false)
    }
  }, [token, id, statusUpdating, logout, statusOptions])

  // Stepper usa gestione inline (3 step). Le transizioni 1->bozza, 2->inviato
  // sono gestite direttamente, mentre il passo 3 (Finale) usa la select.

  const computedOggettoText = useMemo(() => {
    const manual = String(oggetto || '').trim()
    if (manual) return manual
    const map = new Map((Array.isArray(oggettiOptions) ? oggettiOptions : []).map((o) => [String(o.value), String(o.label || '')]))
    const labels = (Array.isArray(selectedOggetti) ? selectedOggetti : [])
      .map((v) => map.get(String(v)))
      .filter(Boolean)
    return labels.join(' - ')
  }, [oggetto, oggettiOptions, selectedOggetti])

  const buildPayload = () => {
    return {
      id_preventivo: id,
      id_anagrafica: Number(idAnagrafica) || 0,
      data_preventivo: dataPreventivo,
      note,
      oggetto: computedOggettoText,
      oggetti: selectedOggetti.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0),
      riferimento_cliente: rifCliente,
      cig: cigList.map((c) => ({ cig: c.cig, data_cig: c.data_cig || null, motivazione: c.motivazione || null })),
      determine: determineList.map((d) => ({ determina: d.determina, data_determina: d.data_determina || null, motivazione: d.motivazione || null })),
      righe,
      totals: {
        imponibile: totals.imponibile,
        totaleIva: totals.totaleIva,
        totale: totals.totale,
        sconto: 0,
      },
    }
  }

  const handleSalvaBozza = async (e) => {
    e.preventDefault()
    if (!editable) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({ token, ...payload, send: false, signal: controller.signal })
      setSubmitSuccess(
        result?.anno_preventivo && result?.numero_documento
          ? `Bozza aggiornata. N. ${result.anno_preventivo}/${result.numero_documento}`
          : `Bozza aggiornata (ID ${result?.id_preventivo ?? id})`,
      )
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConferma = async (e) => {
    e.preventDefault()
    if (!editable) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      const controller = new AbortController()
      const payload = buildPayload()
      const result = await createPreventivo({ token, ...payload, send: true, signal: controller.signal })
      setSubmitSuccess(
        result?.status === 'sent'
          ? `Preventivo confermato e inviato. N. ${result.anno_preventivo}/${result.numero_documento}`
          : `Preventivo salvato come bozza (ID ${result?.id_preventivo ?? id})`,
      )
      if (result?.status === 'sent') {
        const sentStatus = statusOptions.find((s) => (s?.code ?? '') === 'inviato')
        setCurrentStatus({
          code: 'inviato',
          label: sentStatus?.label ?? 'Inviato',
        })
        setHeader((prev) => ({
          ...prev,
          stato: sentStatus?.label ?? 'Inviato',
        }))
      }
      // Dopo conferma, non piu modificabile
      setEditable(false)
    } catch (err) {
      if (err.status === 401 && logout) {
        logout()
        return
      }
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) return null

  // Visualizzazione stato: 3 step (Bozza -> Inviato -> Finale),
  // con select per scegliere lo stato finale (Confermato/Rifiutato/Annullato)
  const isFinalCode = useCallback((code) => {
    const s = String(code || '').toLowerCase()
    return s === 'confermato' || s === 'rifiutato_cliente' || s === 'annullato'
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

  const currentStatusLabel = currentStatus?.label ?? null

  const uiDisabled = !editable || anagraficaDisabled
  const formatDateTime = (val) => {
    const d = new Date(val)
    if (Number.isFinite(d.getTime())) return d.toLocaleString('it-IT')
    return String(val || '')
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Preventivi - Dettagli</h5>
            <small className="text-body-secondary">
              Documento {header.anno ?? '-'} / {header.numero ?? '-'}
            </small>
          </div>
          {header.stato && (
            <CBadge color={editable ? 'info' : 'secondary'} className="text-uppercase">
              {header.stato}
            </CBadge>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        )}

        {!loading && loadError && (
          <CAlert color="danger">{loadError.message || 'Impossibile caricare il dettaglio.'}</CAlert>
        )}

        {!loading && !loadError && (
          <CForm onSubmit={handleConferma}>
            {anagraficaDisabled && (
              <CAlert color="warning" className="mb-3">Cliente disattivato: modifiche e conferma disabilitate.</CAlert>
            )}
            {submitError && (
              <CAlert color="danger" className="mb-3">
                {submitError?.payload?.message || submitError.message || 'Errore durante il salvataggio.'}
              </CAlert>
            )}
            {submitSuccess && (
              <CAlert color="success" className="mb-3">{submitSuccess}</CAlert>
            )}

            {!editable && (
              <CAlert color="info" className="mb-3">
                Il documento non Ã¨ in stato bozza. La modifica Ã¨ disabilitata.
              </CAlert>
            )}

            <section className="mb-4">
              <CNav variant="tabs" role="tablist" className="mb-3">
                <CNavItem>
                  <CNavLink active={statusTab === 'timeline'} role="tab" aria-selected={statusTab === 'timeline'} onClick={() => setStatusTab('timeline')}>
                    Timeline
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={statusTab === 'storico'} role="tab" aria-selected={statusTab === 'storico'} onClick={() => setStatusTab('storico')}>
                    Storico
                  </CNavLink>
                </CNavItem>
              </CNav>
              <CTabContent>
                <CTabPane visible={statusTab === 'timeline'} role="tabpanel">
                  {visualStatusSteps.length > 0 && (
                    <>
                      {statusError && (
                        <CAlert color="danger" className="mb-3">
                          {statusError?.payload?.message || statusError.message || "Errore durante l'aggiornamento dello stato."}
                        </CAlert>
                      )}
                      {statusSuccess && (
                        <CAlert color="success" className="mb-3">{statusSuccess}</CAlert>
                      )}
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
                                // Evita loop: non reagire se già su quello step o durante update
                                if (statusUpdating) return
                                if (step === activeVisualStatusStep) return
                                // Mappa step -> codice stato e salta se già coerente
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
                            <CInputGroup size="sm">
                              <CInputGroupText>Stato finale</CInputGroupText>
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
                            </CInputGroup>
                          </div>
                        </div>
                        <div className="mt-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">
                          <div>
                            <small className="text-body-secondary">
                              Stato attuale: <span className="fw-semibold">{currentStatusLabel || 'N.D.'}</span>
                            </small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {statusUpdating && <CSpinner size="sm" />}
                            <small className="text-body-secondary">Seleziona uno step per aggiornare manualmente lo stato.</small>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CTabPane>
                <CTabPane visible={statusTab === 'storico'} role="tabpanel">
                  {statusLogLoading && (
                    <div className="d-flex align-items-center gap-2">
                      <CSpinner size="sm" />
                      <small className="text-body-secondary">Caricamento storico...</small>
                    </div>
                  )}
                  {!statusLogLoading && statusLogError && (
                    <CAlert color="danger" className="mb-0">Impossibile caricare lo storico dei cambi di stato.</CAlert>
                  )}
                  {!statusLogLoading && !statusLogError && (
                    statusLog.length === 0 ? (
                      <small className="text-body-secondary">Nessun evento di stato.</small>
                    ) : (
                      <CTable small responsive className="mb-0">
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>Data</CTableHeaderCell>
                            <CTableHeaderCell>Utente</CTableHeaderCell>
                            <CTableHeaderCell>Transizione</CTableHeaderCell>
                            <CTableHeaderCell>Nota</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {statusLog.map((e, idx) => (
                            <CTableRow key={idx}>
                              <CTableDataCell>{formatDateTime(e.at || e.created_at || e.timestamp)}</CTableDataCell>
                              <CTableDataCell>{e.user_name || e.username || e.user || e.operatore || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {(e.from_status || e.from || e.da)
                                  ? `${e.from_status || e.from || e.da} â†’ ${e.to_status || e.to || e.a || e.status || ''}`
                                  : (e.to_status || e.to || e.a || e.status || '')}
                              </CTableDataCell>
                              <CTableDataCell>{e.note || e.message || ''}</CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )
                  )}
                </CTabPane>
              </CTabContent>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Dati generali</h6>
              <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Cliente</CFormLabel>
                <AnagraficaAutocomplete
                    items={clientiOptions}
                    value={idAnagrafica}
                    onChange={(id) => setIdAnagrafica(id)}
                    onChangeCliente={(cliente) => {
                      // Evita aggiornamenti ridondanti del display cliente
                      if (cliente) {
                        const nextId = Number(cliente.id_anagrafica ?? cliente.id ?? idAnagrafica ?? 0) || null
                        const nextLabel = String(
                          cliente.ragione_sociale ?? cliente.ragioneSociale ?? cliente.cliente_ragione_sociale ?? ''
                        )
                        const nextCodice = cliente.codice_cliente ?? null
                        const nextPiva = cliente.piva ?? null
                        const nextCf = cliente.codice_fiscale ?? null
                        setClienteDisplay((prev) => {
                          if (
                            prev.id === nextId &&
                            prev.label === nextLabel &&
                            prev.codiceCliente === nextCodice &&
                            prev.piva === nextPiva &&
                            prev.codiceFiscale === nextCf
                          ) {
                            return prev
                          }
                          return {
                            id: nextId,
                            label: nextLabel,
                            codiceCliente: nextCodice,
                            piva: nextPiva,
                            codiceFiscale: nextCf,
                          }
                        })
                      } else {
                        setClienteDisplay((prev) => {
                          if (
                            prev.id == null &&
                            prev.label === '' &&
                            prev.codiceCliente == null &&
                            prev.piva == null &&
                            prev.codiceFiscale == null
                          ) {
                            return prev
                          }
                          return {
                            id: null,
                            label: '',
                            codiceCliente: null,
                            piva: null,
                            codiceFiscale: null,
                          }
                        })
                      }
                    }}
                    onSearch={(q) => {
                      const s = String(q || '')
                      setClienteSearch((prev) => (prev === s ? prev : s))
                    }}
                    loading={loadingClienti}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>CIG</CFormLabel>
                  <CTable small bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '25%' }}>CIG</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '20%' }}>Data</CTableHeaderCell>
                        <CTableHeaderCell>Motivazione</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '10%' }} className="text-center">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>
                          <CFormInput placeholder="CIG" value={newCig.cig} onChange={(e) => setNewCig((s) => ({ ...s, cig: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput type="date" value={newCig.data_cig} onChange={(e) => setNewCig((s) => ({ ...s, data_cig: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput placeholder="Motivazione" value={newCig.motivazione} onChange={(e) => setNewCig((s) => ({ ...s, motivazione: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton size="sm" color="primary" variant="outline" type="button" onClick={addCig} disabled={uiDisabled || !String(newCig.cig || '').trim()}>
                            Aggiungi
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                      {cigList.map((c, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>{c.cig}</CTableDataCell>
                          <CTableDataCell>{c.data_cig || '-'}</CTableDataCell>
                          <CTableDataCell>{c.motivazione || ''}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton size="sm" color="link" type="button" onClick={() => removeCig(idx)} disabled={uiDisabled}>Rimuovi</CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Data preventivo</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dataPreventivo || ''}
                    onChange={(e) => setDataPreventivo(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Riferimento cliente</CFormLabel>
                  <CFormInput
                    value={rifCliente}
                    onChange={(e) => setRifCliente(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Determina</CFormLabel>
                  <CTable small bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '25%' }}>Determina</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '20%' }}>Data</CTableHeaderCell>
                        <CTableHeaderCell>Motivazione</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: '10%' }} className="text-center">Azioni</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>
                          <CFormInput placeholder="Num./Codice" value={newDetermina.determina} onChange={(e) => setNewDetermina((s) => ({ ...s, determina: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput type="date" value={newDetermina.data_determina} onChange={(e) => setNewDetermina((s) => ({ ...s, data_determina: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput placeholder="Motivazione" value={newDetermina.motivazione} onChange={(e) => setNewDetermina((s) => ({ ...s, motivazione: e.target.value }))} disabled={uiDisabled} />
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton size="sm" color="primary" variant="outline" type="button" onClick={addDetermina} disabled={uiDisabled || !String(newDetermina.determina || '').trim()}>
                            Aggiungi
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                      {determineList.map((d, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>{d.determina}</CTableDataCell>
                          <CTableDataCell>{d.data_determina || '-'}</CTableDataCell>
                          <CTableDataCell>{d.motivazione || ''}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton size="sm" color="link" type="button" onClick={() => removeDetermina(idx)} disabled={uiDisabled}>Rimuovi</CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Oggetto preventivo</CFormLabel>
                  <CMultiSelect
                    options={oggettiOptions}
                    selectionType="tags"
                    placeholder="Seleziona o crea opzioni"
                    value={selectedOggetti}
                    allowCreateOptions
                    disabled={uiDisabled}
                  onChange={(vals) => {
                    // Supporta sia array di values che array di oggetti { value, label }
                    const arr = Array.isArray(vals)
                      ? vals
                          .map((v) => {
                            if (v && typeof v === 'object') {
                              return v.value != null ? String(v.value) : ''
                            }
                            return String(v)
                          })
                          .filter((s) => s !== '')
                      : []
                    setSelectedOggetti(arr)
                  }}
                    onCreateOption={async (label) => {
                      try {
                        const controller = new AbortController()
                        const created = await createPreventivoOggettoOption({ token, label, signal: controller.signal })
                        if (created) {
                          setOggettiOptions((opts) => (opts.some((o) => String(o.value) === String(created.value)) ? opts : opts.concat(created)))
                          setSelectedOggetti((prev) => Array.from(new Set([...(prev || []).map(String), String(created.value)])))
                          return created
                        }
                      } catch (_e) {}
                      return null
                    }}
                  />
                  <div className="form-text">Oggetto: {computedOggettoText || '-'}</div>
                </CCol>
                {/* Rimosso: testo libero e anteprima (richiesta) */}
              </CRow>
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0 text-body-secondary">Righe preventivo</h6>
                <div className="d-flex gap-2">
                  <CButton color="secondary" variant="outline" size="sm" onClick={handleAddRiga} disabled={uiDisabled}>
                    Aggiungi riga
                  </CButton>
                  <CButton color="primary" variant="outline" size="sm" onClick={() => { resetProductModal(); setStepperOpen(true) }} disabled={uiDisabled}>
                    Selettore prodotti
                  </CButton>
                  <CButton color="primary" size="sm" type="button" onClick={() => { resetPkgModal(); setPkgOpen(true) }} disabled={uiDisabled}>
                    Inserisci pacchetto
                  </CButton>
                </div>
              </div>
              {/* Modal selezione pacchetto */}
              <CModal visible={pkgOpen} onClose={() => setPkgOpen(false)} size="lg" backdrop="static">
                <CModalHeader>
                  <CModalTitle>Seleziona pacchetto</CModalTitle>
                </CModalHeader>
                <CModalBody>
                  <CRow className="g-3 mb-3 align-items-end">
                    <CCol md={7}>
                      <CFormLabel>Ricerca</CFormLabel>
                      <CFormInput placeholder="Nome o codice pacchetto" value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={5}>
                      <CFormLabel>Pacchetto</CFormLabel>
                      <CFormSelect value={selPacchetto} onChange={(e) => setSelPacchetto(e.target.value)} disabled={uiDisabled}>
                        <option value="">Selezionaâ€¦</option>
                        {pkgOptions.map((p) => (
                          <option key={p.id_pacchetto} value={p.id_pacchetto}>
                            {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={12}>
                      <div className="form-check mt-2">
                        <input id="pkgOnlyActive" type="checkbox" className="form-check-input" checked={pkgOnlyActive} onChange={(e) => setPkgOnlyActive(e.target.checked)} />
                        <label htmlFor="pkgOnlyActive" className="form-check-label">Solo attivi</label>
                      </div>
                    </CCol>
                  </CRow>
                  {pkgPreview.length > 0 && (
                    <div className="border rounded p-2">
                      <div className="fw-semibold mb-2">Righe del pacchetto</div>
                      <CTable compact hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>Descrizione</CTableHeaderCell>
                            <CTableHeaderCell className="text-end">Q.tÃ </CTableHeaderCell>
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
                      disabled={!selPacchetto || pkgPreview.length === 0 || uiDisabled}
                      onClick={() => {
                        if (!selPacchetto || pkgPreview.length === 0) return
                        const newLines = pkgPreview.map((r) => {
                          const line = {
                            descrizione: r.descrizione ?? '',
                            quantita: Number(r.quantita) || 1,
                            prezzo: Number(r.prezzo_unitario) || 0,
                            iva: r.iva != null ? Number(r.iva) : 22,
                            sconto: r.sconto != null ? Number(r.sconto) : 0,
                            id_prodotto: r.id_prodotto ?? null,
                            id_sdi_natura_iva: r.id_sdi_natura_iva ?? null,
                          }

                          const catId = r.id_categoria != null ? Number(r.id_categoria) : null
                          if (catId && !Number.isNaN(catId)) {
                            line.id_categoria = catId
                          }

                          if (r.categoria_nome) {
                            line.categoria_nome = String(r.categoria_nome)
                          }

                          if (line.id_categoria != null && line.categoria_nome == null) {
                            const cat = (catOptions || []).find(
                              (c) => Number(c.id_categoria) === Number(line.id_categoria),
                            )
                            if (cat && cat.nome) {
                              line.categoria_nome = String(cat.nome)
                            }
                          }

                          if (!line.categoria_nome) {
                            const idp = Number(r.id_prodotto) || 0
                            if (idp > 0 && prodCategoryMap[idp]) {
                              line.categoria_nome = String(prodCategoryMap[idp])
                            }
                          }

                          return line
                        })
                        setRighe((rows) => rows.concat(newLines))
                        setPkgOpen(false)
                      }}>
                      Inserisci in preventivo
                    </CButton>
                  </div>
                </CModalFooter>
              </CModal>
              {false && (
                <div className="border rounded p-3 mt-3">
                  <CRow className="g-3 align-items-end">
                    <CCol md={3}>
                      <CFormLabel>Categoria</CFormLabel>
                      <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
                        <option value="">Tutte</option>
                        {catOptions.map((c) => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Prodotto</CFormLabel>
                      <CFormSelect
                        value={selProd}
                        onChange={(e) => {
                          const pid = e.target.value
                          setSelProd(pid)
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                          if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                        }}
                        disabled={uiDisabled}>
                        <option value="">Seleziona...</option>
                        {prodOptions.map((p) => (
                          <option key={p.id_prodotto} value={p.id_prodotto}>
                            {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={2}>
                      <CFormLabel>IVA %</CFormLabel>
                      <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    {/* Rimosso: selettore manuale variazioni. Si usano direttamente le combinazioni */}
                    {prodComboList.length > 0 && (
                      <CCol md={4}>
                        <CFormLabel>Combinazioni disponibili</CFormLabel>
                        <CFormSelect
                          value={(() => {
                            const key = selectedVarIds
                              .map((id) => Number(id) || 0)
                              .filter((n) => n > 0)
                              .sort((a, b) => a - b)
                              .join('+')
                            return key
                          })()}
                          onChange={(e) => {
                            const opt = prodComboList.find((r) => String(r.combo_key) === String(e.target.value))
                            if (!opt) return
                            const ids = Array.isArray(opt.var_ids) ? opt.var_ids.map(Number) : []
                            setSelectedVarIds(ids)
                            const prezzo = Number(opt.prezzo) || 0
                            const prezzoInput = document.getElementById('step-prezzo')
                            if (prezzoInput) prezzoInput.value = String(prezzo)
                          }}
                          disabled={uiDisabled || prodComboList.length === 0}>
                          <option value="">--</option>
                          {prodComboList.map((r, idx) => {
                            const labels = Array.isArray(r.var_ids)
                              ? r.var_ids.map((idv) => {
                                const vv = prodVarOptions.find((x) => Number(x.id_variazione) === Number(idv))
                                return vv ? (vv.categoria ? `${vv.categoria} - ${vv.nome}` : vv.nome) : String(idv)
                              })
                              : []
                            return (
                              <option key={r.combo_key || idx} value={r.combo_key}>
                                {labels.join(', ')} â€” {Number(r.prezzo) ?? 0}
                              </option>
                            )
                          })}
                        </CFormSelect>
                        <div className="mt-2">
                          <CButton color="secondary" variant="outline" size="sm" onClick={() => setSelectedVarIds([])} disabled={uiDisabled || selectedVarIds.length === 0}>Annulla selezione</CButton>
                        </div>
                      </CCol>
                    )}
                  </CRow>
                  <CRow className="g-3 mt-2 align-items-end">
                    <CCol md={3}>
                      <CFormLabel>Ricerca prodotto</CFormLabel>
                      <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>QuantitÃ </CFormLabel>
                      <CFormInput id="step-qta" type="number" min="1" step="1" defaultValue={1} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Prezzo</CFormLabel>
                      <CFormInput id="step-prezzo" type="number" min="0" step="0.01" defaultValue={(() => {
                        const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                        return prod?.prezzo_listino ?? 0
                      })()} disabled={uiDisabled} />
                    </CCol>
                    <CCol md={3} className="d-flex gap-2">
                      <CButton color="primary" type="button" disabled={uiDisabled}
                        onClick={() => {
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
                          if (!prod) return
                          const q = Number(document.getElementById('step-qta')?.value || 1)
                          const prezzoBase = Number(document.getElementById('step-prezzo')?.value || prod.prezzo_listino || 0)
                          const ivaPerc = Number(selIva || prod.iva_percento || 22)
                          const selectedVars = prodVarOptions.filter((v) => selectedVarIds.includes(v.id_variazione))
                          const delta = selectedVars.reduce((acc, v) => acc + (Number(v.delta_prezzo) || 0), 0)
                          const comboKey = selectedVars
                            .map((v) => Number(v.id_variazione) || 0)
                            .filter((n) => n > 0)
                            .sort((a, b) => a - b)
                            .join('+')
                          const comboPrice = comboKey && prodComboMap[comboKey] != null ? Number(prodComboMap[comboKey]) : null
                          const descr = selectedVars.length > 0
                            ? `${prod.nome} - ${selectedVars.map((v) => `${v.nome}${v.codice ? ' [' + v.codice + ']' : ''}`).join(', ')}`
                            : prod.nome
                          const prezzoFinale = comboPrice != null ? comboPrice : (prezzoBase + delta)
                          const riga = { descrizione: descr, quantita: q, prezzo: prezzoFinale, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto }
                          // Aggiungi categoria del prodotto alla riga per raggruppamento immediato
                          if (prod.id_categoria != null) {
                            riga.id_categoria = Number(prod.id_categoria)
                            const c = (catOptions || []).find((x) => Number(x.id_categoria) === Number(prod.id_categoria))
                            if (c && c.nome) riga.categoria_nome = String(c.nome)
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
                          setSelectedVarIds([])
                        }}>
                        Inserisci riga
                      </CButton>
                      <CButton color="link" type="button" onClick={() => setStepperOpen(false)}>
                        Chiudi
                      </CButton>
                    </CCol>
                  </CRow>
                </div>
              )}

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
                      if (uiDisabled) return
                      if (Number(n) === prodStep) return
                      // Always allow going back
                      if (n <= prodStep) {
                        setProdStep(n)
                        return
                      }
                      // Forward navigation with prerequisites
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
                        return
                      }
                    }}
                  />
                  {prodStep === 1 && (
                    <CRow className="g-3">
                      <CCol md={12}>
                        <CFormLabel>Categoria prodotto</CFormLabel>
                        <CFormSelect value={selCat} onChange={(e) => setSelCat(e.target.value)} disabled={uiDisabled}>
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
                            const prod = prodOptions.find((p) => String(p.id_prodotto) === String(pid))
                            if (prod && prod.iva_percento != null) setSelIva(String(prod.iva_percento))
                          }}
                          disabled={uiDisabled}>
                          <option value="">Seleziona...</option>
                          {prodOptions.map((p) => (
                            <option key={p.id_prodotto} value={p.id_prodotto}>
                              {p.codice ? `${p.codice} - ${p.nome}` : p.nome}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Ricerca</CFormLabel>
                        <CFormInput placeholder="Cerca per nome o codice" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} disabled={uiDisabled} />
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
                            disabled={uiDisabled || prodComboList.length === 0}>
                            <option value="">Seleziona una combinazioneâ€¦</option>
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
                        <div className="mb-2"><strong>Prodotto:</strong> {(() => { const p = prodOptions.find((x) => String(x.id_prodotto) === String(selProd)); return p ? (p.codice ? `${p.codice} - ${p.nome}` : p.nome) : '-' })()}</div>
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
                      <CCol md={4}>
                        <CFormLabel>QuantitÃ </CFormLabel>
                        <CFormInput type="number" min="1" step="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value) || 1)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Prezzo</CFormLabel>
                        <CFormInput type="number" min="0" step="0.01" value={modalPrice} onChange={(e) => setModalPrice(Number(e.target.value) || 0)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>IVA %</CFormLabel>
                        <CFormInput type="number" min="0" max="100" step="1" value={selIva} onChange={(e) => setSelIva(e.target.value)} disabled={uiDisabled} />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Natura IVA</CFormLabel>
                        <CFormSelect value={(() => '')()} onChange={() => { }} disabled={true}>
                          <option value="">Selezione natura disponibile nella riga dopo inserimento</option>
                        </CFormSelect>
                      </CCol>
                    </CRow>
                  )}
                </CModalBody>
                <CModalFooter className="d-flex justify-content-between">
                  <div>
                    {prodStep > 1 && (
                      <CButton color="secondary" variant="outline" onClick={() => setProdStep((s) => Math.max(1, s - 1))} disabled={uiDisabled}>Indietro</CButton>
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
                        disabled={(prodStep === 2 && !selProd) || uiDisabled}>
                        Avanti
                      </CButton>
                    )}
                    {prodStep === 4 && (
                      <CButton
                        color="primary"
                        onClick={() => {
                          const prod = prodOptions.find((p) => String(p.id_prodotto) === String(selProd))
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
                          const riga = { descrizione: descr, quantita: modalQty, prezzo: modalPrice, iva: ivaPerc, sconto: 0, id_prodotto: prod.id_prodotto }
                          // Aggiungi categoria del prodotto alla riga per raggruppamento immediato
                          if (prod.id_categoria != null) {
                            riga.id_categoria = Number(prod.id_categoria)
                            const c = (catOptions || []).find((x) => Number(x.id_categoria) === Number(prod.id_categoria))
                            if (c && c.nome) riga.categoria_nome = String(c.nome)
                          }
                          if (ivaPerc === 0) {
                            // Se IVA 0, natura IVA modificabile in tabella dopo inserimento
                          }
                          setRighe((rows) => rows.concat(riga))
                          setStepperOpen(false)
                        }}
                        disabled={uiDisabled}>
                        Inserisci riga
                      </CButton>
                    )}
                  </div>
                </CModalFooter>
              </CModal>

              <CTable className="mt-3" responsive small>
                <CTableHead color="light">
                  <CTableRow className="align-middle">
                    <CTableHeaderCell>Descrizione</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                      Q.tÃ 
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 160 }}>
                      Prezzo
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 140 }}>
                      Sconto %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                      IVA %
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: 200 }}>
                      Natura IVA
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Imponibile</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                    <CTableHeaderCell className="text-center" style={{ width: 64 }}>
                      Azioni
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(() => {
                    // Raggruppa righe per categoria prodotto
                    const rows = Array.isArray(righe) ? righe : []
                    const groupMap = new Map()
                    const getCat = (r) => {
                      // PrioritÃ : nome categoria giÃ  presente in riga
                      if (r && r.categoria_nome) return String(r.categoria_nome)
                      // Poi: id_categoria presente in riga -> lookup
                      if (r && r.id_categoria) {
                        const c = (catOptions || []).find((x) => String(x.id_categoria) === String(r.id_categoria))
                        if (c && c.nome) return String(c.nome)
                      }
                      // Poi: mappa risolta da id_prodotto
                      const idp = Number(r?.id_prodotto) || 0
                      if (idp > 0 && prodCategoryMap[idp]) return prodCategoryMap[idp]
                      // Fallback
                      return 'Varie'
                    }
                    rows.forEach((r, i) => {
                      const cat = getCat(r)
                      if (!groupMap.has(cat)) groupMap.set(cat, [])
                      groupMap.get(cat).push([r, i])
                    })
                    const groups = Array.from(groupMap.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                    const out = []
                    for (const [cat, arr] of groups) {
                      out.push(
                        <CTableRow key={`grp-${cat}`}>
                          <CTableDataCell colSpan={10} className="bg-body-secondary fw-semibold">
                            Categoria: {cat}
                          </CTableDataCell>
                        </CTableRow>,
                      )
                      for (const [riga, idx] of arr) {
                        const q = Number(riga.quantita) || 0
                        const p = Number(riga.prezzo) || 0
                        const s = Number(riga.sconto) || 0
                        const iva = Number(riga.iva) || 0
                        const impon = Math.max(0, q * p * (1 - s / 100))
                        const ivaVal = impon * (iva / 100)
                        const tot = impon + ivaVal
                        out.push(
                          <CTableRow key={idx} className="align-middle">
                            <CTableDataCell>
                              <CFormInput
                                placeholder="Descrizione articolo/servizio"
                                value={riga.descrizione}
                                onChange={(e) => updateRiga(idx, { descrizione: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                step="1"
                                value={riga.quantita}
                                onChange={(e) => updateRiga(idx, { quantita: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={riga.prezzo}
                                onChange={(e) => updateRiga(idx, { prezzo: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={riga.sconto}
                                onChange={(e) => updateRiga(idx, { sconto: e.target.value })}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormInput
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={riga.iva}
                                onChange={(e) => {
                                  const newIva = e.target.value
                                  const patch = { iva: newIva }
                                  if (Number(newIva) !== 0) {
                                    patch.id_sdi_natura_iva = null
                                  }
                                  updateRiga(idx, patch)
                                }}
                                disabled={uiDisabled}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CFormSelect
                                value={riga.id_sdi_natura_iva ?? ''}
                                onChange={(e) => updateRiga(idx, { id_sdi_natura_iva: e.target.value ? Number(e.target.value) : null })}
                                disabled={uiDisabled || Number(riga.iva) !== 0}>
                                <option value="">--</option>
                                {naturaOptions.map((n) => (
                                  <option key={n.id_natura} value={n.id_natura}>
                                    {n.code} - {n.label}
                                  </option>
                                ))}
                              </CFormSelect>
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(impon)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(ivaVal)}</CTableDataCell>
                            <CTableDataCell className="text-end">{formatCurrency(tot)}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton color="link" size="sm" className="p-0" onClick={() => handleRemoveRiga(idx)} disabled={uiDisabled}>
                                -
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>,
                        )
                      }
                    }
                    return out
                  })()}
                </CTableBody>
              </CTable>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Riepilogo</h6>
              <CRow className="g-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale imponibile</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.imponibile)} readOnly disabled />
                  </CInputGroup>
                </CCol>
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale IVA</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.totaleIva)} readOnly disabled />
                  </CInputGroup>
                </CCol>
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>Totale</CInputGroupText>
                    <CFormInput value={formatCurrency(totals.totale)} readOnly disabled />
                  </CInputGroup>
                </CCol>
              </CRow>
            </section>

            <section className="mb-4">
              <h6 className="mb-3 text-body-secondary">Note</h6>
              <CRow>
                <CCol md={12}>
                  <CFormTextarea
                    rows={5}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={uiDisabled}
                  />
                </CCol>
              </CRow>
            </section>

            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" type="button" onClick={handleSalvaBozza} disabled={uiDisabled || submitting}>
                <CIcon icon={cilSave} className="me-2" /> Aggiorna bozza
              </CButton>
              <CButton color="primary" type="submit" disabled={uiDisabled || submitting}>
                <CIcon icon={cilCheckCircle} className="me-2" /> Conferma
              </CButton>
              <CButton color="link" type="button" onClick={() => navigate('/preventivi/lista')}>
                Torna alla lista
              </CButton>
            </div>
          </CForm>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PreventiviDetail
