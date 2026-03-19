import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExtensionLandingPage } from './extension-landing.page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ExtensionLandingPage', () => {
  let component: ExtensionLandingPage;
  let fixture: ComponentFixture<ExtensionLandingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExtensionLandingPage ],
      providers: [
        Title,
        { provide: DOCUMENT, useValue: document }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtensionLandingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
