import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const usePermissions = () => {
  const { user } = useAuth()

  const permissionSet = useMemo(() => {
    const perms = Array.isArray(user?.permissions) ? user.permissions : []
    return new Set(
      perms
        .map((permission) => permission?.code)
        .filter((code) => typeof code === 'string' && code.trim() !== ''),
    )
  }, [user])

  const has = (code) => permissionSet.has(code)
  const hasAny = (codes) => Array.isArray(codes) && codes.some((code) => permissionSet.has(code))

  return { has, hasAny }
}

export default usePermissions
