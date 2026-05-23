import { TestBed } from '@angular/core/testing';
import { SearchLeadsUseCase } from '@application/lead';
import { SearchPage } from './search.page';

describe('SearchPage', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        {
          provide: SearchLeadsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.search-page')).not.toBeNull();
  });
});
