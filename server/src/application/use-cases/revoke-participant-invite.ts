import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import {
  GroupUseCaseError,
  groupSaveFailedFailure,
} from '#src/application/use-cases/group-failures';
import loadManagedGroup from '#src/application/use-cases/load-managed-group';

type RevokeParticipantInviteResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError.GroupNotFound
    | GroupUseCaseError.NotAMember
    | GroupUseCaseError.GroupSaveFailed
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.InviteNotPending
  >
>;

type RevokeParticipantInviteDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const revokeParticipantInvite = ({ groupRepository }: RevokeParticipantInviteDeps) => {
  const execute = async (
    groupId: string,
    participantId: string,
    userId: string
  ): Promise<RevokeParticipantInviteResult> => {
    const loaded = await loadManagedGroup(groupRepository, groupId, userId);
    if (!loaded.ok) {
      return loaded;
    }

    const cleared = loaded.value.clearInvite(participantId);
    if (!cleared.ok) {
      return cleared;
    }

    const savedGroup = await groupRepository.update(cleared.value);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type RevokeParticipantInviteUseCase = ReturnType<typeof revokeParticipantInvite>;

export default revokeParticipantInvite;
