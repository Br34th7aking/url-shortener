// Thin fetch wrapper. Centralizes the base URL, JSON handling, and error-on-non-2xx
// (the things axios gave us for free). Auth headers / refresh will hook in here later.
const BASE_URL = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}
