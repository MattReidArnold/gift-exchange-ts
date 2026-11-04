import { describe, expect, it } from 'vitest';

import generateMatches from '#src/application/use-cases/generate-matches';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { expectErr, expectOk } from '#tests/support/result';
import { seedGroup } from '#tests/support/seed-group';

describe('generateMatches', () => {
  it('locks the group and draws matches for the owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
      { id: 'carol', name: 'Carol' },
    ]);

    const drawn = expectOk(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );

    expect(drawn.locked).toBe(true);
    expect(drawn.matches).toHaveLength(3);
  });

  it('rejects a non-owner', async () => {
    const groupRepository = new InMemoryGroupRepository();
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'someone-else')
    );

    expect(failure.type).toBe(GroupUseCaseError.NotOwner);
  });

  it('keeps the group unlocked when no valid matching exists', async () => {
    const groupRepository = new InMemoryGroupRepository();
    let group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob', exclusions: ['alice'] },
    ]);
    group = expectOk(
      group.updateParticipant('alice', { exclusions: ['bob'] })
    );
    await groupRepository.update(group);

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );
    const after = await groupRepository.getById(group.id!);

    expect(failure.type).toBe(GiftExchangeGroupError.MatchingImpossible);
    expect(after?.locked).toBe(false);
    expect(after?.matches).toEqual([]);
  });

  it('unlocks a previously locked group when a redraw is impossible', async () => {
    const groupRepository = new InMemoryGroupRepository();
    let group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
      { id: 'carol', name: 'Carol' },
    ]);
    expectOk(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );
    group = (await groupRepository.getById(group.id!))!;
    group = expectOk(
      group.updateParticipant('alice', { exclusions: ['bob', 'carol'] })
    );
    await groupRepository.update(group);

    const failure = expectErr(
      await generateMatches({ groupRepository }).execute(group.id!, 'owner-1')
    );
    const after = await groupRepository.getById(group.id!);

    expect(failure.type).toBe(GiftExchangeGroupError.MatchingImpossible);
    expect(after?.locked).toBe(false);
    expect(after?.matches).toEqual([]);
  });
});
