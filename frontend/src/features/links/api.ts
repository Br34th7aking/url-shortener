import { apiPost } from '../../shared/api/client'
import type { CreateLinkResponse } from './types'

export function createLink(longUrl: string): Promise<CreateLinkResponse> {
  return apiPost<CreateLinkResponse>('/links', { long_url: longUrl })
}
