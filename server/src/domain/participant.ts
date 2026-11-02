import InviteCodeHash from '#src/domain/invite-code-hash';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';

export interface ParticipantInvite {
  codeHash: InviteCodeHash;
  createdAt: Date;
}

export interface ParticipantParams {
  id: string;
  name: ParticipantName;
  exclusions: string[];
  userId?: UserId | null;
  invite?: ParticipantInvite | null;
}

export default class Participant {
  readonly id: string;
  readonly name: ParticipantName;
  // Ids of other participants in the same group this participant must not be matched with.
  readonly exclusions: string[];
  // Account linked to this participant, when they have claimed an invite.
  readonly userId: UserId | null;
  // Invite link. It stays after a claim so the same link still resolves.
  readonly invite: ParticipantInvite | null;

  constructor({
    id,
    name,
    exclusions,
    userId = null,
    invite = null,
  }: ParticipantParams) {
    this.id = id;
    this.name = name;
    this.exclusions = exclusions;
    this.userId = userId;
    this.invite = invite;
  }

  get invitePending(): boolean {
    return this.invite !== null && this.userId === null;
  }

  // The stored hash is not part of the API representation.
  toJSON() {
    return {
      id: this.id,
      name: this.name.value,
      exclusions: this.exclusions,
      userId: this.userId?.value ?? null,
      invitePending: this.invitePending,
    };
  }
}
