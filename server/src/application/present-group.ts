import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { Match } from '#src/domain/match';
import UserId from '#src/domain/user-id';

export interface PresentedMatch {
  giverId: string;
  receiverId: string;
}

export interface PresentedGroup {
  id: string | undefined;
  name: string;
  participants: {
    id: string;
    name: string;
    exclusions: string[];
    userId: string | null;
    invitePending: boolean;
  }[];
  members: { userId: string; role: 'owner' | 'member' }[];
  locked: boolean;
  matches: PresentedMatch[];
}

const matchesVisibleTo = (
  group: GiftExchangeGroup,
  viewerId: UserId
): Match[] => {
  if (group.isOwnedBy(viewerId)) {
    return group.matches;
  }
  const participant = group.findParticipantByUserId(viewerId);
  if (!participant) {
    return [];
  }
  return group.matches.filter(({ giverId }) => giverId === participant.id);
};

export const presentGroup = (
  group: GiftExchangeGroup,
  viewerId: string
): PresentedGroup => {
  const viewer = UserId.create(viewerId);
  return {
    id: group.id,
    name: group.name.value,
    participants: group.participants.map((participant) => participant.toJSON()),
    members: group.members.map(({ userId, role }) => ({
      userId: userId.value,
      role,
    })),
    locked: group.locked,
    matches: matchesVisibleTo(group, viewer).map(({ giverId, receiverId }) => ({
      giverId,
      receiverId,
    })),
  };
};
