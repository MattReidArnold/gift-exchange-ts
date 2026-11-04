import GiftExchangeGroup from '#src/domain/gift-exchange-group';
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

type UnlockGroupResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError.GroupNotFound
    | GroupUseCaseError.GroupSaveFailed
    | GroupUseCaseError.NotOwner
  >
>;

type UnlockGroupDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const unlockGroup = ({ groupRepository }: UnlockGroupDeps) => {
  const execute = async (
    groupId: string,
    userId: string
  ): Promise<UnlockGroupResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }
    if (!group.isOwnedBy(UserId.create(userId))) {
      return err(notOwnerFailure());
    }

    const unlocked = group.unlock();
    if (unlocked === group) {
      return ok(group);
    }

    const savedGroup = await groupRepository.update(unlocked);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type UnlockGroupUseCase = ReturnType<typeof unlockGroup>;

export default unlockGroup;
