/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'

import {
  CAvatar,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cibCcAmex,
  cibCcApplePay,
  cibCcMastercard,
  cibCcPaypal,
  cibCcStripe,
  cibCcVisa,
  cibGoogle,
  cibFacebook,
  cibLinkedin,
  cifBr,
  cifEs,
  cifFr,
  cifIn,
  cifPl,
  cifUs,
  cibTwitter,
  cilCloudDownload,
  cilPeople,
  cilUser,
  cilUserFemale,
} from '@coreui/icons'

import avatar1 from 'src/assets/images/avatars/1.jpg'
import avatar2 from 'src/assets/images/avatars/2.jpg'
import avatar3 from 'src/assets/images/avatars/3.jpg'
import avatar4 from 'src/assets/images/avatars/4.jpg'
import avatar5 from 'src/assets/images/avatars/5.jpg'
import avatar6 from 'src/assets/images/avatars/6.jpg'

import WidgetsBrand from '../widgets/WidgetsBrand'
import WidgetsDropdown from '../widgets/WidgetsDropdown'
import MainChart from './MainChart'
import UsersWidget from '../widgets/UsersWidget'

import { fetchAnagraficheDash } from '../../services/dashboard'

const MAX_LATEST_PREVENTIVI = 15
const LATEST_PREVENTIVI_ROWS_PER_PAGE = 5

