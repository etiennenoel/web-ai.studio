import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownRendererComponent } from './markdown-renderer.component';
import { SimpleChange } from '@angular/core';

describe('MarkdownRendererComponent', () => {
  let component: MarkdownRendererComponent;
  let fixture: ComponentFixture<MarkdownRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkdownRendererComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkdownRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render markdown content', async () => {
    component.content = '# Hello World';
    component.ngOnChanges({
      content: new SimpleChange(null, component.content, true)
    });
    
    // Give time for marked parsing
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(fixture.nativeElement.innerHTML).toContain('Hello World');
  });
});
