import React from 'react'
import { CButton } from '@coreui/react'

import usePermissions from '../hooks/usePermissions'

const PermissionButton = ({ permission, permissions, hideWhenDenied = false, disabled, ...rest }) => {
  const { has, hasAny } = usePermissions()
  const allowed = permission ? has(permission) : (permissions ? hasAny(permissions) : true)

  if (!allowed && hideWhenDenied) {
    return null
  }

  return <CButton {...rest} disabled={disabled || !allowed} />
}

export default PermissionButton
