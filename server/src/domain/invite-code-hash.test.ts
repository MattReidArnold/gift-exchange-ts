import { describe, expect, it } from 'vitest';

import InviteCodeHash from '#src/domain/invite-code-hash';

describe('InviteCodeHash', () => {
  it('trims surrounding whitespace', () => {
    expect(InviteCodeHash.create('  abc  ').value).toBe('abc');
  });

  it('treats the same hash as equal after trimming', () => {
    expect(InviteCodeHash.create('  abc  ').equals(InviteCodeHash.create('abc'))).toBe(
      true
    );
  });

  it.each(['', '   '])('rejects the empty hash %j', (raw) => {
    expect(() => InviteCodeHash.create(raw)).toThrow('Invite code hash cannot be empty');
  });

  it('serializes to the hash string', () => {
    expect(JSON.stringify(InviteCodeHash.create('abc'))).toBe('"abc"');
  });
});
