import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarComponent],
      imports: [CommonModule, RouterModule.forRoot([])],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should group menu items correctly', () => {
    expect(component.apiItems.length).toBeGreaterThan(0);
    expect(component.managementItems.length).toBeGreaterThan(0);
    expect(component.nonApiItems.length).toBeGreaterThan(0);
    
    expect(component.apiItems.every(item => item.isApi)).toBeTrue();
    expect(component.managementItems.every(item => item.isManagement)).toBeTrue();
    expect(component.nonApiItems.every(item => !item.isApi && !item.isManagement)).toBeTrue();
  });

  it('should render links with correct routerLink attributes', () => {
    const linkDebugElements = fixture.debugElement.queryAll(By.css('a.nav-btn'));
    expect(linkDebugElements.length).toBeGreaterThan(0);

    // Verify at least one non-API link (e.g. overview) and one API link (e.g. prompt)
    const hrefs = linkDebugElements.map(de => de.nativeElement.getAttribute('href'));
    expect(hrefs).toContain('/overview');
    expect(hrefs).toContain('/prompt');

    // The management items are currently commented out in the HTML template, 
    // so we only expect nonApiItems + apiItems
    expect(linkDebugElements.length).toBe(component.nonApiItems.length + component.apiItems.length);
  });
});
