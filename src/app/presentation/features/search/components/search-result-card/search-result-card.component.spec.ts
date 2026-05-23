import { TestBed } from '@angular/core/testing';
import { SearchResultCardComponent } from './search-result-card.component';

describe('SearchResultCardComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [SearchResultCardComponent] }).compileComponents();

    const fixture = TestBed.createComponent(SearchResultCardComponent);
    fixture.componentRef.setInput('item', {
      itemStatus: 'skipped_has_website',
      placeName: 'Acme Clinic',
      lead: null,
      skipReason: 'HAS_WEBSITE',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.result-card')).not.toBeNull();
  });
});
