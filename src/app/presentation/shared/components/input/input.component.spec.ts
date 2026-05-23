import { TestBed } from '@angular/core/testing';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [InputComponent] }).compileComponents();

    const fixture = TestBed.createComponent(InputComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
  });
});
