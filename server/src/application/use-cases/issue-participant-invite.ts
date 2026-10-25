import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import InviteTokenFactory from '#src/application/ports/invite-token-factory';
import { hashInviteToken } from '#src/application/invite-token';
import {
  GroupUseCaseError,
  groupSaveFailedFailure,
} from '#src/application/use-cases/group-failures';
import loadManagedGroup from '#src/application/use-cases/load-managed-group';

export type IssuedInvite = {
  group: GiftExchangeGroup;
  token: string;
};

type IssueParticipantInviteResult = Result<
  IssuedInvite,
  Failure<
    | GroupUseCaseError.GroupNotFound
    | GroupUseCaseError.NotAMember
    | GroupUseCaseError.GroupSaveFailed
    | GiftExchangeGroupError.ParticipantNotFound
    | GiftExchangeGroupError.ParticipantAlreadyLinked
  >
>;

type IssueParticipantInviteDeps = {
  groupRepository: GiftExchangeGroupRepository;
  inviteTokens: InviteTokenFactory;
  now?: () => Date;
};

const issueParticipantInvite = ({
  groupRepository,
  inviteTokens,
  now = () => new Date(),
}: IssueParticipantInviteDeps) => {
  const execute = async (
    groupId: string,
    participantId: string,
    userId: string
  ): Promise<IssueParticipantInviteResult> => {
    const loaded = await loadManagedGroup(groupRepository, groupId, userId);
    if (!loaded.ok) {
      return loaded;
    }

    const token = inviteTokens.create();
    const issued = loaded.value.issueInvite(participantId, hashInviteToken(token), now());
    if (!issued.ok) {
      return issued;
    }

    const savedGroup = await groupRepository.update(issued.value);
    return savedGroup ? ok({ group: savedGroup, token }) : err(groupSaveFailedFailure());
  };

  return { execute };
};

export type IssueParticipantInviteUseCase = ReturnType<typeof issueParticipantInvite>;

export default issueParticipantInvite;
