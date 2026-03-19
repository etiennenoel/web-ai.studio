import { Component, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DiagnosisService, ApiDiagnostic } from '../managers/diagnosis.service';
import { Subscription } from 'rxjs';

declare const chrome: any;

@Component({
  selector: 'lib-diagnosis',
  templateUrl: './diagnosis.component.html',
  styleUrls: ['./diagnosis.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DiagnosisComponent implements OnInit, OnDestroy {
  apis: ApiDiagnostic[] = [];
  isChecking = true;
  hasErrors = false;
  private subscriptions: Subscription[] = [];

  get failingApis() {
    return this.apis.filter(api => api.siteStatus === false);
  }

  get workingApis() {
    return this.apis.filter(api => api.siteStatus === true);
  }

  constructor(
    private diagnosisService: DiagnosisService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.diagnosisService.apis$.subscribe(apis => {
        this.apis = apis;
        this.cdr.detectChanges();
      }),
      this.diagnosisService.isChecking$.subscribe(isChecking => {
        this.isChecking = isChecking;
        this.cdr.detectChanges();
      }),
      this.diagnosisService.errorCount$.subscribe(count => {
        this.hasErrors = count > 0;
        this.cdr.detectChanges();
      })
    );
    
    // We already run checks on service init, but let's re-run just to be sure 
    // it's fresh when user opens the panel.
    this.runChecks();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  runChecks() {
    this.diagnosisService.runChecks();
  }

  goBack() {
    this.location.back();
  }

  isSidePanel() {
    return typeof chrome !== 'undefined' && !chrome.devtools;
  }
}

