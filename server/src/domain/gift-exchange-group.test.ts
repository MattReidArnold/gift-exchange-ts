import { describe, expect, it } from 'vitest';

import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import InviteCodeHash from '#src/domain/invite-code-hash';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';

const ownerId = 'owner-1';

const groupName = (raw: string) => expectOk(GroupName.create(raw));
const participantName = (raw: string) => expectOk(ParticipantName.create(raw));
const userId = (raw: string) => UserId.create(raw);
const codeHash = (raw: string) => InviteCodeHash.create(raw);

const emptyGroup = () =>
  GiftExchangeGroup.create(groupName('Family'), userId(ownerId));

const groupWithAliceAndBob = () => {
  const withAlice = expectOk(
    emptyGroup().addParticipant({
      id: 'alice',
      name: participantName('Alice'),
      exclusions: [],
    })
  );
  return expectOk(
    withAlice.addParticipant({
      id: 'bob',
      name: participantName('Bob'),
      exclusions: ['alice'],
    })
  );
};

describe('GiftExchangeGroup.create', () => {
  it('starts with the owner and no participants', () => {
    const group = GiftExchangeGroup.create(
      groupName('Family'),
      userId(`  ${ownerId}  `)
    );

    expect(group.name.value).toBe('Family');
    expect(group.participants).toEqual([]);
    expect(group.members).toEqual([{ userId: userId(ownerId), role: 'owner' }]);
    expect(JSON.parse(JSON.stringify(group))).toMatchObject({
      name: 'Family',
      members: [{ userId: ownerId, role: 'owner' }],
    });
  });
});

describe('GiftExchangeGroup.rename', () => {
  it('replaces the name and keeps the id, participants, and members', () => {
    const group = new GiftExchangeGroup({
      id: 'group-1',
      name: groupName('Family'),
      participants: groupWithAliceAndBob().participants,
      members: [{ userId: userId(ownerId), role: 'owner' }],
    });

    const renamed = group.rename(groupName('Friends'));

    expect(renamed.id).toBe('group-1');
    expect(renamed.name.value).toBe('Friends');
    expect(renamed.participants).toEqual(group.participants);
    expect(renamed.members).toEqual(group.members);
  });
});

describe('GiftExchangeGroup.addParticipant', () => {
  it('removes duplicate exclusions', () => {
    const group = expectOk(
      emptyGroup().addParticipant({
        id: 'alice',
        name: participantName('Alice'),
        exclusions: [],
      })
    );

    const updated = expectOk(
      group.addParticipant({
        id: 'bob',
        name: participantName('Bob'),
        exclusions: ['alice', 'alice'],
      })
    );

    expect(updated.findParticipant('bob')).toMatchObject({
      name: participantName('Bob'),
      exclusions: ['alice'],
    });
    expect(updated.members).toEqual(group.members);
  });

  it('rejects a name already used in the group, ignoring case', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: participantName(' alice '),
        exclusions: [],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameTaken);
  });

  it('rejects an exclusion that is not a member of the group', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: participantName('Carol'),
        exclusions: ['unknown'],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InvalidExclusion);
  });

  it('rejects excluding the new participant themselves', () => {
    const failure = expectErr(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: participantName('Carol'),
        exclusions: ['carol'],
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InvalidExclusion);
  });
});

