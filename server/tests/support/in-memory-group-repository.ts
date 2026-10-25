import GiftExchangeGroupRepository, {
  ClaimInviteOutcome,
} from '#src/application/ports/gift-exchange-group-repository';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';

export default class InMemoryGroupRepository
  implements GiftExchangeGroupRepository
{
  private readonly groups = new Map<string, GiftExchangeGroup>();
  private nextId = 1;

  async getAll(): Promise<GiftExchangeGroup[]> {
    return [...this.groups.values()];
  }

  async getById(id: string): Promise<GiftExchangeGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async add(group: GiftExchangeGroup): Promise<GiftExchangeGroup> {
    const id = `g${this.nextId++}`;
    const saved = new GiftExchangeGroup({
      id,
      name: group.name,
      participants: group.participants,
      members: group.members,
    });
    this.groups.set(id, saved);
    return saved;
  }

  async update(group: GiftExchangeGroup): Promise<GiftExchangeGroup | null> {
    if (!group.id || !this.groups.has(group.id)) {
      return null;
    }
    this.groups.set(group.id, group);
    return group;
  }

  async delete(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  async findByPendingInviteHash(codeHash: string): Promise<GiftExchangeGroup | null> {
    for (const group of this.groups.values()) {
      const pending = group.participants.some(
        (participant) => participant.invite?.codeHash === codeHash && !participant.userId
      );
      if (pending) {
        return group;
      }
    }
    return null;
  }

  async claimInvite({
    codeHash,
    userId,
  }: {
    codeHash: string;
    userId: string;
  }): Promise<ClaimInviteOutcome> {
    const found = [...this.groups.values()].find((group) =>
      group.participants.some(
        (participant) =>
          participant.invite?.codeHash === codeHash ||
          participant.claimedCodeHash === codeHash
      )
    );
    const participant = found?.participants.find(
      (item) => item.invite?.codeHash === codeHash || item.claimedCodeHash === codeHash
    );
    if (!found?.id || !participant) {
      return { status: 'not-found' };
    }
    if (participant.userId === userId) {
      return { status: 'already-linked-to-self', groupId: found.id };
    }

    const result = found.claimInvite(participant.id, userId);
    if (!result.ok) {
      switch (result.error.type) {
        case GiftExchangeGroupError.UserAlreadyLinked:
          return { status: 'user-already-linked' };
        case GiftExchangeGroupError.ParticipantAlreadyLinked:
          return { status: 'participant-already-linked' };
        default:
          return { status: 'not-found' };
      }
    }
    this.groups.set(found.id, result.value);
    return { status: 'claimed', groupId: found.id };
  }
}
