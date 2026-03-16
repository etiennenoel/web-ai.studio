import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverviewComponent } from './overview';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgZone } from '@angular/core';
import {
    ModelManager,
    WriterManager,
    RewriterManager,
    PromptManager,
    ProofreaderManager,
    SummarizerManager,
    TranslatorManager,
    LanguageDetectorManager
} from 'base';
import { of } from 'rxjs';

class MockManager {
  modelDownloadedEvent = of(null);
}

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OverviewComponent],
      imports: [CommonModule],
      providers: [
        { provide: ModelManager, useClass: MockManager },
        { provide: WriterManager, useClass: MockManager },
        { provide: RewriterManager, useClass: MockManager },
        { provide: PromptManager, useClass: MockManager },
        { provide: ProofreaderManager, useClass: MockManager },
        { provide: SummarizerManager, useClass: MockManager },
        { provide: TranslatorManager, useClass: MockManager },
        { provide: LanguageDetectorManager, useClass: MockManager },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    
    // Mock the window.chrome and window.LanguageModel if necessary
    (window as any).chrome = { runtime: { onMessage: { addListener: () => {} } } };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize apiCapabilities to empty and then fetch', async () => {
    expect(component.apiCapabilities).toBeDefined();
    await component.refreshApis();
    expect(component.apiCapabilities.length).toBeGreaterThan(0);
  });
});
