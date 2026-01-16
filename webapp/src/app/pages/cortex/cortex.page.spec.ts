import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CortexPage } from './cortex.page';

describe('CortexPage', () => {
  let component: CortexPage;
  let fixture: ComponentFixture<CortexPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CortexPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CortexPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
