import { apiGet, apiPost } from '../../shared/api/client'
import type {
  CreateLinkRequest,
  CreateLinkResponse,
  LinkRow,
  Paginated,
} from './types'

export function createLink(input: CreateLinkRequest): Promise<CreateLinkResponse> {
  return apiPost<CreateLinkResponse>('/links', input)
}

// The caller's own links, newest first (owner-scoped + paginated server-side).
export function listLinks(): Promise<Paginated<LinkRow>> {
  return apiGet<Paginated<LinkRow>>('/links')
}
