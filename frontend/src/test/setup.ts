import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

// Start the mock API before tests, reset handlers between tests, close after.
// globals:false means RTL can't auto-register cleanup, so unmount explicitly —
// otherwise multiple component tests in one file leak DOM into each other.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
