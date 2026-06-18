import { createContext } from 'react'
import type { Credentials } from './api'

export interface AuthContextValue {
  isAuthenticated: boolean
  // True while the initial silent refresh-from-cookie is in flight, so routes
  // don't bounce to /login before we know whether a session exists.
  initializing: boolean
  login: (credentials: Credentials) => Promise<void>
  register: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}

// Kept in its own module so the provider file exports only its component
// (satisfies react-refresh/only-export-components).
export const AuthContext = createContext<AuthContextValue | null>(null)
