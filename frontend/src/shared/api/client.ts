// Thin fetch wrapper. Centralizes the base URL, JSON handling, error-on-non-2xx,
// and the auth lifecycle: it attaches the in-memory access token, sends the
// httpOnly refresh cookie, and transparently refreshes once on a 401.
const BASE_URL = '/api/v1'

// The access token lives in memory only (never localStorage — a closure
// variable is harder for XSS to read, and a reload re-derives it via
// refreshSession from the httpOnly cookie).
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

// The AuthProvider registers a callback so it can drop React auth state when a
// refresh ultimately fails (session truly expired).
let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb
}

// The auth endpoints are the refresh machinery itself — a 401 from them must
// never trigger another refresh (would loop / mask real auth failures).
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]

// Thrown on any non-2xx response. Carries the parsed body so callers can surface
// server-side validation messages (e.g. DRF field errors on a 400).
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, path: string) {
    super(`API request failed: ${status} ${path}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// Single in-flight refresh shared across concurrent 401s, so a burst of failed
// requests triggers exactly one /auth/refresh call.
let refreshInFlight: Promise<boolean> | null = null

function refresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      sessionExpired()
      return false
    }
    const data = (await res.json()) as { access: string }
    accessToken = data.access
    return true
  } catch {
    sessionExpired()
    return false
  }
}

function sessionExpired(): void {
  accessToken = null
  onSessionExpired?.()
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // send/receive the httpOnly refresh cookie
    ...options,
    headers,
  })

  // Access token expired? Refresh once and replay the original request.
  if (res.status === 401 && allowRefresh && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refresh()
    if (refreshed) return request<T>(path, options, false)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body, path)
  }
  // No-content responses (e.g. logout's 205) have no JSON body to parse.
  if (res.status === 204 || res.status === 205) return undefined as T
  return res.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

// Restore a session from the refresh cookie (e.g. after a reload, when the
// in-memory access token is gone). Resolves true if re-authenticated.
export function refreshSession(): Promise<boolean> {
  return refresh()
}
