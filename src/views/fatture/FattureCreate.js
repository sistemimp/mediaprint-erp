import React from 'react'
import { useLocation } from 'react-router-dom'
import SectionPlaceholder from '../shared/SectionPlaceholder'

const FattureCreate = () => {
  const location = useLocation()
  const isAcquisto = location.pathname.includes('/acquisti/')
  const title = isAcquisto ? 'Fatture acquisto - Crea nuova' : 'Fatture - Crea nuova'
  const subtitle = isAcquisto
    ? 'Prepara la schermata per l\'inserimento di una nuova fattura di acquisto.'
    : 'Prepara la schermata per l\'emissione di una nuova fattura.'
  return (
    <SectionPlaceholder
      title={title}
      subtitle={subtitle}
    />
  )
}

export default FattureCreate
