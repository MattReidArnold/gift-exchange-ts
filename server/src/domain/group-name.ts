import {
  GiftExchangeGroupError,
  groupNameEmptyFailure,
} from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';

export default class GroupName {
  private constructor(readonly value: string) {}

  static create(
    raw: string
  ): Result<GroupName, Failure<GiftExchangeGroupError.GroupNameEmpty>> {
    const value = raw.trim();
    if (!value) {
      return err(groupNameEmptyFailure());
    }
    return ok(new GroupName(value));
  }

  // Stored names are already valid. A blank value here is corrupt data.
  static hydrate(stored: string): GroupName {
    const result = GroupName.create(stored);
    if (!result.ok) {
      throw new Error(result.error.reason);
    }
    return result.value;
  }

  toJSON(): string {
    return this.value;
  }
}
