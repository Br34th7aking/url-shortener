import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Default handlers — individual tests can override via server.use(...).
export const server = setupServer(
  http.get('*/api/v1/health', () =>
    HttpResponse.json({ status: 'ok', db: 'ok', redis: 'ok' }),
  ),
)
