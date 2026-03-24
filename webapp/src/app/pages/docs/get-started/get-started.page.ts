import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-get-started',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Getting Started</span>
          </nav>
          
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Built-In AI Documentation
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Built-In AI APIs are a set of JS APIs, provided by the browser, that allows developers to run inference, on-device, without managing API Keys.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Check Availability -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Check Availability</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            For the Built-In AI APIs, the browser manages the availability of the on-device models that power the Built-In AI APIs. This means that the models might not be available right away (not downloaded yet) or simply, the hardware that the user is opening the site on, might not be powerful enough to run any on-device models.
          </p>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            As a web developer, you need to check the availability of the model. To facilitate the usage of the APIs, all the APIs follow the same availability pattern (the parameters passed to it will differ by API):
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">javascript</span>
            </div>
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> availability = <span class="text-purple-400">await</span> *.availability(&#123;&#125;); <span class="text-zinc-500">// AvailabilityEnum</span></code></pre>
          </div>

          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-4 mt-8">AvailabilityEnum</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm mb-6">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr>
                  <th class="px-4 py-3 font-semibold">Enum Value</th>
                  <th class="px-4 py-3 font-semibold">Description</th>
                  <th class="px-4 py-3 font-semibold">What should you do?</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-[#ffffff] dark:bg-[#121212]">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-3 align-top font-mono text-red-600 dark:text-red-400">unavailable</td>
                  <td class="px-4 py-3 align-top">The model is not available, often due to unsupported hardware or a disabled feature.</td>
                  <td class="px-4 py-3 align-top">You can’t use this API on this device, unfortunately.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-3 align-top font-mono text-blue-600 dark:text-blue-400">downloadable</td>
                  <td class="px-4 py-3 align-top">The model can be downloaded for on-device use.</td>
                  <td class="px-4 py-3 align-top">User’s device is supported but not yet downloaded. Call create on the API to initiate download of the model.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-3 align-top font-mono text-amber-600 dark:text-amber-400">downloading</td>
                  <td class="px-4 py-3 align-top">The model is currently being downloaded.</td>
                  <td class="px-4 py-3 align-top">Wait for the model to be available. You can’t wait for the call to create to complete or continue polling availability.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-3 align-top font-mono text-emerald-600 dark:text-emerald-400">available</td>
                  <td class="px-4 py-3 align-top">The model is downloaded and ready for inference.</td>
                  <td class="px-4 py-3 align-top">Simply call create and you will be able to use the feature on the user’s device.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2 mt-8">Hardware requirements</h3>
          <p class="text-sm">
            <a href="https://developer.chrome.com/docs/ai/get-started#hardware" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">https://developer.chrome.com/docs/ai/get-started#hardware</a>
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Create the Instance -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Create the Instance</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            All the APIs follow the same “creation” pattern. Some parameters passed to the create method will be similar and different across the APIs. Look at the individual API documentation for more information.
          </p>

          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-4">
            <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">javascript</span>
            </div>
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> session = <span class="text-purple-400">await</span> *.create(&#123;&#125;);</code></pre>
          </div>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">
            The create methods are asynchronous.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Run Inference -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Run Inference</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            Once the session is created, APIs can be used by calling the API specific method (prompt | translate | detect | summarize | write | rewrite | proofread) to run inference. Similarly, these methods accept similar and different parameters. Look at the individual API documentation for more information.
          </p>

          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2">Streaming</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Streaming provides a way for developers to show to users that inference is happening as soon as the tokens are generated.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-8">
            <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">javascript</span>
            </div>
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> result = <span class="text-purple-400">await</span> session.(promptStreaming|translateStreaming|summarizeStreaming|writeStreaming|rewriteStreaming|proofreadStreaming)();</code></pre>
          </div>

          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2">Non-Streaming</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Developers also have the option to use non-streaming methods. In some cases (e.g. when forcing a JSON response (Structured Output)), the streaming methods are not available (see individual API documentation for more information). You can revert to using the non-streaming methods:
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-4">
            <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">javascript</span>
            </div>
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> result = <span class="text-purple-400">await</span> session.(prompt|translate|detect|summarize|write|rewrite|proofread)();</code></pre>
          </div>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Official Links -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Official Links</h2>
          <ul class="list-disc pl-5 space-y-2 text-sm">
            <li><a href="https://developer.chrome.com/docs/ai/get-started" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">https://developer.chrome.com/docs/ai/get-started</a></li>
            <li><a href="https://developer.chrome.com/docs/ai/built-in" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">https://developer.chrome.com/docs/ai/built-in</a></li>
            <li><a href="https://developer.chrome.com/docs/ai/built-in-apis" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">https://developer.chrome.com/docs/ai/built-in-apis</a></li>
          </ul>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Documentation Home</span>
          </a>

          <a routerLink="/docs/check-availability" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class GetStartedPage {}
