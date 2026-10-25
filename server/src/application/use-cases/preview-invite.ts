import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import { hashInviteToken } from '#src/application/invite-token';
import {
  GroupUseCaseError,
  inviteNotFoundFailure,
} from '#src/application/use-cases/group-failures';

export type InvitePreview = {
  groupName: string;
  participantName: string;
};

type PreviewInviteResult = Result<
  InvitePreview,
  Failure<GroupUseCaseError.InviteNotFound>
>;

type PreviewInviteDeps = {
  groupRepository: GiftExchangeGroupRepository;
};

const previewInvite = ({ groupRepository }: PreviewInviteDeps) => {
  const execute = async (token: string): Promise<PreviewInviteResult> => {
    const codeHash = hashInviteToken(token);
    const group = await groupRepository.findByPendingInviteHash(codeHash);
    const participant = group?.participants.find(
      (item) => item.invite?.codeHash === codeHash
    );
    if (!group || !participant) {
      return err(inviteNotFoundFailure());
    }
    return ok({
      groupName: group.name,
      participantName: participant.name,
    });
  };

  return { execute };
};

export type PreviewInviteUseCase = ReturnType<typeof previewInvite>;

export default previewInvite;
