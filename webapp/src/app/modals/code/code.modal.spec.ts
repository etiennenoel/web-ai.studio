import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';

import { CodeModal } from './code.modal';

@Pipe({ name: 'render_markdown', standalone: false })
class MockRenderMarkdownPipe implements PipeTransform {
  transform(value: string): string { return value; }
}

describe('CodeModal', () => {
  let component: CodeModal;
  let fixture: ComponentFixture<CodeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CodeModal, MockRenderMarkdownPipe],
      providers: [{provide: DialogRef, useValue: {}}],
      schemas: [NO_ERRORS_SCHEMA]
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
