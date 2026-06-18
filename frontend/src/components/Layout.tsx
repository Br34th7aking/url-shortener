import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

// App chrome for authenticated routes: a top bar with the brand and a logout
// button, plus an Outlet for the page body.
export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <span className="font-bold">URL Shortener</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium"
        >
          Log out
        </button>
      </header>
      <main className="flex flex-col items-center gap-8 px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
