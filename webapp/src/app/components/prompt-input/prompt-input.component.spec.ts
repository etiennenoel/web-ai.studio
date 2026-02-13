import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromptInputComponent } from './prompt-input.component';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { AttachmentTypeEnum } from '../../core/enums/attachment-type.enum';
import { FramingAlgorithm } from '../../core/enums/framing-algorithm.enum';

describe('PromptInputComponent', () => {
  let component: PromptInputComponent;
  let fixture: ComponentFixture<PromptInputComponent>;
  let modalServiceSpy: jasmine.SpyObj<NgbModal>;

  beforeEach(async () => {
    modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PromptInputComponent],
      imports: [FormsModule, NgbTooltipModule],
      providers: [
        { provide: NgbModal, useValue: modalServiceSpy }
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
});
