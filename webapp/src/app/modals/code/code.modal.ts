import {Component, Inject, Input, PLATFORM_ID} from '@angular/core';

@Component({
  selector: 'modal-code',
  standalone: false,
  templateUrl: './code.modal.html',
  styleUrl: './code.modal.scss'
})
export class CodeModal {
  @Input()
  code: string = "";

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {
  }
}