const Dashboard = () => {
  const [statsJson, setStatsJson] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [seriesAnag, setSeriesAnag] = useState(null)
  const [kpiAnag, setKpiAnag] = useState(null)
  const [latestPreventiviPage, setLatestPreventiviPage] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
      ; (async () => {
        try {
          const data = await fetchAnagraficheDash({ signal: controller.signal })
          setStatsJson(data)
          setSeriesAnag(data.series)
          setKpiAnag(data.kpi)
        } catch (err) {
          console.error('Failed to load dashboard data:', err)
          setLoadError(err?.message || 'Errore durante il caricamento dashboard')
        }
      })()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setLatestPreventiviPage(0)
  }, [statsJson?.ultimi_preventivi])

  const latestPreventivi = useMemo(() => {
    if (!Array.isArray(statsJson?.ultimi_preventivi)) {
      return []
    }
    return statsJson.ultimi_preventivi.slice(0, MAX_LATEST_PREVENTIVI)
  }, [statsJson?.ultimi_preventivi])

  const totalLatestPreventivi = latestPreventivi.length
  const totalLatestPreventiviPages = Math.max(
    Math.ceil(totalLatestPreventivi / LATEST_PREVENTIVI_ROWS_PER_PAGE),
    1,
  )

  useEffect(() => {
    setLatestPreventiviPage((current) => {
      const maxIdx = Math.max(totalLatestPreventiviPages - 1, 0)
      return current > maxIdx ? maxIdx : current
    })
  }, [totalLatestPreventiviPages])

  const latestPreventiviPageItems = useMemo(() => {
    const start = latestPreventiviPage * LATEST_PREVENTIVI_ROWS_PER_PAGE
    return latestPreventivi.slice(start, start + LATEST_PREVENTIVI_ROWS_PER_PAGE)
  }, [latestPreventivi, latestPreventiviPage])

  const latestPreventiviPaginationItems = useMemo(() => {
    const pages = []
    for (let i = 1; i <= totalLatestPreventiviPages; i += 1) {
      pages.push(i)
    }
    return pages
  }, [totalLatestPreventiviPages])

  const hasLatestPreventivi = totalLatestPreventivi > 0
  const showLatestPreventiviPager = hasLatestPreventivi && totalLatestPreventiviPages > 1

  const progressExample = [
    { title: 'Visits', value: '29.703 Users', percent: 40, color: 'success' },
    { title: 'Unique', value: '24.093 Users', percent: 20, color: 'info' },
    { title: 'Pageviews', value: '78.706 Views', percent: 60, color: 'warning' },
    { title: 'New Users', value: '22.123 Users', percent: 80, color: 'danger' },
    { title: 'Bounce Rate', value: 'Average Rate', percent: 40.15, color: 'primary' },
  ]

  const progressGroupExample1 = [
    { title: 'Monday', value1: 34, value2: 78 },
    { title: 'Tuesday', value1: 56, value2: 94 },
    { title: 'Wednesday', value1: 12, value2: 67 },
    { title: 'Thursday', value1: 43, value2: 91 },
    { title: 'Friday', value1: 22, value2: 73 },
    { title: 'Saturday', value1: 53, value2: 82 },
    { title: 'Sunday', value1: 9, value2: 69 },
  ]

  const progressGroupExample2 = [
    { title: 'Male', icon: cilUser, value: 53 },
    { title: 'Female', icon: cilUserFemale, value: 43 },
  ]

  const progressGroupExample3 = [
    { title: 'Organic Search', icon: cibGoogle, percent: 56, value: '191,235' },
    { title: 'Facebook', icon: cibFacebook, percent: 15, value: '51,223' },
    { title: 'Twitter', icon: cibTwitter, percent: 11, value: '37,564' },
    { title: 'LinkedIn', icon: cibLinkedin, percent: 8, value: '27,319' },
  ]

  const tableExample = [
    {
      avatar: { src: avatar1, status: 'success' },
      user: {
        name: 'Yiorgos Avraamu',
        new: true,
        registered: 'Jan 1, 2023',
      },
      country: { name: 'USA', flag: cifUs },
      usage: {
        value: 50,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'success',
      },
      payment: { name: 'Mastercard', icon: cibCcMastercard },
      activity: '10 sec ago',
    },
    {
      avatar: { src: avatar2, status: 'danger' },
      user: {
        name: 'Avram Tarasios',
        new: false,
        registered: 'Jan 1, 2023',
      },
      country: { name: 'Brazil', flag: cifBr },
      usage: {
        value: 22,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'info',
      },
      payment: { name: 'Visa', icon: cibCcVisa },
      activity: '5 minutes ago',
    },
    {
      avatar: { src: avatar3, status: 'warning' },
      user: { name: 'Quintin Ed', new: true, registered: 'Jan 1, 2023' },
      country: { name: 'India', flag: cifIn },
      usage: {
        value: 74,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'warning',
      },
      payment: { name: 'Stripe', icon: cibCcStripe },
      activity: '1 hour ago',
    },
    {
      avatar: { src: avatar4, status: 'secondary' },
      user: { name: 'Enéas Kwadwo', new: true, registered: 'Jan 1, 2023' },
      country: { name: 'France', flag: cifFr },
      usage: {
        value: 98,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'danger',
      },
      payment: { name: 'PayPal', icon: cibCcPaypal },
      activity: 'Last month',
    },
    {
      avatar: { src: avatar5, status: 'success' },
      user: {
        name: 'Agapetus Tadeáš',
        new: true,
        registered: 'Jan 1, 2023',
      },
      country: { name: 'Spain', flag: cifEs },
      usage: {
        value: 22,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'primary',
      },
      payment: { name: 'Google Wallet', icon: cibCcApplePay },
      activity: 'Last week',
    },
    {
      avatar: { src: avatar6, status: 'danger' },
      user: {
        name: 'Friderik Dávid',
        new: true,
        registered: 'Jan 1, 2023',
      },
      country: { name: 'Poland', flag: cifPl },
      usage: {
        value: 43,
        period: 'Jun 11, 2023 - Jul 10, 2023',
        color: 'success',
      },
      payment: { name: 'Amex', icon: cibCcAmex },
      activity: 'Last week',
    },
  ]



  return (
    <>
      {loadError ? (
        <div className="alert alert-warning" role="alert">
          {String(loadError)}
        </div>
      ) : null}

      <CRow>
        <CCol>
          <UsersWidget
            title="Anagrafiche"
            color="success"
            statsJson={
              statsJson ?? {
                kpi: kpiAnag,
                series: seriesAnag,
              }
            }
            showMenu={false}
          />
        </CCol>
        <CCol>
          <UsersWidget
            title="Preventivi"
            color="primary"
            statsJson={
              statsJson ?? {
                kpi: kpiAnag,
                series: seriesAnag,
              }
            }
            showMenu={false}
          />
        </CCol>
        <CCol>
          <UsersWidget
            title="Fatture"
            color="secondary"
            statsJson={
              statsJson ?? {
                kpi: kpiAnag,
                series: seriesAnag,
              }
            }
            showMenu={false}
          />
        </CCol>
      </CRow>

      {/* KPI sintetiche reali */}
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary text-truncate small">Nuove anagrafiche (mese)</div>
              <div className="fs-4 fw-semibold">{kpiAnag?.nuovi_mese_corrente ?? '—'}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary text-truncate small">Nuovi preventivi (mese)</div>
              <div className="fs-4 fw-semibold">{Array.isArray(statsJson?.preventivi_mese_per_stato) ? statsJson.preventivi_mese_per_stato.reduce((acc, s) => acc + Number(s.tot || 0), 0) : '—'}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Preventivi per stato e ultimi preventivi */}
      <CRow className="mb-4">
        <CCol md={6}>
          <CCard>
            <CCardHeader>Nuovi preventivi del mese per stato</CCardHeader>
            <CCardBody>
              <CTable hover responsive size="sm">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Stato</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {Array.isArray(statsJson?.preventivi_mese_per_stato) && statsJson.preventivi_mese_per_stato.length > 0 ? (
                    statsJson.preventivi_mese_per_stato.map((row, idx) => (
                      <CTableRow key={idx}>
                        <CTableDataCell>{row.label || row.code}</CTableDataCell>
                        <CTableDataCell className="text-end">{row.tot}</CTableDataCell>
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={2} className="text-center text-body-secondary">
                        Nessun dato disponibile
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard>
            <CCardHeader>Ultimi 15 preventivi</CCardHeader>
            <CCardBody>
              <CTable hover responsive size="sm">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>N.</CTableHeaderCell>
                    <CTableHeaderCell>Cliente</CTableHeaderCell>
                    <CTableHeaderCell>Data</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {hasLatestPreventivi ? (
                    latestPreventiviPageItems.map((p) => (
                      <CTableRow key={p.id_preventivo}>
                        <CTableDataCell>{[p.anno_preventivo, p.numero_documento].filter(Boolean).join('/')}</CTableDataCell>
                        <CTableDataCell>{p.ragione_sociale || '-'}</CTableDataCell>
                        <CTableDataCell>{p.data_preventivo || '-'}</CTableDataCell>
                        <CTableDataCell className="text-end">{Number(p.totale || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</CTableDataCell>
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center text-body-secondary">Nessun preventivo</CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
              {showLatestPreventiviPager ? (
                <div className="d-flex justify-content-center mt-3">
                  <CPagination size="sm" className="mb-0">
                    <CPaginationItem
                      aria-label="Pagina precedente"
                      disabled={latestPreventiviPage <= 0}
                      onClick={() => latestPreventiviPage > 0 && setLatestPreventiviPage(latestPreventiviPage - 1)}
                    >
                      &laquo;
                    </CPaginationItem>
                    {latestPreventiviPaginationItems.map((page) => (
                      <CPaginationItem
                        key={page}
                        active={page === latestPreventiviPage + 1}
                        onClick={() => setLatestPreventiviPage(page - 1)}
                      >
                        {page}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      aria-label="Pagina successiva"
                      disabled={latestPreventiviPage >= totalLatestPreventiviPages - 1}
                      onClick={() =>
                        latestPreventiviPage < totalLatestPreventiviPages - 1 &&
                        setLatestPreventiviPage(latestPreventiviPage + 1)
                      }
                    >
                      &raquo;
                    </CPaginationItem>
                  </CPagination>
                </div>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Top clienti */}
      <CCard className="mb-4">
        <CCardHeader>Top 5 clienti (totale preventivi ultimi 12 mesi)</CCardHeader>
        <CCardBody>
          <CTable hover responsive size="sm">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-end"># Preventivi</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Totale</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {Array.isArray(statsJson?.top_clienti) && statsJson.top_clienti.length > 0 ? (
                statsJson.top_clienti.map((c, idx) => (
                  <CTableRow key={c.id_anagrafica ?? idx}>
                    <CTableDataCell>{c.ragione_sociale || '—'}</CTableDataCell>
                    <CTableDataCell className="text-end">{c.num_preventivi}</CTableDataCell>
                    <CTableDataCell className="text-end">{Number(c.totale || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center text-body-secondary">Nessun dato</CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>



      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 id="fatture-trend" className="card-title mb-0">
                Andamento fatture
              </h4>
              <div className="small text-body-secondary">Ultimi 12 mesi</div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton color="primary" className="float-end">
                <CIcon icon={cilCloudDownload} />
              </CButton>
              <CButtonGroup className="float-end me-3">
                {['Day', 'Month', 'Year'].map((value) => (
                  <CButton
                    color="outline-secondary"
                    key={value}
                    className="mx-0"
                    active={value === 'Month'}
                  >
                    {value}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>
          <MainChart stats={statsJson} />
        </CCardBody>
        <CCardFooter>
          <CRow
            xs={{ cols: 1, gutter: 4 }}
            sm={{ cols: 2 }}
            lg={{ cols: 4 }}
            xl={{ cols: 5 }}
            className="mb-2 text-center"
          >
            {progressExample.map((item, index, items) => (
              <CCol
                className={classNames({
                  'd-none d-xl-block': index + 1 === items.length,
                })}
                key={index}
              >
                <div className="text-body-secondary">{item.title}</div>
                <div className="fw-semibold text-truncate">
                  {item.value} ({item.percent}%)
                </div>
                <CProgress thin className="mt-2" color={item.color} value={item.percent} />
              </CCol>
            ))}
          </CRow>
        </CCardFooter>
      </CCard>
      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>Traffic {' & '} Sales</CCardHeader>
            <CCardBody>
              <CRow>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-info py-1 px-3">
                        <div className="text-body-secondary text-truncate small">New Clients</div>
                        <div className="fs-5 fw-semibold">9,123</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Recurring Clients
                        </div>
                        <div className="fs-5 fw-semibold">22,643</div>
                      </div>
                    </CCol>
                  </CRow>
                  <hr className="mt-0" />
                  {progressGroupExample1.map((item, index) => (
                    <div className="progress-group mb-4" key={index}>
                      <div className="progress-group-prepend">
                        <span className="text-body-secondary small">{item.title}</span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="info" value={item.value1} />
                        <CProgress thin color="danger" value={item.value2} />
                      </div>
                    </div>
                  ))}
                </CCol>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Pageviews</div>
                        <div className="fs-5 fw-semibold">78,623</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Organic</div>
                        <div className="fs-5 fw-semibold">49,123</div>
                      </div>
                    </CCol>
                  </CRow>

                  <hr className="mt-0" />

                  {progressGroupExample2.map((item, index) => (
                    <div className="progress-group mb-4" key={index}>
                      <div className="progress-group-header">
                        <CIcon className="me-2" icon={item.icon} size="lg" />
                        <span>{item.title}</span>
                        <span className="ms-auto fw-semibold">{item.value}%</span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="warning" value={item.value} />
                      </div>
                    </div>
                  ))}

                  <div className="mb-5"></div>

                  {progressGroupExample3.map((item, index) => (
                    <div className="progress-group" key={index}>
                      <div className="progress-group-header">
                        <CIcon className="me-2" icon={item.icon} size="lg" />
                        <span>{item.title}</span>
                        <span className="ms-auto fw-semibold">
                          {item.value}{' '}
                          <span className="text-body-secondary small">({item.percent}%)</span>
                        </span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="success" value={item.percent} />
                      </div>
                    </div>
                  ))}
                </CCol>
              </CRow>

              <br />

              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">User</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Country
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Usage</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Payment Method
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Activity</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {tableExample.map((item, index) => (
                    <CTableRow v-for="item in tableItems" key={index}>
                      <CTableDataCell className="text-center">
                        <CAvatar size="md" src={item.avatar.src} status={item.avatar.status} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{item.user.name}</div>
                        <div className="small text-body-secondary text-nowrap">
                          <span>{item.user.new ? 'New' : 'Recurring'}</span> | Registered:{' '}
                          {item.user.registered}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CIcon size="xl" icon={item.country.flag} title={item.country.name} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex justify-content-between text-nowrap">
                          <div className="fw-semibold">{item.usage.value}%</div>
                          <div className="ms-3">
                            <small className="text-body-secondary">{item.usage.period}</small>
                          </div>
                        </div>
                        <CProgress thin color={item.usage.color} value={item.usage.value} />
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CIcon size="xl" icon={item.payment.icon} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small text-body-secondary text-nowrap">Last login</div>
                        <div className="fw-semibold text-nowrap">{item.activity}</div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
