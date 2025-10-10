import React, { useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { CWidgetStatsA } from '@coreui/react'
import { getStyle } from '@coreui/utils'
import { CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilOptions } from '@coreui/icons'

/**
 * Componente widget singolo, “data-driven”.
 * - Nessuna fetch: tutto arriva via props.statsJson
 * - Props minime:
 *    - title: string (es. "Users")
 *    - color: CoreUI color (es. "primary", "info", "warning", "danger")
 *    - statsJson: {
 *        kpi: { totale_generale: number, perc_change_mom: number|null },
 *        series: Array<{ mese: string, tot: number }>
 *      }
 *    - showMenu: boolean (mostra il menu icona opzioni, opzionale)
 *    - numberFormat: (n:number)=>string (formatter personalizzato, opzionale)
 */
const UsersWidget = ({
  className,
  title = 'Users',
  color = 'primary',
  statsJson,
  showMenu = false,
  numberFormat,
}) => {
  const widgetChartRef = useRef(null)

  // aggiorna il point color quando cambia il tema CoreUI
  useEffect(() => {
    const handler = () => {
      if (widgetChartRef.current) {
        setTimeout(() => {
          widgetChartRef.current.data.datasets[0].pointBackgroundColor = getStyle(`--cui-${color}`)
          widgetChartRef.current.update()
        })
      }
    }
    document.documentElement.addEventListener('ColorSchemeChange', handler)
    return () => document.documentElement.removeEventListener('ColorSchemeChange', handler)
  }, [color])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fmtNumber =
    numberFormat ||
    ((n) => (n == null ? '—' : Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n)))

  const chartData = useMemo(() => {
    const labels = statsJson?.series?.map((s) => s.mese) ?? ['—']
    const data = statsJson?.series?.map((s) => Number(s.tot) || 0) ?? [0]
    return {
      labels,
      datasets: [
        {
          label: 'Nuovi clienti',
          backgroundColor: 'transparent',
          borderColor: 'rgba(255,255,255,.55)',
          pointBackgroundColor: getStyle(`--cui-${color}`),
          data,
        },
      ],
    }
  }, [statsJson, color])

  const valueNode = useMemo(() => {
    const tot = fmtNumber(statsJson?.kpi?.totale_generale)
    const delta = statsJson?.kpi?.perc_change_mom
    const hasDelta = typeof delta === 'number'
    const isUp = hasDelta && delta >= 0
    const arrow = isUp ? cilArrowTop : cilArrowBottom
    const deltaTxt = hasDelta ? `${delta}%` : 'n/a'
    return (
      <>
        {tot}{' '}
        <span className="fs-6 fw-normal">
          ({deltaTxt} <CIcon icon={arrow} />)
        </span>
      </>
    )
  }, [statsJson, fmtNumber])

  return (
    <CWidgetStatsA
      className={className}
      color={color}
      value={valueNode}
      title={title}
      action={
        showMenu ? (
          <button
            type="button"
            className="btn btn-link text-white p-0"
            title="Options"
            aria-label="Options"
          >
            <CIcon icon={cilOptions} />
          </button>
        ) : null
      }
      chart={
        <CChartLine
          ref={widgetChartRef}
          className="mt-3 mx-3"
          style={{ height: '70px' }}
          data={chartData}
          options={{
            plugins: { legend: { display: false } },
            maintainAspectRatio: false,
            scales: {
              x: {
                border: { display: false },
                grid: { display: false, drawBorder: false },
                ticks: { display: false },
              },
              y: {
                display: false,
                grid: { display: false },
                ticks: { display: false },
              },
            },
            elements: {
              line: { borderWidth: 1, tension: 0.4 },
              point: { radius: 4, hitRadius: 10, hoverRadius: 4 },
            },
          }}
        />
      }
    />
  )
}

UsersWidget.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  color: PropTypes.oneOf(['primary', 'info', 'warning', 'danger', 'success', 'secondary', 'dark']),
  statsJson: PropTypes.shape({
    kpi: PropTypes.shape({
      totale_generale: PropTypes.number,
      perc_change_mom: PropTypes.number, // può essere null
    }),
    series: PropTypes.arrayOf(
      PropTypes.shape({
        mese: PropTypes.string.isRequired, // es. "2025-05"
        tot: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      })
    ),
  }).isRequired,
  showMenu: PropTypes.bool,
  numberFormat: PropTypes.func,
}

export default UsersWidget
