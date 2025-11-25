import React from 'react'
import { useLocation } from 'react-router-dom'

import routes from '../routes'

import { CBreadcrumb, CBreadcrumbItem, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave } from '@coreui/icons'
import { useBreadcrumbActionsContext } from '../context/BreadcrumbActionsContext'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const { actions } = useBreadcrumbActionsContext()

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`
      const routeName = getRouteName(currentPathname, routes)
      routeName &&
        breadcrumbs.push({
          pathname: currentPathname,
          name: routeName,
          active: index + 1 === array.length ? true : false,
        })
      return currentPathname
    })
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)

  return (
    <div className="d-flex align-items-center gap-3 w-100">
      <CBreadcrumb className="my-0 flex-grow-1">
        <CBreadcrumbItem href="/">Home</CBreadcrumbItem>
        {breadcrumbs.map((breadcrumb, index) => {
          return (
            <CBreadcrumbItem
              {...(breadcrumb.active ? { active: true } : { href: breadcrumb.pathname })}
              key={index}
            >
              {breadcrumb.name}
            </CBreadcrumbItem>
          )
        })}
      </CBreadcrumb>
      {Array.isArray(actions) && actions.length > 0 && (
        <div className="d-flex align-items-center gap-2 ms-auto">
          {actions.map((action) => {
            const {
              id,
              icon,
              label,
              onClick,
              disabled,
              color = 'primary',
              variant = 'ghost',
            } = action
            const key = id || label || 'breadcrumb-action'
            return (
              <CButton
                key={key}
                color={color}
                variant={variant}
                size="sm"
                className="breadcrumb-action-btn p-2"
                aria-label={label || 'Azione'}
                title={label || ''}
                onClick={onClick}
                disabled={disabled}
              >
                <CIcon icon={icon || cilSave} size="lg" />
                {label && <span className="visually-hidden">{label}</span>}
              </CButton>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default React.memo(AppBreadcrumb)
