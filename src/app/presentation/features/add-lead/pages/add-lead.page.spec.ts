import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CreateLeadUseCase } from '@application/lead';
import { AddLeadPage } from './add-lead.page';

describe('AddLeadPage', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({
      imports: [AddLeadPage],
      providers: [
        { provide: CreateLeadUseCase, useValue: { execute: jest.fn() } },
        { provide: Router, useValue: { navigateByUrl: jest.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AddLeadPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.add-lead-page')).not.toBeNull();
  });
});
