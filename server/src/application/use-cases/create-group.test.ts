import { beforeEach, describe, expect, it, vi } from 'vitest';

import createGroup from '#src/application/use-cases/create-group';
import UserId from '#src/domain/user-id';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';

describe('createGroup', () => {
  let groupRepository: InMemoryGroupRepository;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
  });

  it('saves a new group and returns it with an id', async () => {
    const group = expectOk(
      await createGroup({ groupRepository }).execute('  Family  ', 'owner-1')
    );

    expect(group.id).toBeDefined();
    expect(group.name.value).toBe('Family');
    expect(group.members).toEqual([
      { userId: UserId.create('owner-1'), role: 'owner' },
    ]);
    expect(await groupRepository.getById(group.id ?? '')).toEqual(group);
  });

  it('returns the domain failure without saving', async () => {
    const add = vi.spyOn(groupRepository, 'add');

    const failure = expectErr(
      await createGroup({ groupRepository }).execute('   ', 'owner-1')
    );

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNameEmpty);
    expect(add).not.toHaveBeenCalled();
  });
});
