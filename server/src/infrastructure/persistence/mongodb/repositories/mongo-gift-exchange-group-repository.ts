import mongoose from 'mongoose';

import GiftExchangeGroupRepository, {
  ClaimInviteOutcome,
} from '#src/application/ports/gift-exchange-group-repository';
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
      name: group.name,
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
    doc.name = group.name;
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

  async findByPendingInviteHash(codeHash: string): Promise<GiftExchangeGroup | null> {
    const doc = await GiftExchangeGroupModel.findOne({
      participants: { $elemMatch: { inviteCodeHash: codeHash, userId: null } },
    }).exec();
    return doc ? doc.toEntity() : null;
  }

  async claimInvite({
    codeHash,
    userId,
  }: {
    codeHash: string;
    userId: string;
  }): Promise<ClaimInviteOutcome> {
    const existing = await GiftExchangeGroupModel.findOne({
      $or: [
        { 'participants.inviteCodeHash': codeHash },
        { 'participants.claimedCodeHash': codeHash },
      ],
    }).exec();
    if (!existing) {
      return { status: 'not-found' };
    }

    const group = existing.toEntity();
    const participant = group.participants.find(
      (item) => item.invite?.codeHash === codeHash || item.claimedCodeHash === codeHash
    );
    if (!participant || !group.id) {
      return { status: 'not-found' };
    }
    if (participant.userId === userId) {
      return { status: 'already-linked-to-self', groupId: group.id };
    }
    if (participant.userId) {
      return { status: 'participant-already-linked' };
    }
    if (group.participants.some((item) => item.userId === userId)) {
      return { status: 'user-already-linked' };
    }

    const updated = await GiftExchangeGroupModel.updateOne(
      {
        _id: group.id,
        participants: {
          $elemMatch: {
            id: participant.id,
            inviteCodeHash: codeHash,
            userId: null,
          },
        },
        'participants.userId': { $ne: userId },
      },
      {
        $set: {
          'participants.$.userId': userId,
          'participants.$.claimedCodeHash': codeHash,
          'participants.$.inviteCodeHash': null,
          'participants.$.inviteCreatedAt': null,
        },
      }
    ).exec();

    if (updated.modifiedCount !== 1) {
      return this.classifyClaim(codeHash, userId);
    }

    await GiftExchangeGroupModel.updateOne(
      { _id: group.id, 'members.userId': { $ne: userId } },
      { $push: { members: { userId, role: 'member' } } }
    ).exec();

    return { status: 'claimed', groupId: group.id };
  }

  private async classifyClaim(
    codeHash: string,
    userId: string
  ): Promise<ClaimInviteOutcome> {
    const doc = await GiftExchangeGroupModel.findOne({
      $or: [
        { 'participants.inviteCodeHash': codeHash },
        { 'participants.claimedCodeHash': codeHash },
      ],
    }).exec();
    if (!doc) {
      return { status: 'not-found' };
    }
    const group = doc.toEntity();
    const participant = group.participants.find(
      (item) => item.invite?.codeHash === codeHash || item.claimedCodeHash === codeHash
    );
    if (!participant || !group.id) {
      return { status: 'not-found' };
    }
    if (participant.userId === userId) {
      return { status: 'already-linked-to-self', groupId: group.id };
    }
    if (participant.userId) {
      return { status: 'participant-already-linked' };
    }
    if (group.participants.some((item) => item.userId === userId)) {
      return { status: 'user-already-linked' };
    }
    return { status: 'not-found' };
  }
}
