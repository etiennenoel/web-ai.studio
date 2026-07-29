import { Component } from '@angular/core';

@Component({
  selector: 'app-semantic-embedder-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="!no-underline hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Semantic Embedder API</span>
          </nav>

          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Semantic Embedder API
                </h1>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 uppercase tracking-wider border border-violet-200 dark:border-violet-500/30">
                  Explainer
                </span>
              </div>
            </div>


            <div class="flex flex-wrap gap-2 mt-4 md:mt-0">
              <a href="https://github.com/explainers-by-googlers/semantic-embedder-api/blob/main/README.md" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> Explainer
              </a>
              <a href="https://github.com/explainers-by-googlers/semantic-embedder-api/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-bug"></i> File an issue
              </a>
            </div>
          </div>

          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Semantic Embedder API generates high-dimensional vector representations (embeddings) of text directly on the user's device. It unlocks semantic search, retrieval-augmented generation, and real-time content intelligence without the latency, cost, and privacy trade-offs of cloud embedding services — or the storage bloat of every site shipping its own model.
          </p>

          <!-- Proposal Notice -->
          <div class="mt-6 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-900/30 rounded-xl text-violet-800 dark:text-violet-300 text-sm leading-relaxed max-w-4xl flex gap-3">
            <i class="bi bi-lightbulb-fill text-lg mt-0.5"></i>
            <div>
              <strong>Early proposal:</strong> This is a design sketch by the Chrome Built-in AI team to describe the problem and solicit feedback. It has <strong>not been approved to ship in Chrome</strong>, no <code class="bg-violet-100 dark:bg-violet-900/30 px-1 py-0.5 rounded text-xs font-mono">chrome://flags</code> entry exists yet, and the shape of the API — including the <code class="bg-violet-100 dark:bg-violet-900/30 px-1 py-0.5 rounded text-xs font-mono">SemanticEmbedder</code> name itself — is still an open question.
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
                <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-search"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Semantic search</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  A note-taking app can find notes by meaning rather than keywords, entirely on-device and private to the user.
                </p>
              </div>
              <div class="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-journal-richtext"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">RAG</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  A documentation site can build an offline-capable Q&#64;A bot that retrieves the most relevant passages before prompting a model.
                </p>
              </div>
              <div class="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-4">
                  <i class="bi bi-shield-check"></i>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Content intelligence</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  A community forum can flag potentially toxic comments as the user types, before the content is ever sent to a server.
                </p>
              </div>
            </div>
          </section>

          <!-- availability -->
          <section id="availability" class="scroll-mt-6">
            <app-docs-section-header anchorId="availability" title="SemanticEmbedder.availability()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Checks whether an embedding model is available on this device, allowing progressive enhancement. The API follows the same <strong>availability &rarr; create &rarr; execute</strong> pattern as the other Built-In AI APIs.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">availability</span>(): Promise&lt;<span class="text-emerald-400">Availability</span>&gt;;
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
            <app-code-snippet code="if (!SemanticEmbedder || (await SemanticEmbedder.availability()) === 'unavailable') &#123;
  console.error(&quot;Embedding model is not available on this device.&quot;);
  return;
&#125;"></app-code-snippet>
          </section>

          <!-- create -->
          <section id="create" class="scroll-mt-6">
            <app-docs-section-header anchorId="create" title="SemanticEmbedder.create()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Instantiates a new <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">SemanticEmbedder</code> object, initiating any necessary model download. As with the other Built-In AI APIs, expect the standard <code class="text-sm font-mono">signal</code> and <code class="text-sm font-mono">monitor</code> options for aborting creation and tracking download progress.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">create</span>(options?: <span class="text-emerald-400">SemanticEmbedderCreateOptions</span>): Promise&lt;<span class="text-emerald-400">SemanticEmbedder</span>&gt;;
              </code>
            </div>
            <app-code-snippet code="const semanticEmbedder = await SemanticEmbedder.create();
console.log(&quot;Semantic embedder created&quot;);"></app-code-snippet>

            <div class="mt-6 p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 text-sm leading-relaxed flex gap-3">
              <i class="bi bi-info-circle-fill text-lg mt-0.5 text-slate-400 dark:text-slate-500"></i>
              <div>
                Advanced model parameters are explicitly out of scope for the initial proposal. One option under discussion is an optional <code class="text-xs font-mono text-pink-600 dark:text-pink-400">taskType</code> hint (e.g. retrieval or classification) that browsers may safely ignore if the underlying model does not support it.
              </div>
            </div>
          </section>

          <!-- embed -->
          <section id="embed" class="scroll-mt-6">
            <app-docs-section-header anchorId="embed" title="semanticEmbedder.embed()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Embeds the input and returns a structured <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">EmbedderResult</code>. The method is polymorphic: pass a single string, or an array of strings to embed a whole batch in one call.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-blue-400">embed</span>(input: <span class="text-emerald-400">DOMString</span> | <span class="text-emerald-400">sequence&lt;DOMString&gt;</span>): Promise&lt;<span class="text-emerald-400">EmbedderResult</span>&gt;;
              </code>
            </div>

            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns (EmbedderResult)</h3>
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
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">embeddings</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;Embedding&gt;</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The generated embeddings, corresponding strictly 1:1 with the inputs provided in the batch.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">embeddings[i].values</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">Float32Array</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The raw vector for that input.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">embeddings[i].statistics</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">EmbeddingStatistics</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Proposed for future extensibility: usage information such as <code class="font-mono text-xs">tokenCount</code> and <code class="font-mono text-xs">truncated</code>.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">metadata</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">EmbedderMetadata</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Model compatibility information, such as <code class="font-mono text-xs">embeddingSpace</code> and <code class="font-mono text-xs">maxInputTokens</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              A dictionary is returned rather than a raw array so the API can be extended later — with token consumption statistics, truncation warnings, or multi-modal metadata — without breaking backwards compatibility for early adopters.
            </p>
            <app-code-snippet code="&#123;
  embeddings: [
    &#123;
      values: Float32Array(300) [0.0023, -0.0093, ...],
      statistics: &#123; tokenCount: 8, truncated: false &#125;
    &#125;
  ],
  metadata: &#123;
    embeddingSpace: 'embeddinggemma-300m',
    maxInputTokens: 2048
  &#125;
&#125;"></app-code-snippet>
          </section>

          <!-- destroy -->
          <section id="destroy" class="scroll-mt-6">
            <app-docs-section-header anchorId="destroy" title="semanticEmbedder.destroy()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Destroys the embedder instance, allowing the browser to unload the underlying model from memory. Because embedding is stateless, you should proactively destroy the embedder as soon as a batch is done.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-blue-400">destroy</span>(): <span class="text-emerald-400">undefined</span>;
              </code>
            </div>
            <app-code-snippet code="const semanticEmbedder = await SemanticEmbedder.create();
semanticEmbedder.destroy();
console.log(&quot;Semantic embedder destroyed.&quot;);"></app-code-snippet>
          </section>

          <!-- Cosine similarity -->
          <section id="cosine-similarity" class="scroll-mt-6">
            <app-docs-section-header anchorId="cosine-similarity" title="Comparing embeddings"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              The API returns raw vectors, so semantic closeness is measured with a distance function you supply — most commonly cosine similarity. A built-in static utility (e.g. <code class="text-sm font-mono">SemanticEmbedder.compare()</code>) is under discussion; it could also validate that both vectors come from the same embedding space before comparing them.
            </p>
            <app-code-snippet code="const semanticEmbedder = await SemanticEmbedder.create();

const result1 = await semanticEmbedder.embed('The quick brown fox jumps over the lazy dog.');
const result2 = await semanticEmbedder.embed('A fast, dark-colored fox leaps over a resting hound.');

const vector1 = result1.embeddings[0].values;
const vector2 = result2.embeddings[0].values;

const similarity = cosineSimilarity(vector1, vector2);
console.log('Similarity score:', similarity); // High similarity expected

semanticEmbedder.destroy();

function cosineSimilarity(vecA, vecB) &#123;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i &lt; vecA.length; i++) &#123;
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  &#125;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
&#125;"></app-code-snippet>
          </section>

          <!-- Batching -->
          <section id="batching" class="scroll-mt-6">
            <app-docs-section-header anchorId="batching" title="Batching for document retrieval"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              For RAG or document search you typically embed many passages at once. Pass an array to <code class="text-sm font-mono">embed()</code> and store the resulting vectors in local storage such as IndexedDB or OPFS — the API deliberately provides no built-in vector database.
            </p>
            <app-code-snippet code="const semanticEmbedder = await SemanticEmbedder.create();

// A document the developer has already chunked into passages
const passages = [
  'Built-in AI APIs use on-device models.',
  'Embeddings are high-dimensional vectors representing semantic meaning.',
  'The Prompt API facilitates direct usage of a language model.'
];

// Embed the entire batch in one call
const batchResult = await semanticEmbedder.embed(passages);

// Destroy the embedder immediately to free up memory
semanticEmbedder.destroy();

// Store the vectors in a local vector database (e.g. IndexedDB)
for (let i = 0; i &lt; batchResult.embeddings.length; i++) &#123;
  await myLocalVectorDB.insert(&#123;
    text: passages[i],
    embedding: batchResult.embeddings[i].values,
    tokens: batchResult.embeddings[i].statistics.tokenCount
  &#125;);
&#125;"></app-code-snippet>
          </section>

          <!-- Chunking -->
          <section id="chunking" class="scroll-mt-6">
            <app-docs-section-header anchorId="chunking" title="Chunking and truncation"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              The API does <strong>not</strong> automatically chunk large text inputs. You must pre-chunk documents yourself to stay within the model's input limit (2048 tokens for the prototype models) and pass the chunks as an array. Two practical strategies:
            </p>
            <ul class="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400 mb-4">
              <li><strong>Maximum efficiency:</strong> use an offline tokenizer to estimate a domain-specific character-to-token ratio, then chunk rapidly by character length in the browser.</li>
              <li><strong>Strict accuracy:</strong> load the model's open-sourced tokenizer and use it as the length function of a splitter such as LangChain's <code class="text-sm font-mono">RecursiveCharacterTextSplitter</code>, counting exact tokens while merging segments.</li>
            </ul>
            <p class="text-slate-600 dark:text-slate-400">
              A native helper (e.g. <code class="text-sm font-mono">SemanticEmbedder.chunk()</code>) is one of the open questions being explored.
            </p>
          </section>

          <!-- Embedding space -->
          <section id="embedding-space" class="scroll-mt-6">
            <app-docs-section-header anchorId="embedding-space" title="Embedding space and compatibility"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Embedding vectors are mathematically tied to the model that generated them — vectors from different embedding spaces cannot be compared. That is why <code class="text-sm font-mono">EmbedderResult</code> carries an <code class="text-sm font-mono">EmbedderMetadata</code> dictionary exposing the <code class="text-sm font-mono text-pink-600 dark:text-pink-400">embeddingSpace</code> identifier: it lets you version your local vector database, know when to re-index after a model update, and determine which cloud-side models your vectors are compatible with.
            </p>
            <p class="text-slate-600 dark:text-slate-400">
              Initial prototypes are expected to use spaces from open-weight models such as <a href="https://huggingface.co/google/embeddinggemma-300m" target="_blank" class="text-indigo-600 dark:text-indigo-400 font-medium">EmbeddingGemma (google/embeddinggemma-300m)</a> or <a href="https://huggingface.co/Qwen/Qwen3-Embedding-0.6B" target="_blank" class="text-indigo-600 dark:text-indigo-400 font-medium">Qwen3-Embedding-0.6B</a> to maximize compatibility with server-side embeddings.
            </p>
          </section>

          <!-- Non-goals -->
          <section id="non-goals" class="scroll-mt-6">
            <app-docs-section-header anchorId="non-goals" title="Non-goals"></app-docs-section-header>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Out of scope</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">What to do instead</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">Integrated storage</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">No built-in vector database. Store and search embeddings with existing Web Platform storage such as IndexedDB or OPFS.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">Model training</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Inference only. Training and fine-tuning on device are not supported.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">Complex ML knobs</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Advanced model parameters are not exposed initially; the focus is on core functionality.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Security and privacy -->
          <section id="security-privacy" class="scroll-mt-6">
            <app-docs-section-header anchorId="security-privacy" title="Security and privacy"></app-docs-section-header>
            <ul class="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
              <li><strong>Permissions policy:</strong> access is gated by a permissions policy restricted to top-level frames and same-origin iframes by default. Third-party contexts must be explicitly granted access.</li>
              <li><strong>Sandbox isolation:</strong> data processing and model execution occur in a sandboxed environment to mitigate the risk of malicious inputs.</li>
              <li><strong>Statelessness:</strong> other than model download state, the API keeps no memory or user data across sessions.</li>
            </ul>
          </section>

        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/proofreader" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Proofreader API</span>
          </a>

          <div></div>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class SemanticEmbedderApiPage {}
