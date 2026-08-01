import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices-streaming',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10 max-w-4xl">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/best-practices" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Best Practices</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Streaming &amp; Rendering</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Streaming &amp; Rendering</h1>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Streaming makes long generations feel fast — the user sees tokens the moment they exist instead of staring at a spinner. But rendering a stream is also where security mistakes happen: model output is untrusted content, and malicious markup can be split across chunks.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- 1. Streaming for perceived speed -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Stream long content for perceived speed</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              For summaries, chat, and any longer generation, use the streaming variants (<code>promptStreaming()</code>, <code>summarizeStreaming()</code>, …). The total generation time is the same, but the user starts reading at the <em>first token</em> instead of the last one.
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-2">
              Both sides below generate the same content, and the timing bars compare the <strong>time to first output</strong> — the moment your UI stops feeling frozen. (Overall wall-clock time is similar on both sides; perceived latency is what differs.)
            </p>
          </div>
          <app-practice-mock
            scenario="streaming"
            doCaption="Stream tokens"
            dontCaption="Wait for everything">
          </app-practice-mock>
          <app-practice-comparison
            title="Streaming vs. waiting for the full response"
            metricLabel="Time to first visible output"
            doLabel="Stream"
            dontLabel="Block"
            [doCode]="streamDoCode"
            [dontCode]="streamDontCode">
          </app-practice-comparison>
        </div>

        <!-- 2. Render safely -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Render streaming responses safely</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> treat all LLM output as untrusted. Sanitize the <em>full combined output</em> on every update — not individual chunks, because malicious markup can be split across chunk boundaries. Use the built-in <a href="https://developer.mozilla.org/docs/Web/API/HTML_Sanitizer_API" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">Sanitizer API</a> (with DOMPurify as a fallback), and a streaming Markdown parser such as <a href="https://github.com/thetarnav/streaming-markdown" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">streaming-markdown</a> so you're not re-parsing the whole document on every token.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> assign the accumulated text to <code>innerHTML</code> on every chunk. It's an injection vector, and re-parsing the entire document per chunk is slow.
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-2">
              The demo below simulates a model response whose malicious payload is <em>split across two chunks</em> — each chunk looks harmless on its own. The safe side sanitizes the combined output; the unsafe side shows the injected markup landing in the DOM.
            </p>
          </div>
          <app-practice-comparison
            title="Sanitized combined output vs. innerHTML per chunk"
            [timed]="false"
            doLabel="Sanitize"
            dontLabel="innerHTML"
            [doCode]="sanitizeDoCode"
            [dontCode]="sanitizeDontCode">
          </app-practice-comparison>

          <div class="max-w-4xl">
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2 mt-8">Production pattern</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              In a real app, combine a streaming Markdown parser with sanitization of the combined fragment before it reaches the live DOM:
            </p>
            <app-code-snippet [code]="productionPatternCode" [runnable]="false" [expanded]="true"></app-code-snippet>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/best-practices/performance" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Performance</span>
          </a>
          <a routerLink="/best-practices/structured-output" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Structured Output</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class StreamingPage {
  streamDoCode = `const session = await LanguageModel.create();
const start = performance.now();
let firstTokenAt = null;
let fullResponse = '';

const stream = session.promptStreaming(
  'List three benefits of running AI models on-device. Keep it brief.'
);
for await (const chunk of stream) {
  if (firstTokenAt === null) {
    firstTokenAt = performance.now() - start;
    console.log(\`First output visible after \${firstTokenAt.toFixed(0)} ms — the user is already reading.\`);
    reportTiming(firstTokenAt); // the bar compares time-to-first-output
  }
  fullResponse += chunk;
}

console.log(\`Full response after \${(performance.now() - start).toFixed(0)} ms:\`);
console.log(fullResponse);
session.destroy();`;

  streamDontCode = `const session = await LanguageModel.create();
const start = performance.now();

// Nothing to show until the very last token is generated.
const fullResponse = await session.prompt(
  'List three benefits of running AI models on-device. Keep it brief.'
);

const elapsed = performance.now() - start;
console.log(\`First output visible after \${elapsed.toFixed(0)} ms — the user stared at a spinner the whole time.\`);
reportTiming(elapsed); // the bar compares time-to-first-output
console.log(fullResponse);
session.destroy();`;

  sanitizeDoCode = `// Payload split across chunks: each chunk alone looks harmless.
const chunks = ['Great point! <img src=x one', 'rror="window.__pwned = true">Thanks!'];
delete window.__pwned;

const container = document.createElement('div');
let combined = '';

for (const chunk of chunks) {
  combined += chunk;
  // Always sanitize the FULL combined output, never chunk-by-chunk.
  if (container.setHTML) {
    container.setHTML(combined); // built-in Sanitizer API
  } else {
    container.textContent = combined; // conservative fallback (or DOMPurify)
  }
}

// Give a would-be injected onerror handler time to fire.
await new Promise(r => setTimeout(r, 300));
console.log('Rendered DOM:', container.innerHTML);
console.log('Injected code executed:', window.__pwned === true);`;

  sanitizeDontCode = `// Payload split across chunks: each chunk alone looks harmless.
const chunks = ['Great point! <img src=x one', 'rror="window.__pwned = true">Thanks!'];
delete window.__pwned;

const container = document.createElement('div');
let combined = '';

for (const chunk of chunks) {
  combined += chunk;
  // Re-parses the whole document every chunk AND executes injected markup.
  container.innerHTML = combined;
}

// The broken image's attacker-controlled onerror fires asynchronously.
await new Promise(r => setTimeout(r, 300));
console.log('Rendered DOM:', container.innerHTML);
console.log('Injected code executed:', window.__pwned === true);`;

  productionPatternCode = `import * as smd from 'streaming-markdown';

const sanitizer = new Sanitizer({
  allowElements: ['p', 'br', 'strong', 'em', 'a', 'img', 'figure', 'figcaption'],
  allowAttributes: { 'src': ['img'], 'loading': ['img'], 'href': ['a'] },
});

// Parse into an off-DOM buffer, sanitize the combined result, then swap it in.
const buffer = new DocumentFragment();
const parser = smd.parser_new(buffer);

for await (const chunk of session.promptStreaming(userQuery)) {
  smd.parser_write(parser, chunk);
  const clean = sanitizer.sanitize(buffer.cloneNode(true));
  container.replaceChildren(clean);
}`;
}
