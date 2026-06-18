import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { setAccessToken } from '../shared/api/client'
import { AuthProvider } from '../features/auth/AuthProvider'
import App from '../App'

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] }

beforeEach(() => setAccessToken(null))

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <MemoryRouter initialEntries={['/login']}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('login flow', () => {
  it('logs in and lands on the authenticated home', async () => {
    server.use(
      // Boot silent-refresh fails -> start unauthenticated on /login.
      http.post(
        '*/api/v1/auth/refresh',
        () => new HttpResponse(null, { status: 401 }),
      ),
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({ access: 'access-token' }),
      ),
      http.get('*/api/v1/links', () => HttpResponse.json(EMPTY_PAGE)),
    )
    const user = userEvent.setup()
    renderApp()

    await screen.findByRole('button', { name: /log in/i })
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 's3cure-pass-23')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    // Navigated to the protected home; my-links renders its empty state.
    expect(await screen.findByText(/no links yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('surfaces a string `detail` error in full (not its first character)', async () => {
    server.use(
      http.post(
        '*/api/v1/auth/refresh',
        () => new HttpResponse(null, { status: 401 }),
      ),
      // DRF throttling returns { detail: "<string>" } with a 429.
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          { detail: 'Request was throttled. Try again in 30 seconds.' },
          { status: 429 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderApp()

    await screen.findByRole('button', { name: /log in/i })
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 's3cure-pass-23')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/request was throttled/i)).toBeInTheDocument()
  })
})
