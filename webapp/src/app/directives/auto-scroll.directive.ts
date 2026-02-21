import { Directive, ElementRef, AfterViewChecked } from '@angular/core';

@Directive({
  selector: '[autoScroll]',
  standalone: false, // Add this if you're using standalone components
})
export class AutoScrollDirective implements AfterViewChecked {
  private previousScrollHeight = 0;


  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewChecked(): void {
    const element = this.el.nativeElement;

    // Use previousScrollHeight to check if the user was at the bottom BEFORE the content changed.
    // Since ngAfterViewChecked runs after DOM updates, element.scrollHeight already reflects the new height.
    const isAtBottom = this.previousScrollHeight === 0 || 
                       (this.previousScrollHeight - element.scrollTop <= element.clientHeight + 15);

    if (this.previousScrollHeight !== element.scrollHeight) {
      // If the scroll height has changed and we were at the bottom, scroll down to the bottom
      if (isAtBottom) {
        element.scrollTop = element.scrollHeight;
      }
      // Store the current scroll height for the next check
      this.previousScrollHeight = element.scrollHeight;
    }
  }
}
