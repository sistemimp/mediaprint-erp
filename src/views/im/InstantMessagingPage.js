import React from 'react'
import { CContainer } from '@coreui/react'
import InstantMessagingPanel from '../../components/InstantMessagingPanel'

// Pagina contenitore del pannello messaggistica istantanea interna.
const InstantMessagingPage = () => {
  return (
    <CContainer fluid className="py-4">
      <InstantMessagingPanel />
    </CContainer>
  )
}

export default InstantMessagingPage
