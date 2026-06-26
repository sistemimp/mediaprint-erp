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
const PagamentiFondi = React.lazy(() => import('./views/pagamenti/PagamentiFondi'))
const LavorazioniList = React.lazy(() => import('./views/lavorazioni/LavorazioniList'))
const LavorazioneDetail = React.lazy(() => import('./views/lavorazioni/LavorazioneDetail'))
const LavorazioniTemplates = React.lazy(() => import('./views/lavorazioni/LavorazioniTemplates'))
const MagazzinoPage = React.lazy(() => import('./views/magazzino/MagazzinoPage'))
const MagazzinoMovimentiPage = React.lazy(() => import('./views/magazzino/MagazzinoMovimentiPage'))
const MagazzinoConsumiPage = React.lazy(() => import('./views/magazzino/MagazzinoConsumiPage'))
const InstantMessagingPage = React.lazy(() => import('./views/im/InstantMessagingPage'))
const NotificationsList = React.lazy(() => import('./views/notifiche/NotificationsList'))
const AccountsList = React.lazy(() => import('./views/accounts/AccountsList'))
const AccountsDetail = React.lazy(() => import('./views/accounts/AccountsDetail'))
const Profile = React.lazy(() => import('./views/profile/Profile'))
const AttivitaPage = React.lazy(() => import('./views/attivita/AttivitaPage'))
const TicketsList = React.lazy(() => import('./views/tickets/TicketsList'))
const TicketsDetail = React.lazy(() => import('./views/tickets/TicketsDetail'))
const AcquistiRichiesteList = React.lazy(() => import('./views/acquisti/AcquistiRichiesteList'))
const AcquistiRichiesteDetail = React.lazy(() => import('./views/acquisti/AcquistiRichiesteDetail'))
const ReleaseNotesTimeline = React.lazy(() => import('./views/release-notes/ReleaseNotesTimeline'))
const CrmPlusDashboard = React.lazy(() => import('./views/crm/CrmPlusDashboard'))
const CrmPlusComunicazioni = React.lazy(() => import('./views/crm/CrmPlusComunicazioni'))
const CrmPlusConversazioni = React.lazy(() => import('./views/crm/CrmPlusConversazioni'))
const CrmPlusEmailArchivio = React.lazy(() => import('./views/crm/CrmPlusEmailArchivio'))
const CrmPlusEmailDetail = React.lazy(() => import('./views/crm/CrmPlusEmailDetail'))
const CrmPlusRegistri = React.lazy(() => import('./views/crm/CrmPlusRegistri'))
const CrmPlusStatiLavorazione = React.lazy(() => import('./views/crm/CrmPlusStatiLavorazione'))

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
  {
    path: '/acquisti/preventivi/dashboard',
    name: 'Preventivi acquisto - Dashboard',
    element: PreventiviDashboard,
  },
  {
    path: '/acquisti/preventivi/crea',
    name: 'Preventivi acquisto - Crea nuovo',
    element: PreventiviCreate,
  },
  {
    path: '/acquisti/preventivi/lista',
    name: 'Preventivi acquisto - Lista',
    element: PreventiviList,
  },
  {
    path: '/acquisti/preventivi/dettagli',
    name: 'Preventivi acquisto - Dettagli',
    element: PreventiviDetail,
  },
  { path: '/ddt/dashboard', name: 'DDT - Dashboard', element: DdtDashboard },
  { path: '/ddt/crea', name: 'DDT - Crea nuovo', element: DdtCreate },
  { path: '/ddt/lista', name: 'DDT - Lista', element: DdtList },
  { path: '/ddt/dettagli', name: 'DDT - Dettagli', element: DdtDetail },
  { path: '/fatture/dashboard', name: 'Fatture - Dashboard', element: FattureDashboard },
  { path: '/fatture/crea', name: 'Fatture - Crea nuova', element: FattureCreate },
  { path: '/fatture/lista', name: 'Fatture - Lista', element: FattureList },
  { path: '/fatture/dettagli', name: 'Fatture - Dettagli', element: FattureDetail },
  {
    path: '/acquisti/fatture/dashboard',
    name: 'Fatture acquisto - Dashboard',
    element: FattureDashboard,
  },
  { path: '/acquisti/fatture/crea', name: 'Fatture acquisto - Crea nuova', element: FattureCreate },
  { path: '/acquisti/fatture/lista', name: 'Fatture acquisto - Lista', element: FattureList },
  {
    path: '/acquisti/fatture/dettagli',
    name: 'Fatture acquisto - Dettagli',
    element: FattureDetail,
  },
  {
    path: '/acquisti/richieste/lista',
    name: 'Acquisti - Richieste ticket - Lista',
    element: AcquistiRichiesteList,
  },
  {
    path: '/acquisti/richieste/dettagli',
    name: 'Acquisti - Richieste ticket - Dettagli',
    element: AcquistiRichiesteDetail,
  },
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
  { path: '/pagamenti/fondi', name: 'Pagamenti - Fondi cliente', element: PagamentiFondi },
  { path: '/lavorazioni/lista', name: 'Lavorazioni - Lista', element: LavorazioniList },
  { path: '/lavorazioni/dettaglio', name: 'Lavorazioni - Dettaglio', element: LavorazioneDetail },
  {
    path: '/lavorazioni/templates',
    name: 'Lavorazioni - Template attivita',
    element: LavorazioniTemplates,
  },
  { path: '/magazzino', name: 'Magazzino', element: MagazzinoPage },
  { path: '/magazzino/movimenti', name: 'Magazzino - Movimenti', element: MagazzinoMovimentiPage },
  {
    path: '/magazzino/consumi',
    name: 'Magazzino - Distinta consumi',
    element: MagazzinoConsumiPage,
  },
  { path: '/messaggi', name: 'Messaggi', element: InstantMessagingPage },
  { path: '/notifiche', name: 'Notifiche', element: NotificationsList },
  { path: '/accounts/lista', name: 'Account - Lista', element: AccountsList },
  { path: '/accounts/dettagli', name: 'Account - Dettagli', element: AccountsDetail },
  { path: '/profilo', name: 'Profilo', element: Profile },
  { path: '/attivita', name: 'Attivita', element: AttivitaPage },
  { path: '/tickets/lista', name: 'Ticketing - Lista', element: TicketsList },
  { path: '/tickets/dettagli', name: 'Ticketing - Dettagli', element: TicketsDetail },
  { path: '/release-notes', name: 'Note di aggiornamento', element: ReleaseNotesTimeline },
  { path: '/crm/dashboard', name: 'CRM - Dashboard', element: CrmPlusDashboard },
  { path: '/crm/comunicazioni', name: 'CRM - Comunicazioni', element: CrmPlusComunicazioni },
  { path: '/crm/conversazioni', name: 'CRM - Tutte conversazioni', element: CrmPlusConversazioni },
  { path: '/crm/email-archivio', name: 'CRM - Archivio Email', element: CrmPlusEmailArchivio },
  { path: '/crm/email-dettaglio', name: 'CRM - Dettaglio Email', element: CrmPlusEmailDetail },
  { path: '/crm/registri', name: 'CRM - Registri', element: CrmPlusRegistri },
  {
    path: '/crm/stati-lavorazione',
    name: 'CRM - Stati lavorazione',
    element: CrmPlusStatiLavorazione,
  },
  { path: '/crm-plus/dashboard', name: 'CRM - Dashboard (legacy)', element: CrmPlusDashboard },
  {
    path: '/crm-plus/comunicazioni',
    name: 'CRM - Comunicazioni (legacy)',
    element: CrmPlusComunicazioni,
  },
  {
    path: '/crm-plus/conversazioni',
    name: 'CRM - Tutte conversazioni (legacy)',
    element: CrmPlusConversazioni,
  },
  {
    path: '/crm-plus/email-archivio',
    name: 'CRM - Archivio Email (legacy)',
    element: CrmPlusEmailArchivio,
  },
  {
    path: '/crm-plus/email-dettaglio',
    name: 'CRM - Dettaglio Email (legacy)',
    element: CrmPlusEmailDetail,
  },
  { path: '/crm-plus/registri', name: 'CRM - Registri (legacy)', element: CrmPlusRegistri },
  {
    path: '/crm-plus/stati-lavorazione',
    name: 'CRM - Stati lavorazione (legacy)',
    element: CrmPlusStatiLavorazione,
  },
]

export default routes
