import { describe, expect, it } from 'vitest';

import UserId from '#src/domain/user-id';

describe('UserId', () => {
  it('trims surrounding whitespace', () => {
    expect(UserId.create('  user-2  ').value).toBe('user-2');
  });

  it('treats the same id as equal after trimming', () => {
    expect(UserId.create('  user-2  ').equals(UserId.create('user-2'))).toBe(true);
  });

  it.each(['', '   '])('rejects the empty id %j', (raw) => {
    expect(() => UserId.create(raw)).toThrow('User id cannot be empty');
  });

  it('serializes to the id string', () => {
    expect(JSON.stringify(UserId.create('user-2'))).toBe('"user-2"');
  });
});
