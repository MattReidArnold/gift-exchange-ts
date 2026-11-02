import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import UserId from '#src/domain/user-id';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import {
  GroupUseCaseError,
  groupNotFoundFailure,
  notAMemberFailure,
} from '#src/application/use-cases/group-failures';

type LoadManagedGroupResult = Result<
  GiftExchangeGroup,
  Failure<GroupUseCaseError.GroupNotFound | GroupUseCaseError.NotAMember>
>;

const loadManagedGroup = async (
  groupRepository: GiftExchangeGroupRepository,
  groupId: string,
  userId: string
): Promise<LoadManagedGroupResult> => {
  const group = await groupRepository.getById(groupId);
  if (!group) {
    return err(groupNotFoundFailure());
  }
  const accountId = UserId.create(userId);
  if (!group.members.some((member) => member.userId.equals(accountId))) {
    return err(notAMemberFailure());
  }
  return ok(group);
};

export default loadManagedGroup;