describe('GiftExchangeGroup.updateParticipant', () => {
  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithAliceAndBob().updateParticipant('unknown', {
        name: participantName('X'),
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('keeps fields that were not provided', () => {
    const renamed = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', {
        name: participantName('Robert'),
      })
    );

    expect(renamed.findParticipant('bob')).toMatchObject({
      name: participantName('Robert'),
      exclusions: ['alice'],
    });

    const reExcluded = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', { exclusions: [] })
    );

    expect(reExcluded.findParticipant('bob')).toMatchObject({
      name: participantName('Bob'),
      exclusions: [],
    });
  });

  it("rejects renaming to another participant's name", () => {
    const failure = expectErr(
      groupWithAliceAndBob().updateParticipant('bob', {
        name: participantName('ALICE'),
      })
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameTaken);
  });

  it('allows changing the case of their own name', () => {
    const updated = expectOk(
      groupWithAliceAndBob().updateParticipant('bob', {
        name: participantName('BOB'),
      })
    );

    expect(updated.findParticipant('bob')?.name.value).toBe('BOB');
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
    const failure = expectErr(groupWithAliceAndBob().removeParticipant('unknown'));

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

    group.addParticipant({
      id: 'carol',
      name: participantName('Carol'),
      exclusions: ['alice'],
    });
    group.updateParticipant('bob', {
      name: participantName('Robert'),
      exclusions: [],
    });
    group.removeParticipant('alice');
    group.rename(groupName('Friends'));
    group.issueInvite('alice', codeHash('hash-alice'), issuedAt);
    group.clearInvite('alice');
    group.claimInvite('bob', userId('user-2'));

    expect(structuredClone(group)).toEqual(snapshot);
  });
});

const issuedAt = new Date('2026-01-01T00:00:00.000Z');

const groupWithPendingInvite = () =>
  expectOk(
    groupWithAliceAndBob().issueInvite('alice', codeHash('hash-alice'), issuedAt)
  );

