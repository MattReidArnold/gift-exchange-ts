import {
  GiftExchangeGroupError,
  participantAlreadyLinkedFailure,
  userAlreadyLinkedFailure,
} from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import { hashInviteToken } from '#src/application/invite-token';
import {
  GroupUseCaseError,
  inviteNotFoundFailure,
} from '#src/application/use-cases/group-failures';

export type ClaimedInvite = {
  groupId: string;
};

type ClaimInviteResult = Result<
  ClaimedInvite,
  Failure<
    | GroupUseCaseError.InviteNotFound
    | GiftExchangeGroupError.ParticipantAlreadyLinked
    | GiftExchangeGroupError.UserAlreadyLinked
  >
>;

type ClaimInviteDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const claimInvite = ({ groupRepository }: ClaimInviteDeps) => {
  const execute = async (token: string, userId: string): Promise<ClaimInviteResult> => {
    const outcome = await groupRepository.claimInvite({
      codeHash: hashInviteToken(token),
      userId,
    });
    switch (outcome.status) {
      case 'claimed':
      case 'already-linked-to-self':
        return ok({ groupId: outcome.groupId });
      case 'not-found':
        return err(inviteNotFoundFailure());
      case 'participant-already-linked':
        return err(participantAlreadyLinkedFailure());
      case 'user-already-linked':
        return err(userAlreadyLinkedFailure());
      default: {
        const unhandled: never = outcome;
        throw new Error(`Unhandled claim outcome ${JSON.stringify(unhandled)}`);
      }
    }
  };

  return { execute };
};

export type ClaimInviteUseCase = ReturnType<typeof claimInvite>;

export default claimInvite;
