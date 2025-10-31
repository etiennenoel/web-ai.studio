import { Component } from '@angular/core';
import {AxonTestSuiteExecutor} from './axon-test-suite.executor';
import {TestStatus} from '../../../enums/test-status.enum';

@Component({
  selector: 'page-axon',
  standalone: false,
  templateUrl: './axon.page.html',
  styleUrl: './axon.page.scss'
})
export class AxonPage {
  constructor(protected readonly axonTestSuiteExecutor: AxonTestSuiteExecutor,) {
  }

  async start() {
    await this.axonTestSuiteExecutor.start();
  }

  protected readonly TestStatus = TestStatus;
}

