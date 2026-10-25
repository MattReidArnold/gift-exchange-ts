import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '#src/api/http.ts'
import { groupKeys } from '#src/api/groups.ts'

export interface InvitePreview {
  groupName: string
  participantName: string
}

export const invitePreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ['invites', token] as const,
    queryFn: () =>
      apiFetch<InvitePreview>(`/invites/${encodeURIComponent(token)}`),
  })

export const useClaimInvite = (token: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ groupId: string }>(`/invites/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}
