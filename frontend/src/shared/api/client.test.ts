import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { apiGet, apiPost, refreshSession, setAccessToken } from './client'

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] }

beforeEach(() => setAccessToken(null))

describe('api client refresh-on-401', () => {
  it('refreshes once on a 401 and replays the original request', async () => {
    let linkCalls = 0
    let refreshCalls = 0
    server.use(
      http.get('*/api/v1/links', () => {
        linkCalls += 1
        // First call: token expired. After refresh, the replay succeeds.
        return linkCalls === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json(EMPTY_PAGE)
      }),
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({ access: 'fresh-access' })
      }),
    )

    const data = await apiGet('/links')

    expect(data).toEqual(EMPTY_PAGE)
    expect(linkCalls).toBe(2) // original + replay
    expect(refreshCalls).toBe(1)
  })

  it('surfaces the 401 when the refresh also fails', async () => {
    server.use(
      http.get('*/api/v1/links', () => new HttpResponse(null, { status: 401 })),
      http.post(
        '*/api/v1/auth/refresh',
        () => new HttpResponse(null, { status: 401 }),
      ),
    )

    await expect(apiGet('/links')).rejects.toMatchObject({ status: 401 })
  })

  it('does not try to refresh a failed login (no loop)', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({ access: 'x' })
      }),
      http.post(
        '*/api/v1/auth/login',
        () => new HttpResponse(null, { status: 401 }),
      ),
    )

    await expect(apiPost('/auth/login', {})).rejects.toMatchObject({
      status: 401,
    })
    expect(refreshCalls).toBe(0)
  })

  it('refreshSession resolves true when the cookie is still valid', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ access: 'restored' }),
      ),
    )

    await expect(refreshSession()).resolves.toBe(true)
  })
})
