import GiftExchangeGroup from '#src/domain/gift-exchange-group';

export type ClaimInviteOutcome =
  | { status: 'claimed'; groupId: string }
  | { status: 'already-linked-to-self'; groupId: string }
  | { status: 'not-found' }
  | { status: 'participant-already-linked' }
  | { status: 'user-already-linked' };

export default interface GiftExchangeGroupRepository {
  getAll: () => Promise<GiftExchangeGroup[]>;
  getById: (id: string) => Promise<GiftExchangeGroup | null>;
  add: (group: GiftExchangeGroup) => Promise<GiftExchangeGroup>;
  update: (group: GiftExchangeGroup) => Promise<GiftExchangeGroup | null>;
  delete: (id: string) => Promise<boolean>;
  findByPendingInviteHash: (codeHash: string) => Promise<GiftExchangeGroup | null>;
  claimInvite: (input: {
    codeHash: string;
    userId: string;
  }) => Promise<ClaimInviteOutcome>;
}
