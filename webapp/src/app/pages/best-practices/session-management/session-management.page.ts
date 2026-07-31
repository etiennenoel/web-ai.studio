import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices-session-management',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10 max-w-4xl">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/best-practices" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Best Practices</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Session Management</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Session Management</h1>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Creating a session is the most expensive step of using a built-in AI API — the browser may need to load model weights into memory before your first inference can run. When and how you create, reuse, and destroy sessions determines whether your feature feels instant or sluggish.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- 1. Pre-warm -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Prepare the model at a reasonable time</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> initialize the session as soon as you've clearly established the user's intention to use the AI feature — a hover, a focus, opening the panel that contains it. The model loads in the background while the user is still setting up their task, so the first inference has no cold start.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> wait for the "Generate" click to call <code>create()</code>. The user pays the model-loading cost right when they expect a result.
            </p>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-2">
              <i class="bi bi-exclamation-triangle text-amber-600 dark:text-amber-400 mt-0.5"></i>
              <p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed m-0">
                For the Prompt API, have your <code>initialPrompts</code> ready before calling <code>create()</code> — they can only be configured at session creation.
              </p>
            </div>
          </div>
          <app-practice-mock
            scenario="prewarm"
            doCaption="Pre-warm on intent"
            dontCaption="Create on click">
          </app-practice-mock>
          <div class="max-w-4xl">
            <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-2">
              Now run it for real. The "Do" side simulates pre-warming: the session is created first (that cost happens on hover, before the click), so only the inference is on the user's critical path. The "Don't" side pays for everything after the click. Tip: run it twice — the first run also includes true cold-start loading.
            </p>
          </div>
          <app-practice-comparison
            title="Pre-warm on intent vs. cold start on click"
            [doCode]="prewarmDoCode"
            [dontCode]="prewarmDontCode">
          </app-practice-comparison>
        </div>

        <!-- 2. Initial prompts -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Set initial prompts during session creation</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> supply your system instructions in <code>initialPrompts</code> when creating the session. The model processes them ahead of time, which makes the first user-facing prompt faster.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> start with an empty session and stuff the instructions into the first <code>prompt()</code> call — the user waits while the model parses instructions that could have been pre-processed.
            </p>
          </div>
          <app-practice-comparison
            title="initialPrompts at create() vs. instructions in the first prompt"
            [doCode]="initialPromptsDoCode"
            [dontCode]="initialPromptsDontCode">
          </app-practice-comparison>
        </div>

        <!-- 3. Clone sessions -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Clone sessions for repetitive tasks</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              Prompt API sessions accumulate conversation context. For repeated, independent tasks, keep one <em>base session</em> that contains only your system instructions, then <code>clone()</code> it for each task. Clones inherit the pre-processed instructions without the history of unrelated work.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> reuse one session for unrelated tasks (context bleeds between them), and don't call <code>create()</code> again with identical instructions for every task.
            </p>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 mb-2">
              <i class="bi bi-info-circle text-sky-600 dark:text-sky-400 mt-0.5"></i>
              <p class="text-xs text-sky-800 dark:text-sky-300 leading-relaxed m-0">
                Writer, Rewriter, and Summarizer don't retain context between calls — a single instance is fine for multiple unrelated tasks there.
              </p>
            </div>
          </div>
          <app-practice-mock
            scenario="clone"
            doCaption="clone() the base session"
            dontCaption="create() every time">
          </app-practice-mock>
          <app-practice-comparison
            title="clone() a base session vs. create() per task"
            [doCode]="cloneDoCode"
            [dontCode]="cloneDontCode">
          </app-practice-comparison>
        </div>

        <!-- 4. Destroy -->
        <div class="mb-16 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Destroy sessions you no longer need</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
            Each active session holds memory. Even though sessions are garbage collected eventually, explicitly calling <code>destroy()</code> frees resources deterministically. When you use the clone pattern, keep the base session alive and destroy the clones once their task completes.
          </p>
          <app-code-snippet [code]="destroyCode"></app-code-snippet>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/best-practices" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Best Practices Home</span>
          </a>
          <a routerLink="/best-practices/performance" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Performance</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class SessionManagementPage {
  prewarmDoCode = `// Pre-warm: create() runs on user intent (hover/focus),
// BEFORE the user clicks "Generate".
const session = await LanguageModel.create();

// ...user finishes setting up their task, then clicks.
// Only the inference is on the critical path:
const start = performance.now();
const result = await session.prompt(
  'Suggest one catchy title for a blog post about on-device AI.'
);
const wait = performance.now() - start;
console.log(\`User-perceived wait: \${wait.toFixed(0)} ms\`);
console.log(result);
reportTiming(wait); // feeds the comparison bar below
session.destroy();`;

  prewarmDontCode = `// Cold start: nothing happens until the user clicks "Generate".
const start = performance.now();

const session = await LanguageModel.create(); // user is already waiting...
const result = await session.prompt(
  'Suggest one catchy title for a blog post about on-device AI.'
);

const wait = performance.now() - start;
console.log(\`User-perceived wait: \${wait.toFixed(0)} ms\`);
console.log(result);
reportTiming(wait); // feeds the comparison bar below
session.destroy();`;

  initialPromptsDoCode = `// System instructions are pre-processed at creation time.
const session = await LanguageModel.create({
  initialPrompts: [{
    role: 'system',
    content: 'You are a helpful assistant specialized in code reviews. ' +
             'Answer with a single short paragraph.',
  }],
});

const start = performance.now();
const review = await session.prompt(
  'Review this code: const adults = users.filter(u => u.age > 18);'
);
const firstPromptMs = performance.now() - start;
console.log(\`First prompt: \${firstPromptMs.toFixed(0)} ms\`);
console.log(review);
reportTiming(firstPromptMs); // feeds the comparison bar below
session.destroy();`;

  initialPromptsDontCode = `// Empty session: instructions travel with the first prompt,
// so the user waits while they are parsed.
const session = await LanguageModel.create();

const start = performance.now();
const review = await session.prompt(
  'You are a helpful assistant specialized in code reviews. ' +
  'Answer with a single short paragraph.\\n\\n' +
  'Review this code: const adults = users.filter(u => u.age > 18);'
);
const firstPromptMs = performance.now() - start;
console.log(\`First prompt: \${firstPromptMs.toFixed(0)} ms\`);
console.log(review);
reportTiming(firstPromptMs); // feeds the comparison bar below
session.destroy();`;

  cloneDoCode = `// One base session holds the instructions...
const baseSession = await LanguageModel.create({
  initialPrompts: [{
    role: 'system',
    content: 'You are a technical editor. Reply in one short sentence.',
  }],
});

// ...and each task gets a fresh clone: no re-parsing, no stale context.
const start = performance.now();
for (const draft of ['AI are changing the web.', 'Models runs locally now.']) {
  const task = await baseSession.clone();
  console.log(await task.prompt(\`Fix the grammar: "\${draft}"\`));
  task.destroy();
}
console.log(\`Both tasks: \${(performance.now() - start).toFixed(0)} ms\`);
baseSession.destroy();`;

  cloneDontCode = `// A brand new session — and identical instructions — for every task.
const start = performance.now();
for (const draft of ['AI are changing the web.', 'Models runs locally now.']) {
  const session = await LanguageModel.create({
    initialPrompts: [{
      role: 'system',
      content: 'You are a technical editor. Reply in one short sentence.',
    }],
  });
  console.log(await session.prompt(\`Fix the grammar: "\${draft}"\`));
  session.destroy();
}
console.log(\`Both tasks: \${(performance.now() - start).toFixed(0)} ms\`);`;

  destroyCode = `const baseSession = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'Reply in five words or fewer.' }],
});

const clone = await baseSession.clone();
const response = await clone.prompt('Say hello to WebAI Studio.');
console.log(response);

// The clone did its one job: free its memory immediately.
clone.destroy();

// Keep the base session only if more tasks are coming; otherwise:
baseSession.destroy();
console.log('Sessions destroyed — memory released.');`;
}
