import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'
import { useAuth } from '../context/AuthContext'
import { fetchMagazzinoStock } from '../services/magazzino'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { user, token } = useAuth()
  const [hasWarehouseAlerts, setHasWarehouseAlerts] = React.useState(false)
  const permissions = React.useMemo(() => {
    if (!Array.isArray(user?.permissions)) {
      return new Set()
    }
    return new Set(
      user.permissions
        .map((permission) => permission?.code)
        .filter((code) => typeof code === 'string' && code.trim() !== ''),
    )
  }, [user])

  const filterNavigation = React.useCallback(
    (items) => {
      if (!Array.isArray(items)) {
        return []
      }

      const hasPermission = (required) => {
        if (!Array.isArray(required) || required.length === 0) {
          return true
        }
        return required.some((code) => permissions.has(code))
      }

      return items.reduce((acc, item) => {
        const required = item.permissions ?? (item.permission ? [item.permission] : null)
        if (item.items) {
          const children = filterNavigation(item.items)
          if (children.length === 0 || !hasPermission(required)) {
            return acc
          }
          acc.push({ ...item, items: children })
          return acc
        }

        if (!hasPermission(required)) {
          return acc
        }

        acc.push(item)
        return acc
      }, [])
    },
    [permissions],
  )

  const filteredNavigation = React.useMemo(() => filterNavigation(navigation), [filterNavigation])
  const navigationWithAlerts = React.useMemo(() => {
    if (!hasWarehouseAlerts) {
      return filteredNavigation
    }

    return filteredNavigation.map((item) => {
      const isWarehouseGroup =
        String(item?.name || '')
          .trim()
          .toLowerCase() === 'magazzino' ||
        item?.to === '/magazzino' ||
        (Array.isArray(item?.items) &&
          item.items.some((child) => String(child?.to || '').startsWith('/magazzino')))

      if (!isWarehouseGroup) {
        return item
      }

      return {
        ...item,
        name: (
          <span>
            Magazzino{' '}
            <CIcon
              icon={cilWarning}
              size="sm"
              className="text-warning"
              title="Scorte basse o esaurite"
            />
          </span>
        ),
      }
    })
  }, [filteredNavigation, hasWarehouseAlerts])

  React.useEffect(() => {
    if (!token) {
      setHasWarehouseAlerts(false)
      return undefined
    }

    let active = true
    let timerId = null

    const checkWarehouseAlerts = async () => {
      try {
        const { items } = await fetchMagazzinoStock({
          token,
          only_alerts: true,
          include_unmanaged: false,
        })
        if (!active) {
          return
        }
        setHasWarehouseAlerts(Array.isArray(items) && items.length > 0)
      } catch (_) {
        if (!active) {
          return
        }
        setHasWarehouseAlerts(false)
      }
    }

    checkWarehouseAlerts()
    const handleMovementUpdate = () => {
      checkWarehouseAlerts()
    }
    window.addEventListener('magazzino:movement-updated', handleMovementUpdate)
    timerId = window.setInterval(checkWarehouseAlerts, 60000)

    return () => {
      active = false
      window.removeEventListener('magazzino:movement-updated', handleMovementUpdate)
      if (timerId) {
        window.clearInterval(timerId)
      }
    }
  }, [token])

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigationWithAlerts} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
