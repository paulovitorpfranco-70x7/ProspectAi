import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OutreachQueueService } from '@application/outreach/outreach-queue.service';
import { appRoutes } from '../../../app.routes';

describe('/fila route', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should lazy-load and render the outreach queue', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        {
          provide: OutreachQueueService,
          useValue: {
            montarFila: jest.fn().mockResolvedValue({
              followups: [],
              novos: [],
              enviadosHoje: [],
              contadorHoje: 0,
            }),
            confirmarEnvio: jest.fn(),
            desfazerEnvio: jest.fn(),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create('/fila');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('.outreach-queue')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Fila diária de abordagem');
  });
});
