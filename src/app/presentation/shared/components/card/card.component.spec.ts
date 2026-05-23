import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [CardComponent] }).compileComponents();

    const fixture = TestBed.createComponent(CardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card')).not.toBeNull();
  });
});
