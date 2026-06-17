import { useMutation } from '@tanstack/react-query'
import { createLink } from './api'

export function useCreateLink() {
  return useMutation({ mutationFn: createLink })
}
