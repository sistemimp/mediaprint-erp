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
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/prodotti/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/prodotti/crea',
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
    items: [
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/pacchetti/crea',
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
    name: 'Anagrafica',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
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
    name: 'Preventivi',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Dashboard',
        to: '/preventivi/dashboard',
      },
      {
        component: CNavItem,
        name: 'Crea nuovo',
        to: '/preventivi/crea',
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
    name: 'Live Chat',
    to: '/chat',
    icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
  },
]

export default _nav
