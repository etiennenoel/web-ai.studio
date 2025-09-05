import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslationPage } from './translation.page';

describe('TranslationPage', () => {
  let component: TranslationPage;
  let fixture: ComponentFixture<TranslationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TranslationPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranslationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
