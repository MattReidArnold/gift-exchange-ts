import { beforeEach, describe, expect, it } from 'vitest';

import { hashInviteToken } from '#src/application/invite-token';
import issueParticipantInvite from '#src/application/use-cases/issue-participant-invite';
import previewInvite from '#src/application/use-cases/preview-invite';
import { GroupUseCaseError } from '#src/application/use-cases/group-failures';
import { expectErr, expectOk } from '#tests/support/result';
import InMemoryGroupRepository from '#tests/support/in-memory-group-repository';
import SequentialInviteTokenFactory from '#tests/support/sequential-invite-token-factory';
import { seedGroup } from '#tests/support/seed-group';

describe('previewInvite', () => {
  let groupRepository: InMemoryGroupRepository;
  let preview: ReturnType<typeof previewInvite>;
  let issue: ReturnType<typeof issueParticipantInvite>;

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository();
    preview = previewInvite({ groupRepository });
    issue = issueParticipantInvite({
      groupRepository,
      inviteTokens: new SequentialInviteTokenFactory(),
    });
  });

  it('returns only the group and participant names', async () => {
    const { id = '' } = await seedGroup(
      groupRepository,
      [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob', exclusions: ['alice'] },
      ],
      'Family'
    );
    const { token } = expectOk(await issue.execute(id, 'alice', 'owner-1'));

    const result = expectOk(await preview.execute(token));

    expect(result).toEqual({ groupName: 'Family', participantName: 'Alice' });
  });

  it('returns not found for an unknown token', async () => {
    const failure = expectErr(await preview.execute('missing'));

    expect(failure.type).toBe(GroupUseCaseError.InviteNotFound);
  });

  it('returns not found after the invite has been claimed', async () => {
    const { id = '' } = await seedGroup(groupRepository, [
      { id: 'alice', name: 'Alice' },
    ]);
    const { token } = expectOk(await issue.execute(id, 'alice', 'owner-1'));
    await groupRepository.claimInvite({
      codeHash: hashInviteToken(token),
      userId: 'user-2',
    });

    const failure = expectErr(await preview.execute(token));

    expect(failure.type).toBe(GroupUseCaseError.InviteNotFound);
  });
});
