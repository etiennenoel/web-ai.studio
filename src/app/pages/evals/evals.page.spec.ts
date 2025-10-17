import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvalsPage } from './evals.page';

describe('EvalsPage', () => {
  let component: EvalsPage;
  let fixture: ComponentFixture<EvalsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvalsPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
