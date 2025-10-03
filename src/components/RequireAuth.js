import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

import { useAuth } from '../context/AuthContext'

const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default RequireAuth
