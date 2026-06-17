import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

// Route guard: renders the nested routes only when authenticated, otherwise
// redirects to /login. Waits out the initial silent refresh so a valid session
// isn't bounced to login on first paint.
export default function RequireAuth() {
  const { isAuthenticated, initializing } = useAuth()

  if (initializing) {
    return <p className="p-6 text-sm text-slate-500">Loading…</p>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
