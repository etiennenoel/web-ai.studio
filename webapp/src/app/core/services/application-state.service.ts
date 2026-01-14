import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApplicationStateService {
  private _currentUser = new BehaviorSubject<any>(null);
  public currentUser$ = this._currentUser.asObservable();

  setCurrentUser(user: any) {
    this._currentUser.next(user);
  }
}
