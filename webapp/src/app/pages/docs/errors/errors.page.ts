import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-errors',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Error Handling</span>
          </nav>
          
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Error Handling & Exceptions
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 23, 2026</p>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            When interacting with the Chrome Built-in AI APIs, various exceptions may be thrown depending on hardware constraints, network conditions, or invalid inputs. Understanding these errors is crucial for building resilient AI applications that gracefully degrade or guide the user.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        
        
        <!-- Errors Table -->
        <div class="max-w-5xl overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
              <tr>
                <th class="px-5 py-4 font-semibold w-1/5">Error</th>
                <th class="px-5 py-4 font-semibold w-1/6">JS Type</th>
                <th class="px-5 py-4 font-semibold w-1/3">Description</th>
                <th class="px-5 py-4 font-semibold w-1/3">Resolution</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-[#ffffff] dark:bg-[#121212]">
              
              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-hdd-network text-red-500"></i>
                    <code class="font-mono font-bold text-red-700 dark:text-red-400">QuotaExceededError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Context Window Overflow</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when the input is too large and the combination of your system prompt, context, and input exceeds the maximum token limit. 
                  <div class="mt-3 p-2 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-100 dark:border-zinc-800 text-xs">
                    <strong>Props:</strong><br>
                    <code>e.requested</code>: Total input tokens.<br>
                    <code>e.quota</code>: Tokens available.
                  </div>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Catch the error and inform the user that their input is too large. Use <code>measureInputUsage()</code> beforehand to truncate inputs proactively if needed.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-shield-slash text-rose-500"></i>
                    <code class="font-mono font-bold text-rose-700 dark:text-rose-400">NotReadableError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Safety Filtered</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when the execution yielded an unsafe response. The built-in safety model intercepted the output due to toxicity or restricted topics.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Inform the user that the response violated safety guidelines and could not be displayed. Consider adjusting the system prompt to guide safer responses.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-person-lock text-pink-500"></i>
                    <code class="font-mono font-bold text-pink-700 dark:text-pink-400">NotAllowedError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Permission Denied</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when a user permission error occurs (e.g., the user is not allowed to execute the model), or if an Enterprise Policy disables the feature.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Display a message indicating that the browser environment or administrator policy prohibits the use of local AI models. Handle the missing capability gracefully in your UI.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-x-octagon text-orange-500"></i>
                    <code class="font-mono font-bold text-orange-700 dark:text-orange-400">NotSupportedError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Unsupported Config</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when: <br>
                  1. The request is invalid (input/options could not be processed).<br>
                  2. The model attempted to output in an untested language.<br>
                  3. The model attempted to output low quality text.<br>
                  4. The response constraint JSON schema is not supported.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Adjust your constraints or handle the unsupported state gracefully. Ensure you use the <code>availability(options)</code> check to verify base support before calling <code>create()</code>.
                </td>
              </tr>
              
              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-exclamation-triangle text-amber-500"></i>
                    <code class="font-mono font-bold text-amber-700 dark:text-amber-400">InvalidStateError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">State Destroyed</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when the model execution session has been explicitly destroyed, the document is no longer active, or the execution context is invalid.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Ensure you are not calling <code>prompt()</code> on a session that has already been destroyed, and that the calling window context is still alive.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-pc-display-horizontal text-emerald-500"></i>
                    <code class="font-mono font-bold text-emerald-700 dark:text-emerald-400">OperationError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Service Unavailable</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when the underlying model execution service (the Chrome process managing the model) is not available or has crashed.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Treat this as a fatal crash of the local model and inform the user that the service is currently unavailable.
                </td>
              </tr>
              
              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-question-octagon text-cyan-500"></i>
                    <code class="font-mono font-bold text-cyan-700 dark:text-cyan-400">UnknownError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Generic Failure</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when other generic, unclassified failures occur, or when an internal state like a "retryable" or "non-retryable" engine error is encountered.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Capture and log the error for telemetry and display a graceful failure message.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-wifi-off text-indigo-500"></i>
                    <code class="font-mono font-bold text-indigo-700 dark:text-indigo-400">NetworkError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Download Failure</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown during <code>create()</code> if a required model or language pack needs to be downloaded but the network request fails.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Catch the error, prompt the user to check their internet connection, and provide a button to retry the initialization.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-stop-circle text-slate-500"></i>
                    <code class="font-mono font-bold text-slate-700 dark:text-slate-300">AbortError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Operation Cancelled</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when an operation is cancelled by the developer via an <code>AbortSignal</code>, the response was disabled, or the request was cancelled internally by Chrome.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  This is usually an expected state if your UI allows users to "Stop Generation". Catch it and silently reset your UI state to idle.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-braces-asterisk text-purple-500"></i>
                    <code class="font-mono font-bold text-purple-700 dark:text-purple-400">SyntaxError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Invalid Structure</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Thrown when the model fails to generate a response that perfectly matches a strict <code>responseConstraint</code> (JSON Schema/RegExp), or if <code>prefix: true</code> is misused.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Simplify your constraint rules, or provide better system instructions so the model understands exactly what format is required.
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-shield-exclamation text-teal-500"></i>
                    <code class="font-mono font-bold text-teal-700 dark:text-teal-400">SecurityError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Multimodal Data Errors</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">DOMException</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  <strong>SecurityError</strong> is thrown for cross-origin media violations (un-tainted canvas).<br><br>
                  <strong>EncodingError</strong> is thrown if raw bytes cannot be decoded using standard browser sniffing rules.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Ensure media has <code>crossorigin="anonymous"</code> or is same-origin. Only use supported formats (JPEG, PNG, WebP).
                </td>
              </tr>

              <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <td class="px-5 py-5 align-top">
                  <div class="flex items-center gap-2 mb-1">
                    <i class="bi bi-bug text-blue-500"></i>
                    <code class="font-mono font-bold text-blue-700 dark:text-blue-400">TypeError</code>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-500 block pl-6">Validation Errors</span>
                </td>
                <td class="px-5 py-5 align-top">
                  <code class="text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">JS Native</code>
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  <strong>TypeError</strong>: Invalid option combinations (e.g. system role placement).<br><br>
                  <strong>RangeError</strong>: Model params (temperature, topK) are set below minimum bounds.
                </td>
                <td class="px-5 py-5 align-top leading-relaxed">
                  Review your configuration code against the API specifications to ensure you are passing valid parameters.
                </td>
              </tr>

            </tbody>
          </table>
        </div>


        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/check-availability" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</span>
          </a>

          <a routerLink="/docs/prompt-api" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Prompt API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class DocsErrorsPage {}
