import { beforeEach, describe, expect, it, vi } from 'vitest';

import claimInvite from '#src/application/use-cases/claim-invite';
import issueParticipantInvite from '#src/application/use-cases/issue-participant-invite';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import SequentialInviteTokenFactory from '#tests/support/sequential-invite-token-factory';
import { seedGroup } from '#tests/support/seed-group';

const ownerId = 'owner-1';

describe('claimInvite', () => {
  let groupRepository: InMemoryGroupRepository;
  let claim: ReturnType<typeof claimInvite>;
  let issue: ReturnType<typeof issueParticipantInvite>;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    claim = claimInvite({ groupRepository });
    issue = issueParticipantInvite({
      groupRepository,
      inviteTokens: new SequentialInviteTokenFactory(),
    });
  });

  const issueFor = async (participantId: string, name: string) => {
    const seeded = await seedGroup(groupRepository, [{ id: participantId, name }]);
    const issued = expectOk(
      await issue.execute(seeded.id ?? '', participantId, ownerId)
    );
    return { groupId: seeded.id ?? '', token: issued.token };
  };

  it('links a new account and adds group membership', async () => {
    const { groupId, token } = await issueFor('alice', 'Alice');

    const claimed = expectOk(await claim.execute(token, 'user-2'));

    expect(claimed).toEqual({ groupId });
    const group = await groupRepository.getById(groupId);
    expect(group?.findParticipant('alice')?.userId).toBe('user-2');
    expect(group?.findParticipant('alice')?.invite).toBeNull();
    expect(group?.members).toEqual([
      { userId: ownerId, role: 'owner' },
      { userId: 'user-2', role: 'member' },
    ]);
  });

  it('links the owner without changing their role', async () => {
    const { groupId, token } = await issueFor('alice', 'Alice');

    expectOk(await claim.execute(token, ownerId));

    const group = await groupRepository.getById(groupId);
    expect(group?.findParticipant('alice')?.userId).toBe(ownerId);
    expect(group?.members).toEqual([{ userId: ownerId, role: 'owner' }]);
  });

  it('succeeds again for the same account without saving', async () => {
    const { groupId, token } = await issueFor('alice', 'Alice');
    expectOk(await claim.execute(token, 'user-2'));
    const update = vi.spyOn(groupRepository, 'update');

    const again = expectOk(await claim.execute(token, 'user-2'));

    expect(again).toEqual({ groupId });
    expect(update).not.toHaveBeenCalled();
    const group = await groupRepository.getById(groupId);
    expect(group?.members.filter((member) => member.userId === 'user-2')).toHaveLength(1);
  });

  it('rejects a different account after the participant is linked', async () => {
    const { token } = await issueFor('alice', 'Alice');
    expectOk(await claim.execute(token, 'user-2'));

    const failure = expectErr(await claim.execute(token, 'user-3'));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
  });

  it('rejects an account already linked to another participant', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]);
    const alice = expectOk(await issue.execute(id, 'alice', ownerId));
    expectOk(await claim.execute(alice.token, 'user-2'));
    const bob = expectOk(await issue.execute(id, 'bob', ownerId));

    const failure = expectErr(await claim.execute(bob.token, 'user-2'));

    expect(failure.type).toBe(GiftExchangeGroupError.UserAlreadyLinked);
    expect((await groupRepository.getById(id))?.findParticipant('bob')?.userId).toBeNull();
  });

  it('returns not found for an unknown token', async () => {
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await claim.execute('missing', 'user-2'));

    expect(failure.type).toBe(GroupUseCaseError.InviteNotFound);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns save failed when the group cannot be saved', async () => {
    const { token } = await issueFor('alice', 'Alice');
    vi.spyOn(groupRepository, 'update').mockResolvedValue(null);

    const failure = expectErr(await claim.execute(token, 'user-2'));

    expect(failure.type).toBe(GroupUseCaseError.GroupSaveFailed);
  });
});
