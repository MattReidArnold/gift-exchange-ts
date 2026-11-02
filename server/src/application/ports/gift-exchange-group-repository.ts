import GiftExchangeGroup from '#src/domain/gift-exchange-group';

export default interface GiftExchangeGroupRepository {
  getAll: () => Promise<GiftExchangeGroup[]>;
  getById: (id: string) => Promise<GiftExchangeGroup | null>;
  add: (group: GiftExchangeGroup) => Promise<GiftExchangeGroup>;
  update: (group: GiftExchangeGroup) => Promise<GiftExchangeGroup | null>;
  delete: (id: string) => Promise<boolean>;
  findByInviteCodeHash: (codeHash: string) => Promise<GiftExchangeGroup | null>;
}
