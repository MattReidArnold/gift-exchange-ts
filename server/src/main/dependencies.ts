import Dependencies from '#src/application/dependencies';
import randomInviteTokenFactory from '#src/infrastructure/id/random-invite-token-factory';
import uuidIdGenerator from '#src/infrastructure/id/uuid-id-generator';
import winstonLogger from '#src/infrastructure/logger/winston-logger';
import mongoConnect from '#src/infrastructure/persistence/mongodb/connect';
import MongoGiftExchangeGroupRepository from '#src/infrastructure/persistence/mongodb/repositories/mongo-gift-exchange-group-repository';
import { env } from '#src/main/env';

export default async (): Promise<Dependencies> => {
  const logger = winstonLogger();
  await mongoConnect(logger, env.MONGODB_URI);
  return {
    logger,
    groupRepository: new MongoGiftExchangeGroupRepository(),
    idGenerator: uuidIdGenerator(),
    inviteTokens: randomInviteTokenFactory(),
  };
};
