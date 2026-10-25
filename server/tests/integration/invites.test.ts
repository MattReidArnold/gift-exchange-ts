import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GroupJson,
  createApiClient,
  failureType,
} from '#tests/support/api-client';

const owner = createApiClient();

let groupId: string;
let aliceId: string;

const participantNamed = (group: GroupJson, name: string) => {
  const participant = group.participants.find((item) => item.name === name);
  if (!participant) {
    throw new Error(`No participant named ${name}`);
  }
  return participant;
};

beforeEach(async () => {
  const { body } = await owner.createGroup();
  groupId = body.id;
  const { body: withAlice } = await owner.addParticipant(groupId, { name: 'Alice' });
  aliceId = participantNamed(withAlice, 'Alice').id;
});

afterEach(() => owner.cleanup());

describe('participant invites', () => {
  it('rejects issuing and claiming without a session', async () => {
    const anonymous = createApiClient({ session: false });

    const issued = await anonymous.issueInvite(groupId, aliceId);
    const claimed = await anonymous.claimInvite('missing-token');

    expect(issued.status).toBe(401);
    expect(failureType(issued)).toBe('UNAUTHENTICATED');
    expect(claimed.status).toBe(401);
    expect(failureType(claimed)).toBe('UNAUTHENTICATED');
  });

  it('rejects an invite from someone who is not a member', async () => {
    const other = createApiClient({
      email: `other-${randomUUID()}@example.com`,
      name: 'Other User',
    });

    const response = await other.issueInvite(groupId, aliceId);

    expect(response.status).toBe(403);
    expect(failureType(response)).toBe('NOT_A_MEMBER');
  });

  it('previews only the group and participant names', async () => {
    await owner.addParticipant(groupId, { name: 'Bob' });
    const issued = await owner.issueInvite(groupId, aliceId);
    const anonymous = createApiClient({ session: false });

    const preview = await anonymous.previewInvite(issued.body.token);
    const stored = await owner.getGroup(groupId);

    expect(issued.status).toBe(200);
    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({ groupName: stored.body.name, participantName: 'Alice' });
    expect(participantNamed(stored.body, 'Alice')).toEqual({
      id: aliceId,
      name: 'Alice',
      exclusions: [],
      userId: null,
      invitePending: true,
    });
    expect(JSON.stringify(stored.body)).not.toContain(issued.body.token);
  });

  it('links a new account and adds them as a member', async () => {
    const { body: issued } = await owner.issueInvite(groupId, aliceId);
    const guest = createApiClient({
      email: `guest-${randomUUID()}@example.com`,
      name: 'Guest User',
    });

    const claimed = await guest.claimInvite(issued.token);
    const again = await guest.claimInvite(issued.token);
    const stored = await owner.getGroup(groupId);

    expect(claimed.status).toBe(200);
    expect(claimed.body).toEqual({ groupId });
    expect(again.status).toBe(200);
    expect(participantNamed(stored.body, 'Alice').userId).toBe(guest.userId);
    expect(participantNamed(stored.body, 'Alice').invitePending).toBe(false);
    expect(stored.body.members).toEqual([
      { userId: owner.userId, role: 'owner' },
      { userId: guest.userId, role: 'member' },
    ]);
  });

  it('links an existing member without changing their role', async () => {
    const { body: issued } = await owner.issueInvite(groupId, aliceId);

    const claimed = await owner.claimInvite(issued.token);
    const stored = await owner.getGroup(groupId);

    expect(claimed.status).toBe(200);
    expect(participantNamed(stored.body, 'Alice').userId).toBe(owner.userId);
    expect(stored.body.members).toEqual([{ userId: owner.userId, role: 'owner' }]);
  });

  it('rejects a second account and an account already linked elsewhere', async () => {
    const { body: withBob } = await owner.addParticipant(groupId, { name: 'Bob' });
    const bobId = participantNamed(withBob, 'Bob').id;
    const { body: aliceInvite } = await owner.issueInvite(groupId, aliceId);
    const guest = createApiClient({
      email: `guest-${randomUUID()}@example.com`,
      name: 'Guest User',
    });
    const other = createApiClient({
      email: `other-${randomUUID()}@example.com`,
      name: 'Other User',
    });
    await guest.claimInvite(aliceInvite.token);

    const secondAccount = await other.claimInvite(aliceInvite.token);
    const { body: bobInvite } = await owner.issueInvite(groupId, bobId);
    const sameAccount = await guest.claimInvite(bobInvite.token);
    const stored = await owner.getGroup(groupId);

    expect(secondAccount.status).toBe(409);
    expect(failureType(secondAccount)).toBe('PARTICIPANT_ALREADY_LINKED');
    expect(sameAccount.status).toBe(409);
    expect(failureType(sameAccount)).toBe('USER_ALREADY_LINKED');
    expect(participantNamed(stored.body, 'Bob').userId).toBeNull();
  });

  it('stops accepting a token after it is rotated or revoked', async () => {
    const first = await owner.issueInvite(groupId, aliceId);
    const rotated = await owner.issueInvite(groupId, aliceId);
    const anonymous = createApiClient({ session: false });

    const oldPreview = await anonymous.previewInvite(first.body.token);
    const newPreview = await anonymous.previewInvite(rotated.body.token);
    const revoked = await owner.revokeInvite(groupId, aliceId);
    const afterRevoke = await anonymous.previewInvite(rotated.body.token);

    expect(oldPreview.status).toBe(404);
    expect(failureType(oldPreview)).toBe('INVITE_NOT_FOUND');
    expect(newPreview.status).toBe(200);
    expect(revoked.status).toBe(200);
    expect(participantNamed(revoked.body, 'Alice').invitePending).toBe(false);
    expect(afterRevoke.status).toBe(404);
  });

  it('returns not found for an unknown invite', async () => {
    const anonymous = createApiClient({ session: false });

    const response = await anonymous.previewInvite('missing-token');

    expect(response.status).toBe(404);
    expect(failureType(response)).toBe('INVITE_NOT_FOUND');
  });
});
