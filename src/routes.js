import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const DashboardREW = React.lazy(() => import('./views/dashboard/DashboardREW'))
const DashboardMP = React.lazy(() => import('./views/dashboard/DashboardMP'))

const AnagraficaCreate = React.lazy(() => import('./views/anagrafica/AnagraficaCreate'))
const AnagraficaList = React.lazy(() => import('./views/anagrafica/AnagraficaList'))
const AnagraficaDetail = React.lazy(() => import('./views/anagrafica/AnagraficaDetail'))

const PreventiviCreate = React.lazy(() => import('./views/preventivi/PreventiviCreate'))
const PreventiviList = React.lazy(() => import('./views/preventivi/PreventiviList'))
const PreventiviDetail = React.lazy(() => import('./views/preventivi/PreventiviDetail'))

const DdtCreate = React.lazy(() => import('./views/ddt/DdtCreate'))
const DdtList = React.lazy(() => import('./views/ddt/DdtList'))
const DdtDetail = React.lazy(() => import('./views/ddt/DdtDetail'))

const FattureCreate = React.lazy(() => import('./views/fatture/FattureCreate'))
const FattureList = React.lazy(() => import('./views/fatture/FattureList'))
const FattureDetail = React.lazy(() => import('./views/fatture/FattureDetail'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/dashboardREW', name: 'DashboardREW', element: Dashboard },
  { path: '/dashboardMP', name: 'DashboardMP', element: Dashboard },
  { path: '/anagrafica/crea', name: 'Anagrafica - Crea nuova', element: AnagraficaCreate },
  { path: '/anagrafica/lista', name: 'Anagrafica - Lista', element: AnagraficaList },
  { path: '/anagrafica/dettagli', name: 'Anagrafica - Dettagli', element: AnagraficaDetail },
  { path: '/preventivi/crea', name: 'Preventivi - Crea nuovo', element: PreventiviCreate },
  { path: '/preventivi/lista', name: 'Preventivi - Lista', element: PreventiviList },
  { path: '/preventivi/dettagli', name: 'Preventivi - Dettagli', element: PreventiviDetail },
  { path: '/ddt/crea', name: 'DDT - Crea nuovo', element: DdtCreate },
  { path: '/ddt/lista', name: 'DDT - Lista', element: DdtList },
  { path: '/ddt/dettagli', name: 'DDT - Dettagli', element: DdtDetail },
  { path: '/fatture/crea', name: 'Fatture - Crea nuova', element: FattureCreate },
  { path: '/fatture/lista', name: 'Fatture - Lista', element: FattureList },
  { path: '/fatture/dettagli', name: 'Fatture - Dettagli', element: FattureDetail },
]

export default routes
