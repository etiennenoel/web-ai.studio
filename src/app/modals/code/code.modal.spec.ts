import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeModal } from './code.modal';

describe('CodeModal', () => {
  let component: CodeModal;
  let fixture: ComponentFixture<CodeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