describe('GiftExchangeGroup.issueInvite', () => {
  it('stores a pending invite without linking an account', () => {
    const group = groupWithPendingInvite();
    const alice = group.findParticipant('alice');

    expect(alice?.invite).toEqual({
      codeHash: codeHash('hash-alice'),
      createdAt: issuedAt,
    });
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
      groupWithPendingInvite().issueInvite('alice', codeHash('hash-next'), issuedAt)
    );

    expect(rotated.findParticipant('alice')?.invite?.codeHash.value).toBe('hash-next');
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithAliceAndBob().issueInvite('unknown', codeHash('hash'), issuedAt)
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('rejects an invite for a linked participant', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const failure = expectErr(
      claimed.issueInvite('alice', codeHash('hash-next'), issuedAt)
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
  });
});

describe('GiftExchangeGroup.clearInvite', () => {
  it('removes the pending invite and leaves the other participants alone', () => {
    const issued = expectOk(
      groupWithPendingInvite().issueInvite('bob', codeHash('hash-bob'), issuedAt)
    );

    const cleared = expectOk(issued.clearInvite('alice'));

    expect(cleared.findParticipant('alice')?.invite).toBeNull();
    expect(cleared.findParticipant('bob')?.invite?.codeHash.value).toBe('hash-bob');
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(groupWithAliceAndBob().clearInvite('unknown'));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('rejects clearing when no invite is pending', () => {
    const failure = expectErr(groupWithAliceAndBob().clearInvite('alice'));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
  });

  it('rejects clearing after the invite is claimed', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const failure = expectErr(claimed.clearInvite('alice'));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
    expect(claimed.findParticipant('alice')?.invite?.codeHash.value).toBe('hash-alice');
  });
});

describe('GiftExchangeGroup.claimInvite', () => {
  it('finds a participant by a pending or claimed invite code', () => {
    const pending = groupWithPendingInvite();

    expect(pending.findParticipantByInviteCode(codeHash('hash-alice'))?.id).toBe(
      'alice'
    );
    expect(pending.findParticipantByInviteCode(codeHash('missing'))).toBeUndefined();

    const claimed = expectOk(pending.claimInvite('alice', userId('user-2')));

    expect(claimed.findParticipantByInviteCode(codeHash('hash-alice'))?.id).toBe(
      'alice'
    );
  });

  it('links a new account and adds them as a member', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );
    const alice = claimed.findParticipant('alice');

    expect(alice?.userId?.value).toBe('user-2');
    expect(alice?.invite).toEqual({
      codeHash: codeHash('hash-alice'),
      createdAt: issuedAt,
    });
    expect(alice?.toJSON().invitePending).toBe(false);
    expect(JSON.stringify(claimed)).not.toContain('hash-alice');
    expect(claimed.members).toEqual([
      { userId: userId(ownerId), role: 'owner' },
      { userId: userId('user-2'), role: 'member' },
    ]);
  });

  it('links the owner without adding a second membership', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId(`  ${ownerId}  `))
    );

    expect(claimed.findParticipant('alice')?.userId).toEqual(userId(ownerId));
    expect(claimed.members).toEqual([{ userId: userId(ownerId), role: 'owner' }]);
  });

  it('links an existing member without changing their role', () => {
    const pending = groupWithPendingInvite();
    const group = new GiftExchangeGroup({
      id: 'group-1',
      name: pending.name,
      participants: pending.participants,
      members: [
        { userId: userId(ownerId), role: 'owner' },
        { userId: userId('member-1'), role: 'member' },
      ],
    });

    const claimed = expectOk(group.claimInvite('alice', userId('member-1')));

    expect(claimed.findParticipant('alice')?.userId?.value).toBe('member-1');
    expect(claimed.members).toEqual(group.members);
  });

  it('succeeds again for the account that already claimed it', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const again = expectOk(claimed.claimInvite('alice', userId('user-2')));

    expect(again).toBe(claimed);
  });

  it('rejects a different account once the participant is linked', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const failure = expectErr(claimed.claimInvite('alice', userId('user-3')));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantAlreadyLinked);
  });

  it('rejects an account already linked to another participant', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );
    const withBob = expectOk(
      claimed.issueInvite('bob', codeHash('hash-bob'), issuedAt)
    );

    const failure = expectErr(withBob.claimInvite('bob', userId('user-2')));

    expect(failure.type).toBe(GiftExchangeGroupError.UserAlreadyLinked);
    expect(withBob.findParticipant('bob')?.userId).toBeNull();
  });

  it('rejects a claim when no invite is pending', () => {
    const failure = expectErr(
      groupWithAliceAndBob().claimInvite('alice', userId('user-2'))
    );

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
  });

  it('rejects a claim after the invite is revoked', () => {
    const cleared = expectOk(groupWithPendingInvite().clearInvite('alice'));

    const failure = expectErr(cleared.claimInvite('alice', userId('user-2')));

    expect(failure.type).toBe(GiftExchangeGroupError.InviteNotPending);
    expect(cleared.findParticipant('alice')?.userId).toBeNull();
  });

  it('returns not found for an unknown participant', () => {
    const failure = expectErr(
      groupWithPendingInvite().claimInvite('unknown', userId('user-2'))
    );

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNotFound);
  });

  it('treats a repeated claim with surrounding whitespace as the same account', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const again = expectOk(claimed.claimInvite('alice', userId('  user-2  ')));

    expect(again).toBe(claimed);
  });
});

describe('participant account link', () => {
  it('keeps the link and pending invite when other fields change', () => {
    const updated = expectOk(
      groupWithPendingInvite().updateParticipant('alice', {
        name: participantName('Alicia'),
      })
    );

    expect(updated.findParticipant('alice')).toMatchObject({
      name: participantName('Alicia'),
      userId: null,
      invite: { codeHash: codeHash('hash-alice'), createdAt: issuedAt },
    });
  });

  it('keeps the linked account when the participant is renamed', () => {
    const claimed = expectOk(
      groupWithPendingInvite().claimInvite('alice', userId('user-2'))
    );

    const updated = expectOk(
      claimed.updateParticipant('alice', { name: participantName('Alicia') })
    );

    expect(updated.findParticipant('alice')).toMatchObject({
      name: participantName('Alicia'),
      userId: userId('user-2'),
      invite: { codeHash: codeHash('hash-alice'), createdAt: issuedAt },
    });
  });

  it('drops a pending invite when the participant is removed', () => {
    const issued = expectOk(
      groupWithPendingInvite().issueInvite('bob', codeHash('hash-bob'), issuedAt)
    );

    const updated = expectOk(issued.removeParticipant('alice'));

    expect(updated.findParticipant('alice')).toBeUndefined();
    expect(updated.findParticipant('bob')?.invite?.codeHash.value).toBe('hash-bob');
  });
});

