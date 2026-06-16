import { apiGet } from '../../shared/api/client'
import type { Health } from './types'

export function fetchHealth(): Promise<Health> {
  return apiGet<Health>('/health')
}
