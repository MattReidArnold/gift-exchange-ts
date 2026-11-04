import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import InviteCodeHash from '#src/domain/invite-code-hash';

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
      locked: group.locked,
      matches: group.matches,
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

  async findByInviteCodeHash(codeHash: string): Promise<GiftExchangeGroup | null> {
    const hash = InviteCodeHash.create(codeHash);
    for (const group of this.groups.values()) {
      if (group.findParticipantByInviteCode(hash)) {
        return group;
      }
    }
    return null;
  }
}
