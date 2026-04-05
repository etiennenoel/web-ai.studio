import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerformanceComponent } from './performance.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PerformanceComponent', () => {
  let component: PerformanceComponent;
  let fixture: ComponentFixture<PerformanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PerformanceComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceComponent);
    component = fixture.componentInstance;
    
    (window as any).chrome = {
      devtools: {
        inspectedWindow: {
          eval: jasmine.createSpy('eval').and.callFake((str, cb) => cb('http://test', false))
        }
      },
      runtime: {
        sendMessage: jasmine.createSpy('sendMessage').and.callFake((req, cb) => {
          cb({ data: [] });
        }),
        lastError: null
      }
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply count filters', () => {
    component.setCountFilter('100');
    expect(component.countFilter).toBe('100');
  });

  it('should toggle api filter', () => {
    expect(component.selectedApis.has('Prompt')).toBeFalse();
    component.toggleApi('Prompt');
    expect(component.selectedApis.has('Prompt')).toBeTrue();
  });
});
