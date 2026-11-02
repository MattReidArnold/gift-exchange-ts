import { Router } from 'express';

import devSessionController from '#src/infrastructure/web/controllers/dev-session-controller';
import inviteController from '#src/infrastructure/web/controllers/invite-controller';
import { requireSession } from '#src/infrastructure/web/require-session';
import WebContext from '#src/infrastructure/web/web-context';
import groupRouter from '#src/infrastructure/web/routes/api/group-router';

const apiRouter = (context: WebContext) => {
  const router = Router();
  if (process.env.NODE_ENV !== 'production') {
    router.post('/dev/session', devSessionController(context.auth).create);
  }
  const invites = inviteController({ logger: context.logger, ...context.useCases });
  router.get('/invites/:token', invites.preview);
  router.post('/invites/:token/claim', requireSession(context.auth), invites.claim);
  router.use('/groups', requireSession(context.auth), groupRouter(context));
  return router;
};

export default apiRouter;
