export interface ParticipantInvite {
  codeHash: string;
  createdAt: Date;
}

export interface ParticipantParams {
  id: string;
  name: string;
  exclusions: string[];
  userId?: string | null;
  invite?: ParticipantInvite | null;
  claimedCodeHash?: string | null;
}

export default class Participant {
  readonly id: string;
  readonly name: string;
  // Ids of other participants in the same group this participant must not be matched with.
  readonly exclusions: string[];
  // Account linked to this participant, when they have claimed an invite.
  readonly userId: string | null;
  // Pending invite. Absent once the participant is linked or the invite is revoked.
  readonly invite: ParticipantInvite | null;
  // Hash kept after a claim so the same account can redeem the link again.
  readonly claimedCodeHash: string | null;

  constructor({
    id,
    name,
    exclusions,
    userId = null,
    invite = null,
    claimedCodeHash = null,
  }: ParticipantParams) {
    this.id = id;
    this.name = name;
    this.exclusions = exclusions;
    this.userId = userId;
    this.invite = invite;
    this.claimedCodeHash = claimedCodeHash;
  }

  // The stored hashes are not part of the API representation.
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      exclusions: this.exclusions,
      userId: this.userId,
      invitePending: this.invite !== null,
    };
  }
}
