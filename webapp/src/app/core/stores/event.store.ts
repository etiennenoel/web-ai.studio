import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventStore {
  updateFramingAlgorithm = new Subject<void>();
}
