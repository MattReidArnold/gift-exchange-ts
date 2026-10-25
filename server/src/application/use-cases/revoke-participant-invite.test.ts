import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashInviteToken } from '#src/application/invite-token';
import issueParticipantInvite from '#src/application/use-cases/issue-participant-invite';
import revokeParticipantInvite from '#src/application/use-cases/revoke-participant-invite';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import SequentialInviteTokenFactory from '#tests/support/sequential-invite-token-factory';
import { seedGroup } from '#tests/support/seed-group';

const ownerId = 'owner-1';

describe('revokeParticipantInvite', () => {
  let groupRepository: InMemoryGroupRepository;
  let revoke: ReturnType<typeof revokeParticipantInvite>;
  let issue: ReturnType<typeof issueParticipantInvite>;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    revoke = revokeParticipantInvite({ groupRepository });
    issue = issueParticipantInvite({
      groupRepository,
      inviteTokens: new SequentialInviteTokenFactory(),
    });
  });

  it('clears the pending invite', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    await issue.execute(id, 'alice', ownerId);

    const group = expectOk(await revoke.execute(id, 'alice', ownerId));

    expect(group.findParticipant('alice')?.invite).toBeNull();
  });

  it('does not save when the caller is not a member', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    await issue.execute(id, 'alice', ownerId);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await revoke.execute(id, 'alice', 'stranger'));

    expect(failure.type).toBe(GroupUseCaseError.NotAMember);
    expect(update).not.toHaveBeenCalled();
    expect(
      (await groupRepository.getById(id))?.findParticipant('alice')?.invite?.codeHash
    ).toBe(hashInviteToken('invite-token-1'));
  });

  it('returns not found when no invite is pending', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await revoke.execute(id, 'alice', ownerId));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown participant', async () => {
    const { id = '' } = await seedGroup(groupRepository);
    const update = vi.spyOn(groupRepository, 'update');

    const failure = expectErr(await revoke.execute(id, 'missing', ownerId));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
    expect(update).not.toHaveBeenCalled();
  });
});
