import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) {
    console.log(`[Mock Toast] ${type}: ${message}`);
  }
}
