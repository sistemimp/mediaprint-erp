import React, { useMemo } from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'

import avatar8 from './../../assets/images/avatars/8.jpg'
import { useAuth } from '../../context/AuthContext'

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const { user, logout, avatarUrl } = useAuth()

  const displayName = useMemo(() => {
    if (!user) {
      return 'Account'
    }

    return user.name || user.username || user.email || 'Account'
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatarUrl || avatar8} size="md" />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {displayName}
        </CDropdownHeader>
        <CDropdownItem
          as="button"
          type="button"
          onClick={() => navigate('/profilo')}
        >
          <CIcon icon={cilUser} className="me-2" /> Profilo
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={handleLogout}>
          <CIcon icon={cilLockLocked} className="me-2" /> Esci
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
