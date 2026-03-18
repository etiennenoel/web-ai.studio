import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LatencyLoaderComponent } from './latency-loader.component';
import { LoadingLabelService } from '../../core/services/loading-label.service';
import { LoadingLabel } from '../../core/models/loading-label.model';

describe('LatencyLoaderComponent', () => {
  let component: LatencyLoaderComponent;
  let fixture: ComponentFixture<LatencyLoaderComponent>;
  let mockLoadingLabelService: jasmine.SpyObj<LoadingLabelService>;

  beforeEach(async () => {
    mockLoadingLabelService = jasmine.createSpyObj('LoadingLabelService', ['getRandomLabel']);
    mockLoadingLabelService.getRandomLabel.and.returnValue({ text: 'Mock label' } as LoadingLabel);

    await TestBed.configureTestingModule({
      imports: [LatencyLoaderComponent],
      providers: [
        { provide: LoadingLabelService, useValue: mockLoadingLabelService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LatencyLoaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should clear timeout on destroy', fakeAsync(() => {
    fixture.detectChanges();
    spyOn(window, 'clearTimeout');
    component.ngOnDestroy();
    expect(window.clearTimeout).toHaveBeenCalled();
    // Flush pending timeouts
    tick(5000);
  }));

  it('should get random label on init', () => {
    fixture.detectChanges();
    expect(mockLoadingLabelService.getRandomLabel).toHaveBeenCalled();
  });
});
