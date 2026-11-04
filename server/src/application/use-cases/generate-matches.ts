import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import UserId from '#src/domain/user-id';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import {
  GroupUseCaseError,
  groupNotFoundFailure,
  groupSaveFailedFailure,
  notOwnerFailure,
} from '#src/application/use-cases/group-failures';

type GenerateMatchesResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError.GroupNotFound
    | GroupUseCaseError.GroupSaveFailed
    | GroupUseCaseError.NotOwner
    | GiftExchangeGroupError.TooFewParticipants
    | GiftExchangeGroupError.MatchingImpossible
  >
>;

type GenerateMatchesDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const generateMatches = ({ groupRepository }: GenerateMatchesDeps) => {
  const execute = async (
    groupId: string,
    userId: string
  ): Promise<GenerateMatchesResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }
    if (!group.isOwnedBy(UserId.create(userId))) {
      return err(notOwnerFailure());
    }

    const result = group.generateMatches();
    if (!result.ok) {
      if (result.error.type === GiftExchangeGroupError.MatchingImpossible) {
        const unlocked = group.unlock();
        if (unlocked !== group) {
          const saved = await groupRepository.update(unlocked);
          if (!saved) {
            return err(groupSaveFailedFailure());
          }
        }
      }
      return result;
    }

    const savedGroup = await groupRepository.update(result.value);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type GenerateMatchesUseCase = ReturnType<typeof generateMatches>;

export default generateMatches;
