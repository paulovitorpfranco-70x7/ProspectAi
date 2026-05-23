import { TestBed } from '@angular/core/testing';
import {
  DeleteLeadUseCase,
  LEAD_REPOSITORY,
  SendEmailUseCase,
  SendWhatsAppUseCase,
  UpdateLeadStatusUseCase,
} from '@application/lead';
import type { LeadRepository } from '@domain/lead/repositories/lead.repository';
import { PipelinePage } from './pipeline.page';

function makeRepositoryMock(): jest.Mocked<LeadRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    existsByPhoneAndCity: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

describe('PipelinePage', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({
      imports: [PipelinePage],
      providers: [
        { provide: LEAD_REPOSITORY, useValue: makeRepositoryMock() },
        { provide: UpdateLeadStatusUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteLeadUseCase, useValue: { execute: jest.fn() } },
        { provide: SendWhatsAppUseCase, useValue: { execute: jest.fn() } },
        { provide: SendEmailUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PipelinePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.pipeline-page')).not.toBeNull();
  });
});
