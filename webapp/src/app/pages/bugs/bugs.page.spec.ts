import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BugsPage } from './bugs.page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('BugsPage', () => {
  let component: BugsPage;
  let fixture: ComponentFixture<BugsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BugsPage ],
      providers: [
        Title,
        { provide: DOCUMENT, useValue: document }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BugsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have bugs populated', () => {
    expect(component.bugs.length).toBeGreaterThan(0);
  });
});
