import { describe, expect, it } from 'vitest';

import GroupName from '#src/domain/group-name';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';

describe('GroupName', () => {
  it('trims surrounding whitespace', () => {
    expect(expectOk(GroupName.create('  Family  ')).value).toBe('Family');
  });

  it.each(['', '   '])('rejects the empty name %j', (raw) => {
    const failure = expectErr(GroupName.create(raw));

    expect(failure.type).toBe(GiftExchangeGroupError.GroupNameEmpty);
  });

  it('rejects a blank stored name', () => {
    expect(() => GroupName.hydrate('   ')).toThrow('Group name cannot be empty');
  });

  it('serializes to the name string', () => {
    expect(JSON.stringify(expectOk(GroupName.create('Family')))).toBe('"Family"');
  });
});
