import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PromptCodeModal } from './prompt-code-modal';

describe('PromptCodeModal', () => {
  let component: PromptCodeModal;
  let fixture: ComponentFixture<PromptCodeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PromptCodeModal],
      providers: [{provide: DialogRef, useValue: {}}, {provide: DIALOG_DATA, useValue: {}}],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptCodeModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
