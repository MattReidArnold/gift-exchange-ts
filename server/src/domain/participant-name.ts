import {
  GiftExchangeGroupError,
  participantNameEmptyFailure,
} from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';

export default class ParticipantName {
  private constructor(readonly value: string) {}

  static create(
    raw: string
  ): Result<ParticipantName, Failure<GiftExchangeGroupError.ParticipantNameEmpty>> {
    const value = raw.trim();
    if (!value) {
      return err(participantNameEmptyFailure());
    }
    return ok(new ParticipantName(value));
  }

  // Stored names are already valid. A blank value here is corrupt data.
  static hydrate(stored: string): ParticipantName {
    const result = ParticipantName.create(stored);
    if (!result.ok) {
      throw new Error(result.error.reason);
    }
    return result.value;
  }

  equals(other: ParticipantName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toJSON(): string {
    return this.value;
  }
}
