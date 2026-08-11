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
    existsByGooglePlaceId: jest.fn(),
    updatePlaceDetailsByGooglePlaceId: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    statsByStatus: jest.fn(),
  };
}

describe('PipelinePage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should render statistics without the outreach queue', async () => {
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
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pipeline-page__stats')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.outreach-queue')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Fila diária de abordagem');
  });
});
