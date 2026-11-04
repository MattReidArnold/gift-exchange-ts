import { Response } from 'express';

import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';

export type GroupFailure = Failure<GroupUseCaseError | GiftExchangeGroupError>;

export const statusForFailure = ({ type }: GroupFailure): number => {
  switch (type) {
    case GroupUseCaseError.GroupNotFound:
    case GroupUseCaseError.InviteNotFound:
    case GiftExchangeGroupError.ParticipantNotFound:
    case GiftExchangeGroupError.InviteNotPending:
      return 404;
    case GroupUseCaseError.GroupSaveFailed:
      return 500;
    case GroupUseCaseError.NotAMember:
    case GroupUseCaseError.NotOwner:
      return 403;
    case GiftExchangeGroupError.ParticipantAlreadyLinked:
    case GiftExchangeGroupError.UserAlreadyLinked:
    case GiftExchangeGroupError.GroupLocked:
      return 409;
    case GiftExchangeGroupError.GroupNameEmpty:
    case GiftExchangeGroupError.ParticipantNameEmpty:
    case GiftExchangeGroupError.ParticipantNameTaken:
    case GiftExchangeGroupError.InvalidExclusion:
    case GiftExchangeGroupError.GroupNotLocked:
    case GiftExchangeGroupError.TooFewParticipants:
    case GiftExchangeGroupError.MatchingImpossible:
      return 422;
    default: {
      const unhandled: never = type;
      throw new Error(`No HTTP status mapped for failure ${unhandled}`);
    }
  }
};

export const sendFailure = (res: Response, failure: GroupFailure) =>
  res.status(statusForFailure(failure)).send({ failure });
