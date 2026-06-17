import { apiGet, apiPost } from '../../shared/api/client'
import type { CreateLinkResponse, LinkRow, Paginated } from './types'

export function createLink(longUrl: string): Promise<CreateLinkResponse> {
  return apiPost<CreateLinkResponse>('/links', { long_url: longUrl })
}

// The caller's own links, newest first (owner-scoped + paginated server-side).
export function listLinks(): Promise<Paginated<LinkRow>> {
  return apiGet<Paginated<LinkRow>>('/links')
}
