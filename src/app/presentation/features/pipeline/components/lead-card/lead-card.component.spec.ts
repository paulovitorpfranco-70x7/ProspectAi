import { TestBed } from '@angular/core/testing';
import type { LeadDto } from '@application/lead';
import { LeadCardComponent } from './lead-card.component';

const BASE_LEAD: LeadDto = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  businessName: 'Acme Clinic',
  sector: 'Clínicas & Consultórios',
  city: 'Niterói',
  address: 'Rua A, 123',
  phone: '(21) 99999-0001',
  phoneDigits: '21999990001',
  email: 'contato@acme.com',
  status: 'novo',
  notes: '',
  rating: 4.5,
  contactCount: 2,
  lastContactAtIso: null,
  hasWebsite: false,
  createdAtIso: '2026-05-18T12:00:00.000Z',
};

async function render(lead: LeadDto = BASE_LEAD) {
  await TestBed.configureTestingModule({ imports: [LeadCardComponent] }).compileComponents();

  const fixture = TestBed.createComponent(LeadCardComponent);
  fixture.componentRef.setInput('lead', lead);
  fixture.detectChanges();

  return fixture;
}

describe('LeadCardComponent', () => {
  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should render lead businessName', async () => {
    const fixture = await render();

    expect(fixture.nativeElement.textContent).toContain('Acme Clinic');
  });

  it('should render status badge with correct label', async () => {
    const fixture = await render({ ...BASE_LEAD, status: 'proposta' });

    expect(fixture.nativeElement.textContent).toContain('Proposta');
  });

  it('should emit statusChange event when transition button clicked', async () => {
    const fixture = await render();
    const emitSpy = jest.spyOn(fixture.componentInstance.statusChange, 'emit');
    const buttons = fixture.nativeElement.querySelectorAll('.lead-card__transition');

    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({ leadId: BASE_LEAD.id, newStatus: 'contatado' });
  });

  it('should disable forbidden transition buttons', async () => {
    const fixture = await render();
    const buttons = fixture.nativeElement.querySelectorAll('.lead-card__transition');

    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[3] as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show stale indicator when lead.isStale visual marker is on', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-22T12:00:00Z'));

    const fixture = await render({
      ...BASE_LEAD,
      status: 'contatado',
      lastContactAtIso: '2026-05-18T12:00:00.000Z',
    });

    expect(fixture.nativeElement.textContent).toContain('Sem retorno');
  });
});
