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

type LockGroupResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError.GroupNotFound
    | GroupUseCaseError.GroupSaveFailed
    | GroupUseCaseError.NotOwner
    | GiftExchangeGroupError.TooFewParticipants
  >
>;

type LockGroupDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const lockGroup = ({ groupRepository }: LockGroupDeps) => {
  const execute = async (
    groupId: string,
    userId: string
  ): Promise<LockGroupResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }
    if (!group.isOwnedBy(UserId.create(userId))) {
      return err(notOwnerFailure());
    }

    const result = group.lock();
    if (!result.ok) {
      return result;
    }
    if (result.value === group) {
      return ok(group);
    }

    const savedGroup = await groupRepository.update(result.value);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type LockGroupUseCase = ReturnType<typeof lockGroup>;

export default lockGroup;
