import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices-performance',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10 max-w-4xl">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/best-practices" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Best Practices</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Performance</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Performance</h1>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            On-device inference latency scales with input size, and every token you feed the model costs time and compute on the user's hardware. The two highest-leverage optimizations: send less, and don't send the same thing twice.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- 1. Optimize input -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Optimize your input for speed</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> pass only the content the model strictly needs. Strip HTML tags, metadata, and boilerplate before prompting — <code>element.innerText</code> instead of <code>element.innerHTML</code> is the classic example. For large datasets, pre-select the relevant items instead of dumping the whole list.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> send raw markup or unfiltered data. The model wastes time tokenizing angle brackets and attributes that carry no meaning for the task, and latency grows with every extra token.
            </p>
          </div>
          <app-practice-mock
            scenario="input-hygiene"
            doCaption="Send clean text"
            dontCaption="Send raw markup">
          </app-practice-mock>
          <div class="max-w-4xl">
            <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-2">
              The benchmark below builds the same article both ways and summarizes it. Watch the input size printed in the output — the markup version is about twice as large before the model even starts. It runs a discarded warm-up, then three measured samples per side, and only claims a winner when the gap beats the run-to-run spread.
            </p>
          </div>
          <app-practice-comparison
            title="Clean text input vs. raw HTML input"
            metricLabel="summarize() inference time — summarizer creation excluded"
            [doCode]="inputDoCode"
            [dontCode]="inputDontCode">
          </app-practice-comparison>
        </div>

        <!-- 2. Cache results -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Cache results for repeated tasks</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> store results locally (<code>localStorage</code>, <code>sessionStorage</code>, or IndexedDB) keyed by a normalized version of the input — trimmed and lowercased for better hit rates, hashed when inputs are heavy. Use a conservative TTL, and let users force a fresh inference when a cached result isn't satisfying.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> re-run identical inference for a query you've already answered when variability isn't desirable — it wastes the user's battery and makes your UI feel slower than it needs to be.
            </p>
          </div>
          <app-practice-mock
            scenario="cache"
            doCaption="Cache + TTL"
            dontCaption="Re-run every time">
          </app-practice-mock>
          <div class="max-w-4xl">
            <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-2">
              Both sides below answer the same question twice. The cached side pays for inference once and answers the repeat in under a millisecond.
            </p>
          </div>
          <app-practice-comparison
            title="Cached repeat query vs. re-running inference"
            metricLabel="Time to answer the question twice — session setup excluded"
            [doCode]="cacheDoCode"
            [dontCode]="cacheDontCode">
          </app-practice-comparison>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/best-practices/session-management" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Session Management</span>
          </a>
          <a routerLink="/best-practices/streaming" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Streaming &amp; Rendering</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class PerformancePage {
  inputDoCode = `// A realistically sized article — one section repeated to article length.
const article = document.createElement('article');
article.innerHTML = Array.from({ length: 6 }, (_, i) => \`
  <section class="prose-block" data-analytics-id="sec-\${i}" data-track="impression">
    <h2 class="title xl:text-3xl font-extrabold tracking-tight">On-device AI, part \${i + 1}</h2>
    <p class="lead text-slate-600" data-testid="lead-\${i}">Built-in AI APIs let websites run
    inference locally: no API keys, no server round-trips, and user data never
    leaves the device.</p>
    <p class="body" style="margin:0 0 16px 0;line-height:1.6">The Summarizer, Writer and
    Rewriter APIs share one lifecycle — availability, create, inference — so the code you
    write for one transfers directly to the others.</p>
    <p><a class="link underline" href="/docs?utm_source=x&utm_campaign=y">Read the guide</a>
    for hardware requirements and download tracking.</p>
  </section>\`).join('');

const cleanText = article.innerText; // markup stripped
console.log(\`Input size: \${cleanText.length} characters\`);

const summarizer = await Summarizer.create({ type: 'tldr', length: 'short' });

// Timed region: summarize() only. Creating the summarizer is identical on
// both sides, so including it would just add shared noise.
const start = performance.now();
console.log(await summarizer.summarize(cleanText));
const inference = performance.now() - start;
console.log(\`Inference: \${inference.toFixed(0)} ms\`);
reportTiming(inference);
summarizer.destroy();`;

  inputDontCode = `// Identical article — but the raw markup is handed to the model.
const article = document.createElement('article');
article.innerHTML = Array.from({ length: 6 }, (_, i) => \`
  <section class="prose-block" data-analytics-id="sec-\${i}" data-track="impression">
    <h2 class="title xl:text-3xl font-extrabold tracking-tight">On-device AI, part \${i + 1}</h2>
    <p class="lead text-slate-600" data-testid="lead-\${i}">Built-in AI APIs let websites run
    inference locally: no API keys, no server round-trips, and user data never
    leaves the device.</p>
    <p class="body" style="margin:0 0 16px 0;line-height:1.6">The Summarizer, Writer and
    Rewriter APIs share one lifecycle — availability, create, inference — so the code you
    write for one transfers directly to the others.</p>
    <p><a class="link underline" href="/docs?utm_source=x&utm_campaign=y">Read the guide</a>
    for hardware requirements and download tracking.</p>
  </section>\`).join('');

const dirtyText = article.innerHTML; // markup included
console.log(\`Input size: \${dirtyText.length} characters\`);

const summarizer = await Summarizer.create({ type: 'tldr', length: 'short' });

// Same timed region as the "do" side: summarize() only.
const start = performance.now();
console.log(await summarizer.summarize(dirtyText));
const inference = performance.now() - start;
console.log(\`Inference: \${inference.toFixed(0)} ms\`);
reportTiming(inference);
summarizer.destroy();`;

  cacheDoCode = `const TTL_MS = 60 * 60 * 1000; // 1 hour

async function getAiResponse(session, userInput, forceRefresh = false) {
  const cacheKey = 'ai_results_' + userInput.trim().toLowerCase();

  if (!forceRefresh) {
    const itemStr = sessionStorage.getItem(cacheKey);
    if (itemStr) {
      const item = JSON.parse(itemStr);
      if (Date.now() < item.expiry) return { value: item.value, cached: true };
      sessionStorage.removeItem(cacheKey);
    }
  }

  const value = await session.prompt(userInput);
  sessionStorage.setItem(cacheKey, JSON.stringify({ value, expiry: Date.now() + TTL_MS }));
  return { value, cached: false };
}

const session = await LanguageModel.create();
const question = 'In one sentence, what is WebGPU?';

// Note: the cache lives in sessionStorage, so if you re-run this snippet
// BOTH attempts will be cache hits. Pass forceRefresh = true to bypass.
const totalStart = performance.now(); // timed region: the two asks, not setup
for (const attempt of [1, 2]) {
  const start = performance.now();
  const { value, cached } = await getAiResponse(session, question);
  console.log(\`Attempt \${attempt} (\${cached ? 'cache hit' : 'inference'}): \` +
              \`\${(performance.now() - start).toFixed(1)} ms\`);
  console.log(value);
}
reportTiming(performance.now() - totalStart);
session.destroy();`;

  cacheDontCode = `// Same question asked twice, full inference both times.
const session = await LanguageModel.create();
const question = 'In one sentence, what is WebGPU?';

const totalStart = performance.now(); // same timed region as the "do" side
for (const attempt of [1, 2]) {
  const start = performance.now();
  const value = await session.prompt(question);
  console.log(\`Attempt \${attempt} (inference): \` +
              \`\${(performance.now() - start).toFixed(1)} ms\`);
  console.log(value);
}
reportTiming(performance.now() - totalStart);
session.destroy();`;
}
