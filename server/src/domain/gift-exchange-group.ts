import InviteCodeHash from '#src/domain/invite-code-hash';
import GroupName from '#src/domain/group-name';
import { Match, Shuffle, assignMatches, defaultShuffle } from '#src/domain/match';
import Participant from '#src/domain/participant';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import {
  GiftExchangeGroupError,
  ParticipantValidationError,
  groupLockedFailure,
  invalidExclusionFailure,
  matchingImpossibleFailure,
  participantAlreadyLinkedFailure,
  participantNameTakenFailure,
  participantNotFoundFailure,
  tooFewParticipantsFailure,
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
  locked?: boolean;
  matches?: Match[];
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

type ValidatedParticipantResult = Result<
  GiftExchangeGroup,
  Failure<ParticipantValidationError>
>;

type AddParticipantResult = Result<
  GiftExchangeGroup,
  Failure<ParticipantValidationError | GiftExchangeGroupError.GroupLocked>
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

type GenerateMatchesResult = Result<
  GiftExchangeGroup,
  Failure<
    | GiftExchangeGroupError.TooFewParticipants
    | GiftExchangeGroupError.MatchingImpossible
  >
>;

export default class GiftExchangeGroup {
  readonly id?: string;
  readonly name: GroupName;
  readonly participants: Participant[];
  readonly members: GroupMember[];
  readonly locked: boolean;
  readonly matches: Match[];

  // Rehydrates an existing group without validation; use `create` for new groups.
  constructor({
    id,
    name,
    participants,
    members,
    locked = false,
    matches = [],
  }: GiftExchangeGroupParams) {
    this.id = id;
    this.name = name;
    this.participants = participants;
    this.members = members;
    this.locked = locked;
    this.matches = matches;
  }

  static create(name: GroupName, ownerId: UserId): GiftExchangeGroup {
    return new GiftExchangeGroup({
      name,
      participants: [],
      members: [{ userId: ownerId, role: 'owner' }],
    });
  }

  rename(name: GroupName): GiftExchangeGroup {
    return this.copy({ name });
  }

  findParticipant(participantId: string): Participant | undefined {
    return this.participants.find(({ id }) => id === participantId);
  }

  findParticipantByInviteCode(codeHash: InviteCodeHash): Participant | undefined {
    return this.participants.find((participant) =>
      participant.invite?.codeHash.equals(codeHash)
    );
  }

  findParticipantByUserId(userId: UserId): Participant | undefined {
    return this.participants.find((participant) => participant.userId?.equals(userId));
  }

  isOwnedBy(userId: UserId): boolean {
    return this.members.some(
      (member) => member.role === 'owner' && member.userId.equals(userId)
    );
  }

  unlock(): GiftExchangeGroup {
    if (!this.locked && this.matches.length === 0) {
      return this;
    }
    return this.copy({ locked: false, matches: [] });
  }

  // Locks the roster and assigns matches. Callers unlock on MatchingImpossible.
  generateMatches(shuffle: Shuffle = defaultShuffle): GenerateMatchesResult {
    if (this.participants.length < 2) {
      return err(tooFewParticipantsFailure());
    }
    const exclusionsByGiver = new Map(
      this.participants.map((participant) => [
        participant.id,
        new Set(participant.exclusions),
      ])
    );
    const matches = assignMatches(
      this.participants.map(({ id }) => id),
      exclusionsByGiver,
      shuffle
    );
    if (!matches) {
      return err(matchingImpossibleFailure());
    }
    return ok(this.copy({ locked: true, matches }));
  }

  addParticipant({ id, name, exclusions }: NewParticipant): AddParticipantResult {
    if (this.locked) {
      return err(groupLockedFailure());
    }
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
    const nextExclusions = exclusions ? unique(exclusions) : existing.exclusions;
    const exclusionsChanged =
      exclusions !== undefined &&
      (nextExclusions.length !== existing.exclusions.length ||
        nextExclusions.some((id, index) => id !== existing.exclusions[index]));
    const participant = new Participant({
      id: existing.id,
      name: name ?? existing.name,
      exclusions: nextExclusions,
      userId: existing.userId,
      invite: existing.invite,
    });
    const result = this.withValidParticipant(
      participant,
      this.participants.map((p) => (p.id === participant.id ? participant : p))
    );
    if (!result.ok || !exclusionsChanged || this.matches.length === 0) {
      return result;
    }
    return ok(result.value.copy({ matches: [] }));
  }

  removeParticipant(
    participantId: string
  ): Result<
    GiftExchangeGroup,
    Failure<
      | GiftExchangeGroupError.ParticipantNotFound
      | GiftExchangeGroupError.GroupLocked
    >
  > {
    if (this.locked) {
      return err(groupLockedFailure());
    }
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
      this.copy({
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
  ): ValidatedParticipantResult {
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
    return this.copy({ participants });
  }

  private replaceParticipant(participant: Participant): GiftExchangeGroup {
    return this.withParticipants(
      this.participants.map((existing) =>
        existing.id === participant.id ? participant : existing
      )
    );
  }

  private copy(
    overrides: Partial<GiftExchangeGroupParams>
  ): GiftExchangeGroup {
    return new GiftExchangeGroup({
      id: this.id,
      name: this.name,
      participants: this.participants,
      members: this.members,
      locked: this.locked,
      matches: this.matches,
      ...overrides,
    });
  }
}

const unique = (ids: string[]): string[] => [...new Set(ids)];
