import { TestBed } from '@angular/core/testing';
import { SearchFormComponent } from './search-form.component';

describe('SearchFormComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [SearchFormComponent] }).compileComponents();

    const fixture = TestBed.createComponent(SearchFormComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.search-form')).not.toBeNull();
  });
});
