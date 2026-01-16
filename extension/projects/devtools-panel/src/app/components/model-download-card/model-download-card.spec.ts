import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelDownloadCard } from './model-download-card';

describe('ModelDownloadCard', () => {
  let component: ModelDownloadCard;
  let fixture: ComponentFixture<ModelDownloadCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModelDownloadCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModelDownloadCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
