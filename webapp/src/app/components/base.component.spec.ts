import { Component, Inject } from '@angular/core';
import { BaseComponent } from './base.component';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-test-base',
  template: '',
  standalone: false
})
class TestBaseComponent extends BaseComponent {
  constructor(@Inject(DOCUMENT) document: Document) {
    super(document);
  }

  addSubscription(sub: Subscription) {
    this.subscriptions.push(sub);
  }
}

describe('BaseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestBaseComponent],
      providers: [
        { provide: DOCUMENT, useValue: document }
      ]
    }).compileComponents();
  });

  it('should unsubscribe from all subscriptions on destroy', () => {
    const fixture = TestBed.createComponent(TestBaseComponent);
    const component = fixture.componentInstance;
    
    const mockSubscription = new Subscription();
    const unsubscribeSpy = spyOn(mockSubscription, 'unsubscribe');
    
    component.addSubscription(mockSubscription);
    
    component.ngOnDestroy();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
