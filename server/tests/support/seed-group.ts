import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';
import { expectOk } from '#tests/support/result';

type SeedParticipant = { id: string; name: string; exclusions?: string[] };

export const seedGroup = async (
  repository: GiftExchangeGroupRepository,
  participants: SeedParticipant[] = [],
  name = 'Family',
  ownerId = 'owner-1'
): Promise<GiftExchangeGroup> => {
  let group = GiftExchangeGroup.create(
    expectOk(GroupName.create(name)),
    UserId.create(ownerId)
  );
  for (const { id, name: rawName, exclusions = [] } of participants) {
    group = expectOk(
      group.addParticipant({
        id,
        name: expectOk(ParticipantName.create(rawName)),
        exclusions,
      })
    );
  }
  return repository.add(group);
};
