import { describe, expect, it } from 'vitest';

import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';

const ownerId = 'owner-1';

const emptyGroup = () => expectOk(GiftExchangeGroup.create('Family', ownerId));

const groupWithAliceAndBob = () => {
  const withAlice = expectOk(
    emptyGroup().addParticipant({ id: 'alice', name: 'Alice', exclusions: [] })
  );
  return expectOk(
    withAlice.addParticipant({ id: 'bob', name: 'Bob', exclusions: ['alice'] })
  );
};

describe('GiftExchangeGroup.create', () => {
  it('trims the name and starts with no participants', () => {
    const group = expectOk(GiftExchangeGroup.create('  Family  ', `  ${ownerId}  `));

    expect(group.name).toBe('Family');
    expect(group.participants).toEqual([]);
    expect(group.members).toEqual([{ userId: ownerId, role: 'owner' }]);
  });

  it.each(['', '   '])('rejects the empty name %j', (name) => {
    const failure = expectErr(GiftExchangeGroup.create(name, ownerId));

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNameEmpty);
  });
});

describe('GiftExchangeGroup.rename', () => {
  it('trims the new name and keeps the id and participants', () => {
    const group = new GiftExchangeGroup({
      id: 'group-1',
      name: 'Family',
      participants: groupWithAliceAndBob().participants,
      members: [{ userId: ownerId, role: 'owner' }],
    });

    const renamed = expectOk(group.rename('  Friends  '));

    expect(renamed.id).toBe('group-1');
    expect(renamed.name).toBe('Friends');
    expect(renamed.participants).toEqual(group.participants);
    expect(renamed.members).toEqual(group.members);
  });

  it.each(['', '   '])('rejects the empty name %j', (name) => {
    const failure = expectErr(emptyGroup().rename(name));

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNameEmpty);
  });
});

describe('GiftExchangeGroup.addParticipant', () => {
  it('trims the name and removes duplicate exclusions', () => {
    const group = expectOk(
      emptyGroup().addParticipant({ id: 'alice', name: 'Alice', exclusions: [] })
    );

    const updated = expectOk(
      group.addParticipant({
        id: 'bob',
        name: '  Bob  ',
        exclusions: ['alice', 'alice'],
      })
    );

    expect(updated.findParticipant('bob')).toMatchObject({
      name: 'Bob',
      exclusions: ['alice'],
    });
    expect(updated.members).toEqual(group.members);
  });

  it('rejects an empty name', () => {
    const failure = expectErr(
      emptyGroup().addParticipant({ id: 'alice', name: '  ', exclusions: [] })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameEmpty);
  });

  it('rejects a name already used in the group, ignoring case', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: ' alice ',
        exclusions: [],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameTaken);
  });

  it('rejects an exclusion that is not a member of the group', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: 'Carol',
        exclusions: ['unknown'],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InvalidExclusion);
  });

  it('rejects excluding the new participant themselves', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: 'Carol',
        exclusions: ['carol'],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InvalidExclusion);
  });
});

describe('GiftExchangeGroup.updateParticipant', () => {
  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithAliceAndBob().updateParticipant('unknown', { name: 'X' })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('keeps fields that were not provided', () => {
    const renamed = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', { name: 'Robert' })
    );

    expect(renamed.findParticipant('bob')).toMatchObject({
      name: 'Robert',
      exclusions: ['alice'],
    });

    const reExcluded = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', { exclusions: [] })
    );

    expect(reExcluded.findParticipant('bob')).toMatchObject({
      name: 'Bob',
      exclusions: [],
    });
  });

  it("rejects renaming to another participant's name", () => {
    const failure = expectErr(
      groupWithAliceAndBob().updateParticipant('bob', { name: 'ALICE' })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameTaken);
  });

  it('allows changing the case of their own name', () => {
    const updated = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', { name: 'BOB' })
    );

    expect(updated.findParticipant('bob')?.name).toBe('BOB');
  });

  it('rejects excluding themselves', () => {
    const failure = expectErr(
      groupWithAliceAndBob().updateParticipant('alice', {
        exclusions: ['alice'],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InvalidExclusion);
  });
});

