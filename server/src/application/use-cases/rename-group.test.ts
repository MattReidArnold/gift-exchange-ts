import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import renameGroup from '#src/application/use-cases/rename-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { seedGroup } from '#tests/support/seed-group';

describe('renameGroup', () => {
  let groupRepository: InMemoryGroupRepository;
  let useCase: ReturnType<typeof renameGroup>;
  let groupId: string;

  beforeEach(async () => {
    groupRepository = new InMemoryGroupRepository();
    useCase = renameGroup({ groupRepository });
    const group = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    groupId = group.id ?? '';
  });

  it('renames the group and saves it', async () => {
    const group = expectOk(await useCase.execute(groupId, '  Friends  '));

    expect(group.name.value).toBe('Friends');
    expect(group.participants.map(({ id }) => id)).toEqual(['alice']);
    expect(await groupRepository.getById(groupId)).toEqual(group);
  });

  it('returns not found for an unknown group', async () => {
    const failure = expectErr(await useCase.execute('missing', 'Friends'));

    expect(failure.type).toBe(GroupUseCaseError.GroupNotFound);
  });

  it('returns the domain failure without saving', async () => {
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await useCase.execute(groupId, '   '));

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNameEmpty);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns save failed when the group cannot be saved', async () => {
    vi.spyOn(groupRepository, 'update').mockResolvedValue(null);

    const failure = expectErr(await useCase.execute(groupId, 'Friends'));

    expect(failure.type).toBe(GroupUseCaseError.GroupSaveFailed);
  });
});
