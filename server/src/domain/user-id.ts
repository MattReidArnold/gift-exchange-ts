export default class UserId {
  private constructor(readonly value: string) {}

  // A blank id is a programming error, not a failure the API reports.
  static create(raw: string): UserId {
    const value = raw.trim();
    if (!value) {
      throw new Error('User id cannot be empty');
    }
    return new UserId(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
