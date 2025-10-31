import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AxonPage } from './axon.page';

describe('AxonPage', () => {
  let component: AxonPage;
  let fixture: ComponentFixture<AxonPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AxonPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AxonPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
