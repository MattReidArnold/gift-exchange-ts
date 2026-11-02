import InviteTokenFactory from '#src/application/ports/invite-token-factory';

export default class SequentialInviteTokenFactory implements InviteTokenFactory {
  private next = 1;

  create(): string {
    const token = `invite-token-${this.next}`;
    this.next += 1;
    return token;
  }
}
