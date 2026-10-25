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
      return 403;
    case GiftExchangeGroupError.ParticipantAlreadyLinked:
    case GiftExchangeGroupError.UserAlreadyLinked:
      return 409;
    case GiftExchangeGroupError.GroupNameEmpty:
    case GiftExchangeGroupError.ParticipantNameEmpty:
    case GiftExchangeGroupError.ParticipantNameTaken:
    case GiftExchangeGroupError.InvalidExclusion:
      return 422;
    default: {
      const unhandled: never = type;
      throw new Error(`No HTTP status mapped for failure ${unhandled}`);
    }
  }
};

export const sendFailure = (res: Response, failure: GroupFailure) =>
  res.status(statusForFailure(failure)).send({ failure });
