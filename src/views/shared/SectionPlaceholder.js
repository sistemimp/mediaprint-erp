import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

// Vista SectionPlaceholder: componente UI del modulo.
const SectionPlaceholder = ({ title, subtitle }) => {
  return (
    <CCard>
      <CCardHeader>
        <h2 className="h5 mb-0">{title}</h2>
      </CCardHeader>
      <CCardBody>
        <p className="text-body-secondary mb-0">{subtitle}</p>
      </CCardBody>
    </CCard>
  )
}

export default SectionPlaceholder