describe('GiftExchangeGroup.removeParticipant', () => {
  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithAliceAndBob().removeParticipant('unknown')
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it("removes the participant and clears them from others' exclusions", () => {
    const group = expectOk(
      groupWithAliceAndBob().updateParticipant('alice', { exclusions: ['bob'] })
    );

    const updated = expectOk(group.removeParticipant('bob'));

    expect(updated.participants.map(({ id }) => id)).toEqual(['alice']);
    expect(updated.findParticipant('alice')?.exclusions).toEqual([]);
  });
});

describe('GiftExchangeGroup immutability', () => {
  it('leaves the original group unchanged after every operation', () => {
    const group = groupWithAliceAndBob();
    const snapshot = structuredClone(group);

    group.addParticipant({ id: 'carol', name: 'Carol', exclusions: ['alice'] });
    group.updateParticipant('bob', { name: 'Robert', exclusions: [] });
    group.removeParticipant('alice');
    group.rename('Friends');
    group.issueInvite('alice', 'hash-alice', issuedAt);
    group.clearInvite('alice');
    group.claimInvite('bob', 'user-2');

    expect(structuredClone(group)).toEqual(snapshot);
  });
});

const issuedAt = new Date('2026-01-01T00:00:00.000Z');

const groupWithPendingInvite = () =>
  expectOk(groupWithAliceAndBob().issueInvite('alice', 'hash-alice', issuedAt));

describe('GiftExchangeGroup.issueInvite', () => {
  it('stores a pending invite without linking an account', () => {
    const group = groupWithPendingInvite();
    const alice = group.findParticipant('alice');

    expect(alice?.invite).toEqual({ codeHash: 'hash-alice', createdAt: issuedAt });
    expect(alice?.userId).toBeNull();
    expect(alice?.toJSON()).toEqual({
      id: 'alice',
      name: 'Alice',
      exclusions: [],
      userId: null,
      invitePending: true,
    });
    expect(JSON.stringify(group)).not.toContain('hash-alice');
  });

  it('replaces a pending invite', () => {
    const rotated = expectOk(
      groupWithPendingInvite().issueInvite('alice', 'hash-next', issuedAt)
    );

    expect(rotated.findParticipant('alice')?.invite?.codeHash).toBe('hash-next');
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithAliceAndBob().issueInvite('unknown', 'hash', issuedAt)
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('rejects an invite for a linked participant', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));

    const failure = expectErr(claimed.issueInvite('alice', 'hash-next', issuedAt));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
  });
});

