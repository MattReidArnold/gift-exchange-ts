import InviteCodeHash from '#src/domain/invite-code-hash';
import UserId from '#src/domain/user-id';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import { hashInviteToken } from '#src/application/invite-token';
import {
  GroupUseCaseError,
  groupSaveFailedFailure,
  inviteNotFoundFailure,
} from '#src/application/use-cases/group-failures';

export type ClaimedInvite = {
  groupId: string;
};

type ClaimInviteResult = Result<
  ClaimedInvite,
  Failure<
    | GroupUseCaseError.InviteNotFound
    | GroupUseCaseError.GroupSaveFailed
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.ParticipantAlreadyLinked
    | GiftExchangeGroupError.UserAlreadyLinked
    | GiftExchangeGroupError.InviteNotPending
  >
>;

type ClaimInviteDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const claimInvite = ({ groupRepository }: ClaimInviteDeps) => {
  const execute = async (token: string, userId: string): Promise<ClaimInviteResult> => {
    const codeHash = InviteCodeHash.create(hashInviteToken(token));
    const group = await groupRepository.findByInviteCodeHash(codeHash.value);
    const participant = group?.findParticipantByInviteCode(codeHash);
    if (!group?.id || !participant) {
      return err(inviteNotFoundFailure());
    }

    const claimed = group.claimInvite(participant.id, UserId.create(userId));
    if (!claimed.ok) {
      return claimed;
    }
    if (claimed.value === group) {
      return ok({ groupId: group.id });
    }

    const savedGroup = await groupRepository.update(claimed.value);
    return savedGroup?.id ? ok({ groupId: savedGroup.id }) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type ClaimInviteUseCase = ReturnType<typeof claimInvite>;

export default claimInvite;
