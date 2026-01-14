import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AxonTestStatusBadgeComponent } from './axon-test-status-badge.component';

describe('AxonTestStatusBadgeComponent', () => {
  let component: AxonTestStatusBadgeComponent;
  let fixture: ComponentFixture<AxonTestStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AxonTestStatusBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AxonTestStatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
