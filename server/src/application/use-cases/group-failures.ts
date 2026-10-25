import { Failure } from '#src/domain/shared/failure';

export enum GroupUseCaseError {
  GroupNotFound = 'GROUP_NOT_FOUND',
  GroupSaveFailed = 'GROUP_SAVE_FAILED',
  NotAMember = 'NOT_A_MEMBER',
  InviteNotFound = 'INVITE_NOT_FOUND',
}

export const groupNotFoundFailure =
  (): Failure<GroupUseCaseError.GroupNotFound> => ({
    type: GroupUseCaseError.GroupNotFound,
    reason: 'Group with that id was not found',
  });

export const groupSaveFailedFailure =
  (): Failure<GroupUseCaseError.GroupSaveFailed> => ({
    type: GroupUseCaseError.GroupSaveFailed,
    reason: 'Group could not be saved at this time',
  });

export const notAMemberFailure = (): Failure<GroupUseCaseError.NotAMember> => ({
  type: GroupUseCaseError.NotAMember,
  reason: 'Only a member of the group can manage invites',
});

export const inviteNotFoundFailure =
  (): Failure<GroupUseCaseError.InviteNotFound> => ({
    type: GroupUseCaseError.InviteNotFound,
    reason: 'Invite link is invalid or has already been used',
  });
