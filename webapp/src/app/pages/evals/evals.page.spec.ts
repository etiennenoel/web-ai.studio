import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalsPage } from './evals.page';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('EvalsPage', () => {
  let component: EvalsPage;
  let fixture: ComponentFixture<EvalsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvalsPage ],
      imports: [ ReactiveFormsModule, RouterTestingModule ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a row', () => {
    const initialLength = component.rows.length;
    component.addRow();
    expect(component.rows.length).toBe(initialLength + 1);
  });

  it('should remove a row', () => {
    component.addRow();
    const initialLength = component.rows.length;
    component.removeRow(0);
    expect(component.rows.length).toBe(initialLength - 1);
  });
});
