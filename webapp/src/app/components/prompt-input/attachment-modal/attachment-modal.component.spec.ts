import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttachmentModalComponent } from './attachment-modal.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ImageProcessingService } from '../../../core/services/image-processing.service';
import { PdfProcessingService } from '../../../core/services/pdf-processing.service';
import { EventStore } from '../../../core/stores/event.store';
import { DomSanitizer } from '@angular/platform-browser';
import { Attachment } from '../../../core/interfaces/attachment.interface';
import { AttachmentTypeEnum } from '../../../core/enums/attachment-type.enum';
import { FramingAlgorithm } from '../../../core/enums/framing-algorithm.enum';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('AttachmentModalComponent', () => {
  let component: AttachmentModalComponent;
  let fixture: ComponentFixture<AttachmentModalComponent>;
  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
  let mockImageProcessingService: jasmine.SpyObj<ImageProcessingService>;
  let mockPdfProcessingService: jasmine.SpyObj<PdfProcessingService>;
  let mockDomSanitizer: jasmine.SpyObj<DomSanitizer>;
  let mockEventStore: jasmine.SpyObj<EventStore>;

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);
    mockImageProcessingService = jasmine.createSpyObj('ImageProcessingService', ['frame']);
    mockPdfProcessingService = jasmine.createSpyObj('PdfProcessingService', ['getPagesAsImageBlobs']);
    mockDomSanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustUrl']);
    mockEventStore = jasmine.createSpyObj('EventStore', ['updateFramingAlgorithm']);
    // updateFramingAlgorithm is a Subject, we need to mock it better
    mockEventStore.updateFramingAlgorithm = { next: jasmine.createSpy('next') } as any;

    await TestBed.configureTestingModule({
      declarations: [ AttachmentModalComponent ],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal },
        { provide: ImageProcessingService, useValue: mockImageProcessingService },
        { provide: PdfProcessingService, useValue: mockPdfProcessingService },
        { provide: DomSanitizer, useValue: mockDomSanitizer },
        { provide: EventStore, useValue: mockEventStore },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttachmentModalComponent);
    component = fixture.componentInstance;
    component.attachment = {
      type: AttachmentTypeEnum.Image,
      file: new File([], 'test.png'),
      content: new Blob(),
      safeUrl: 'safe-url',
      framingAlgorithm: FramingAlgorithm.NoFraming,
      id: '1',
      name: 'test.png'
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
