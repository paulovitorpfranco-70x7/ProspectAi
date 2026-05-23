import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [ButtonComponent] }).compileComponents();

    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
