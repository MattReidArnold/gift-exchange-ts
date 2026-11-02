import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GroupJson,
  createApiClient,
  failureType,
} from '#tests/support/api-client';

const api = createApiClient();

let groupId: string;

const participantNamed = (group: GroupJson, name: string) => {
  const participant = group.participants.find((p) => p.name === name);
  if (!participant) {
    throw new Error(`No participant named ${name}`);
  }
  return participant;
};

beforeEach(async () => {
  const { body } = await api.createGroup();
  groupId = body.id;
});

afterEach(() => api.cleanup());

describe('POST /api/groups/:groupId/participants', () => {
  it('adds a participant with a generated id', async () => {
    const response = await api.addParticipant(groupId, { name: 'Alice' });

    expect(response.status).toBe(201);
    expect(response.body.participants).toEqual([
      {
        id: expect.any(String),
        name: 'Alice',
        exclusions: [],
        userId: null,
        invitePending: false,
      },
    ]);
  });

  it('rejects a duplicate name', async () => {
    await api.addParticipant(groupId, { name: 'Alice' });

    const response = await api.addParticipant(groupId, { name: 'alice' });

    expect(response.status).toBe(422);
    expect(failureType(response)).toBe('PARTICIPANT_NAME_TAKEN');
  });

  it('rejects an exclusion that is not in the group', async () => {
    const response = await api.addParticipant(groupId, {
      name: 'Alice',
      exclusions: ['unknown'],
    });

    expect(response.status).toBe(422);
    expect(failureType(response)).toBe('INVALID_EXCLUSION');
  });

  it('returns 404 for an unknown group', async () => {
    const response = await api.addParticipant('000000000000000000000000', {
      name: 'Alice',
    });

    expect(response.status).toBe(404);
    expect(failureType(response)).toBe('GROUP_NOT_FOUND');
  });
});

describe('PUT /api/groups/:groupId/participants/:participantId', () => {
  it('updates exclusions', async () => {
    await api.addParticipant(groupId, { name: 'Alice' });
    const { body: group } = await api.addParticipant(groupId, { name: 'Bob' });
    const alice = participantNamed(group, 'Alice');
    const bob = participantNamed(group, 'Bob');

    const response = await api.updateParticipant(groupId, alice.id, {
      exclusions: [bob.id],
    });

    expect(response.status).toBe(200);
    expect(participantNamed(response.body, 'Alice').exclusions).toEqual([
      bob.id,
    ]);
  });

  it('returns 404 for an unknown participant', async () => {
    const response = await api.updateParticipant(groupId, 'unknown', {
      name: 'X',
    });

    expect(response.status).toBe(404);
    expect(failureType(response)).toBe('PARTICIPANT_NOT_FOUND');
  });
});

describe('DELETE /api/groups/:groupId/participants/:participantId', () => {
  it("removes the participant and clears them from others' exclusions", async () => {
    const { body: withAlice } = await api.addParticipant(groupId, {
      name: 'Alice',
    });
    const alice = participantNamed(withAlice, 'Alice');
    const { body: withBob } = await api.addParticipant(groupId, {
      name: 'Bob',
      exclusions: [alice.id],
    });
    const bob = participantNamed(withBob, 'Bob');
    await api.updateParticipant(groupId, alice.id, { exclusions: [bob.id] });

    const response = await api.removeParticipant(groupId, bob.id);

    expect(response.status).toBe(200);
    expect(response.body.participants).toEqual([
      {
        id: alice.id,
        name: 'Alice',
        exclusions: [],
        userId: null,
        invitePending: false,
      },
    ]);
  });
});
