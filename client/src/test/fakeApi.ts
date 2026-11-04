import { vi } from 'vitest'

import type { Group, GroupMember, Participant } from '#src/api/types.ts'

export const signedInUser = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
}

export const ownerMember: GroupMember = { userId: signedInUser.id, role: 'owner' }

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const failure = (status: number, type: string, reason: string) =>
  json(status, { failure: { type, reason } })

const sessionBody = () => ({
  session: {
    id: 'session-1',
    userId: signedInUser.id,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    token: 'token',
  },
  user: {
    ...signedInUser,
    emailVerified: true,
    image: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
})

const groupNotFound = () =>
  failure(404, 'GROUP_NOT_FOUND', 'Group with that id was not found')

const participantNotFound = () =>
  failure(404, 'PARTICIPANT_NOT_FOUND', 'Participant with that id was not found in the group')

const participantNameInvalid = (group: Group, name: string, ignoreId?: string) => {
  if (!name) {
    return failure(422, 'PARTICIPANT_NAME_EMPTY', 'Participant name cannot be empty')
  }
  const taken = group.participants.some(
    (participant) =>
      participant.id !== ignoreId &&
      participant.name.toLowerCase() === name.toLowerCase(),
  )
  return taken
    ? failure(422, 'PARTICIPANT_NAME_TAKEN', 'A participant with this name already exists in the group')
    : undefined
}

// In-memory stand-in for the server's `/api/groups` endpoints.
export const createFakeApi = (
  initialGroups: Group[] = [],
  { signedIn = true }: { signedIn?: boolean } = {},
) => {
  let isSignedIn = signedIn
  let groups: Group[] = structuredClone(initialGroups)
  let nextId = 1
  const invites = new Map<string, { groupId: string; participantId: string }>()
  const newId = (prefix: string) => `${prefix}-${nextId++}`

  const saveGroup = (group: Group) => {
    groups = groups.map((existing) => (existing.id === group.id ? group : existing))
    return group
  }

  const participantById = (participantId: string) => {
    for (const group of groups) {
      const participant = group.participants.find(({ id }) => id === participantId)
      if (participant) {
        return { group, participant }
      }
    }
    return undefined
  }

  const inviteTarget = (token: string) => {
    const saved = invites.get(token)
    if (saved) {
      const group = groups.find(({ id }) => id === saved.groupId)
      const participant = group?.participants.find(({ id }) => id === saved.participantId)
      return group && participant ? { group, participant } : undefined
    }
    return participantById(token)
  }

  const replaceGroup = (group: Group, status = 200) => json(status, saveGroup(group))

  const handle = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = input instanceof Request ? input.url : String(input)
    const { pathname } = new URL(url, 'http://localhost')
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) : {}

    if (pathname === '/api/auth/get-session') {
      return json(200, isSignedIn ? sessionBody() : null)
    }
    if (pathname === '/api/auth/sign-out' && method === 'POST') {
      isSignedIn = false
      return json(200, { success: true })
    }

    if (pathname.startsWith('/api/invites/')) {
      const rest = pathname.slice('/api/invites/'.length)
      const claiming = rest.endsWith('/claim')
      const token = decodeURIComponent(claiming ? rest.slice(0, -'/claim'.length) : rest)
      if (token === 'unauthorized') {
        return failure(401, 'UNAUTHENTICATED', 'Sign in to continue')
      }
      const target = inviteTarget(token)
      const pending =
        target?.participant.invitePending && !target.participant.userId
      if (!target || !pending) {
        return failure(
          404,
          'INVITE_NOT_FOUND',
          'Invite link is invalid or has already been used',
        )
      }
      if (!claiming) {
        return json(200, {
          groupName: target.group.name,
          participantName: target.participant.name,
        })
      }
      if (!isSignedIn) {
        return failure(401, 'UNAUTHENTICATED', 'Sign in to continue')
      }
      if (
        target.group.participants.some(
          (participant) =>
            participant.userId === signedInUser.id &&
            participant.id !== target.participant.id,
        )
      ) {
        return failure(
          409,
          'USER_ALREADY_LINKED',
          'This account is already linked to another participant in the group',
        )
      }
      const members = target.group.members.some(
        (member) => member.userId === signedInUser.id,
      )
        ? target.group.members
        : [...target.group.members, { userId: signedInUser.id, role: 'member' as const }]
      saveGroup({
        ...target.group,
        members,
        participants: target.group.participants.map((participant) =>
          participant.id === target.participant.id
            ? { ...participant, userId: signedInUser.id, invitePending: false }
            : participant,
        ),
      })
      invites.delete(token)
      return json(200, { groupId: target.group.id })
    }

    const [, , , groupId, , participantId] = pathname.split('/')

    if (!pathname.startsWith('/api/groups')) {
      return json(404)
    }

    if (!groupId) {
      if (method === 'GET') {
        return json(200, groups)
      }
      const name = String(body.name ?? '').trim()
      if (!name) {
        return failure(422, 'GROUP_NAME_EMPTY', 'Group name cannot be empty')
      }
      const group: Group = {
        id: newId('group'),
        name,
        participants: [],
        members: [ownerMember],
        locked: false,
        matches: [],
      }
      groups = [...groups, group]
      return json(201, group)
    }

    const group = groups.find(({ id }) => id === decodeURIComponent(groupId))
    if (!group) {
      return groupNotFound()
    }

    if (pathname.endsWith('/lock')) {
      if (method === 'POST') {
        if (group.participants.length < 2) {
          return failure(
            422,
            'TOO_FEW_PARTICIPANTS',
            'At least two participants are required',
          )
        }
        return replaceGroup({ ...group, locked: true })
      }
      if (method === 'DELETE') {
        return replaceGroup({ ...group, locked: false, matches: [] })
      }
    }

    if (pathname.endsWith('/matches') && method === 'POST') {
      if (!group.locked) {
        return failure(422, 'GROUP_NOT_LOCKED', 'Lock the group before generating matches')
      }
      if (group.participants.length < 2) {
        return failure(
          422,
          'TOO_FEW_PARTICIPANTS',
          'At least two participants are required',
        )
      }
      const ids = group.participants.map(({ id }) => id)
      const matches = ids.map((giverId, index) => ({
        giverId,
        receiverId: ids[(index + 1) % ids.length]!,
      }))
      const invalid = matches.some(({ giverId, receiverId }) => {
        const giver = group.participants.find(({ id }) => id === giverId)
        return giver?.exclusions.includes(receiverId)
      })
      if (invalid) {
        saveGroup({ ...group, locked: false, matches: [] })
        return failure(
          422,
          'MATCHING_IMPOSSIBLE',
          'No valid matching exists for the current exclusions',
        )
      }
      return replaceGroup({ ...group, matches })
    }

    if (!pathname.includes('/participants')) {
      if (method === 'GET') {
        return json(200, group)
      }
      if (method === 'DELETE') {
        groups = groups.filter(({ id }) => id !== group.id)
        return new Response(null, { status: 204 })
      }
      const name = String(body.name ?? '').trim()
      if (!name) {
        return failure(422, 'GROUP_NAME_EMPTY', 'Group name cannot be empty')
      }
      return replaceGroup({ ...group, name })
    }

    if (!participantId) {
      if (group.locked) {
        return failure(
          409,
          'GROUP_LOCKED',
          'This group is locked, so the participant list cannot change',
        )
      }
      const name = String(body.name ?? '').trim()
      const invalid = participantNameInvalid(group, name)
      if (invalid) {
        return invalid
      }
      const participant: Participant = {
        id: newId('participant'),
        name,
        exclusions: body.exclusions ?? [],
        userId: null,
        invitePending: false,
      }
      return replaceGroup(
        { ...group, participants: [...group.participants, participant] },
        201,
      )
    }

    const existing = group.participants.find(
      ({ id }) => id === decodeURIComponent(participantId),
    )
    if (!existing) {
      return participantNotFound()
    }

    if (pathname.endsWith('/invite')) {
      if (method === 'DELETE') {
        if (!existing.invitePending) {
          return failure(
            404,
            'INVITE_NOT_PENDING',
            'This participant does not have a pending invite',
          )
        }
        for (const [storedToken, stored] of invites) {
          if (stored.participantId === existing.id && stored.groupId === group.id) {
            invites.delete(storedToken)
          }
        }
        return replaceGroup({
          ...group,
          participants: group.participants.map((participant) =>
            participant.id === existing.id
              ? { ...participant, invitePending: false }
              : participant,
          ),
        })
      }
      if (existing.userId) {
        return failure(
          409,
          'PARTICIPANT_ALREADY_LINKED',
          'This participant is already linked to an account',
        )
      }
      const token = `issued-${existing.id}`
      invites.set(token, { groupId: group.id, participantId: existing.id })
      const nextGroup = saveGroup({
        ...group,
        participants: group.participants.map((participant) =>
          participant.id === existing.id
            ? { ...participant, invitePending: true }
            : participant,
        ),
      })
      return json(200, { group: nextGroup, token })
    }

    if (method === 'DELETE') {
      if (group.locked) {
        return failure(
          409,
          'GROUP_LOCKED',
          'This group is locked, so the participant list cannot change',
        )
      }
      return replaceGroup({
        ...group,
        participants: group.participants
          .filter(({ id }) => id !== existing.id)
          .map((participant) => ({
            ...participant,
            exclusions: participant.exclusions.filter((id) => id !== existing.id),
          })),
      })
    }

    const name = String(body.name ?? existing.name).trim()
    const invalid = participantNameInvalid(group, name, existing.id)
    if (invalid) {
      return invalid
    }
    const updated: Participant = {
      ...existing,
      name,
      exclusions: body.exclusions ?? existing.exclusions,
    }
    return replaceGroup({
      ...group,
      participants: group.participants.map((participant) =>
        participant.id === existing.id ? updated : participant,
      ),
    })
  }

  return {
    fetch: vi.fn(handle),
    get groups() {
      return groups
    },
  }
}
