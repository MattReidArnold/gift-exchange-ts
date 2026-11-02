import mongoose from 'mongoose';

import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GiftExchangeGroupModel, {
  toMemberAttrs,
  toParticipantAttrs,
} from '#src/infrastructure/persistence/mongodb/models/gift-exchange-group';

export default class MongoGiftExchangeGroupRepository
  implements GiftExchangeGroupRepository
{
  async getAll(): Promise<GiftExchangeGroup[]> {
    const docs = await GiftExchangeGroupModel.find().sort({ _id: 1 }).exec();
    return docs.map((doc) => doc.toEntity());
  }
  async getById(id: string): Promise<GiftExchangeGroup | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const doc = await GiftExchangeGroupModel.findById(id).exec();
    if (!doc) {
      return null;
    }
    return doc.toEntity();
  }
  async add(group: GiftExchangeGroup): Promise<GiftExchangeGroup> {
    const doc = await GiftExchangeGroupModel.create({
      name: group.name.value,
      participants: group.participants.map(toParticipantAttrs),
      members: group.members.map(toMemberAttrs),
    });
    return doc.toEntity();
  }
  async update(group: GiftExchangeGroup): Promise<GiftExchangeGroup | null> {
    if (!group.id || !mongoose.isValidObjectId(group.id)) {
      return null;
    }
    const doc = await GiftExchangeGroupModel.findById(group.id).exec();
    if (!doc) {
      return null;
    }
    doc.name = group.name.value;
    doc.participants = group.participants.map(toParticipantAttrs);
    doc.members = group.members.map(toMemberAttrs);
    const updatedDoc = await doc.save();
    return updatedDoc.toEntity();
  }
  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) {
      return false;
    }
    const { deletedCount } = await GiftExchangeGroupModel.deleteOne({
      _id: id,
    }).exec();
    return deletedCount > 0;
  }

  async findByInviteCodeHash(codeHash: string): Promise<GiftExchangeGroup | null> {
    const doc = await GiftExchangeGroupModel.findOne({
      'participants.inviteCodeHash': codeHash,
    }).exec();
    return doc ? doc.toEntity() : null;
  }
}
