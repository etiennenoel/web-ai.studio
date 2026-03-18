import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragAndDropComponent } from './drag-and-drop.component';

describe('DragAndDropComponent', () => {
  let component: DragAndDropComponent;
  let fixture: ComponentFixture<DragAndDropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DragAndDropComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DragAndDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit fileDropped on onDrop', () => {
    spyOn(component.fileDropped, 'emit');
    const mockFile = new File([''], 'test.txt');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(mockFile);
    
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: dataTransfer
    } as any;

    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.fileDropped.emit).toHaveBeenCalledWith(dataTransfer.files);
  });
});
