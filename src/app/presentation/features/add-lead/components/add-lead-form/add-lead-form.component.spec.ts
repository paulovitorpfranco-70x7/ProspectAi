import { TestBed } from '@angular/core/testing';
import { AddLeadFormComponent } from './add-lead-form.component';

describe('AddLeadFormComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [AddLeadFormComponent] }).compileComponents();

    const fixture = TestBed.createComponent(AddLeadFormComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.add-lead-form')).not.toBeNull();
  });
});
