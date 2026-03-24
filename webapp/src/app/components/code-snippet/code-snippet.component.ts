import { Component, ChangeDetectorRef, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-code-snippet',
  template: `
    <details class="group rounded-xl overflow-hidden mt-6 mb-8 border border-slate-200 dark:border-zinc-800 bg-[#161616] shadow-sm open:bg-[#161616]" (toggle)="onToggle($event)">
      <summary class="block w-full bg-slate-50 dark:bg-[#1e1e1e] border-b border-slate-200 dark:border-zinc-800 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80 m-0">
        <div class="flex justify-between items-center w-full px-4 py-2">
          <div class="flex items-center gap-2.5 h-full">
            <i class="bi bi-chevron-right text-[10px] text-slate-400 dark:text-zinc-500 transition-transform duration-200 group-open:rotate-90 flex-shrink-0"></i>
            <span class="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider translate-y-[0.5px] whitespace-nowrap flex-shrink-0">Interactive Playground</span>
          </div>
          <div class="flex items-center gap-2">
            <button *ngIf="isOpen" (click)="runCode($event)" 
                    class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 transition-colors m-0 flex-shrink-0" 
                    title="Execute Code">
              <i class="bi bi-play-fill text-[14px]"></i>
              Run
            </button>
            <button (click)="copyCode($event)" 
                    class="flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700/50 transition-colors m-0 flex-shrink-0" 
                    title="Copy code">
              <i class="bi text-[13px]" [ngClass]="copied ? 'bi-check2 text-emerald-500 dark:text-emerald-400' : 'bi-clipboard'"></i>
            </button>
          </div>
        </div>
      </summary>
      
      <div class="relative w-full border-b border-slate-200 dark:border-zinc-800" *ngIf="isOpen">
        <app-code-editor [code]="code" (codeChange)="onCodeChange($event)" [readOnly]="false" [height]="editorHeight"></app-code-editor>
      </div>

      <!-- Execution Output -->
      <div *ngIf="executionOutput" class="w-full bg-slate-900 border-t border-zinc-800 p-4 relative">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
          <span>Output</span>
          <button (click)="executionOutput = ''" class="hover:text-slate-300 transition-colors"><i class="bi bi-x-lg"></i></button>
        </div>
        <pre class="text-[12px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{{ executionOutput }}</pre>
      </div>
      </details>
      `,
      standalone: false
      })
      export class CodeSnippetComponent implements OnInit {
      @Input() code: string = '';
      copied = false;
      isOpen = false;
      executionOutput = '';
      editorHeight = '200px';

      constructor(private cdr: ChangeDetectorRef) {}

      ngOnInit() {
      this.calculateHeight();
      }

      onToggle(event: Event) {
      const details = event.target as HTMLDetailsElement;
      this.isOpen = details.open;
      if (this.isOpen) {
      this.calculateHeight();
      }
      }

      onCodeChange(newCode: string) {
      this.code = newCode;
      this.calculateHeight();
      }

      calculateHeight() {
      if (!this.code) return;
      const lines = this.code.split('\n').length;
      // 21px per line (line-height 1.5 of ~14px font) + 50px extra padding
      let h = Math.max(100, lines * 21 + 50);
      this.editorHeight = h + 'px';
      }

  copyCode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(this.code);
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  async runCode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.executionOutput = 'Executing...\\n';
    this.cdr.detectChanges();

    const outputBuffer: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        outputBuffer.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      },
      error: (...args: any[]) => {
        outputBuffer.push('Error: ' + args.join(' '));
      },
      warn: (...args: any[]) => {
        outputBuffer.push('Warning: ' + args.join(' '));
      }
    };

    try {
      // By wrapping the execution in an Immediately Invoked Async Function Expression (IIFE), 
      // we guarantee the browser's native parser evaluates it as an async context, allowing 
      // top-level await. This completely circumvents Angular/TypeScript transpilation bugs 
      // where AsyncFunction constructor gets downleveled to a synchronous Function.
      const wrapperCode = `
        return (async () => {
          const console = customConsole;
          // Map window.ai to global if standard names are nested there (legacy support)
          const LanguageModel = window.LanguageModel || (window.ai ? window.ai.languageModel : undefined);
          const Translator = window.Translator || (window.ai ? window.ai.translator : undefined);
          const LanguageDetector = window.LanguageDetector || (window.ai ? window.ai.languageDetector : undefined);
          const Summarizer = window.Summarizer || (window.ai ? window.ai.summarizer : undefined);
          const Writer = window.Writer || (window.ai ? window.ai.writer : undefined);
          const Rewriter = window.Rewriter || (window.ai ? window.ai.rewriter : undefined);
          
          ${this.code}
        })();
      `;
      
      const fn = new Function('customConsole', wrapperCode);
      await fn(customConsole);
      
      if (outputBuffer.length === 0) {
        outputBuffer.push('Execution completed with no output.');
      }
    } catch (err: any) {
      outputBuffer.push('Exception: ' + (err.message || String(err)));
    }

    this.executionOutput = outputBuffer.join('\\n');
    this.cdr.detectChanges();
  }
}

