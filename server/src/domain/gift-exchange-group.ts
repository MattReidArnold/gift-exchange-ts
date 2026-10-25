import Participant from '#src/domain/participant';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import {
  GiftExchangeGroupError,
  ParticipantValidationError,
  groupNameEmptyFailure,
  invalidExclusionFailure,
  inviteNotPendingFailure,
  participantAlreadyLinkedFailure,
  participantNameEmptyFailure,
  participantNameTakenFailure,
  participantNotFoundFailure,
  userAlreadyLinkedFailure,
} from '#src/domain/gift-exchange-group-error';

export type GroupMemberRole = 'owner' | 'member';

export interface GroupMember {
  userId: string;
  role: GroupMemberRole;
}

export interface GiftExchangeGroupParams {
  id?: string;
  name: string;
  participants: Participant[];
  members: GroupMember[];
}

export interface NewParticipant {
  id: string;
  name: string;
  exclusions: string[];
}

export interface ParticipantChanges {
  name?: string;
  exclusions?: string[];
}

type ParticipantResult = Result<
  GiftExchangeGroup,
  Failure<ParticipantValidationError>
>;

type ExistingParticipantResult = Result<
  GiftExchangeGroup,
  Failure<GiftExchangeGroupError.ParticipantNotFound | ParticipantValidationError>
>;

type IssueInviteResult = Result<
  GiftExchangeGroup,
  Failure<
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.ParticipantAlreadyLinked
  >
>;

type ClearInviteResult = Result<
  GiftExchangeGroup,
  Failure<
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.InviteNotPending
  >
>;

type ClaimInviteResult = Result<
  GiftExchangeGroup,
  Failure<
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.ParticipantAlreadyLinked
    | GiftExchangeGroupError.UserAlreadyLinked
    | GiftExchangeGroupError.InviteNotPending
  >
>;

export default class GiftExchangeGroup {
  readonly id?: string;
  readonly name: string;
  readonly participants: Participant[];
  readonly members: GroupMember[];

  // Rehydrates an existing group without validation; use `create` for new groups.
  constructor({ id, name, participants, members }: GiftExchangeGroupParams) {
    this.id = id;
    this.name = name;
    this.participants = participants;
    this.members = members;
  }

