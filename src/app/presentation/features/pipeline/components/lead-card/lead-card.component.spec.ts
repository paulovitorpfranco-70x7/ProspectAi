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
  instagramHandle: null,
  websiteQuality: null,
  leadScore: 0,
  openingHours: null,
  topReviews: null,
  previewUrl: null,
  previewViews: 0,
  previewLastViewedAtIso: null,
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

  it.each([
    { score: 90, colorClass: 'badge--accent' },
    { score: 70, colorClass: 'badge--warning' },
    { score: 69, colorClass: 'badge--muted' },
  ])('should render score $score with the expected color range', async ({ score, colorClass }) => {
    const fixture = await render({ ...BASE_LEAD, leadScore: score });
    const scoreBadge = fixture.nativeElement.querySelector('.lead-card__score .badge');

    expect(scoreBadge.textContent).toContain(`Score ${score}`);
    expect(scoreBadge.classList).toContain(colorClass);
  });

  it('should render Instagram handle as a safe external link', async () => {
    const fixture = await render({ ...BASE_LEAD, instagramHandle: '@acmeclinic' });
    const link = fixture.nativeElement.querySelector('.lead-card__instagram') as HTMLAnchorElement;

    expect(link.textContent).toContain('@acmeclinic');
    expect(link.href).toBe('https://instagram.com/acmeclinic');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('should omit Instagram badge when handle is absent', async () => {
    const fixture = await render({ ...BASE_LEAD, instagramHandle: null });

    expect(fixture.nativeElement.querySelector('.lead-card__instagram')).toBeNull();
  });

  it.each([
    { quality: 'none' as const, label: 'Sem site', colorClass: 'badge--muted' },
    { quality: 'weak' as const, label: 'Site fraco', colorClass: 'badge--warning' },
    { quality: 'proper' as const, label: 'Tem site próprio', colorClass: 'badge--info' },
  ])('should render website quality $quality', async ({ quality, label, colorClass }) => {
    const fixture = await render({ ...BASE_LEAD, websiteQuality: quality });
    const qualityBadge = fixture.nativeElement.querySelector('.lead-card__website-quality .badge');

    expect(qualityBadge.textContent).toContain(label);
    expect(qualityBadge.classList).toContain(colorClass);
  });

  it('should omit website quality badge when quality is unknown', async () => {
    const fixture = await render({ ...BASE_LEAD, websiteQuality: null });

    expect(fixture.nativeElement.querySelector('.lead-card__website-quality')).toBeNull();
  });

  it('should emit statusChange event when transition button clicked', async () => {
    const fixture = await render();
    const emitSpy = jest.spyOn(fixture.componentInstance.statusChange, 'emit');
    const buttons = fixture.nativeElement.querySelectorAll('.lead-card__transition');

    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({ leadId: BASE_LEAD.id, newStatus: 'contatado' });
  });

  it('should enable every transition except the current status', async () => {
    const fixture = await render();
    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.lead-card__transition'),
    );

    expect(buttons[0].disabled).toBe(true);
    expect(buttons.slice(1).every((button) => !button.disabled)).toBe(true);
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
