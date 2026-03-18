import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirstCreateShouldFullyLoadTheModelPage } from './first-create-should-fully-load-the-model.page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

describe('FirstCreateShouldFullyLoadTheModelPage', () => {
  let component: FirstCreateShouldFullyLoadTheModelPage;
  let fixture: ComponentFixture<FirstCreateShouldFullyLoadTheModelPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FirstCreateShouldFullyLoadTheModelPage ],
      providers: [
        Title,
        { provide: DOCUMENT, useValue: document }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FirstCreateShouldFullyLoadTheModelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset results', () => {
    component.results[0].status = 'done';
    component.resetResults();
    expect(component.results[0].status).toBe('pending');
  });
});
