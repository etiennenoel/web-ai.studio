import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritingAssistanceInputComponent } from './writing-assistance-input.component';
import { Dialog } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { PromptInputStateEnum } from '../../core/enums/prompt-input-state.enum';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('WritingAssistanceInputComponent', () => {
  let component: WritingAssistanceInputComponent;
  let fixture: ComponentFixture<WritingAssistanceInputComponent>;
  let mockModalService: jasmine.SpyObj<Dialog>;

  beforeEach(async () => {
    mockModalService = jasmine.createSpyObj('Dialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ WritingAssistanceInputComponent ],
      imports: [ FormsModule ],
      providers: [
        { provide: Dialog, useValue: mockModalService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WritingAssistanceInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit run event with input on onRunClick', () => {
    spyOn(component.run, 'emit');
    component.input = 'test input';
    component.onRunClick();
    expect(component.run.emit).toHaveBeenCalledWith({ input: 'test input', options: component.options });
  });

  it('should not emit run event if input is empty', () => {
    spyOn(component.run, 'emit');
    component.input = '  ';
    component.onRunClick();
    expect(component.run.emit).not.toHaveBeenCalled();
  });

  it('should emit cancel event on onStopClick', () => {
    spyOn(component.cancel, 'emit');
    component.onStopClick();
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('should clear input when state is changed to Ready', () => {
    component.state = PromptInputStateEnum.Inferencing;
    component.input = 'something';
    component.state = PromptInputStateEnum.Ready;
    expect(component.input).toBe('');
  });
});
