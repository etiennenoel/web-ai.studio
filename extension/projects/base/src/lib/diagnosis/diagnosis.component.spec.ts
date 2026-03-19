import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosisComponent } from './diagnosis.component';
import { DiagnosisService, ApiDiagnostic } from '../managers/diagnosis.service';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { vi, describe, beforeEach, it, expect, Mock } from 'vitest';

describe('DiagnosisComponent', () => {
  let component: DiagnosisComponent;
  let fixture: ComponentFixture<DiagnosisComponent>;
  let mockDiagnosisService: any;
  
  let apisSubject: BehaviorSubject<ApiDiagnostic[]>;
  let isCheckingSubject: BehaviorSubject<boolean>;
  let errorCountSubject: BehaviorSubject<number>;

  beforeEach(async () => {
    apisSubject = new BehaviorSubject<ApiDiagnostic[]>([]);
    isCheckingSubject = new BehaviorSubject<boolean>(false);
    errorCountSubject = new BehaviorSubject<number>(0);

    mockDiagnosisService = {
      runChecks: vi.fn(),
      apis$: apisSubject.asObservable(),
      isChecking$: isCheckingSubject.asObservable(),
      errorCount$: errorCountSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [ DiagnosisComponent ],
      providers: [
        { provide: DiagnosisService, useValue: mockDiagnosisService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagnosisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(mockDiagnosisService.runChecks).toHaveBeenCalled();
  });

  it('should update properties based on service observables', () => {
    const mockApis: ApiDiagnostic[] = [
      { name: 'API 1', globalName: 'API1', statusType: 'ga', devToolsStatus: true, siteStatus: true, docsUrl: '' },
      { name: 'API 2', globalName: 'API2', statusType: 'dev-trial', devToolsStatus: true, siteStatus: false, docsUrl: '' }
    ];

    apisSubject.next(mockApis);
    isCheckingSubject.next(true);
    errorCountSubject.next(1);

    expect(component.apis).toEqual(mockApis);
    expect(component.isChecking).toBe(true);
    expect(component.hasErrors).toBe(true);
    expect(component.workingApis.length).toBe(1);
    expect(component.failingApis.length).toBe(1);
  });

  it('should call runChecks on service when runChecks is called', () => {
    mockDiagnosisService.runChecks.mockClear();
    component.runChecks();
    expect(mockDiagnosisService.runChecks).toHaveBeenCalled();
  });
});
