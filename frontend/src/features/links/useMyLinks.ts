import { useQuery } from '@tanstack/react-query'
import { listLinks } from './api'

export const MY_LINKS_KEY = ['my-links'] as const

export function useMyLinks() {
  return useQuery({ queryKey: MY_LINKS_KEY, queryFn: listLinks })
}
