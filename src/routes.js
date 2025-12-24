import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const DashboardREW = React.lazy(() => import('./views/dashboard/DashboardREW'))
const DashboardMP = React.lazy(() => import('./views/dashboard/DashboardMP'))

const AnagraficaDashboard = React.lazy(() => import('./views/anagrafica/AnagraficaDashboard'))
const AnagraficaCreate = React.lazy(() => import('./views/anagrafica/AnagraficaCreate'))
const AnagraficaList = React.lazy(() => import('./views/anagrafica/AnagraficaList'))
const AnagraficaDetail = React.lazy(() => import('./views/anagrafica/AnagraficaDetail'))

const PreventiviDashboard = React.lazy(() => import('./views/preventivi/PreventiviDashboard'))
const PreventiviCreate = React.lazy(() => import('./views/preventivi/PreventiviCreate'))
const PreventiviList = React.lazy(() => import('./views/preventivi/PreventiviList'))
const PreventiviDetail = React.lazy(() => import('./views/preventivi/PreventiviDetail'))

const DdtDashboard = React.lazy(() => import('./views/ddt/DdtDashboard'))
const DdtCreate = React.lazy(() => import('./views/ddt/DdtCreate'))
const DdtList = React.lazy(() => import('./views/ddt/DdtList'))
const DdtDetail = React.lazy(() => import('./views/ddt/DdtDetail'))

const FattureDashboard = React.lazy(() => import('./views/fatture/FattureDashboard'))
const FattureCreate = React.lazy(() => import('./views/fatture/FattureCreate'))
const FattureList = React.lazy(() => import('./views/fatture/FattureList'))
const FattureDetail = React.lazy(() => import('./views/fatture/FattureDetail'))

// Prodotti
const ProdottiDashboard = React.lazy(() => import('./views/prodotti/ProdottiDashboard'))
const ProdottiCreate = React.lazy(() => import('./views/prodotti/ProdottiCreate'))
const ProdottiList = React.lazy(() => import('./views/prodotti/ProdottiList'))
const ProdottiDetail = React.lazy(() => import('./views/prodotti/ProdottiDetail'))
const ProdottiCategorie = React.lazy(() => import('./views/prodotti/CategorieList'))
const ProdottiVariazioni = React.lazy(() => import('./views/prodotti/VariazioniList'))
// Pacchetti
const PacchettiList = React.lazy(() => import('./views/pacchetti/PacchettiList'))
const PacchettiCreate = React.lazy(() => import('./views/pacchetti/PacchettiCreate'))
const PacchettiDetail = React.lazy(() => import('./views/pacchetti/PacchettiDetail'))
// Contratti
const ContrattiList = React.lazy(() => import('./views/contratti/ContrattiList'))
const ContrattiCreate = React.lazy(() => import('./views/contratti/ContrattiCreate'))
const ContrattiDetail = React.lazy(() => import('./views/contratti/ContrattiDetail'))
// Pagamenti
const PagamentiDashboard = React.lazy(() => import('./views/pagamenti/PagamentiDashboard'))
const PagamentiList = React.lazy(() => import('./views/pagamenti/PagamentiList'))
const PagamentiDetail = React.lazy(() => import('./views/pagamenti/PagamentiDetail'))
const PagamentiImport = React.lazy(() => import('./views/pagamenti/PagamentiImport'))
const LavorazioniList = React.lazy(() => import('./views/lavorazioni/LavorazioniList'))
const LavorazioneDetail = React.lazy(() => import('./views/lavorazioni/LavorazioneDetail'))
const LavorazioniTemplates = React.lazy(() => import('./views/lavorazioni/LavorazioniTemplates'))
const AccountsList = React.lazy(() => import('./views/accounts/AccountsList'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/dashboardREW', name: 'DashboardREW', element: Dashboard },
  { path: '/dashboardMP', name: 'DashboardMP', element: Dashboard },
  { path: '/anagrafica/dashboard', name: 'Anagrafica - Dashboard', element: AnagraficaDashboard },
  { path: '/anagrafica/crea', name: 'Anagrafica - Crea nuova', element: AnagraficaCreate },
  { path: '/anagrafica/lista', name: 'Anagrafica - Lista', element: AnagraficaList },
  { path: '/anagrafica/dettagli', name: 'Anagrafica - Dettagli', element: AnagraficaDetail },
  { path: '/preventivi/dashboard', name: 'Preventivi - Dashboard', element: PreventiviDashboard },
  { path: '/preventivi/crea', name: 'Preventivi - Crea nuovo', element: PreventiviCreate },
  { path: '/preventivi/lista', name: 'Preventivi - Lista', element: PreventiviList },
  { path: '/preventivi/dettagli', name: 'Preventivi - Dettagli', element: PreventiviDetail },
  { path: '/ddt/dashboard', name: 'DDT - Dashboard', element: DdtDashboard },
  { path: '/ddt/crea', name: 'DDT - Crea nuovo', element: DdtCreate },
  { path: '/ddt/lista', name: 'DDT - Lista', element: DdtList },
  { path: '/ddt/dettagli', name: 'DDT - Dettagli', element: DdtDetail },
  { path: '/fatture/dashboard', name: 'Fatture - Dashboard', element: FattureDashboard },
  { path: '/fatture/crea', name: 'Fatture - Crea nuova', element: FattureCreate },
  { path: '/fatture/lista', name: 'Fatture - Lista', element: FattureList },
  { path: '/fatture/dettagli', name: 'Fatture - Dettagli', element: FattureDetail },
  { path: '/prodotti/dashboard', name: 'Prodotti - Dashboard', element: ProdottiDashboard },
  { path: '/prodotti/crea', name: 'Prodotti - Crea nuovo', element: ProdottiCreate },
  { path: '/prodotti/lista', name: 'Prodotti - Lista', element: ProdottiList },
  { path: '/prodotti/dettagli', name: 'Prodotti - Dettagli', element: ProdottiDetail },
  { path: '/prodotti/categorie', name: 'Prodotti - Categorie', element: ProdottiCategorie },
  { path: '/prodotti/variazioni', name: 'Prodotti - Variazioni', element: ProdottiVariazioni },
  { path: '/pacchetti/lista', name: 'Pacchetti - Lista', element: PacchettiList },
  { path: '/pacchetti/crea', name: 'Pacchetti - Crea nuovo', element: PacchettiCreate },
  { path: '/pacchetti/dettagli', name: 'Pacchetti - Dettagli', element: PacchettiDetail },
  { path: '/contratti/lista', name: 'Contratti - Lista', element: ContrattiList },
  { path: '/contratti/crea', name: 'Contratti - Crea nuovo', element: ContrattiCreate },
  { path: '/contratti/dettagli', name: 'Contratti - Dettagli', element: ContrattiDetail },
  { path: '/pagamenti/dashboard', name: 'Pagamenti - Dashboard', element: PagamentiDashboard },
  { path: '/pagamenti/lista', name: 'Pagamenti - Situazione', element: PagamentiList },
  { path: '/pagamenti/dettaglio', name: 'Pagamenti - Dettaglio', element: PagamentiDetail },
  { path: '/pagamenti/import', name: 'Pagamenti - Import', element: PagamentiImport },
  { path: '/lavorazioni/lista', name: 'Lavorazioni - Lista', element: LavorazioniList },
  { path: '/lavorazioni/dettaglio', name: 'Lavorazioni - Dettaglio', element: LavorazioneDetail },
  { path: '/lavorazioni/templates', name: 'Lavorazioni - Template attivita', element: LavorazioniTemplates },
  { path: '/accounts/lista', name: 'Account - Lista', element: AccountsList },
]

export default routes
