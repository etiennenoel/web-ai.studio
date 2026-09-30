import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelManager } from 'base';
import { Subject } from 'rxjs';
import { ModelDownloadCard } from './model-download-card';

describe('ModelDownloadCard', () => {
  let component: ModelDownloadCard;
  let fixture: ComponentFixture<ModelDownloadCard>;
  let mockModelManager: { availability: jasmine.Spy; download: jasmine.Spy; modelDownloadedEvent: Subject<void> };

  beforeEach(async () => {
    mockModelManager = {
      availability: jasmine.createSpy('availability').and.returnValue(Promise.resolve('unavailable')),
      download: jasmine.createSpy('download').and.returnValue(Promise.resolve()),
      modelDownloadedEvent: new Subject<void>(),
    };

    await TestBed.configureTestingModule({
      declarations: [ModelDownloadCard],
      providers: [{ provide: ModelManager, useValue: mockModelManager }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModelDownloadCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render unavailable state when model is unavailable', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.status()).toBe('unavailable');
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
  });

  it('should render available state when model is available', async () => {
    mockModelManager.availability.and.returnValue(Promise.resolve('available'));
    await component.refreshStatus();
    fixture.detectChanges();
    expect(component.status()).toBe('available');
    expect(fixture.nativeElement.textContent).toContain('Available');
  });

  it('should render an unknown state, not unavailable, when the check fails', async () => {
    mockModelManager.availability.and.returnValue(Promise.reject(new Error('timed out')));
    await component.refreshStatus();
    fixture.detectChanges();
    expect(component.status()).toBe('check-failed');
    expect(fixture.nativeElement.textContent).toContain('Status unknown');
    expect(fixture.nativeElement.textContent).not.toContain('Unavailable');
  });
});
