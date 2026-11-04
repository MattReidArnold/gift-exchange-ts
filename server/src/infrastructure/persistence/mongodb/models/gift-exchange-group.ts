import mongoose from 'mongoose';
import GiftExchangeGroup, {
  GroupMember,
  GroupMemberRole,
} from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import InviteCodeHash from '#src/domain/invite-code-hash';
import Participant from '#src/domain/participant';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';

interface ParticipantAttrs {
  id: string;
  name: string;
  exclusions: string[];
  userId: string | null;
  inviteCodeHash: string | null;
  inviteCreatedAt: Date | null;
}

interface MemberAttrs {
  userId: string;
  role: GroupMemberRole;
}

interface MatchAttrs {
  giverId: string;
  receiverId: string;
}

interface GiftExchangeGroupDocument extends mongoose.Document {
  name: string;
  participants: ParticipantAttrs[];
  members: MemberAttrs[];
  locked: boolean;
  matches: MatchAttrs[];
  toEntity(): GiftExchangeGroup;
}

const ParticipantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    exclusions: { type: [String], default: [] },
    userId: { type: String, default: null },
    inviteCodeHash: { type: String, default: null },
    inviteCreatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ['owner', 'member'], required: true },
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    giverId: { type: String, required: true },
    receiverId: { type: String, required: true },
  },
  { _id: false }
);

const GiftExchangeGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  participants: { type: [ParticipantSchema], default: [] },
  members: { type: [MemberSchema], required: true },
  locked: { type: Boolean, default: false },
  matches: { type: [MatchSchema], default: [] },
});

GiftExchangeGroupSchema.index({ 'members.userId': 1 });
GiftExchangeGroupSchema.index({ 'participants.inviteCodeHash': 1 });

const toMember = ({ userId, role }: MemberAttrs): GroupMember => ({
  userId: UserId.create(userId),
  role,
});

GiftExchangeGroupSchema.methods.toEntity = function (): GiftExchangeGroup {
  const { _id, name, participants, members, locked, matches } = this as GiftExchangeGroupDocument;
  return new GiftExchangeGroup({
    id: String(_id),
    name: GroupName.hydrate(name),
    participants: participants.map(
      ({
        id,
        name,
        exclusions,
        userId,
        inviteCodeHash,
        inviteCreatedAt,
      }) =>
        new Participant({
          id,
          name: ParticipantName.hydrate(name),
          exclusions: [...exclusions],
          userId: userId ? UserId.create(userId) : null,
          invite: inviteCodeHash
            ? {
                codeHash: InviteCodeHash.create(inviteCodeHash),
                createdAt: inviteCreatedAt ?? new Date(0),
              }
            : null,
        })
    ),
    members: (members ?? []).map(toMember),
    locked: locked ?? false,
    matches: (matches ?? []).map(({ giverId, receiverId }) => ({
      giverId,
      receiverId,
    })),
  });
};

const Model = mongoose.model<GiftExchangeGroupDocument>(
  'GiftExchangeGroup',
  GiftExchangeGroupSchema
);

export const toParticipantAttrs = ({
  id,
  name,
  exclusions,
  userId,
  invite,
}: Participant): ParticipantAttrs => ({
  id,
  name: name.value,
  exclusions,
  userId: userId?.value ?? null,
  inviteCodeHash: invite?.codeHash.value ?? null,
  inviteCreatedAt: invite?.createdAt ?? null,
});

export const toMemberAttrs = ({ userId, role }: GroupMember): MemberAttrs => ({
  userId: userId.value,
  role,
});

export default Model;
