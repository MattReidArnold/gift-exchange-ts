import { describe, expect, it } from 'vitest';

import generateMatches from '#src/application/use-cases/generate-matches';
import lockGroup from '#src/application/use-cases/lock-group';
import unlockGroup from '#src/application/use-cases/unlock-group';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { expectErr, expectOk } from '#tests/support/result';
import { seedGroup } from '#tests/support/seed-group';

describe('unlockGroup', () => {
  it('unlocks the group and clears matches for the owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
      { id: 'carol', name: 'Carol' },
    ]);
    expectOk(await lockGroup({ groupRepository }).execute(group.id!, 'owner-1'));
    expectOk(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );

    const unlocked = expectOk(
      await unlockGroup({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(unlocked.locked).toBe(false);
    expect(unlocked.matches).toEqual([]);
  });

  it('rejects a non-owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);
    expectOk(await lockGroup({ groupRepository }).execute(group.id!, 'owner-1'));

    const failure = expectErr(
      await unlockGroup({ groupRepository }).execute(group.id!, 'someone-else')
    );

    expect(failure.type).toBe(GroupUseCaseError.NotOwner);
  });
});
