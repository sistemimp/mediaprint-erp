import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch, AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, buildApiUrl } from '../services/apiClient'
import { fetchProfileAvatar } from '../services/profileAvatar'

const AuthContext = createContext({
  token: null,
  user: null,
  avatarUrl: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  mfaChallenge: null,
  passkeyChallenge: null,
  login: async () => {},
  verifyMfaCode: async () => {},
  requestPasskeyChallenge: async () => {},
  verifyPasskeyCredential: async () => {},
  clearMfaChallenge: () => {},
  logout: () => {},
  refreshAvatar: async () => null,
  updateUserSnapshot: () => {},
})

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''

const isValidRole = (role) =>
  role &&
  typeof role === 'object' &&
  Number.isFinite(Number(role.id)) &&
  isNonEmptyString(role.code) &&
  isNonEmptyString(role.label)

const isValidPermission = (permission) =>
  permission &&
  typeof permission === 'object' &&
  Number.isFinite(Number(permission.id)) &&
  isNonEmptyString(permission.code) &&
  isNonEmptyString(permission.label)

const isValidStoredUser = (storedUser) => {
  if (!storedUser || typeof storedUser !== 'object') {
    return false
  }

  if (!Number.isFinite(Number(storedUser.id))) {
    return false
  }

  if (!isNonEmptyString(storedUser.accountType)) {
    return false
  }

  if (!isNonEmptyString(storedUser.username) || !isNonEmptyString(storedUser.email)) {
    return false
  }

  if (typeof storedUser.mustChangePassword !== 'boolean' || typeof storedUser.hasMfa !== 'boolean') {
    return false
  }

  if (!Array.isArray(storedUser.roles) || !storedUser.roles.every(isValidRole)) {
    return false
  }

  if (!Array.isArray(storedUser.permissions) || !storedUser.permissions.every(isValidPermission)) {
    return false
  }

  return true
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!storedUser) {
      return null
    }

    try {
      return JSON.parse(storedUser)
    } catch (_error) {
      return null
    }
  })
  const [avatarUrl, setAvatarUrl] = useState(null)
  const avatarUrlRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mfaChallenge, setMfaChallenge] = useState(null)
  const [passkeyChallenge, setPasskeyChallenge] = useState(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    }
  }, [user])

  const login = useCallback(async ({ username, password }) => {
    const configuredLoginUrl = import.meta.env.VITE_AUTH_LOGIN_URL
    const loginUrl =
      configuredLoginUrl && configuredLoginUrl.trim() !== ''
        ? configuredLoginUrl.trim()
        : buildApiUrl('/login.php').toString()

    if (!loginUrl) {
      throw new Error('Login endpoint is not configured (missing VITE_AUTH_LOGIN_URL).')
    }

    setLoading(true)
    setError(null)
    setMfaChallenge(null)

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const message = errorBody?.message || 'Credenziali non valide o errore del server.'
        throw new Error(message)
      }

      const data = await response.json()

      if (data?.mfa_required && data?.account?.id_account && data?.mfa_token) {
        setMfaChallenge({
          token: data.mfa_token,
          method: data.mfa_method || 'otp',
          qrUri: data.mfa_otpauth_uri ?? null,
          account: data.account,
        })
        setPasskeyChallenge(null)
        return data
      }

      if (!data?.token) {
        throw new Error('La risposta del server non contiene un token.')
      }

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
      setToken(data.token)
      setUser(data.user ?? null)
      return data
    } catch (loginError) {
      setToken(null)
      setUser(null)
      setError(loginError)
      setMfaChallenge(null)
      throw loginError
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    if (avatarUrlRef.current && avatarUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrlRef.current)
    }
    avatarUrlRef.current = null
    setAvatarUrl(null)
    setToken(null)
    setUser(null)
    setError(null)
    setMfaChallenge(null)
  }, [])

  useEffect(() => {
    const rawStored = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!rawStored) {
      return
    }

    let parsed = null
    try {
      parsed = JSON.parse(rawStored)
    } catch (_error) {
      parsed = null
    }

    if (!isValidStoredUser(parsed)) {
      logout()
    }
  }, [logout])

  useEffect(() => {
    if (!token) {
      return
    }

    const controller = new AbortController()

    const syncUser = async () => {
      try {
        const response = await apiFetch('/me.php', { signal: controller.signal })
        const dbUser = response?.user ?? null
        if (!dbUser) {
          throw new Error('Risposta utente non valida.')
        }

        let storedUser = null
        const rawStored = localStorage.getItem(AUTH_USER_STORAGE_KEY)
        if (rawStored) {
          try {
            storedUser = JSON.parse(rawStored)
          } catch (_error) {
            storedUser = null
          }
        }

        if (storedUser) {
          const mismatch =
            String(storedUser.id ?? '') !== String(dbUser.id ?? '') ||
            String(storedUser.username ?? '') !== String(dbUser.username ?? '') ||
            String(storedUser.email ?? '') !== String(dbUser.email ?? '') ||
            String(storedUser.accountType ?? '') !== String(dbUser.accountType ?? '')

          if (mismatch) {
            logout()
            return
          }
        }

        setUser(dbUser)
      } catch (syncError) {
        if (syncError?.name === 'AbortError') {
          return
        }
      }
    }

    syncUser()

    return () => controller.abort()
  }, [token, logout])

  const updateAvatarUrl = useCallback((nextUrl) => {
    if (avatarUrlRef.current && avatarUrlRef.current !== nextUrl && avatarUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrlRef.current)
    }
    avatarUrlRef.current = nextUrl
    setAvatarUrl(nextUrl)
  }, [])

  const refreshAvatar = useCallback(
    async ({ signal } = {}) => {
      if (!token || !user) {
        updateAvatarUrl(null)
        return null
      }

      try {
        const blob = await fetchProfileAvatar({ token, signal })
        if (!blob) {
          updateAvatarUrl(null)
          return null
        }
        const url = URL.createObjectURL(blob)
        updateAvatarUrl(url)
        return url
      } catch (error) {
        if (error?.name === 'AbortError') {
          return null
        }
        updateAvatarUrl(null)
        return null
      }
    },
    [token, user, updateAvatarUrl],
  )

  useEffect(() => {
    if (!token || !user) {
      updateAvatarUrl(null)
      return
    }

    const controller = new AbortController()
    refreshAvatar({ signal: controller.signal })
    return () => controller.abort()
  }, [token, user, refreshAvatar, updateAvatarUrl])

  const updateUserSnapshot = useCallback((snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') {
      return
    }
    setUser(snapshot)
  }, [])

  const requestPasskeyChallenge = useCallback(async () => {
    if (!mfaChallenge?.token) {
      throw new Error('Nessuna richiesta MFA attiva.')
    }
    const url = buildApiUrl('/authMfaPasskeyChallenge.php')
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mfa_token: mfaChallenge.token,
      }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = payload?.message || 'Impossibile iniziare la verifica passkey.'
      throw new Error(message)
    }
    const data = await response.json()
    setPasskeyChallenge({
      challengeToken: data.challenge_token,
      publicKey: data.publicKey,
    })
    return data
  }, [mfaChallenge])

  const verifyPasskeyCredential = useCallback(
    async ({ challengeToken, credential }) => {
      if (!mfaChallenge?.token) {
        throw new Error('Nessuna richiesta MFA attiva.')
      }
      setLoading(true)
      setError(null)
      try {
        const url = buildApiUrl('/authMfaVerifyPasskey.php')
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mfa_token: mfaChallenge.token,
            challenge_token: challengeToken,
            credential,
          }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const message = payload?.message || 'Verifica passkey fallita.'
          const errorToThrow = new Error(message)
          errorToThrow.status = response.status
          throw errorToThrow
        }
        const data = await response.json()
        if (!data?.token) {
          throw new Error('La risposta del server non contiene un token.')
        }
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
        setToken(data.token)
        setUser(data.user ?? null)
        setMfaChallenge(null)
        setPasskeyChallenge(null)
        return data
      } catch (fetchError) {
        setError(fetchError)
        throw fetchError
      } finally {
        setLoading(false)
      }
    },
    [mfaChallenge],
  )

  const verifyMfaCode = useCallback(
    async (code) => {
      if (!mfaChallenge?.token) {
        throw new Error('Nessuna richiesta MFA attiva.')
      }
      setLoading(true)
      setError(null)
      try {
        const url = buildApiUrl('/authMfaVerifyOtp.php')
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mfa_token: mfaChallenge.token,
            code,
          }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const message = payload?.message || 'Codice OTP non valido.'
          const errorToThrow = new Error(message)
          errorToThrow.status = response.status
          throw errorToThrow
        }
        const data = await response.json()
        if (!data?.token) {
          throw new Error('La risposta del server non contiene un token.')
        }
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
        setToken(data.token)
        setUser(data.user ?? null)
        setMfaChallenge(null)
        return data
      } catch (fetchError) {
        setError(fetchError)
        throw fetchError
      } finally {
        setLoading(false)
      }
    },
    [mfaChallenge],
  )

  const clearMfaChallenge = useCallback(() => {
    setMfaChallenge(null)
    setPasskeyChallenge(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      avatarUrl,
      loading,
      error,
      mfaChallenge,
      passkeyChallenge,
      isAuthenticated: Boolean(token),
      login,
      verifyMfaCode,
      requestPasskeyChallenge,
      verifyPasskeyCredential,
      clearMfaChallenge,
      logout,
      refreshAvatar,
      updateUserSnapshot,
    }),
    [
      token,
      user,
      avatarUrl,
      loading,
      error,
      login,
      logout,
      refreshAvatar,
      updateUserSnapshot,
      mfaChallenge,
      passkeyChallenge,
      verifyMfaCode,
      requestPasskeyChallenge,
      verifyPasskeyCredential,
      clearMfaChallenge,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => React.useContext(AuthContext)

export default AuthContext
