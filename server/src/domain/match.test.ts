import { describe, expect, it } from 'vitest';

import { assignMatches, Shuffle } from '#src/domain/match';

const identityShuffle: Shuffle = (items) => [...items];

const exclusions = (
  entries: Record<string, string[]>
): Map<string, ReadonlySet<string>> =>
  new Map(
    Object.entries(entries).map(([giverId, excluded]) => [
      giverId,
      new Set(excluded),
    ])
  );

describe('assignMatches', () => {
  it('returns null when there are fewer than two participants', () => {
    expect(assignMatches(['alice'], exclusions({}), identityShuffle)).toBeNull();
  });

  it('assigns each giver a distinct receiver who is not themselves', () => {
    const matches = assignMatches(
      ['alice', 'bob', 'carol'],
      exclusions({}),
      identityShuffle
    );

    expect(matches).toHaveLength(3);
    const givers = matches!.map(({ giverId }) => giverId).sort();
    const receivers = matches!.map(({ receiverId }) => receiverId).sort();
    expect(givers).toEqual(['alice', 'bob', 'carol']);
    expect(receivers).toEqual(['alice', 'bob', 'carol']);
    for (const { giverId, receiverId } of matches!) {
      expect(giverId).not.toBe(receiverId);
    }
  });

  it('respects giver exclusions', () => {
    const matches = assignMatches(
      ['alice', 'bob'],
      exclusions({ alice: ['bob'], bob: [] }),
      identityShuffle
    );

    expect(matches).toBeNull();
  });

  it('finds a valid assignment around exclusions', () => {
    const matches = assignMatches(
      ['alice', 'bob', 'carol'],
      exclusions({ alice: ['bob'] }),
      identityShuffle
    );

    expect(matches).not.toBeNull();
    expect(matches!.find(({ giverId }) => giverId === 'alice')?.receiverId).not.toBe(
      'bob'
    );
  });
});
