import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'

import { authClient } from '#src/api/auth-client.ts'
import { invitePreviewQuery, useClaimInvite } from '#src/api/invites.ts'
import { sessionQuery } from '#src/api/session.ts'
import { paths } from '#src/paths.ts'

export function JoinPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { data: user } = useQuery(sessionQuery())
  const preview = useQuery({ ...invitePreviewQuery(token), enabled: token !== '' })
  const claim = useClaimInvite(token)

  const linkAccount = () => {
    claim.mutate(undefined, {
      onSuccess: ({ groupId }) => {
        void navigate(paths.group(groupId))
      },
    })
  }

  if (preview.isPending) {
    return <Typography>Loading invite…</Typography>
  }

  if (preview.isError) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          Invite unavailable
        </Typography>
        <Typography color="text.secondary">{preview.error.message}</Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h4" component="h1">
        Join {preview.data.groupName}
      </Typography>
      <Typography>
        This invite links your account to {preview.data.participantName}.
      </Typography>
      {user ? (
        <>
          <Typography>You are signed in as {user.name}.</Typography>
          {claim.error ? <Alert severity="error">{claim.error.message}</Alert> : null}
          <Button variant="contained" onClick={linkAccount} loading={claim.isPending}>
            Link this account
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          onClick={() =>
            void authClient.signIn.social({
              provider: 'google',
              callbackURL: paths.join(token),
            })
          }
        >
          Sign in with Google
        </Button>
      )}
    </Stack>
  )
}
