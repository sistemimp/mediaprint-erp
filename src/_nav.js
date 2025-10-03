import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilMoney, cilNotes, cilSpeedometer, cilTruck, cilUser } from '@coreui/icons'
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
    name: 'Anagrafica',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    items: [
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
]

export default _nav
