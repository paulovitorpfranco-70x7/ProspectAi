import { TestBed } from '@angular/core/testing';
import { PipelineColumnComponent } from './pipeline-column.component';

describe('PipelineColumnComponent', () => {
  it('should render without error', async () => {
    await TestBed.configureTestingModule({ imports: [PipelineColumnComponent] }).compileComponents();

    const fixture = TestBed.createComponent(PipelineColumnComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pipeline-column')).not.toBeNull();
  });
});
