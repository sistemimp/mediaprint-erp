/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useState } from 'react'
import { CWidgetStatsD, CRow, CCol } from '@coreui/react'
import { CChart } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilCalendar } from '@coreui/icons'
import { fetchAnagraficheDash } from '../../services/dashboard'

// Vista WidgetsBrand: componente UI del modulo.
const WidgetsBrand = (props) => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchAnagraficheDash({ onlyActive: true })
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const chartOptions = { /* tuoi options invariati */ }

  const chartData = useMemo(() => {
    if (!stats) return null
    const labels = stats.series.map(s => s.mese) // ['2025-05','...','2025-10']
    const data = stats.series.map(s => Number(s.tot))
    return {
      labels,
      datasets: [{
        backgroundColor: 'rgba(255,255,255,.1)',
        borderColor: 'rgba(255,255,255,.55)',
        pointHoverBackgroundColor: '#fff',
        borderWidth: 2,
        data,
        fill: true,
      }],
    }
  }, [stats])

  return (
    <CRow className={props.className} xs={{ gutter: 4 }}>
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsD
          {...(props.withCharts && chartData && {
            chart: (
              <CChart
                className="position-absolute w-100 h-100"
                type="line"
                data={chartData}
                options={chartOptions}
              />
            ),
          })}
          icon={<CIcon icon={cilCalendar} height={52} className="my-4 text-white" />}
          values={[
            { title: 'Users', value: stats ? String(stats.kpi.totale_generale) : '—' },
            {
              title: 'trend MoM',
              value: stats?.kpi.perc_change_mom != null ? `${stats.kpi.perc_change_mom}%` : 'n/a',
            },
          ]}
          style={{ '--cui-card-cap-bg': '#6f42c1' }}
        />
      </CCol>
      {/* gli altri widget restano come sono, oppure replichi la stessa logica */}
    </CRow>
  )
}

export default WidgetsBrand
