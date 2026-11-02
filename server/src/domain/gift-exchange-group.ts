import InviteCodeHash from '#src/domain/invite-code-hash';
import GroupName from '#src/domain/group-name';
import Participant from '#src/domain/participant';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import {
  GiftExchangeGroupError,
  ParticipantValidationError,
  invalidExclusionFailure,
  participantAlreadyLinkedFailure,
  participantNameTakenFailure,
  participantNotFoundFailure,
  userAlreadyLinkedFailure,
  inviteNotPendingFailure,
} from '#src/domain/gift-exchange-group-error';

export type GroupMemberRole = 'owner' | 'member';

export interface GroupMember {
  userId: UserId;
  role: GroupMemberRole;
}

export interface GiftExchangeGroupParams {
  id?: string;
  name: GroupName;
  participants: Participant[];
  members: GroupMember[];
}

export interface NewParticipant {
  id: string;
  name: ParticipantName;
  exclusions: string[];
}

export interface ParticipantChanges {
  name?: ParticipantName;
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
  readonly name: GroupName;
  readonly participants: Participant[];
  readonly members: GroupMember[];

  // Rehydrates an existing group without validation; use `create` for new groups.
  constructor({ id, name, participants, members }: GiftExchangeGroupParams) {
    this.id = id;
    this.name = name;
    this.participants = participants;
    this.members = members;
  }

  static create(name: GroupName, ownerId: UserId): GiftExchangeGroup {
    return new GiftExchangeGroup({
      name,
      participants: [],
      members: [{ userId: ownerId, role: 'owner' }],
    });
  }

  rename(name: GroupName): GiftExchangeGroup {
    return new GiftExchangeGroup({
      id: this.id,
      name,
      participants: this.participants,
      members: this.members,
    });
  }

  findParticipant(participantId: string): Participant | undefined {
    return this.participants.find(({ id }) => id === participantId);
  }

  findParticipantByInviteCode(codeHash: InviteCodeHash): Participant | undefined {
    return this.participants.find((participant) =>
      participant.invite?.codeHash.equals(codeHash)
    );
  }

  addParticipant({ id, name, exclusions }: NewParticipant): ParticipantResult {
    const participant = new Participant({
      id,
      name,
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
      name: name ?? existing.name,
      exclusions: exclusions ? unique(exclusions) : existing.exclusions,
      userId: existing.userId,
      invite: existing.invite,
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
          })
      );
    return ok(this.withParticipants(remaining));
  }

  issueInvite(
    participantId: string,
    codeHash: InviteCodeHash,
    createdAt: Date
  ): IssueInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    if (existing.userId) {
      return err(participantAlreadyLinkedFailure());
    }
    return ok(
      this.replaceParticipant(
        new Participant({
          id: existing.id,
          name: existing.name,
          exclusions: existing.exclusions,
          invite: { codeHash, createdAt },
        })
      )
    );
  }

  clearInvite(participantId: string): ClearInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    if (!existing.invitePending) {
      return err(inviteNotPendingFailure());
    }
    return ok(
      this.replaceParticipant(
        new Participant({
          id: existing.id,
          name: existing.name,
          exclusions: existing.exclusions,
          userId: existing.userId,
        })
      )
    );
  }

  claimInvite(participantId: string, userId: UserId): ClaimInviteResult {
    const existing = this.findParticipant(participantId);
    if (!existing) {
      return err(participantNotFoundFailure());
    }
    if (existing.userId?.equals(userId)) {
      return ok(this);
    }
    if (existing.userId) {
      return err(participantAlreadyLinkedFailure());
    }
    if (this.participants.some((participant) => participant.userId?.equals(userId))) {
      return err(userAlreadyLinkedFailure());
    }
    if (!existing.invite) {
      return err(inviteNotPendingFailure());
    }
    const members = this.members.some((member) => member.userId.equals(userId))
      ? this.members
      : [...this.members, { userId, role: 'member' as const }];
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
                userId,
                invite: existing.invite,
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

  private hasParticipantNamed(name: ParticipantName, ignoreParticipantId: string) {
    return this.participants.some(
      (participant) =>
        participant.id !== ignoreParticipantId && participant.name.equals(name)
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
