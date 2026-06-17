import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { setAccessToken } from '../../shared/api/client'
import { AuthProvider } from './AuthProvider'
import RequireAuth from './RequireAuth'

beforeEach(() => setAccessToken(null))

function renderApp(): ReactElement | void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>Secret dashboard</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('redirects to /login when the session cannot be restored', async () => {
    server.use(
      http.post(
        '*/api/v1/auth/refresh',
        () => new HttpResponse(null, { status: 401 }),
      ),
    )

    renderApp()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('renders the protected route once the session is restored', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ access: 'restored' }),
      ),
    )

    renderApp()

    expect(await screen.findByText('Secret dashboard')).toBeInTheDocument()
  })
})
