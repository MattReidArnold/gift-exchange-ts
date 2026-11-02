import { describe, expect, it } from 'vitest';

import ParticipantName from '#src/domain/participant-name';
import { GiftExchangeGroupError } from '#src/domain/gift-exchange-group-error';
import { expectErr, expectOk } from '#tests/support/result';

describe('ParticipantName', () => {
  it('trims surrounding whitespace', () => {
    expect(expectOk(ParticipantName.create('  Alice  ')).value).toBe('Alice');
  });

  it.each(['', '   '])('rejects the empty name %j', (raw) => {
    const failure = expectErr(ParticipantName.create(raw));

    expect(failure.type).toBe(GiftExchangeGroupError.ParticipantNameEmpty);
  });

  it('matches another name ignoring case', () => {
    const alice = expectOk(ParticipantName.create(' alice '));

    expect(alice.equals(expectOk(ParticipantName.create('ALICE')))).toBe(true);
    expect(alice.equals(expectOk(ParticipantName.create('Bob')))).toBe(false);
  });

  it('serializes to the name string', () => {
    expect(JSON.stringify(expectOk(ParticipantName.create('Alice')))).toBe('"Alice"');
  });
});
