import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { refreshSession, setOnSessionExpired } from '../../shared/api/client'
import { AuthContext } from './AuthContext'
import * as authApi from './api'
import type { Credentials } from './api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // If a refresh ultimately fails mid-session, the client tells us here.
    setOnSessionExpired(() => setIsAuthenticated(false))

    // On boot the in-memory access token is gone; try to restore the session
    // from the httpOnly refresh cookie before deciding auth state.
    let active = true
    refreshSession().then((ok) => {
      if (!active) return
      setIsAuthenticated(ok)
      setInitializing(false)
    })

    return () => {
      active = false
      setOnSessionExpired(null)
    }
  }, [])

  const login = useCallback(async (credentials: Credentials) => {
    await authApi.login(credentials)
    setIsAuthenticated(true)
  }, [])

  const register = useCallback(async (credentials: Credentials) => {
    await authApi.register(credentials)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Even if the network call fails, drop local auth state.
      setIsAuthenticated(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, initializing, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
