import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelsComponent } from './models.component';
import { AiModelDataService } from '../../services/ai-model-data.service';
import { ToastService } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ModelsComponent', () => {
  let component: ModelsComponent;
  let fixture: ComponentFixture<ModelsComponent>;
  let toastSpy: jasmine.Spy;

  beforeEach(async () => {
    toastSpy = jasmine.createSpy('show');
    const mockDataService = { getModels: jasmine.createSpy('getModels').and.returnValue(Promise.resolve([{ name: 'TestModel', status: 'available' }])) };

    await TestBed.configureTestingModule({
      declarations: [ModelsComponent],
      providers: [
        { provide: AiModelDataService, useValue: mockDataService },
        { provide: ToastService, useValue: { show: toastSpy } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load models on init', async () => {
    await fixture.whenStable();
    expect(component.models.length).toBe(1);
    expect(component.models[0].name).toBe('TestModel');
  });

  it('should call toast on deleteModel', () => {
    component.deleteModel('TestModel');
    expect(toastSpy).toHaveBeenCalledWith('Deleted TestModel', 'success');
  });
});
