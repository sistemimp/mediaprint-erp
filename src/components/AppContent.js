import React, { Suspense, useEffect, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'
import { useAuth } from '../context/AuthContext'

const AppContent = () => {
  const location = useLocation()
  const { user } = useAuth()

  const permissionSet = useMemo(() => {
    const perms = Array.isArray(user?.permissions) ? user.permissions : []
    return new Set(
      perms
        .map((permission) => permission?.code)
        .filter((code) => typeof code === 'string' && code.trim() !== ''),
    )
  }, [user])

  const moduleKey = useMemo(() => {
    const pathname = location.pathname.toLowerCase()
    const map = [
      ['/prodotti', 'prod'],
      ['/pacchetti', 'pack'],
      ['/contratti', 'contr'],
      ['/anagrafica', 'anag'],
      ['/accounts', 'acct'],
      ['/preventivi', 'prev'],
      ['/ddt', 'ddt'],
      ['/fatture', 'fatt'],
      ['/pagamenti', 'pay'],
      ['/lavorazioni', 'job'],
      ['/magazzino', 'prod'],
      ['/messaggi', 'msg'],
      ['/acquisti/preventivi', 'prev'],
      ['/acquisti/richieste', 'prev'],
      ['/acquisti/fatture', 'fatt'],
      ['/tickets', 'bug'],
    ]
    const match = map.find(([prefix]) => pathname.startsWith(prefix))
    return match ? match[1] : null
  }, [location.pathname])

  const readOnly = useMemo(() => {
    if (!moduleKey) {
      return false
    }
    const canRead = permissionSet.has(`${moduleKey}.read`)
    const canEdit = permissionSet.has(`${moduleKey}.write`) || permissionSet.has(`${moduleKey}.create`)
    return canRead && !canEdit
  }, [moduleKey, permissionSet])

  useEffect(() => {
    document.body.classList.toggle('read-only-mode', readOnly)
    return () => {
      document.body.classList.remove('read-only-mode')
    }
  }, [readOnly])

  return (
    <CContainer className="px-4" lg data-readonly={readOnly ? 'true' : 'false'}>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes location={location} key={`${location.pathname}${location.search}`}>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={<route.element />}
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default AppContent