describe('GiftExchangeGroup.clearInvite', () => {
  it('removes the pending invite and leaves the other participants alone', () => {
    const issued = expectOk(
      groupWithPendingInvite().issueInvite('bob', 'hash-bob', issuedAt)
    );

    const cleared = expectOk(issued.clearInvite('alice'));

    expect(cleared.findParticipant('alice')?.invite).toBeNull();
    expect(cleared.findParticipant('bob')?.invite?.codeHash).toBe('hash-bob');
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(groupWithAliceAndBob().clearInvite('unknown'));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('rejects clearing when no invite is pending', () => {
    const failure = expectErr(groupWithAliceAndBob().clearInvite('alice'));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
  });
});

describe('GiftExchangeGroup.claimInvite', () => {
  it('finds a participant by a pending or claimed invite code', () => {
    const pending = groupWithPendingInvite();

    expect(pending.findParticipantByInviteCode('hash-alice')?.id).toBe('alice');
    expect(pending.findParticipantByInviteCode('missing')).toBeUndefined();

    const claimed = expectOk(pending.claimInvite('alice', 'user-2'));

    expect(claimed.findParticipantByInviteCode('hash-alice')?.id).toBe('alice');
  });

  it('links a new account and adds them as a member', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));
    const alice = claimed.findParticipant('alice');

    expect(alice?.userId).toBe('user-2');
    expect(alice?.invite).toBeNull();
    expect(alice?.claimedCodeHash).toBe('hash-alice');
    expect(alice?.toJSON().invitePending).toBe(false);
    expect(claimed.members).toEqual([
      { userId: ownerId, role: 'owner' },
      { userId: 'user-2', role: 'member' },
    ]);
  });

  it('links the owner without adding a second membership', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', `  ${ownerId}  `));

    expect(claimed.findParticipant('alice')?.userId).toBe(ownerId);
    expect(claimed.members).toEqual([{ userId: ownerId, role: 'owner' }]);
  });

  it('links an existing member without changing their role', () => {
    const pending = groupWithPendingInvite();
    const group = new GiftExchangeGroup({
      id: 'group-1',
      name: pending.name,
      participants: pending.participants,
      members: [
        { userId: ownerId, role: 'owner' },
        { userId: 'member-1', role: 'member' },
      ],
    });

    const claimed = expectOk(group.claimInvite('alice', 'member-1'));

    expect(claimed.findParticipant('alice')?.userId).toBe('member-1');
    expect(claimed.members).toEqual(group.members);
  });

  it('succeeds again for the account that already claimed it', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));

    const again = expectOk(claimed.claimInvite('alice', 'user-2'));

    expect(again).toBe(claimed);
  });

  it('rejects a different account once the participant is linked', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));

    const failure = expectErr(claimed.claimInvite('alice', 'user-3'));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
  });

  it('rejects an account already linked to another participant', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));
    const withBob = expectOk(claimed.issueInvite('bob', 'hash-bob', issuedAt));

    const failure = expectErr(withBob.claimInvite('bob', 'user-2'));

    expect(failure.type).toBe(GiftExchangeGroupError.UserAlreadyLinked);
    expect(withBob.findParticipant('bob')?.userId).toBeNull();
  });

  it('rejects a claim when no invite is pending', () => {
    const failure = expectErr(groupWithAliceAndBob().claimInvite('alice', 'user-2'));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
  });

  it('rejects a claim after the invite is revoked', () => {
    const cleared = expectOk(groupWithPendingInvite().clearInvite('alice'));

    const failure = expectErr(cleared.claimInvite('alice', 'user-2'));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
    expect(cleared.findParticipant('alice')?.userId).toBeNull();
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(groupWithPendingInvite().claimInvite('unknown', 'user-2'));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('treats a repeated claim with surrounding whitespace as the same account', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));

    const again = expectOk(claimed.claimInvite('alice', '  user-2  '));

    expect(again).toBe(claimed);
  });
});

describe('participant account link', () => {
  it('keeps the link and pending invite when other fields change', () => {
    const updated = expectOk(
      groupWithPendingInvite().updateParticipant('alice', { name: 'Alicia' })
    );

    expect(updated.findParticipant('alice')).toMatchObject({
      name: 'Alicia',
      userId: null,
      invite: { codeHash: 'hash-alice', createdAt: issuedAt },
    });
  });

  it('keeps the linked account when the participant is renamed', () => {
    const claimed = expectOk(groupWithPendingInvite().claimInvite('alice', 'user-2'));

    const updated = expectOk(claimed.updateParticipant('alice', { name: 'Alicia' }));

    expect(updated.findParticipant('alice')).toMatchObject({
      name: 'Alicia',
      userId: 'user-2',
      invite: null,
      claimedCodeHash: 'hash-alice',
    });
  });

  it('drops a pending invite when the participant is removed', () => {
    const issued = expectOk(
      groupWithPendingInvite().issueInvite('bob', 'hash-bob', issuedAt)
    );

    const updated = expectOk(issued.removeParticipant('alice'));

    expect(updated.findParticipant('alice')).toBeUndefined();
    expect(updated.findParticipant('bob')?.invite?.codeHash).toBe('hash-bob');
  });
});
