import type { UseCase } from '@application/shared/use-case.interface';
import { DuplicateLeadError } from '@domain/lead/errors/duplicate-lead.error';
import { Lead } from '@domain/lead/entities/lead.entity';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { BusinessName } from '@domain/lead/value-objects/business-name.vo';
import { ContactInfo } from '@domain/lead/value-objects/contact-info.vo';
import { Email } from '@domain/lead/value-objects/email.vo';
import { Location } from '@domain/lead/value-objects/location.vo';
import { PhoneNumber } from '@domain/lead/value-objects/phone-number.vo';
import { Sector } from '@domain/lead/value-objects/sector.vo';
import { LeadMapper } from '../../dtos/lead.mapper';
import type { CreateLeadInput } from './create-lead.input.dto';
import type { CreateLeadOutput } from './create-lead.output.dto';

export class CreateLeadUseCase implements UseCase<CreateLeadInput, CreateLeadOutput> {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(input: CreateLeadInput): Promise<CreateLeadOutput> {
    const businessName = BusinessName.create(input.businessName);
    const sector = Sector.create(input.sector);
    const location = Location.create({ city: input.city, address: input.address });
    const phone = input.phone == null ? null : PhoneNumber.create(input.phone);
    const email = input.email == null ? null : Email.create(input.email);
    const contactInfo = ContactInfo.create({ phone, email });

    if (
      contactInfo.hasPhone() &&
      phone !== null &&
      (await this.leadRepository.existsByPhoneAndCity(phone, location.getCity()))
    ) {
      throw new DuplicateLeadError(phone.getValue(), location.getCity());
    }

    const lead = Lead.create({
      businessName,
      sector,
      location,
      contactInfo,
      rating: input.rating,
      hasWebsite: input.hasWebsite,
    });

    await this.leadRepository.save(lead);

    return { lead: LeadMapper.toDto(lead) };
  }
}
