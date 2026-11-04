import { Router } from 'express';

import WebContext from '#src/infrastructure/web/web-context';
import groupController from '#src/infrastructure/web/controllers/group-controller';
import inviteController from '#src/infrastructure/web/controllers/invite-controller';

const groupRouter = ({ logger, useCases }: WebContext) => {
  const controller = groupController({ logger, ...useCases });
  const invites = inviteController({ logger, ...useCases });
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:groupId', controller.find);
  router.put('/:groupId', controller.rename);
  router.delete('/:groupId', controller.remove);
  router.delete('/:groupId/lock', controller.unlock);
  router.post('/:groupId/matches', controller.draw);
  router.post('/:groupId/participants', controller.addMember);
  router.put('/:groupId/participants/:participantId', controller.updateMember);
  router.delete(
    '/:groupId/participants/:participantId',
    controller.removeMember
  );
  router.post(
    '/:groupId/participants/:participantId/invite',
    invites.issue
  );
  router.delete(
    '/:groupId/participants/:participantId/invite',
    invites.revoke
  );
  return router;
};

export default groupRouter;
