import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiStatusComponent } from './api-status.component';
import { CommonModule } from '@angular/common';

describe('ApiStatusComponent', () => {
  let component: ApiStatusComponent;
  let fixture: ComponentFixture<ApiStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApiStatusComponent],
      imports: [CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle isExpanded when toggleDetails is called', () => {
    expect(component.isExpanded).toBeFalse();
    component.toggleDetails();
    expect(component.isExpanded).toBeTrue();
    component.toggleDetails();
    expect(component.isExpanded).toBeFalse();
  });
});
