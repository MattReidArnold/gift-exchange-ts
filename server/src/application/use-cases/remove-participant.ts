import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import {
  GroupUseCaseError,
  groupNotFoundFailure,
  groupSaveFailedFailure,
} from '#src/application/use-cases/group-failures';

type RemoveParticipantResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.GroupLocked
  >
>;

type RemoveParticipantDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const removeParticipant = ({ groupRepository }: RemoveParticipantDeps) => {
  const execute = async (
    groupId: string,
    participantId: string
  ): Promise<RemoveParticipantResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }

    const result = group.removeParticipant(participantId);
    if (!result.ok) {
      return result;
    }

    const savedGroup = await groupRepository.update(result.value);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return {
    execute,
  };
};

export type RemoveParticipantUseCase = ReturnType<typeof removeParticipant>;

export default removeParticipant;
