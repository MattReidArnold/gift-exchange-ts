import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import UserId from '#src/domain/user-id';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';

type CreateGroupResult = Result<
  GiftExchangeGroup,
  Failure<GiftExchangeGroupError.GroupNameEmpty>
>;

type CreateGroupDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const createGroup = ({ groupRepository }: CreateGroupDeps) => {
  const execute = async (
    name: string,
    ownerId: string
  ): Promise<CreateGroupResult> => {
    const groupName = GroupName.create(name);
    if (!groupName.ok) {
      return groupName;
    }
    return ok(
      await groupRepository.add(
        GiftExchangeGroup.create(groupName.value, UserId.create(ownerId))
      )
    );
  };

  return {
    execute,
  };
};

export type CreateGroupUseCase = ReturnType<typeof createGroup>;

export default createGroup;
