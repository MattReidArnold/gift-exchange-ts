import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashInviteToken } from '#src/application/invite-token';
import issueParticipantInvite from '#src/application/use-cases/issue-participant-invite';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import SequentialInviteTokenFactory from '#tests/support/sequential-invite-token-factory';
import { seedGroup } from '#tests/support/seed-group';

const issuedAt = new Date('2026-01-01T00:00:00.000Z');
const ownerId = 'owner-1';

describe('issueParticipantInvite', () => {
  let groupRepository: InMemoryGroupRepository;
  let useCase: ReturnType<typeof issueParticipantInvite>;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    useCase = issueParticipantInvite({
      groupRepository,
      inviteTokens: new SequentialInviteTokenFactory(),
      now: () => issuedAt,
    });
  });

  it('returns the token once and stores only its hash', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);

    const issued = expectOk(await useCase.execute(id, 'alice', ownerId));

    expect(issued.token).toBe('invite-token-1');
    expect(issued.group.findParticipant('alice')?.invite).toEqual({
      codeHash: hashInviteToken('invite-token-1'),
      createdAt: issuedAt,
    });
    expect(JSON.stringify(issued.group)).not.toContain(issued.token);
    expect(await groupRepository.getById(id)).toEqual(issued.group);
  });

  it('replaces the stored hash when issued again', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    await useCase.execute(id, 'alice', ownerId);

    const rotated = expectOk(await useCase.execute(id, 'alice', ownerId));

    expect(rotated.token).toBe('invite-token-2');
    expect(rotated.group.findParticipant('alice')?.invite?.codeHash).toBe(
      hashInviteToken('invite-token-2')
    );
  });

  it('does not save when the caller is not a member', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await useCase.execute(id, 'alice', 'stranger'));

    expect(failure.type).toBe(GroupUseCaseError.NotAMember);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown group', async () => {
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await useCase.execute('missing', 'alice', ownerId));

    expect(failure.type).toBe(GroupUseCaseError.GroupNotFound);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns the domain failure without saving', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await useCase.execute(id, 'missing', ownerId));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not save a new invite for a linked participant', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const issued = expectOk(await useCase.execute(id, 'alice', ownerId));
    await groupRepository.claimInvite({
      codeHash: hashInviteToken(issued.token),
      userId: 'user-2',
    });
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await useCase.execute(id, 'alice', ownerId));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns save failed when the group cannot be saved', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    vi.spyOn(groupRepository, 'update').mockResolvedValue(null);

    const failure = expectErr(await useCase.execute(id, 'alice', ownerId));

    expect(failure.type).toBe(GroupUseCaseError.GroupSaveFailed);
  });
});
