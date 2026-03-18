import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { AxonTestSuiteExecutor } from './axon/axon-test-suite.executor';

import { CortexPage } from './cortex.page';

describe('CortexPage', () => {
  let component: CortexPage;
  let fixture: ComponentFixture<CortexPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CortexPage],
      imports: [RouterTestingModule],
      providers: [
        { 
          provide: AxonTestSuiteExecutor, 
          useValue: { 
            results: { status: 0 }, 
            preTestsStatus: 0, 
            testsSuite: [], 
            testIdMap: {} 
          } 
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CortexPage);
    component = fixture.componentInstance;
    component.isExtensionInstalled = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

