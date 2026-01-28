import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilMoney,
  cilNotes,
  cilSpeedometer,
  cilTruck,
  cilUser,
  cilTags,
  cilLibraryAdd,
  cilCreditCard,
  cilViewColumn,
  cilChatBubble,
  cilPeople,
  cilDescription,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Prodotti',
    icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
    permissions: ['prod.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard e fatturazione',
        to: '/prodotti/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuovo Prodotto',
        to: '/prodotti/crea',
        permission: 'prod.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/prodotti/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/prodotti/dettagli',
      },
      {
        component: CNavItem,
        name: 'Categorie',
        to: '/prodotti/categorie',
      },
      {
        component: CNavItem,
        name: 'Variazioni',
        to: '/prodotti/variazioni',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Pacchetti',
    icon: <CIcon icon={cilLibraryAdd} customClassName="nav-icon" />,
    permissions: ['pack.read'],
    items: [
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/pacchetti/crea',
        permission: 'pack.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/pacchetti/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/pacchetti/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Contratti',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    permissions: ['contr.read'],
    items: [
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/contratti/crea',
        permission: 'contr.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/contratti/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/contratti/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Anagrafica',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    permissions: ['anag.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/anagrafica/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuova',
        to: '/anagrafica/crea',
        permission: 'anag.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/anagrafica/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/anagrafica/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Account',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    permissions: ['acct.read'],
    items: [
      {
        component: CNavItem,
        name: 'Lista',
        to: '/accounts/lista',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Preventivi',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    permissions: ['prev.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/preventivi/dashboard',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/preventivi/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/preventivi/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'DDT',
    icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
    permissions: ['ddt.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/ddt/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/ddt/crea',
        permission: 'ddt.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/ddt/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/ddt/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Fatture',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    permissions: ['fatt.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/fatture/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuova',
        to: '/fatture/crea',
        permission: 'fatt.create',
      },
      {
        component: CNavItem,
        name: 'Lista',
        to: '/fatture/lista',
      },
      {
        component: CNavItem,
        name: 'Dettagli',
        to: '/fatture/dettagli',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Pagamenti',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
    permissions: ['pay.read'],
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/pagamenti/dashboard',
      },
      {
        component: CNavItem,
        name: 'Situazione',
        to: '/pagamenti/lista',
      },
      {
        component: CNavItem,
        name: 'Importa',
        to: '/pagamenti/import',
        permission: 'pay.write',
      },
      {
        component: CNavItem,
        name: 'Dettaglio',
        to: '/pagamenti/dettaglio',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Lavorazioni',
    icon: <CIcon icon={cilViewColumn} customClassName="nav-icon" />,
    permissions: ['job.read'],
    items: [
      {
        component: CNavItem,
        name: 'Planner e lista',
        to: '/lavorazioni/lista',
      },
      {
        component: CNavItem,
        name: 'Dettaglio',
        to: '/lavorazioni/dettaglio',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Messaggi',
    to: '/messaggi',
    icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
    permissions: ['msg.read'],
  },
]

export default _nav
