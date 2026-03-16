import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WriterComponent } from './writer.component';
import { WriterDataService } from '../../services/writer-data.service';
import { ToastService, WriterManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WriterComponent', () => {
  let component: WriterComponent;
  let fixture: ComponentFixture<WriterComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code'),
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        writeStreaming: jasmine.createSpy('writeStreaming').and.returnValue((async function*() { yield 'Written content'; })()),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [WriterComponent],
      providers: [
        { provide: WriterDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: WriterManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(WriterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run write successfully using streaming', async () => {
    component.topic = 'Hello';
    await component.write();
    
    expect(component.writerOutput).toBe('Written content');
    expect(component.isWriting).toBeFalse();
  });
});
