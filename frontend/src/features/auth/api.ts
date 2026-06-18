import { apiPost, setAccessToken } from '../../shared/api/client'

export interface Credentials {
  email: string
  password: string
}

interface AccessResponse {
  access: string
}

// Register and login both return an access token (and set the refresh cookie
// server-side); stash the access token in the client for subsequent calls.
export async function register(credentials: Credentials): Promise<void> {
  const { access } = await apiPost<AccessResponse>('/auth/register', credentials)
  setAccessToken(access)
}

export async function login(credentials: Credentials): Promise<void> {
  const { access } = await apiPost<AccessResponse>('/auth/login', credentials)
  setAccessToken(access)
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout', {})
  setAccessToken(null)
}
