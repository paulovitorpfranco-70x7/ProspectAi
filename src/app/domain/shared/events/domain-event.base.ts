export abstract class DomainEvent {
  abstract readonly eventName: string;
  readonly occurredAt: Date;

  protected constructor(occurredAt?: Date) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
