import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Link as RouterLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
} from 'react-router'

import {
  groupQuery,
  useAddParticipant,
  useDeleteGroup,
  useIssueInvite,
  useRemoveParticipant,
  useRenameGroup,
  useRevokeInvite,
  useUpdateParticipant,
} from '#src/api/groups.ts'
import type { Group, Participant } from '#src/api/types.ts'
import { ConfirmDialog } from '#src/components/ConfirmDialog.tsx'
import { GroupFormDialog } from '#src/components/GroupFormDialog.tsx'
import { InviteDialog } from '#src/components/InviteDialog.tsx'
import { ParticipantFormDialog } from '#src/components/ParticipantFormDialog.tsx'
import { paths } from '#src/paths.ts'

const useGroup = () => {
  const { groupId = '' } = useParams()
  return useSuspenseQuery(groupQuery(groupId)).data
}

const otherParticipants = (group: Group, participantId?: string) =>
  group.participants.filter(({ id }) => id !== participantId)

function ExclusionChips({ group, participant }: { group: Group; participant: Participant }) {
  const names = group.participants
    .filter(({ id }) => participant.exclusions.includes(id))
    .map(({ name }) => name)

  if (names.length === 0) {
    return 'No exclusions'
  }
  return (
    <Stack
      direction="row"
      spacing={1}
      component="span"
      sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}
    >
      <span>Not matched with:</span>
      {names.map((name) => (
        <Chip key={name} label={name} size="small" component="span" />
      ))}
    </Stack>
  )
}

