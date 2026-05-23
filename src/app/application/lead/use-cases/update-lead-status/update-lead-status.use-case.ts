import type { UseCase } from '@application/shared/use-case.interface';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import { LeadStatus } from '@domain/lead/value-objects/lead-status.vo';
import { LeadNotFoundError } from '@domain/lead/errors/lead-not-found.error';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { LeadMapper } from '../../dtos/lead.mapper';
import type { UpdateLeadStatusInput } from './update-lead-status.input.dto';
import type { UpdateLeadStatusOutput } from './update-lead-status.output.dto';

export class UpdateLeadStatusUseCase
  implements UseCase<UpdateLeadStatusInput, UpdateLeadStatusOutput>
{
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(input: UpdateLeadStatusInput): Promise<UpdateLeadStatusOutput> {
    const leadId = LeadId.fromString(input.leadId);
    const lead = await this.leadRepository.findById(leadId);

    if (lead === null) {
      throw new LeadNotFoundError(leadId.getValue());
    }

    const newStatus = LeadStatus.create(input.newStatus);

    lead.changeStatus(newStatus);
    await this.leadRepository.save(lead);

    return { lead: LeadMapper.toDto(lead) };
  }
}
