import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import ShortenForm from './ShortenForm'

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('ShortenForm', () => {
  it('shortens a valid URL and shows the short link', async () => {
    server.use(
      http.post('*/api/v1/links', async ({ request }) => {
        const body = (await request.json()) as { long_url: string }
        return HttpResponse.json(
          { short_url: 'http://localhost:8787/AbC1234', code: 'AbC1234', long_url: body.long_url },
          { status: 201 },
        )
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<ShortenForm />)

    await user.type(screen.getByRole('textbox'), 'https://example.com/a-long-path')
    await user.click(screen.getByRole('button', { name: /shorten/i }))

    await waitFor(() =>
      expect(screen.getByText('http://localhost:8787/AbC1234')).toBeInTheDocument(),
    )
  })

  it('copies the short link to the clipboard', async () => {
    server.use(
      http.post('*/api/v1/links', () =>
        HttpResponse.json(
          { short_url: 'http://localhost:8787/XyZ7890', code: 'XyZ7890', long_url: 'https://example.com' },
          { status: 201 },
        ),
      ),
    )
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderWithClient(<ShortenForm />)

    await user.type(screen.getByRole('textbox'), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /shorten/i }))
    await screen.findByText('http://localhost:8787/XyZ7890')

    await user.click(screen.getByRole('button', { name: /copy/i }))

    expect(writeText).toHaveBeenCalledWith('http://localhost:8787/XyZ7890')
  })

  it('shows the validation error when the API rejects the URL', async () => {
    server.use(
      http.post('*/api/v1/links', () =>
        HttpResponse.json({ long_url: ['Enter a valid URL.'] }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<ShortenForm />)

    await user.type(screen.getByRole('textbox'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: /shorten/i }))

    await waitFor(() =>
      expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument(),
    )
  })
})
