import { beforeEach, describe, expect, it, vi } from 'vitest';

import addParticipant from '#src/application/use-cases/add-participant';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import { seedGroup } from '#tests/support/seed-group';
import SequentialIdGenerator from '#tests/support/sequential-id-generator';

describe('addParticipant', () => {
  let groupRepository: InMemoryGroupRepository;
  let useCase: ReturnType<typeof addParticipant>;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    useCase = addParticipant({
      groupRepository,
      idGenerator: new SequentialIdGenerator(),
    });
  });

  it('adds the participant with a generated id and saves the group', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);

    const group = expectOk(
      await useCase.execute(id, { name: 'Bob', exclusions: ['alice'] })
    );

    expect(group.findParticipant('p1')?.name.value).toBe('Bob');
    expect(group.findParticipant('p1')?.exclusions).toEqual(['alice']);
    expect(await groupRepository.getById(id)).toEqual(group);
  });

  it('returns not found for an unknown group', async () => {
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(
      await useCase.execute('missing', { name: 'Bob', exclusions: [] })
    );

    expect(failure.type).toBe(GroupUseCaseError.GroupNotFound);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns the domain failure without saving', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(
      await useCase.execute(id, { name: 'alice', exclusions: [] })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameTaken);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns save failed when the group cannot be saved', async () => {
    const { id = '' } = await seedGroup(groupRepository);
    vi.spyOn(groupRepository, 'update').mockResolvedValue(null);

    const failure = expectErr(
      await useCase.execute(id, { name: 'Bob', exclusions: [] })
    );

    expect(failure.type).toBe(GroupUseCaseError.GroupSaveFailed);
  });
});
