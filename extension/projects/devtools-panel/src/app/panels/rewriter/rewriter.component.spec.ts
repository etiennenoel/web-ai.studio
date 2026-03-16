import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RewriterComponent } from './rewriter.component';
import { RewriterDataService } from '../../services/rewriter-data.service';
import { ToastService, RewriterManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('RewriterComponent', () => {
  let component: RewriterComponent;
  let fixture: ComponentFixture<RewriterComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code'),
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        rewrite: jasmine.createSpy('rewrite').and.returnValue(Promise.resolve('Rewritten')),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [RewriterComponent],
      providers: [
        { provide: RewriterDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: RewriterManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RewriterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run rewrite successfully', async () => {
    component.inputText = 'Hello';
    await component.rewrite('shorter');
    
    expect(component.rewriterOutput).toBe('Rewritten');
    expect(component.isRewriting).toBeFalse();
  });
});
