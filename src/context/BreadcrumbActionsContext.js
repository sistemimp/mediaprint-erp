import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const BreadcrumbActionsContext = createContext(null)

export const BreadcrumbActionsProvider = ({ children }) => {
  const [actions, setActions] = useState([])

  const value = useMemo(
    () => ({
      actions,
      setActions,
    }),
    [actions],
  )

  return (
    <BreadcrumbActionsContext.Provider value={value}>
      {children}
    </BreadcrumbActionsContext.Provider>
  )
}

export const useBreadcrumbActionsContext = () => {
  const context = useContext(BreadcrumbActionsContext)
  if (!context) {
    throw new Error('useBreadcrumbActionsContext must be used within a BreadcrumbActionsProvider')
  }
  return context
}

export const useBreadcrumbActions = () => {
  const { setActions } = useBreadcrumbActionsContext()

  const setBreadcrumbActions = useCallback(
    (nextActions) => {
      setActions(Array.isArray(nextActions) ? nextActions : [])
    },
    [setActions],
  )

  const clearBreadcrumbActions = useCallback(() => {
    setActions([])
  }, [setActions])

  return { setBreadcrumbActions, clearBreadcrumbActions }
}
