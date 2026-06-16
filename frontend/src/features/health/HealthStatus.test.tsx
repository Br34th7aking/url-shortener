import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HealthStatus from './HealthStatus'

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('HealthStatus', () => {
  it('shows "API healthy" when the health endpoint returns ok', async () => {
    renderWithClient(<HealthStatus />)

    await waitFor(() =>
      expect(screen.getByText('API healthy')).toBeInTheDocument(),
    )
    expect(screen.getByText('db: ok')).toBeInTheDocument()
    expect(screen.getByText('redis: ok')).toBeInTheDocument()
  })
})
