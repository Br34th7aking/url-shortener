import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLink } from './api'
import { MY_LINKS_KEY } from './useMyLinks'

export function useCreateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLink,
    // A new link belongs in the my-links list — refetch it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_LINKS_KEY }),
  })
}
