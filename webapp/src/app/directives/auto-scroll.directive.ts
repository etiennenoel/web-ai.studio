import { Directive, ElementRef, AfterViewChecked } from '@angular/core';

@Directive({
  selector: '[autoScroll]',
  standalone: false, // Add this if you're using standalone components
})
export class AutoScrollDirective implements AfterViewChecked {
  private previousScrollHeight = 0;
  private shouldScrollDown = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewChecked(): void {
    const element = this.el.nativeElement;

    // Check if we should scroll down before the DOM update
    // We check this before the scrollHeight has a chance to change
    this.shouldScrollDown =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10; // 10px tolerance

    //console.log(`Scrolling properties: previousScrollHeight:${this.previousScrollHeight}, scrollHeight:${element.scrollHeight}, scrollTop:${element.scrollTop}, clientHeight:${element.clientHeight}`)

    // If the scroll height has changed and we were at the bottom, scroll down
    //if (this.shouldScrollDown && this.previousScrollHeight !== element.scrollHeight) {
      element.scrollTop = element.scrollHeight;
    //}

    // Store the current scroll height for the next check
    this.previousScrollHeight = element.scrollHeight;
  }
}
