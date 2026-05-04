import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverviewComponent } from './overview';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgZone } from '@angular/core';
import { DiagnosisService } from 'base';
import { of, BehaviorSubject } from 'rxjs';

class MockDiagnosisService {
  apis$ = new BehaviorSubject<any[]>([]);
  errorCount$ = new BehaviorSubject<number>(0);
  runChecks() {}
}

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OverviewComponent],
      imports: [CommonModule],
      providers: [
        { provide: DiagnosisService, useClass: MockDiagnosisService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    
    // Mock the window.chrome and window.LanguageModel if necessary
    (window as any).chrome = { 
      runtime: { onMessage: { addListener: () => {} } },
      tabs: { onActivated: { addListener: () => {} }, onUpdated: { addListener: () => {} }, query: () => {} }
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
