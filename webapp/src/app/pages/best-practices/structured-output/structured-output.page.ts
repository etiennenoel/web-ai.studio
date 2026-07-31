import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices-structured-output',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10 max-w-4xl">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/best-practices" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Best Practices</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Structured Output</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Structured Output</h1>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            When your code — not a human — consumes the model's answer, you need a guaranteed shape. The Prompt API's <code>responseConstraint</code> option enforces a JSON Schema at generation time, which beats any amount of prompt engineering.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- 1. responseConstraint -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Use a schema, not polite requests</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> pass a JSON Schema via <code>responseConstraint</code>. The output is guaranteed to match, so <code>JSON.parse()</code> always succeeds and no post-processing is needed.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> rely on natural-language instructions like "reply with only JSON". Models add conversational filler ("Sure! Here's your JSON:") or Markdown fences, and your parser breaks in production on exactly the input you didn't test.
            </p>
          </div>
          <app-practice-comparison
            title="responseConstraint schema vs. 'please output JSON'"
            doLabel="Schema"
            dontLabel="Prose"
            [doCode]="schemaDoCode"
            [dontCode]="schemaDontCode">
          </app-practice-comparison>
        </div>

        <!-- 2. Length constraints -->
        <div class="mb-16">
          <div class="max-w-4xl">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Decouple generation from length constraints</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <strong class="text-emerald-600 dark:text-emerald-400">Do:</strong> let the model generate naturally, then fit the result to your UI with client-side logic — CSS <code>text-overflow: ellipsis</code>, or a JS truncation with a "show more" affordance.
            </p>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
              <strong class="text-red-600 dark:text-red-400">Don't:</strong> enforce strict character limits in the prompt or schema (<code>maxLength</code>). When a response would exceed the limit, models squeeze meaning into high-density tokens — switching to emoji or other languages — and produce nonsense.
            </p>
          </div>
          <app-practice-comparison
            title="Generate freely + truncate in UI vs. 'exactly 40 characters'"
            doLabel="Truncate"
            dontLabel="Constrain"
            [doCode]="lengthDoCode"
            [dontCode]="lengthDontCode">
          </app-practice-comparison>

          <div class="max-w-4xl">
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2 mt-8">The CSS that replaces the prompt constraint</h3>
            <app-code-snippet [code]="cssCode" [runnable]="false" [expanded]="true"></app-code-snippet>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/best-practices/streaming" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Streaming &amp; Rendering</span>
          </a>
          <a routerLink="/best-practices/user-experience" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">UX Patterns</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class StructuredOutputPage {
  schemaDoCode = `const session = await LanguageModel.create();

const schema = {
  type: 'object',
  properties: {
    isTopicCats: { type: 'boolean' },
    confidence: { type: 'number' },
  },
  required: ['isTopicCats'],
};

const post = 'My tabby knocked the router off the shelf again. No wifi, but look at him.';
const result = await session.prompt(\`Is this post about cats?\\n\\n\${post}\`, {
  responseConstraint: schema,
});

console.log('Raw output:', result);
const parsed = JSON.parse(result); // guaranteed to parse
console.log('isTopicCats =', parsed.isTopicCats);
session.destroy();`;

  schemaDontCode = `const session = await LanguageModel.create();

const post = 'My tabby knocked the router off the shelf again. No wifi, but look at him.';
const result = await session.prompt(
  'Is this post about cats? Respond ONLY with JSON like ' +
  '{"isTopicCats": true}. No other text.\\n\\n' + post
);

console.log('Raw output:', result);
try {
  const parsed = JSON.parse(result);
  console.log('isTopicCats =', parsed.isTopicCats);
} catch (e) {
  console.log('JSON.parse failed — the model added filler or fences: ' + e.message);
}
session.destroy();`;

  lengthDoCode = `const session = await LanguageModel.create();

// Let the model write naturally...
const bio = await session.prompt(
  'Write a one-sentence bio for a developer who builds on-device AI for the web.'
);
console.log('Generated:', bio);

// ...and fit it to the UI in code, where truncation is deterministic.
const truncated = bio.length > 40 ? bio.slice(0, 39).trimEnd() + '…' : bio;
console.log('Shown in the 40-char UI slot:', truncated);
session.destroy();`;

  lengthDontCode = `const session = await LanguageModel.create();

// Forcing the length constraint onto the model itself.
const bio = await session.prompt(
  'Write a bio for a developer who builds on-device AI for the web. ' +
  'It must be EXACTLY 40 characters. Never exceed 40 characters.'
);

console.log(\`Generated (\${bio.length} chars):\`, bio);
console.log('Models often meet hard limits with emoji, dropped words, or ' +
            'high-density tokens from other languages.');
session.destroy();`;

  cssCode = `.result {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}`;
}
