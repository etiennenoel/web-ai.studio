import { TestBed } from '@angular/core/testing';
import { AiModelDataService } from './ai-model-data.service';
import { ClassifierManager, withAvailabilityTimeout } from 'base';

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

  it('withAvailabilityTimeout should resolve to fallbackValue when a promise hangs', async () => {
    const hangingPromise = new Promise<string>(() => {});
    const result = await withAvailabilityTimeout(hangingPromise, 25, 'unavailable');
    expect(result).toBe('unavailable');
  });

  it('withAvailabilityTimeout should retry a factory function when the first cold-start call hangs', async () => {
    let calls = 0;
    const factory = () => {
      calls++;
      if (calls === 1) {
        return new Promise<string>(() => {}); // Simulate cold-start hang
      }
      return Promise.resolve('downloadable');
    };
    const result = await withAvailabilityTimeout(factory, 2000, 'unavailable');
    expect(calls).toBe(2);
    expect(result).toBe('downloadable');
  });
});
