import React from 'react'
import { CRow, CCol } from '@coreui/react'
import { useAuth } from '../../context/AuthContext'
import MyActivitiesSection from '../profile/MyActivitiesSection'

const AttivitaPage = () => {
  const { token, user } = useAuth()

  return (
    <CRow>
      <CCol xs={12}>
        <MyActivitiesSection token={token} userId={user?.id} />
      </CCol>
    </CRow>
  )
}

export default AttivitaPage
