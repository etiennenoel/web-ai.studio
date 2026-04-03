import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromptInputComponent } from './prompt-input.component';
import { DialogRef, Dialog } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { AttachmentTypeEnum } from '../../core/enums/attachment-type.enum';
import { FramingAlgorithm } from '../../core/enums/framing-algorithm.enum';

describe('PromptInputComponent', () => {
  let component: PromptInputComponent;
  let fixture: ComponentFixture<PromptInputComponent>;
  let modalServiceSpy: jasmine.SpyObj<Dialog>;

  beforeEach(async () => {
    modalServiceSpy = jasmine.createSpyObj('Dialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PromptInputComponent],
      imports: [FormsModule],
      providers: [
        { provide: Dialog, useValue: modalServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear promptText and attachments on run', async () => {
    // Setup initial state
    component.capabilities.available = true;
    component.promptText = 'Test prompt';
    component.attachments = [{
        id: '1',
        file: new File([], 'test.png'),
        content: new File([], 'test.png'),
        safeUrl: 'safeUrl',
        mimeType: 'image/png',
        type: AttachmentTypeEnum.Image,
        framingAlgorithm: FramingAlgorithm.NoFraming
    }];
    component.attachmentWarnings = true;
    component.attachmentReadyForPromptMap.set('1', true);

    // Spy on emit
    spyOn(component.run, 'emit');

    // Execute run
    await component.onRunClick();

    // Verify emit was called
    expect(component.run.emit).toHaveBeenCalled();

    // Verify state is cleared
    expect(component.promptText).toBe('');
    expect(component.attachments.length).toBe(0);
    expect(component.attachmentWarnings).toBeFalse();
    expect(component.attachmentReadyForPromptMap.size).toBe(0);
  });

  it('should open camera modal when openCamera is called', () => {
    const modalRefSpyObj = jasmine.createSpyObj('DialogRef', ['close']);
    modalRefSpyObj.closed = { subscribe: () => {} };
    modalServiceSpy.open.and.returnValue(modalRefSpyObj as any);

    component.openCamera();
    expect(modalServiceSpy.open).toHaveBeenCalled();
  });

  it('should open audio recording modal when recordAudio is called', () => {
    const modalRefSpyObj = jasmine.createSpyObj('DialogRef', ['close']);
    modalRefSpyObj.closed = { subscribe: () => {} };
    modalServiceSpy.open.and.returnValue(modalRefSpyObj as any);

    component.recordAudio();
    expect(modalServiceSpy.open).toHaveBeenCalled();
  });
});
