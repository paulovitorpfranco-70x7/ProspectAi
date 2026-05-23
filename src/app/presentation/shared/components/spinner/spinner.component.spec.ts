import { TestBed } from '@angular/core/testing';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [SpinnerComponent] }).compileComponents();

    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.spinner-overlay__indicator')).not.toBeNull();
  });
});
