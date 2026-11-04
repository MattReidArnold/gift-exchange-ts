import { Request, Response, NextFunction } from 'express';

import { presentGroup } from '#src/application/present-group';
import Logger from '#src/application/ports/logger';
import { ClaimInviteUseCase } from '#src/application/use-cases/claim-invite';
import { IssueParticipantInviteUseCase } from '#src/application/use-cases/issue-participant-invite';
import { PreviewInviteUseCase } from '#src/application/use-cases/preview-invite';
import { RevokeParticipantInviteUseCase } from '#src/application/use-cases/revoke-participant-invite';
import { sendFailure } from '#src/infrastructure/web/status-for-failure';

type InviteControllerDeps = {
  logger: Logger;
  issueParticipantInvite: IssueParticipantInviteUseCase;
  revokeParticipantInvite: RevokeParticipantInviteUseCase;
  previewInvite: PreviewInviteUseCase;
  claimInvite: ClaimInviteUseCase;
};

type ParticipantParams = { groupId: string; participantId: string };
type TokenParams = { token: string };

const unauthenticated = {
  failure: {
    type: 'UNAUTHENTICATED',
    reason: 'Sign in to continue',
  },
};

const inviteController = ({
  logger,
  issueParticipantInvite,
  revokeParticipantInvite,
  previewInvite,
  claimInvite,
}: InviteControllerDeps) => {
  const issue = async (
    req: Request<ParticipantParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send(unauthenticated);
    }
    const { groupId, participantId } = req.params;
    const result = await issueParticipantInvite.execute(groupId, participantId, userId);
    if (!result.ok) {
      logger.info('failed to issue invite', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.status(200).send({
      group: presentGroup(result.value.group, userId),
      token: result.value.token,
    });
  };

  const revoke = async (
    req: Request<ParticipantParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send(unauthenticated);
    }
    const { groupId, participantId } = req.params;
    const result = await revokeParticipantInvite.execute(
      groupId,
      participantId,
      userId
    );
    if (!result.ok) {
      logger.info('failed to revoke invite', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.send(presentGroup(result.value, userId));
  };

  const preview = async (
    req: Request<TokenParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const result = await previewInvite.execute(req.params.token);
    if (!result.ok) {
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  const claim = async (
    req: Request<TokenParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send(unauthenticated);
    }
    const result = await claimInvite.execute(req.params.token, userId);
    if (!result.ok) {
      logger.info('failed to claim invite', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  return { issue, revoke, preview, claim };
};

export default inviteController;
