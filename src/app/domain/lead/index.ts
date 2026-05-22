export * from './entities/lead.entity';

export * from './value-objects/lead-id.vo';
export * from './value-objects/business-name.vo';
export * from './value-objects/sector.vo';
export * from './value-objects/lead-status.vo';
export * from './value-objects/phone-number.vo';
export * from './value-objects/email.vo';
export * from './value-objects/location.vo';
export * from './value-objects/contact-info.vo';

export * from './events/lead-created.event';
export * from './events/lead-status-changed.event';
export * from './events/lead-contacted.event';

export * from './repositories/lead.repository';

export * from './services/place-finder.service';
export * from './services/contact-dispatcher.service';
export * from './services/message-template.service';

export * from './errors/lead-id-invalid.error';
export * from './errors/business-name-invalid.error';
export * from './errors/sector-invalid.error';
export * from './errors/lead-status-invalid.error';
export * from './errors/phone-number-invalid.error';
export * from './errors/email-invalid.error';
export * from './errors/location-invalid.error';
export * from './errors/contact-info-empty.error';
export * from './errors/lead-rating-invalid.error';
export * from './errors/lead-notes-too-long.error';
export * from './errors/invalid-status-transition.error';
export * from './errors/lead-missing-contact-channel.error';
export * from './errors/lead-not-found.error';
export * from './errors/duplicate-lead.error';
export * from './errors/place-finder-unavailable.error';
export * from './errors/dispatch-failed.error';
