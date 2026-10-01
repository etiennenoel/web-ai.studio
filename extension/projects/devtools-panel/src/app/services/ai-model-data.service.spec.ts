import { TestBed } from '@angular/core/testing';
import { AiModelDataService } from './ai-model-data.service';
import { ClassifierManager, resetModelBrokerWarmUp } from 'base';

describe('AiModelDataService', () => {
  let service: AiModelDataService;
  let mockClassifierManager: { availability: jasmine.Spy };

  beforeEach(() => {
    mockClassifierManager = {
      availability: jasmine.createSpy('availability').and.returnValue(Promise.resolve('downloadable')),
    };

    TestBed.configureTestingModule({
      providers: [
        AiModelDataService,
        { provide: ClassifierManager, useValue: mockClassifierManager },
      ],
    });
    service = TestBed.inject(AiModelDataService);
    resetModelBrokerWarmUp();
  });

  it('should return all 8 initial API capabilities immediately with unknown status', () => {
    const initial = service.getInitialApiCapabilities();
    expect(initial.length).toBe(8);
    expect(initial.every((c) => c.status === 'unknown')).toBeTrue();
  });

  it('should resolve getApiAvailability in parallel and invoke onUpdate callback', async () => {
    (self as any).LanguageModel = {
      availability: jasmine.createSpy('availability').and.returnValue(Promise.resolve('available')),
    };
    (self as any).Summarizer = {
      availability: jasmine.createSpy('availability').and.returnValue(Promise.resolve('downloadable')),
    };
    delete (self as any).Writer;
    delete (self as any).Rewriter;
    delete (self as any).Translator;
    delete (self as any).LanguageDetector;
    delete (self as any).Proofreader;
    delete (self as any).ai;

    const updates: number[] = [];
    const result = await service.getApiAvailability((caps) => {
      updates.push(caps.length);
    });

    expect(result.length).toBe(8);
    expect(updates.length).toBeGreaterThan(0);
    expect(result.find((c) => c.id === 'prompt')?.status).toBe('available');
    expect(result.find((c) => c.id === 'summarizer')?.status).toBe('downloadable');
    expect(result.find((c) => c.id === 'writer')?.status).toBe('unavailable');
    expect(result.find((c) => c.id === 'classifier')?.status).toBe('downloadable');
  });
});
