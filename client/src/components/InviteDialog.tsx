import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useId, useState } from 'react'

import { paths } from '#src/paths.ts'

interface InviteDialogProps {
  open: boolean
  participantName: string
  invitePending: boolean
  token: string | null
  issuing: boolean
  revoking: boolean
  error: Error | null
  onIssue: () => void
  onRevoke: () => void
  onClose: () => void
}

export function InviteDialog({
  open,
  participantName,
  invitePending,
  token,
  issuing,
  revoking,
  error,
  onIssue,
  onRevoke,
  onClose,
}: InviteDialogProps) {
  const titleId = useId()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const inviteUrl = token ? `${window.location.origin}${paths.join(token)}` : ''
  const copied = token !== null && copiedToken === token
  const canRevoke = invitePending || inviteUrl !== ''
  const busy = issuing || revoking

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedToken(token)
    } catch {
      setCopiedToken(null)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>Invite {participantName}</DialogTitle>
      <DialogContent>
        {inviteUrl ? (
          <Stack spacing={2}>
            <DialogContentText>
              Share this link. It lets them create an account or link an account they
              already have. Generating another link replaces this one.
            </DialogContentText>
            <TextField
              label="Invite link"
              value={inviteUrl}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
          </Stack>
        ) : invitePending ? (
          <DialogContentText>
            An invite is already waiting. The previous link cannot be shown again.
            Generating a new one replaces it.
          </DialogContentText>
        ) : (
          <DialogContentText>
            Create a link that lets {participantName} create an account, or link an
            account they already have.
          </DialogContentText>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        {inviteUrl ? (
          <Button onClick={() => void copyLink()} disabled={busy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        ) : null}
        {canRevoke ? (
          <Button onClick={onRevoke} color="error" disabled={busy} loading={revoking}>
            Revoke invite
          </Button>
        ) : null}
        <Button onClick={onIssue} variant="contained" disabled={revoking} loading={issuing}>
          {inviteUrl || invitePending ? 'Generate a new link' : 'Create invite link'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
