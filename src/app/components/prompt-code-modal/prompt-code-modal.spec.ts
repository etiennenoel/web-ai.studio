import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptCodeModal } from './prompt-code-modal';

describe('PromptCodeModal', () => {
  let component: PromptCodeModal;
  let fixture: ComponentFixture<PromptCodeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PromptCodeModal]
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
