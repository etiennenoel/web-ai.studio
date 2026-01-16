import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  log(message: string, ...optionalParams: any[]) {
    console.log(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams);
  }

  info(message: string, ...optionalParams: any[]) {
    console.info(message, ...optionalParams);
  }
}
