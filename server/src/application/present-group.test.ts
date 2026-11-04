import { describe, expect, it } from 'vitest';

import { presentGroup } from '#src/application/present-group';
import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import GroupName from '#src/domain/group-name';
import Participant from '#src/domain/participant';
import ParticipantName from '#src/domain/participant-name';
import UserId from '#src/domain/user-id';
import { expectOk } from '#tests/support/result';

const name = (raw: string) => expectOk(GroupName.create(raw));
const participantName = (raw: string) => expectOk(ParticipantName.create(raw));

const groupWithMatches = () => {
  let group = GiftExchangeGroup.create(name('Family'), UserId.create('owner-1'));
  group = expectOk(
    group.addParticipant({
      id: 'alice',
      name: participantName('Alice'),
      exclusions: [],
    })
  );
  group = expectOk(
    group.addParticipant({
      id: 'bob',
      name: participantName('Bob'),
      exclusions: [],
    })
  );
  group = expectOk(
    group.addParticipant({
      id: 'carol',
      name: participantName('Carol'),
      exclusions: [],
    })
  );
  group = expectOk(group.generateMatches((items) => [...items]));
  return new GiftExchangeGroup({
    id: 'group-1',
    name: group.name,
    participants: [
      new Participant({
        id: 'alice',
        name: participantName('Alice'),
        exclusions: [],
        userId: UserId.create('owner-1'),
      }),
      new Participant({
        id: 'bob',
        name: participantName('Bob'),
        exclusions: [],
        userId: UserId.create('user-bob'),
      }),
      new Participant({
        id: 'carol',
        name: participantName('Carol'),
        exclusions: [],
      }),
    ],
    members: [
      { userId: UserId.create('owner-1'), role: 'owner' },
      { userId: UserId.create('user-bob'), role: 'member' },
    ],
    locked: true,
    matches: group.matches,
  });
};

describe('presentGroup', () => {
  it('shows every match to the owner', () => {
    const presented = presentGroup(groupWithMatches(), 'owner-1');

    expect(presented.matches).toHaveLength(3);
    expect(presented.locked).toBe(true);
  });

  it('shows a member only their own outgoing match', () => {
    const group = groupWithMatches();
    const presented = presentGroup(group, 'user-bob');
    const bobMatch = group.matches.find(({ giverId }) => giverId === 'bob');

    expect(presented.matches).toEqual([bobMatch]);
  });

  it('hides matches from a member who is not linked to a participant', () => {
    const group = groupWithMatches();
    const presented = presentGroup(
      new GiftExchangeGroup({
        id: group.id,
        name: group.name,
        participants: group.participants,
        members: [
          ...group.members,
          { userId: UserId.create('spectator'), role: 'member' },
        ],
        locked: true,
        matches: group.matches,
      }),
      'spectator'
    );

    expect(presented.matches).toEqual([]);
  });
});
