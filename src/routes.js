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

// Prodotti
const ProdottiCreate = React.lazy(() => import('./views/prodotti/ProdottiCreate'))
const ProdottiList = React.lazy(() => import('./views/prodotti/ProdottiList'))
const ProdottiDetail = React.lazy(() => import('./views/prodotti/ProdottiDetail'))
const ProdottiCategorie = React.lazy(() => import('./views/prodotti/CategorieList'))
const ProdottiVariazioni = React.lazy(() => import('./views/prodotti/VariazioniList'))
// Pacchetti
const PacchettiList = React.lazy(() => import('./views/pacchetti/PacchettiList'))
const PacchettiCreate = React.lazy(() => import('./views/pacchetti/PacchettiCreate'))
const PacchettiDetail = React.lazy(() => import('./views/pacchetti/PacchettiDetail'))
// Pagamenti
const PagamentiList = React.lazy(() => import('./views/pagamenti/PagamentiList'))
const PagamentiDetail = React.lazy(() => import('./views/pagamenti/PagamentiDetail'))
const PagamentiImport = React.lazy(() => import('./views/pagamenti/PagamentiImport'))

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
  { path: '/prodotti/crea', name: 'Prodotti - Crea nuovo', element: ProdottiCreate },
  { path: '/prodotti/lista', name: 'Prodotti - Lista', element: ProdottiList },
  { path: '/prodotti/dettagli', name: 'Prodotti - Dettagli', element: ProdottiDetail },
  { path: '/prodotti/categorie', name: 'Prodotti - Categorie', element: ProdottiCategorie },
  { path: '/prodotti/variazioni', name: 'Prodotti - Variazioni', element: ProdottiVariazioni },
  { path: '/pacchetti/lista', name: 'Pacchetti - Lista', element: PacchettiList },
  { path: '/pacchetti/crea', name: 'Pacchetti - Crea nuovo', element: PacchettiCreate },
  { path: '/pacchetti/dettagli', name: 'Pacchetti - Dettagli', element: PacchettiDetail },
  { path: '/pagamenti/lista', name: 'Pagamenti - Situazione', element: PagamentiList },
  { path: '/pagamenti/dettaglio', name: 'Pagamenti - Dettaglio', element: PagamentiDetail },
  { path: '/pagamenti/import', name: 'Pagamenti - Import', element: PagamentiImport },
]

export default routes
