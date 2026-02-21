import {
  Component,
  Input,
  ElementRef,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-markdown-renderer',
  templateUrl: './markdown-renderer.component.html',
  styleUrls: ['./markdown-renderer.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent implements OnChanges, AfterViewInit {
  @Input() content: string = '';
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] && this.container) {
      this.updateContent();
    }
  }

  ngAfterViewInit(): void {
    this.updateContent();
  }

  private async updateContent() {
    if (!this.container || !this.container.nativeElement) return;
    
    // Configure marked to inject a copy button for code blocks
    const renderer = new marked.Renderer();
    renderer.code = (obj: any): string => {
      const code = obj.text;
      const language = obj.lang;
      // Create the standard pre/code block
      const validLanguage = language ? `language-${language}` : '';
      const codeHtml = `<pre><code class="${validLanguage}">${code}</code></pre>`;
      
      // Inject our wrapper with the copy button
      return `
        <div class="code-block-wrapper">
          ${codeHtml}
          <button class="btn btn-sm btn-icon copy-btn rounded-circle" 
                  aria-label="Copy code" 
                  title="Copy to clipboard"
                  data-code="${encodeURIComponent(code)}">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      `;
    };

    marked.setOptions({ renderer });

    // Parse markdown to HTML string
    const rawHtml = await marked.parse(this.content || '');
    
    // Sanitize the HTML
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr', 'br', 'table',
        'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'button'
      ],
      ALLOWED_ATTR: ['href', 'class', 'target', 'rel', 'data-code', 'aria-label', 'title']
    });

    // Write to a temporary template element to create a DOM tree
    const template = document.createElement('template');
    template.innerHTML = cleanHtml;
    
    this.diffNodes(template.content, this.container.nativeElement);
  }

  private diffNodes(newParent: Node, oldParent: Node) {
    const newNodes = Array.from(newParent.childNodes);
    
    let i = 0;
    while (i < newNodes.length) {
      const newNode = newNodes[i];
      const oldNode = oldParent.childNodes[i];

      if (!oldNode) {
        // Append new nodes that don't exist yet
        oldParent.appendChild(newNode.cloneNode(true));
      } else if (newNode.nodeType === oldNode.nodeType && newNode.nodeName === oldNode.nodeName) {
        if (newNode.nodeType === Node.ELEMENT_NODE) {
          const newEl = newNode as Element;
          const oldEl = oldNode as Element;
          
          if (!newNode.isEqualNode(oldNode)) {
            // Sync attributes
            const newAttrs = newEl.attributes;
            const oldAttrs = oldEl.attributes;
            
            for (let j = oldAttrs.length - 1; j >= 0; j--) {
              const name = oldAttrs[j].name;
              if (!newEl.hasAttribute(name)) {
                oldEl.removeAttribute(name);
              }
            }
            for (let j = 0; j < newAttrs.length; j++) {
              const name = newAttrs[j].name;
              const value = newAttrs[j].value;
              
              // Special case: Preserve dynamic state classes on the copy button
              if (name === 'class' && oldEl.classList.contains('copy-btn')) {
                // Only update the data-code attribute, leave classes alone so the animation isn't interrupted
                continue;
              }

              if (oldEl.getAttribute(name) !== value) {
                oldEl.setAttribute(name, value);
              }
            }
            
            // Recurse
            this.diffNodes(newNode, oldNode);
          }
        } else if (newNode.nodeType === Node.TEXT_NODE) {
          if (newNode.nodeValue !== oldNode.nodeValue) {
            oldNode.nodeValue = newNode.nodeValue;
          }
        } else {
          if (!newNode.isEqualNode(oldNode)) {
             // Exception: Don't replace the icon if it's currently showing a success state
             if (oldNode.nodeType === Node.ELEMENT_NODE && (oldNode as Element).tagName.toLowerCase() === 'i' && oldParent.nodeType === Node.ELEMENT_NODE && (oldParent as Element).classList.contains('copy-btn')) {
                // Do nothing, let the timeout restore it
             } else {
                oldParent.replaceChild(newNode.cloneNode(true), oldNode);
             }
          }
        }
      } else {
        // Different tag or type, replace entirely
        oldParent.replaceChild(newNode.cloneNode(true), oldNode);
      }
      i++;
    }

    // Remove any trailing nodes in the container that are no longer in the new content
    while (oldParent.childNodes.length > newNodes.length) {
      oldParent.removeChild(oldParent.lastChild!);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const btn = target.closest('.copy-btn') as HTMLButtonElement | null;
    if (!btn) return;

    const codeToCopy = btn.getAttribute('data-code');
    if (codeToCopy) {
      navigator.clipboard.writeText(decodeURIComponent(codeToCopy)).then(() => {
        // Visual feedback
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.remove('bi-clipboard');
          icon.classList.add('bi-check2');
          btn.classList.add('btn-success');
          
          setTimeout(() => {
            icon.classList.remove('bi-check2');
            icon.classList.add('bi-clipboard');
            btn.classList.remove('btn-success');
          }, 3500);
        }
      });
    }
  }
}
