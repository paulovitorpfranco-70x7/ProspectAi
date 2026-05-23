import { TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [BadgeComponent] }).compileComponents();

    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.badge')).not.toBeNull();
  });
});
