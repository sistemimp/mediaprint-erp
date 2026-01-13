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

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'
import { useAuth } from '../context/AuthContext'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { user } = useAuth()
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

  const filteredNavigation = React.useMemo(
    () => filterNavigation(navigation),
    [filterNavigation],
  )

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
      <AppSidebarNav items={filteredNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
