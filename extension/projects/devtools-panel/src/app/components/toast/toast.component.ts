import { Component } from '@angular/core';
import { ToastService, ToastMessage } from 'base';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  template: `
    <div *ngIf="toast$ | async as toast" 
         class="absolute top-4 right-4 bg-[#323232] border border-l-4 text-white px-4 py-3 rounded shadow-lg transform transition-all duration-300 z-50 flex items-center gap-3"
         [ngClass]="{
           'border-red-500': toast.type === 'error',
           'border-green-500': toast.type === 'success',
           'border-blue-500': toast.type === 'info'
         }">
      <i class="fa-solid" [ngClass]="{
           'fa-circle-exclamation text-red-400': toast.type === 'error',
           'fa-circle-check text-green-400': toast.type === 'success',
           'fa-circle-info text-blue-400': toast.type === 'info'
         }"></i>
      <span id="toast-msg">{{ toast.message }}</span>
    </div>
  `,
  standalone: false
})
export class ToastComponent {
  toast$: Observable<ToastMessage | null>;

  constructor(private toastService: ToastService) {
    this.toast$ = this.toastService.toast$;
  }
}