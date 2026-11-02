import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import {
  GroupUseCaseError,
  groupNotFoundFailure,
  groupSaveFailedFailure,
} from '#src/application/use-cases/group-failures';

type RenameGroupResult = Result<
  GiftExchangeGroup,
  Failure<GroupUseCaseError | GiftExchangeGroupError.GroupNameEmpty>
>;

type RenameGroupDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const renameGroup = ({ groupRepository }: RenameGroupDeps) => {
  const execute = async (
    groupId: string,
    name: string
  ): Promise<RenameGroupResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }

    const groupName = GroupName.create(name);
    if (!groupName.ok) {
      return groupName;
    }

    const savedGroup = await groupRepository.update(group.rename(groupName.value));
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return {
    execute,
  };
};

export type RenameGroupUseCase = ReturnType<typeof renameGroup>;

export default renameGroup;
