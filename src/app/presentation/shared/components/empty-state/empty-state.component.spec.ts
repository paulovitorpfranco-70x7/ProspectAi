import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();

    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  });
});
