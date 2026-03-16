import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryComponent } from './history.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HistoryComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    
    // Mock global chrome
    (window as any).chrome = {
      runtime: {
        sendMessage: jasmine.createSpy('sendMessage').and.callFake((req, cb) => {
          if (req.action === 'get_all_history') {
            cb({ data: [] });
          } else if (req.action === 'get_setting') {
            cb({ value: true });
          }
        }),
        onMessage: {
          addListener: jasmine.createSpy('addListener')
        }
      }
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format code display correctly', () => {
    const formatted = component.formatForDisplay({ key: 'val' });
    expect(formatted).toContain('"key": "val"');
  });

  it('should toggle api filter', () => {
    const event = new Event('click');
    component.toggleApiFilter('Prompt', event);
    expect(component.apiFilter).toContain('Prompt');
    component.toggleApiFilter('Prompt', event);
    expect(component.apiFilter.length).toBe(0);
  });
});
