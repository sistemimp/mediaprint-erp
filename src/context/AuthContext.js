import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext({
  token: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
})

const TOKEN_STORAGE_KEY = 'mediaprint-erp-auth-token'
const USER_STORAGE_KEY = 'mediaprint-erp-user'

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)
    if (!storedUser) {
      return null
    }

    try {
      return JSON.parse(storedUser)
    } catch (_error) {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [user])

  const login = useCallback(async ({ username, password }) => {
    const loginUrl =
      import.meta.env.VITE_AUTH_LOGIN_URL || 'https://gestionale.mediaprint.it/pubblica/login.php'

    if (!loginUrl) {
      throw new Error('Login endpoint is not configured (missing VITE_AUTH_LOGIN_URL).')
    }

    setLoading(true)
    setError(null)

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

      if (!data?.token) {
        throw new Error('La risposta del server non contiene un token.')
      }

      setToken(data.token)
      setUser(data.user ?? null)
      return data
    } catch (loginError) {
      setToken(null)
      setUser(null)
      setError(loginError)
      throw loginError
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, loading, error, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => React.useContext(AuthContext)

export default AuthContext
