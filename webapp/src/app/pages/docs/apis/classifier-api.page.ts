import { Component } from '@angular/core';

@Component({
  selector: 'app-classifier-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="!no-underline hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Classifier API</span>
          </nav>

          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Classifier API
                </h1>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 uppercase tracking-wider border border-amber-200 dark:border-amber-500/30">
                  Dev Trial
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 mt-4 md:mt-0">
              <a href="https://github.com/michaelwasserman/classifier-api" target="_blank" rel="noopener noreferrer" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> Explainer
              </a>
              <a href="https://github.com/explainers-by-googlers/classifier-api/issues" target="_blank" rel="noopener noreferrer" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-bug"></i> File an issue
              </a>
              <a routerLink="/playgrounds/classifier" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors border border-indigo-600 flex items-center gap-2">
                <i class="bi bi-play-circle"></i> Playground
              </a>
            </div>
          </div>

          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Classifier API (<code class="text-sm font-mono text-indigo-600 dark:text-indigo-400">window.Classifier</code>) evaluates input text against a caller-defined schema of structured questions (<code class="text-sm font-mono">binary</code>, <code class="text-sm font-mono">categorical</code>, and <code class="text-sm font-mono">ordinal</code>) on the user's device, returning a selected option label, confidence score, and probability distribution for each question.
          </p>

          <!-- Flag Notice -->
          <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-sm leading-relaxed max-w-4xl flex gap-3">
            <i class="bi bi-exclamation-triangle-fill text-lg mt-0.5"></i>
            <div>
              Enable <code class="bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded text-xs font-mono">#classifier-api</code> in <code class="bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded text-xs font-mono">chrome://flags</code> to use this API.
            </div>
          </div>
        </div>

        <div class="h-px w-full bg-slate-200 dark:bg-zinc-800 mb-10 max-w-4xl"></div>

        <!-- Main Content -->
        <div class="space-y-12 max-w-4xl">

          <!-- Use cases -->
          <section id="use-cases" class="scroll-mt-6">
            <app-docs-section-header anchorId="use-cases" title="Use cases"></app-docs-section-header>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-signpost-split"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Intent &amp; action routing</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Map a user's natural-language input or support request to a predefined set of application actions, departments, or UI filters.
                </p>
              </div>
              <div class="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-shield-check"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Pre-send checks &amp; moderation</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Evaluate drafts or comments locally against boolean criteria (such as policy checks or tone checks) before submitting or escalating to a generative model.
                </p>
              </div>
              <div class="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-bar-chart-steps"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Ordinal rating &amp; ranking</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Score items along an ordered scale (such as 1 to 5 severity or relevance) and read the expected value <code class="text-xs font-mono">expectedScore</code>.
                </p>
              </div>
            </div>
          </section>

          <!-- Question types -->
          <section id="question-types" class="scroll-mt-6">
            <app-docs-section-header anchorId="question-types" title="Question types"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-6">
              A schema passed to <code class="text-sm font-mono">Classifier.create()</code> contains a <code class="text-sm font-mono">questions</code> array. Each question specifies an <code class="text-sm font-mono">id</code>, a <code class="text-sm font-mono">prompt</code>, and one of three <code class="text-sm font-mono">type</code> values:
            </p>

            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl mb-6">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Options Required</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Output Fields</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">binary</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">No (implicit <code class="text-xs font-mono">"true"</code> / <code class="text-xs font-mono">"false"</code>)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Returns <code class="text-xs font-mono">label</code> (<code class="text-xs font-mono">"true"</code> or <code class="text-xs font-mono">"false"</code>), <code class="text-xs font-mono">probability</code>, <code class="text-xs font-mono">confidence</code>, and <code class="text-xs font-mono">probabilities</code>.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">categorical</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Yes (2 or more <code class="text-xs font-mono">&#123; label, description &#125;</code> items)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Returns the top option <code class="text-xs font-mono">label</code>, <code class="text-xs font-mono">confidence</code>, and <code class="text-xs font-mono">probabilities</code> across all options.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">ordinal</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Yes (ordered levels, e.g., <code class="text-xs font-mono">"1"</code> through <code class="text-xs font-mono">"5"</code>)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Returns <code class="text-xs font-mono">label</code>, <code class="text-xs font-mono">expectedScore</code> (weighted average across levels), <code class="text-xs font-mono">standardError</code>, <code class="text-xs font-mono">confidence</code>, and <code class="text-xs font-mono">probabilities</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- availability -->
          <section id="availability" class="scroll-mt-6">
            <app-docs-section-header anchorId="availability" title="Classifier.availability()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Checks whether the browser supports creating a classifier session for the given options.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">availability</span>(options?: <span class="text-emerald-400">ClassifierCreateOptions</span>): Promise&lt;<span class="text-emerald-400">Availability</span>&gt;;
              </code>
            </div>

            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns</h3>
            <p class="text-slate-600 dark:text-slate-400 mb-6">
              A promise that resolves to an <code class="text-sm font-mono text-emerald-600 dark:text-emerald-400">Availability</code> string:
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'available'</code>,
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloadable'</code>,
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloading'</code>, or
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'unavailable'</code>.
            </p>
            <app-code-snippet [code]="snippetAvailability"></app-code-snippet>
          </section>

          <!-- create -->
          <section id="create" class="scroll-mt-6">
            <app-docs-section-header anchorId="create" title="Classifier.create()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Creates a new <code class="text-sm font-mono">Classifier</code> instance configured with the provided question schema.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">create</span>(options: <span class="text-emerald-400">ClassifierCreateOptions</span>): Promise&lt;<span class="text-emerald-400">Classifier</span>&gt;;
              </code>
            </div>
            <app-code-snippet [code]="snippetCreate"></app-code-snippet>
          </section>

          <!-- classify -->
          <section id="classify" class="scroll-mt-6">
            <app-docs-section-header anchorId="classify" title="classifier.classify()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Evaluates the input string against all questions defined in the session schema and returns a <code class="text-sm font-mono">ClassifierResult</code>.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-blue-400">classify</span>(input: <span class="text-emerald-400">DOMString</span>, options?: <span class="text-emerald-400">ClassifierClassifyOptions</span>): Promise&lt;<span class="text-emerald-400">ClassifierResult</span>&gt;;
              </code>
            </div>

            <app-code-snippet [code]="snippetExample1"></app-code-snippet>

            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3 mt-8">Decision properties (ClassifierDecision)</h3>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl mb-6">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Property</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">id</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">DOMString</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The question identifier defined in the schema.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">label</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">DOMString</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The highest-probability option label (<code class="text-xs font-mono">"true"</code>/<code class="text-xs font-mono">"false"</code> for binary, or one of the supplied <code class="text-xs font-mono">options</code>).</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">confidence</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">double (0.0 – 1.0)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Confidence score for the decision.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">probability</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">double? (0.0 – 1.0)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Present for <code class="text-xs font-mono">binary</code> questions: probability of <code class="text-xs font-mono">"true"</code>.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">expectedScore</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">double?</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Present for <code class="text-xs font-mono">ordinal</code> questions: weighted average across the ordered option levels.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">standardError</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">double?</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Optional standard error around <code class="text-xs font-mono">expectedScore</code>.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">probabilities</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;OptionProbability&gt;</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">List of <code class="text-xs font-mono">&#123; label, probability &#125;</code> entries across all options for the question.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- destroy -->
          <section id="destroy" class="scroll-mt-6">
            <app-docs-section-header anchorId="destroy" title="classifier.destroy()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Releases the resources associated with the classifier session when it is no longer needed.
            </p>
            <app-code-snippet [code]="snippetDestroy"></app-code-snippet>
          </section>

          <!-- API Reference -->
          <section id="api-reference" class="scroll-mt-6">
            <app-docs-section-header anchorId="api-reference" title="API reference (Prospective WebIDL)"></app-docs-section-header>
            <app-code-snippet [runnable]="false" [code]="snippetWebIdl"></app-code-snippet>
          </section>

        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/semantic-embedder" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Semantic Embedder API</span>
          </a>

          <a routerLink="/playgrounds/classifier" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Try it live <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Classifier Playground</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class ClassifierApiPage {
  snippetAvailability = `const schema = {
  context: "Customer support ticket router.",
  questions: [
    { id: "is_urgent", type: "binary", prompt: "Does this ticket require immediate incident response?" }
  ]
};

const status = await Classifier.availability(schema);
console.log("Classifier availability:", status);`;

  snippetCreate = `const schema = {
  context: "Customer support ticket router.",
  questions: [
    {
      id: "is_urgent",
      type: "binary",
      prompt: "Does this ticket require immediate incident response?"
    },
    {
      id: "category",
      type: "categorical",
      prompt: "Select the primary support department.",
      options: [
        { label: "bug", description: "Production crash or software defect" },
        { label: "billing", description: "Invoice or double-charge issue" },
        { label: "feature_request", description: "Enhancement request" }
      ]
    },
    {
      id: "severity",
      type: "ordinal",
      prompt: "Rate the business impact from 1 (minimal) to 5 (critical).",
      options: [
        { label: "1", description: "Minimal impact" },
        { label: "2", description: "Low impact" },
        { label: "3", description: "Moderate impact" },
        { label: "4", description: "High impact" },
        { label: "5", description: "Critical production outage" }
      ]
    }
  ]
};

const classifier = await Classifier.create(schema);
console.log("Classifier created");
classifier.destroy();`;

  snippetExample1 = `const schema = {
  context: "Customer support ticket router.",
  questions: [
    {
      id: "is_urgent",
      type: "binary",
      prompt: "Does this ticket require immediate incident response?"
    },
    {
      id: "category",
      type: "categorical",
      prompt: "Select the primary support department.",
      options: [
        { label: "bug", description: "Production crash or software defect" },
        { label: "billing", description: "Invoice or double-charge issue" },
        { label: "feature_request", description: "Enhancement request" }
      ]
    }
  ]
};

const status = await Classifier.availability(schema);

if (status === "available" || status === "downloadable") {
  const classifier = await Classifier.create(schema);

  const input = "Urgent: our production database pipeline crashes with a fatal segfault!";
  const result = await classifier.classify(input);
  console.log("Classification result:", result);

  classifier.destroy();
} else {
  console.log("Classifier unavailable:", status);
}`;

  snippetDestroy = `const schema = {
  context: "Customer support ticket router.",
  questions: [
    { id: "is_urgent", type: "binary", prompt: "Does this ticket require immediate incident response?" }
  ]
};

const classifier = await Classifier.create(schema);
const result = await classifier.classify("We were charged twice on invoice #4821");
console.log("Classified before destroy:", result);
classifier.destroy();
console.log("Classifier session destroyed.");`;

  snippetWebIdl = `enum Availability { "unavailable", "downloadable", "downloading", "available" };
enum ClassifierQuestionType { "binary", "categorical", "ordinal" };

[Exposed=Window, SecureContext]
interface Classifier {
  static Promise<Availability> availability(optional ClassifierCreateOptions options = {});
  static Promise<Classifier> create(ClassifierCreateOptions options);

  Promise<ClassifierResult> classify(
      DOMString input,
      optional ClassifierClassifyOptions options = {});

  undefined destroy();
};

dictionary ClassifierCreateOptions {
  DOMString context;
  sequence<ClassifierExpectedInput> expectedInputs;
  required sequence<ClassifierQuestion> questions;
  AbortSignal signal;
  CreateMonitorCallback monitor;
};

dictionary ClassifierQuestion {
  required DOMString id;
  required ClassifierQuestionType type;
  required DOMString prompt;
  sequence<ClassifierOption> options; // Required for "categorical" and "ordinal"
};

dictionary ClassifierOption {
  required DOMString label;
  DOMString description;
};

dictionary ClassifierClassifyOptions {
  DOMString context;
  unsigned long samples = 1;
  AbortSignal signal;
};

dictionary ClassifierDecision {
  DOMString id;
  DOMString label;
  double confidence;
  double? probability;
  double? expectedScore;
  double? standardError;
  sequence<ClassifierOptionProbability> probabilities;
};`;
}