describe('GiftExchangeGroup.lock', () => {
  it('locks a group with at least two participants', () => {
    const locked = expectOk(groupWithAliceAndBob().lock());

    expect(locked.locked).toBe(true);
  });

  it('rejects locking when there are fewer than two participants', () => {
    const failure = expectErr(emptyGroup().lock());

    expect(failure.type).toBe(GiftExchangeGroupError.TooFewParticipants);
  });

  it('is idempotent when the group is already locked', () => {
    const locked = expectOk(groupWithAliceAndBob().lock());

    expect(expectOk(locked.lock())).toBe(locked);
  });
});

describe('GiftExchangeGroup.unlock', () => {
  it('clears the lock and any matches', () => {
    const ready = expectOk(
      expectOk(
        groupWithAliceAndBob().updateParticipant('bob', { exclusions: [] })
      ).lock()
    );
    const drawn = expectOk(ready.generateMatches((items) => [...items]));

    const unlocked = drawn.unlock();

    expect(unlocked.locked).toBe(false);
    expect(unlocked.matches).toEqual([]);
  });

  it('is a no-op when already unlocked with no matches', () => {
    const group = groupWithAliceAndBob();

    expect(group.unlock()).toBe(group);
  });
});

describe('GiftExchangeGroup roster changes while locked', () => {
  it('rejects adding or removing participants', () => {
    const locked = expectOk(groupWithAliceAndBob().lock());

    expect(expectErr(locked.addParticipant({
      id: 'carol',
      name: participantName('Carol'),
      exclusions: [],
    })).type).toBe(GiftExchangeGroupError.GroupLocked);
    expect(expectErr(locked.removeParticipant('alice')).type).toBe(
      GiftExchangeGroupError.GroupLocked
    );
  });

  it('clears matches when exclusions change', () => {
    const ready = expectOk(
      expectOk(
        groupWithAliceAndBob().updateParticipant('bob', { exclusions: [] })
      ).lock()
    );
    const drawn = expectOk(ready.generateMatches((items) => [...items]));

    const updated = expectOk(
      drawn.updateParticipant('bob', { exclusions: ['alice'] })
    );

    expect(updated.matches).toEqual([]);
    expect(updated.locked).toBe(true);
  });
});

describe('GiftExchangeGroup.generateMatches', () => {
  const stableShuffle = <T,>(items: readonly T[]) => [...items];

  it('rejects generating matches before the group is locked', () => {
    const failure = expectErr(groupWithAliceAndBob().generateMatches(stableShuffle));

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNotLocked);
  });

  it('assigns every participant a distinct receiver while respecting exclusions', () => {
    const withCarol = expectOk(
      groupWithAliceAndBob().addParticipant({
        id: 'carol',
        name: participantName('Carol'),
        exclusions: [],
      })
    );
    const locked = expectOk(withCarol.lock());

    const drawn = expectOk(locked.generateMatches(stableShuffle));

    expect(drawn.matches).toHaveLength(3);
    const givers = drawn.matches.map(({ giverId }) => giverId).sort();
    const receivers = drawn.matches.map(({ receiverId }) => receiverId).sort();
    expect(givers).toEqual(['alice', 'bob', 'carol']);
    expect(receivers).toEqual(['alice', 'bob', 'carol']);
    expect(drawn.matches.find(({ giverId }) => giverId === 'bob')?.receiverId).not.toBe(
      'alice'
    );
  });

  it('rejects impossible exclusions', () => {
    const mutual = expectOk(
      groupWithAliceAndBob().updateParticipant('alice', { exclusions: ['bob'] })
    );
    const locked = expectOk(mutual.lock());

    const failure = expectErr(locked.generateMatches(stableShuffle));

    expect(failure.type).toBe(GiftExchangeGroupError.MatchingImpossible);
  });
});
