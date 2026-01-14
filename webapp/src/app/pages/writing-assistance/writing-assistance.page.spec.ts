import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WritingAssistancePage } from './writing-assistance.page';

describe('WritingAssistancePage', () => {
  let component: WritingAssistancePage;
  let fixture: ComponentFixture<WritingAssistancePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WritingAssistancePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WritingAssistancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
