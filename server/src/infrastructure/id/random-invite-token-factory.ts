import { randomBytes } from 'node:crypto';

import InviteTokenFactory from '#src/application/ports/invite-token-factory';

const randomInviteTokenFactory = (): InviteTokenFactory => ({
  create: () => randomBytes(32).toString('base64url'),
});

export default randomInviteTokenFactory;
