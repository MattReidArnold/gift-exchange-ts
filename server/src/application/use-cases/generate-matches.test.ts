import { describe, expect, it } from 'vitest';

import generateMatches from '#src/application/use-cases/generate-matches';
import lockGroup from '#src/application/use-cases/lock-group';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { expectErr, expectOk } from '#tests/support/result';
import { seedGroup } from '#tests/support/seed-group';

describe('generateMatches', () => {
  it('draws matches after the owner locks the group', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
      { id: 'carol', name: 'Carol' },
    ]);
    expectOk(await lockGroup({ groupRepository }).execute(group.id!, 'owner-1'));

    const drawn = expectOk(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(drawn.matches).toHaveLength(3);
  });

  it('rejects drawing before the group is locked', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNotLocked);
  });

  it('rejects a non-owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);
    expectOk(await lockGroup({ groupRepository }).execute(group.id!, 'owner-1'));

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'someone-else')
    );

    expect(failure.type).toBe(GroupUseCaseError.NotOwner);
  });

  it('unlocks the group when no valid matching exists', async () => {
    const groupRepository = new InMemoryGroupRepository();
    let group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob', exclusions: ['alice'] },
    ]);
    group = expectOk(
      group.updateParticipant('alice', { exclusions: ['bob'] })
    );
    await groupRepository.update(group);
    expectOk(await lockGroup({ groupRepository }).execute(group.id!, 'owner-1'));

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );
    const unlocked = await groupRepository.getById(group.id!);

    expect(failure.type).toBe(GiftExchangeGroupError.MatchingImpossible);
    expect(unlocked?.locked).toBe(false);
    expect(unlocked?.matches).toEqual([]);
  });
});
