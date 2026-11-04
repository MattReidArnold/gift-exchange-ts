import { afterEach, describe, expect, it } from 'vitest';

import {
  createApiClient,
  failureType,
} from '#tests/support/api-client';

const api = createApiClient();

afterEach(() => api.cleanup());

const seedThree = async () => {
  const { body: group } = await api.createGroup();
  const alice = (await api.addParticipant(group.id, { name: 'Alice' })).body
    .participants[0]!;
  const withBob = (await api.addParticipant(group.id, { name: 'Bob' })).body;
  const bob = withBob.participants.find(({ name }) => name === 'Bob')!;
  const withCarol = (
    await api.addParticipant(group.id, {
      name: 'Carol',
      exclusions: [alice.id],
    })
  ).body;
  const carol = withCarol.participants.find(({ name }) => name === 'Carol')!;
  return { groupId: group.id, alice, bob, carol };
};

describe('POST /api/groups/:groupId/lock', () => {
  it('locks a group with enough participants', async () => {
    const { groupId } = await seedThree();

    const response = await api.lockGroup(groupId);

    expect(response.status).toBe(200);
    expect(response.body.locked).toBe(true);
    expect(response.body.matches).toEqual([]);
  });

  it('rejects locking with fewer than two participants', async () => {
    const { body: group } = await api.createGroup();
    await api.addParticipant(group.id, { name: 'Alice' });

    const response = await api.lockGroup(group.id);

    expect(response.status).toBe(422);
    expect(failureType(response)).toBe('TOO_FEW_PARTICIPANTS');
  });

  it('rejects locking by a non-owner', async () => {
    const { groupId } = await seedThree();
    const other = createApiClient({ email: `other-${Date.now()}@example.com` });

    const response = await other.lockGroup(groupId);

    expect(response.status).toBe(403);
    expect(failureType(response)).toBe('NOT_OWNER');
  });
});

describe('POST /api/groups/:groupId/matches', () => {
  it('generates matches that respect exclusions', async () => {
    const { groupId, alice, bob, carol } = await seedThree();
    await api.lockGroup(groupId);

    const response = await api.generateMatches(groupId);

    expect(response.status).toBe(200);
    expect(response.body.matches).toHaveLength(3);
    const givers = response.body.matches.map(({ giverId }) => giverId).sort();
    const receivers = response.body.matches
      .map(({ receiverId }) => receiverId)
      .sort();
    expect(givers).toEqual([alice.id, bob.id, carol.id].sort());
    expect(receivers).toEqual(givers);
    expect(
      response.body.matches.find(({ giverId }) => giverId === carol.id)
        ?.receiverId
    ).not.toBe(alice.id);
  });

  it('rejects drawing before the group is locked', async () => {
    const { groupId } = await seedThree();

    const response = await api.generateMatches(groupId);

    expect(response.status).toBe(422);
    expect(failureType(response)).toBe('GROUP_NOT_LOCKED');
  });

  it('rejects adding participants after the group is locked', async () => {
    const { groupId } = await seedThree();
    await api.lockGroup(groupId);

    const response = await api.addParticipant(groupId, { name: 'Dave' });

    expect(response.status).toBe(409);
    expect(failureType(response)).toBe('GROUP_LOCKED');
  });

  it('unlocks the group and clears matches', async () => {
    const { groupId } = await seedThree();
    await api.lockGroup(groupId);
    await api.generateMatches(groupId);

    const response = await api.unlockGroup(groupId);

    expect(response.status).toBe(200);
    expect(response.body.locked).toBe(false);
    expect(response.body.matches).toEqual([]);
    expect((await api.addParticipant(groupId, { name: 'Dave' })).status).toBe(201);
  });

  it('unlocks the group when matching is impossible', async () => {
    const { body: group } = await api.createGroup();
    const withAlice = (await api.addParticipant(group.id, { name: 'Alice' })).body;
    const alice = withAlice.participants[0]!;
    const withBob = (
      await api.addParticipant(group.id, {
        name: 'Bob',
        exclusions: [alice.id],
      })
    ).body;
    const bob = withBob.participants.find(({ name }) => name === 'Bob')!;
    await api.updateParticipant(group.id, alice.id, { exclusions: [bob.id] });
    await api.lockGroup(group.id);

    const response = await api.generateMatches(group.id);
    const after = await api.getGroup(group.id);

    expect(response.status).toBe(422);
    expect(failureType(response)).toBe('MATCHING_IMPOSSIBLE');
    expect(after.body.locked).toBe(false);
    expect(after.body.matches).toEqual([]);
  });
});
