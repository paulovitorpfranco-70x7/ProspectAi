import type { UseCase } from '@application/shared/use-case.interface';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { LeadId } from '@domain/lead/value-objects/lead-id.vo';
import type { DeleteLeadInput } from './delete-lead.input.dto';
import type { DeleteLeadOutput } from './delete-lead.output.dto';

export class DeleteLeadUseCase implements UseCase<DeleteLeadInput, DeleteLeadOutput> {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(input: DeleteLeadInput): Promise<DeleteLeadOutput> {
    const leadId = LeadId.fromString(input.leadId);

    await this.leadRepository.delete(leadId);

    return {
      leadId: leadId.getValue(),
      deletedAtIso: new Date().toISOString(),
    };
  }
}
