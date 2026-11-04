import { describe, expect, it } from 'vitest';

import lockGroup from '#src/application/use-cases/lock-group';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { expectErr, expectOk } from '#tests/support/result';
import { seedGroup } from '#tests/support/seed-group';

describe('lockGroup', () => {
  it('locks the group for the owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const locked = expectOk(
      await lockGroup({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(locked.locked).toBe(true);
  });

  it('rejects a non-owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const failure = expectErr(
      await lockGroup({ groupRepository }).execute(group.id!, 'someone-else')
    );

    expect(failure.type).toBe(GroupUseCaseError.NotOwner);
  });

  it('rejects locking with fewer than two participants', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);

    const failure = expectErr(
      await lockGroup({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(failure.type).toBe(GiftExchangeGroupError.TooFewParticipants);
  });
});
