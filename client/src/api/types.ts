export interface Participant {
  id: string
  name: string
  // Ids of other participants in the same group this participant must not be matched with.
  exclusions: string[]
  userId: string | null
  invitePending: boolean
}

export type GroupMemberRole = 'owner' | 'member'

export interface GroupMember {
  userId: string
  role: GroupMemberRole
}

export interface Group {
  id: string
  name: string
  participants: Participant[]
  members: GroupMember[]
}

export interface Failure {
  type: string
  reason: string
}

export interface ParticipantInput {
  name: string
  exclusions: string[]
}
