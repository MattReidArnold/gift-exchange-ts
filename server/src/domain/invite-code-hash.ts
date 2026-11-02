export default class InviteCodeHash {
  private constructor(readonly value: string) {}

  // A blank hash is a programming error, not a failure the API reports.
  static create(raw: string): InviteCodeHash {
    const value = raw.trim();
    if (!value) {
      throw new Error('Invite code hash cannot be empty');
    }
    return new InviteCodeHash(value);
  }

  equals(other: InviteCodeHash): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
