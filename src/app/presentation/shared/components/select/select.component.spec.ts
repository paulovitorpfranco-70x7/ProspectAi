import { TestBed } from '@angular/core/testing';
import { SelectComponent } from './select.component';

describe('SelectComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [SelectComponent] }).compileComponents();

    const fixture = TestBed.createComponent(SelectComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select')).not.toBeNull();
  });
});
