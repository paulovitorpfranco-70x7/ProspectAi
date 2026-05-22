import { InvalidStatusTransitionError } from '../errors/invalid-status-transition.error';
import { LeadMissingContactChannelError } from '../errors/lead-missing-contact-channel.error';
import { LeadNotesTooLongError } from '../errors/lead-notes-too-long.error';
import { LeadRatingInvalidError } from '../errors/lead-rating-invalid.error';
import { LeadContactedEvent } from '../events/lead-contacted.event';
import { LeadCreatedEvent } from '../events/lead-created.event';
import { LeadStatusChangedEvent } from '../events/lead-status-changed.event';
import { BusinessName } from '../value-objects/business-name.vo';
import { ContactInfo } from '../value-objects/contact-info.vo';
import { LeadId } from '../value-objects/lead-id.vo';
import { LeadStatus } from '../value-objects/lead-status.vo';
import { Location } from '../value-objects/location.vo';
import { Sector } from '../value-objects/sector.vo';
import { DomainEvent } from '../../shared/events/domain-event.base';

export type ContactChannel = 'whatsapp' | 'email';

export interface LeadCreateInput {
  readonly businessName: BusinessName;
  readonly sector: Sector;
  readonly location: Location;
  readonly contactInfo: ContactInfo;
  readonly rating?: number | null;
  readonly hasWebsite?: boolean;
}

export interface LeadSnapshot {
  readonly id: LeadId;
  readonly businessName: BusinessName;
  readonly sector: Sector;
  readonly location: Location;
  readonly contactInfo: ContactInfo;
  readonly status: LeadStatus;
  readonly notes: string;
  readonly rating: number | null;
  readonly contactCount: number;
  readonly lastContactAt: Date | null;
  readonly hasWebsite: boolean;
  readonly createdAt: Date;
}

const MAX_NOTES_LENGTH = 2000;
const MIN_RATING = 0;
const MAX_RATING = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class Lead {
  private constructor(
    private readonly _id: LeadId,
    private readonly _businessName: BusinessName,
    private readonly _sector: Sector,
    private readonly _location: Location,
    private readonly _contactInfo: ContactInfo,
    private _status: LeadStatus,
    private _notes: string,
    private readonly _rating: number | null,
    private _contactCount: number,
    private _lastContactAt: Date | null,
    private readonly _hasWebsite: boolean,
    private readonly _createdAt: Date,
    private readonly _events: DomainEvent[],
  ) {}

  static create(input: LeadCreateInput): Lead {
    const rating = input.rating ?? null;
    Lead.assertRatingIsValid(rating);

    const id = LeadId.generate();
    const createdAt = new Date();
    const lead = new Lead(
      id,
      input.businessName,
      input.sector,
      input.location,
      input.contactInfo,
      LeadStatus.novo(),
      '',
      rating,
      0,
      null,
      input.hasWebsite ?? false,
      createdAt,
      [],
    );

    lead._events.push(new LeadCreatedEvent(id, input.businessName, input.sector, createdAt));

    return lead;
  }

  static reconstitute(snapshot: LeadSnapshot): Lead {
    Lead.assertRatingIsValid(snapshot.rating);

    return new Lead(
      snapshot.id,
      snapshot.businessName,
      snapshot.sector,
      snapshot.location,
      snapshot.contactInfo,
      snapshot.status,
      snapshot.notes,
      snapshot.rating,
      snapshot.contactCount,
      snapshot.lastContactAt,
      snapshot.hasWebsite,
      snapshot.createdAt,
      [],
    );
  }

  get id(): LeadId {
    return this._id;
  }

  get businessName(): BusinessName {
    return this._businessName;
  }

  get sector(): Sector {
    return this._sector;
  }

  get location(): Location {
    return this._location;
  }

  get contactInfo(): ContactInfo {
    return this._contactInfo;
  }

  get status(): LeadStatus {
    return this._status;
  }

  get notes(): string {
    return this._notes;
  }

  get rating(): number | null {
    return this._rating;
  }

  get contactCount(): number {
    return this._contactCount;
  }

  get lastContactAt(): Date | null {
    return this._lastContactAt;
  }

  get hasWebsite(): boolean {
    return this._hasWebsite;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  changeStatus(newStatus: LeadStatus): void {
    const previousStatus = this._status;

    if (!previousStatus.canTransitionTo(newStatus)) {
      throw new InvalidStatusTransitionError(previousStatus.getValue(), newStatus.getValue());
    }

    this._status = newStatus;
    this._events.push(new LeadStatusChangedEvent(this._id, previousStatus, newStatus));
  }

  registerContact(channel: ContactChannel, at: Date): void {
    this.assertContactChannelAvailable(channel);

    const previousStatus = this._status;
    this._contactCount += 1;
    this._lastContactAt = at;
    this._events.push(new LeadContactedEvent(this._id, channel, at));

    if (previousStatus.getValue() === 'novo') {
      const newStatus = LeadStatus.contatado();
      this._status = newStatus;
      this._events.push(new LeadStatusChangedEvent(this._id, previousStatus, newStatus, at));
    }
  }

  updateNotes(notes: string): void {
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new LeadNotesTooLongError(notes.length, MAX_NOTES_LENGTH);
    }

    this._notes = notes;
  }

  isStale(now: Date, thresholdDays: number): boolean {
    if (this._status.getValue() !== 'contatado' || this._lastContactAt === null) {
      return false;
    }

    return now.getTime() - this._lastContactAt.getTime() >= thresholdDays * MS_PER_DAY;
  }

  pullEvents(): readonly DomainEvent[] {
    const events = [...this._events];
    this._events.length = 0;

    return events;
  }

  private static assertRatingIsValid(rating: number | null): void {
    if (rating === null) {
      return;
    }

    if (rating < MIN_RATING || rating > MAX_RATING) {
      throw new LeadRatingInvalidError(rating);
    }
  }

  private assertContactChannelAvailable(channel: ContactChannel): void {
    if (channel === 'whatsapp' && !this._contactInfo.hasPhone()) {
      throw new LeadMissingContactChannelError(this._id.getValue(), channel);
    }

    if (channel === 'email' && !this._contactInfo.hasEmail()) {
      throw new LeadMissingContactChannelError(this._id.getValue(), channel);
    }
  }
}