export function GroupDetailPage() {
  const group = useGroup()
  const navigate = useNavigate()
  const deleteGroup = useDeleteGroup()
  const removeParticipant = useRemoveParticipant(group.id)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null)
  const [inviteTarget, setInviteTarget] = useState<Participant | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const issueInvite = useIssueInvite(group.id)
  const revokeInvite = useRevokeInvite(group.id)

  const handleDeleteGroup = () =>
    deleteGroup.mutate(group.id, {
      onSuccess: () => navigate(paths.groups(), { replace: true }),
    })

  const handleRemoveParticipant = () => {
    if (!participantToRemove) {
      return
    }
    removeParticipant.mutate(participantToRemove.id, {
      onSuccess: () => setParticipantToRemove(null),
    })
  }

  const closeRemoveParticipant = () => {
    setParticipantToRemove(null)
    removeParticipant.reset()
  }

  const openInvite = (participant: Participant) => {
    setInviteToken(null)
    issueInvite.reset()
    revokeInvite.reset()
    setInviteTarget(participant)
  }

  const closeInvite = () => {
    setInviteTarget(null)
    setInviteToken(null)
    issueInvite.reset()
    revokeInvite.reset()
  }

  const currentInviteTarget = inviteTarget
    ? (group.participants.find(({ id }) => id === inviteTarget.id) ?? inviteTarget)
    : null

  return (
    <Stack spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={RouterLink} to={paths.groups()} underline="hover" color="inherit">
          Groups
        </Link>
        <Typography color="text.primary" aria-current="page">
          {group.name}
        </Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="h4" component="h1">
          {group.name}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={paths.renameGroup(group.id)}
            variant="outlined"
            startIcon={<EditIcon />}
          >
            Rename group
          </Button>
          <Button
            onClick={() => setConfirmingDelete(true)}
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete group
          </Button>
        </Stack>
      </Stack>

      <Stack component="section" aria-labelledby="participants-heading" spacing={2}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography id="participants-heading" variant="h5" component="h2">
            Participants
          </Typography>
          <Button
            component={RouterLink}
            to={paths.newParticipant(group.id)}
            variant="contained"
            startIcon={<AddIcon />}
          >
            Add participant
          </Button>
        </Stack>

        {group.participants.length === 0 ? (
          <Typography color="text.secondary">No participants yet</Typography>
        ) : (
          <Paper variant="outlined">
            <List aria-label="Participants" disablePadding>
              {group.participants.map((participant) => (
                <ListItem
                  key={participant.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      {participant.userId ? null : (
                        <IconButton
                          onClick={() => openInvite(participant)}
                          aria-label={`Invite ${participant.name}`}
                        >
                          <LinkIcon />
                        </IconButton>
                      )}
                      <IconButton
                        component={RouterLink}
                        to={paths.editParticipant(group.id, participant.id)}
                        aria-label={`Edit ${participant.name}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => setParticipantToRemove(participant)}
                        aria-label={`Delete ${participant.name}`}
                        edge="end"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                  sx={{ pr: { xs: 18, sm: 22 } }}
                >
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        spacing={1}
                        component="span"
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <span>{participant.name}</span>
                        {participant.userId ? (
                          <Chip label="Linked" size="small" color="success" component="span" />
                        ) : participant.invitePending ? (
                          <Chip label="Invite pending" size="small" component="span" />
                        ) : null}
                      </Stack>
                    }
                    secondary={<ExclusionChips group={group} participant={participant} />}
                    slotProps={{ secondary: { component: 'span' } }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${group.name}?`}
        description="This permanently deletes the group and all of its participants."
        confirmLabel="Delete"
        pending={deleteGroup.isPending}
        error={deleteGroup.error}
        onConfirm={handleDeleteGroup}
        onClose={() => {
          setConfirmingDelete(false)
          deleteGroup.reset()
        }}
      />
      <ConfirmDialog
        open={participantToRemove !== null}
        title={`Delete ${participantToRemove?.name ?? 'participant'}?`}
        description="They will also be removed from everyone else's exclusions."
        confirmLabel="Delete"
        pending={removeParticipant.isPending}
        error={removeParticipant.error}
        onConfirm={handleRemoveParticipant}
        onClose={closeRemoveParticipant}
      />

      {currentInviteTarget ? (
        <InviteDialog
          open
          participantName={currentInviteTarget.name}
          invitePending={currentInviteTarget.invitePending}
          token={inviteToken}
          issuing={issueInvite.isPending}
          revoking={revokeInvite.isPending}
          error={issueInvite.error ?? revokeInvite.error}
          onIssue={() =>
            issueInvite.mutate(currentInviteTarget.id, {
              onSuccess: ({ token }) => setInviteToken(token),
            })
          }
          onRevoke={() =>
            revokeInvite.mutate(currentInviteTarget.id, { onSuccess: closeInvite })
          }
          onClose={closeInvite}
        />
      ) : null}

      <Outlet />
    </Stack>
  )
}

export function RenameGroupRoute() {
  const group = useGroup()
  const navigate = useNavigate()
  const renameGroup = useRenameGroup(group.id)
  const close = () => navigate(paths.group(group.id), { replace: true })

  return (
    <GroupFormDialog
      title="Rename group"
      submitLabel="Save"
      initialName={group.name}
      pending={renameGroup.isPending}
      error={renameGroup.error}
      onSubmit={(name) => renameGroup.mutate(name, { onSuccess: close })}
      onClose={close}
    />
  )
}

export function AddParticipantRoute() {
  const group = useGroup()
  const navigate = useNavigate()
  const addParticipant = useAddParticipant(group.id)
  const close = () => navigate(paths.group(group.id), { replace: true })

  return (
    <ParticipantFormDialog
      title="Add participant"
      submitLabel="Add"
      otherParticipants={group.participants}
      pending={addParticipant.isPending}
      error={addParticipant.error}
      onSubmit={(participant) => addParticipant.mutate(participant, { onSuccess: close })}
      onClose={close}
    />
  )
}

export function EditParticipantRoute() {
  const group = useGroup()
  const { participantId = '' } = useParams()
  const navigate = useNavigate()
  const updateParticipant = useUpdateParticipant(group.id, participantId)
  const participant = group.participants.find(({ id }) => id === participantId)
  const close = () => navigate(paths.group(group.id), { replace: true })

  if (!participant) {
    return <Navigate to={paths.group(group.id)} replace />
  }

  return (
    <ParticipantFormDialog
      title="Edit participant"
      submitLabel="Save"
      otherParticipants={otherParticipants(group, participant.id)}
      initialValues={participant}
      pending={updateParticipant.isPending}
      error={updateParticipant.error}
      onSubmit={(changes) => updateParticipant.mutate(changes, { onSuccess: close })}
      onClose={close}
    />
  )
}