  static create(
    name: string,
    ownerId: string
  ): Result<GiftExchangeGroup, Failure<GiftExchangeGroupError.GroupNameEmpty>> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return err(groupNameEmptyFailure());
    }
    const trimmedOwnerId = ownerId.trim();
    if (!trimmedOwnerId) {
      throw new Error('Group owner id cannot be empty');
    }
    return ok(
      new GiftExchangeGroup({
        name: trimmedName,
        participants: [],
        members: [{ userId: trimmedOwnerId, role: 'owner' }],
      })
    );
  }

  rename(
    name: string
  ): Result<GiftExchangeGroup, Failure<GiftExchangeGroupError.GroupNameEmpty>> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return err(groupNameEmptyFailure());
    }
    return ok(
      new GiftExchangeGroup({
        id: this.id,
        name: trimmedName,
        participants: this.participants,
        members: this.members,
      })
    );
  }

  findParticipant(participantId: string): Participant | undefined {
    return this.participants.find(({ id }) => id === participantId);
  }

  addParticipant({ id, name, exclusions }: NewParticipant): ParticipantResult {
    const participant = new Participant({
      id,
      name: name.trim(),
      exclusions: unique(exclusions),
    });
    return this.withValidParticipant(participant, [
      ...this.participants,
      participant,
    ]);
  }

  updateParticipant(
    participantId: string,
    { name, exclusions }: ParticipantChanges
  ): ExistingParticipantResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    const participant = new Participant({
      id: existing.id,
      name: name?.trim() ?? existing.name,
      exclusions: exclusions ? unique(exclusions) : existing.exclusions,
      userId: existing.userId,
      invite: existing.invite,
      claimedCodeHash: existing.claimedCodeHash,
    });
    return this.withValidParticipant(
      participant,
      this.participants.map((p) => (p.id === participant.id ? participant : p))
    );
  }

  removeParticipant(
    participantId: string
  ): Result<GiftExchangeGroup, Failure<GiftExchangeGroupError.ParticipantNotFound>> {
    if (!this.findParticipant(participantId)) {
      return err(participantNotFoundFailure());
    }
    const remaining = this.participants
      .filter(({ id }) => id !== participantId)
      .map(
        (p) =>
          new Participant({
            id: p.id,
            name: p.name,
            exclusions: p.exclusions.filter((id) => id !== participantId),
            userId: p.userId,
            invite: p.invite,
            claimedCodeHash: p.claimedCodeHash,
          })
      );
    return ok(this.withParticipants(remaining));
  }

  issueInvite(
    participantId: string,
    codeHash: string,
    createdAt: Date
  ): IssueInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    if (existing.userId) {
      return err(participantAlreadyLinkedFailure());
    }
    const trimmedHash = codeHash.trim();
    if (!trimmedHash) {
      throw new Error('Invite code hash cannot be empty');
    }
    return ok(
      this.replaceParticipant(
        new Participant({
          id: existing.id,
          name: existing.name,
          exclusions: existing.exclusions,
          invite: { codeHash: trimmedHash, createdAt },
        })
      )
    );
  }

  clearInvite(participantId: string): ClearInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    if (!existing.invite) {
      return err(inviteNotPendingFailure());
    }
    return ok(
      this.replaceParticipant(
        new Participant({
          id: existing.id,
          name: existing.name,
          exclusions: existing.exclusions,
          userId: existing.userId,
          claimedCodeHash: existing.claimedCodeHash,
        })
      )
    );
  }

  claimInvite(participantId: string, userId: string): ClaimInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      throw new Error('User id cannot be empty');
    }
    if (existing.userId === trimmedUserId) {
      return ok(this);
    }
    if (existing.userId) {
      return err(participantAlreadyLinkedFailure());
    }
    if (this.participants.some((participant) => participant.userId === trimmedUserId)) {
      return err(userAlreadyLinkedFailure());
    }
    if (!existing.invite) {
      return err(inviteNotPendingFailure());
    }
    const members = this.members.some((member) => member.userId === trimmedUserId)
      ? this.members
      : [...this.members, { userId: trimmedUserId, role: 'member' as const }];
    return ok(
      new GiftExchangeGroup({
        id: this.id,
        name: this.name,
        participants: this.participants.map((participant) =>
          participant.id === existing.id
            ? new Participant({
                id: existing.id,
                name: existing.name,
                exclusions: existing.exclusions,
                userId: trimmedUserId,
                claimedCodeHash: existing.invite?.codeHash ?? null,
              })
            : participant
        ),
        members,
      })
    );
  }

  private withValidParticipant(
    participant: Participant,
    participants: Participant[]
  ): ParticipantResult {
    const failure = this.validateParticipant(participant);
    return failure ? err(failure) : ok(this.withParticipants(participants));
  }

  private validateParticipant(
    participant: Participant
  ): Failure<ParticipantValidationError> | null {
    if (!participant.name) {
      return participantNameEmptyFailure();
    }
    if (this.hasParticipantNamed(participant.name, participant.id)) {
      return participantNameTakenFailure();
    }
    const invalidExclusion = participant.exclusions.find(
      (excludedId) =>
        excludedId === participant.id || !this.findParticipant(excludedId)
    );
    if (invalidExclusion !== undefined) {
      return invalidExclusionFailure(invalidExclusion);
    }
    return null;
  }

  private hasParticipantNamed(name: string, ignoreParticipantId: string) {
    const normalized = name.toLowerCase();
    return this.participants.some(
      (participant) =>
        participant.id !== ignoreParticipantId &&
        participant.name.trim().toLowerCase() === normalized
    );
  }

  private withParticipants(participants: Participant[]): GiftExchangeGroup {
    return new GiftExchangeGroup({
      id: this.id,
      name: this.name,
      participants,
      members: this.members,
    });
  }

  private replaceParticipant(participant: Participant): GiftExchangeGroup {
    return this.withParticipants(
      this.participants.map((existing) =>
        existing.id === participant.id ? participant : existing
      )
    );
  }
}

const unique = (ids: string[]): string[] => [...new Set(ids)];
