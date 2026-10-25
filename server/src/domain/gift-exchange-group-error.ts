import { Failure } from '#src/domain/shared/failure';

export enum GiftExchangeGroupError {
  GroupNameEmpty = 'GROUP_NAME_EMPTY',
  ParticipantNotFound = 'PARTICIPANT_NOT_FOUND',
  ParticipantNameEmpty = 'PARTICIPANT_NAME_EMPTY',
  ParticipantNameTaken = 'PARTICIPANT_NAME_TAKEN',
  InvalidExclusion = 'INVALID_EXCLUSION',
  ParticipantAlreadyLinked = 'PARTICIPANT_ALREADY_LINKED',
  UserAlreadyLinked = 'USER_ALREADY_LINKED',
  InviteNotPending = 'INVITE_NOT_PENDING',
}

export type ParticipantValidationError =
  | GiftExchangeGroupError.ParticipantNameEmpty
  | GiftExchangeGroupError.ParticipantNameTaken
  | GiftExchangeGroupError.InvalidExclusion;

export const groupNameEmptyFailure =
  (): Failure<GiftExchangeGroupError.GroupNameEmpty> => ({
    type: GiftExchangeGroupError.GroupNameEmpty,
    reason: 'Group name cannot be empty',
  });

export const participantNotFoundFailure =
  (): Failure<GiftExchangeGroupError.ParticipantNotFound> => ({
    type: GiftExchangeGroupError.ParticipantNotFound,
    reason: 'Participant with that id was not found in the group',
  });

export const participantNameEmptyFailure =
  (): Failure<GiftExchangeGroupError.ParticipantNameEmpty> => ({
    type: GiftExchangeGroupError.ParticipantNameEmpty,
    reason: 'Participant name cannot be empty',
  });

export const participantNameTakenFailure =
  (): Failure<GiftExchangeGroupError.ParticipantNameTaken> => ({
    type: GiftExchangeGroupError.ParticipantNameTaken,
    reason: 'A participant with this name already exists in the group',
  });

export const invalidExclusionFailure = (
  participantId: string
): Failure<GiftExchangeGroupError.InvalidExclusion> => ({
  type: GiftExchangeGroupError.InvalidExclusion,
  reason: `Exclusion '${participantId}' must be another participant in the group`,
});

export const participantAlreadyLinkedFailure =
  (): Failure<GiftExchangeGroupError.ParticipantAlreadyLinked> => ({
    type: GiftExchangeGroupError.ParticipantAlreadyLinked,
    reason: 'This participant is already linked to an account',
  });

export const userAlreadyLinkedFailure =
  (): Failure<GiftExchangeGroupError.UserAlreadyLinked> => ({
    type: GiftExchangeGroupError.UserAlreadyLinked,
    reason: 'This account is already linked to another participant in the group',
  });

export const inviteNotPendingFailure =
  (): Failure<GiftExchangeGroupError.InviteNotPending> => ({
    type: GiftExchangeGroupError.InviteNotPending,
    reason: 'This participant does not have a pending invite',
  });
