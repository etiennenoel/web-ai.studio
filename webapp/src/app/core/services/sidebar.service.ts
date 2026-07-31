import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

/**
 * Controls the visibility of the navigation sidebar when it is displayed as an
 * off-canvas drawer (small screens). On large screens the sidebar is always
 * visible and this state is ignored.
 */
@Injectable({providedIn: 'root'})
export class SidebarService {
  private readonly isOpenSubject = new BehaviorSubject<boolean>(false);

  readonly isOpen$ = this.isOpenSubject.asObservable();

  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }

  open() {
    this.isOpenSubject.next(true);
  }

  close() {
    this.isOpenSubject.next(false);
  }

  toggle() {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }
}
