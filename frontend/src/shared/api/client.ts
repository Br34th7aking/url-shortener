// Thin fetch wrapper. Centralizes the base URL, JSON handling, and error-on-non-2xx
// (the things axios gave us for free). Auth headers / refresh will hook in here later.
const BASE_URL = '/api/v1'

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body, path)
  }
  return res.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
