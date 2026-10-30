import { APP_VERSION } from '../../base/src/lib/version';
import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { ChromeAiApiName } from '../../shared/enums/chrome-ai-api-name.enum';
import { WindowMessageBridge } from '../../shared/messaging/window-message-bridge';
import { ChromeAiApiWrapper } from './api-wrapping/chrome-ai-api-wrapper';
import {
  DiagnosisEvalMeta,
  DiagnosisEvalResult,
  SettingsPushData,
} from '../../shared/interfaces/window-messages.interface';
import { ClassifierPolyfillInstaller } from './polyfill/classifier-polyfill.installer';
import { ClassifierPageBridge } from './polyfill/classifier-page-bridge';
import { ClassifierRuntimeOp } from '../../base/src/lib/classifier/enums/classifier-runtime-op.enum';

declare global {
  interface Window {
    webai: any;
  }
}

const INJECTED_CLEANUP_KEY = Symbol.for('__webai_injected_cleanup__');
if (typeof window !== 'undefined' && typeof (window as any)[INJECTED_CLEANUP_KEY] === 'function') {
  (window as any)[INJECTED_CLEANUP_KEY]();
}

const ownExtensionOrigin =
  new Error().stack?.match(/chrome-extension:\/\/[a-z]{32}/)?.[0] ?? null;

// ---------------------------------------------------------------------------
// 0. Non-invasive Web Worker observation
//
// Content scripts execute in Window contexts, not WorkerGlobalScope. We observe
// Worker / SharedWorker construction via a transparent Proxy so the Side Panel
// can inform the user when a page runs Web Workers alongside 0 window AI calls.
// ---------------------------------------------------------------------------

let pageCreatedWorkers = false;
const workerRestoreCallbacks: Array<() => void> = [];

function observeWorkerConstructor(ctorName: 'Worker' | 'SharedWorker'): void {
  if (typeof window === 'undefined') return;
  const OriginalCtor = (window as any)[ctorName];
  if (typeof OriginalCtor !== 'function') return;
  try {
    const proxiedCtor = new Proxy(OriginalCtor, {
      construct(target, argArray, newTarget) {
        pageCreatedWorkers = true;
        return Reflect.construct(target, argArray, newTarget);
      },
    });
    (window as any)[ctorName] = proxiedCtor;
    workerRestoreCallbacks.push(() => {
      if ((window as any)[ctorName] === proxiedCtor) {
        (window as any)[ctorName] = OriginalCtor;
      }
    });
  } catch {
    // Non-configurable constructor in unusual environments - ignore safely.
  }
}

observeWorkerConstructor('Worker');
observeWorkerConstructor('SharedWorker');

function hasActiveWebWorkers(): boolean {
  const hasServiceWorkerController = Boolean(
    typeof navigator !== 'undefined' && navigator.serviceWorker?.controller,
  );
  return pageCreatedWorkers || hasServiceWorkerController;
}

// ---------------------------------------------------------------------------
// 1. Initialize the window.webai namespace
// ---------------------------------------------------------------------------

window.webai = window.webai || {};
window.webai.version = APP_VERSION;

// ---------------------------------------------------------------------------
// 1b. Decisions API polyfill (`window.DecisionModel`)
//
// Defined before wrapping so the wrapper below records its calls like any
// native API. Removed again if the setting is off (see SETTINGS_PUSH).
// ---------------------------------------------------------------------------

let decisionModelPolyfilled = ClassifierPolyfillInstaller.install();
window.webai.decisions = window.webai.decisions || {};
window.webai.decisions.isPolyfilled = decisionModelPolyfilled;

/** Prints the polyfill runtime state (offscreen document, active model, cached models) to help debugging. */
const diagnoseDecisions = async function (): Promise<unknown> {
  const report: Record<string, unknown> = {
    isPolyfilled: decisionModelPolyfilled,
    hasDecisionModel: typeof (window as any).DecisionModel !== 'undefined',
  };
  try {
    report['availability'] = await ClassifierPageBridge.request(ClassifierRuntimeOp.AVAILABILITY, { schema: {} });
    report['models'] = await ClassifierPageBridge.request(ClassifierRuntimeOp.LIST_MODELS, {});
    report['runtime'] = 'ok';
  } catch (e) {
    report['runtime'] = 'error';
    report['error'] = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  console.table(report);
  return report;
};
window.webai.decisions.diagnose = diagnoseDecisions;

// ---------------------------------------------------------------------------
// 2. Hardware information - uses the bridge to request from content script
// ---------------------------------------------------------------------------

window.webai.getHardwareInformation = function (): Promise<unknown> {
  return WindowMessageBridge.sendRequest(
    WindowMessageType.HW_INFO_REQUEST,
    WindowMessageType.HW_INFO_RESPONSE,
  );
};

// ---------------------------------------------------------------------------
// 3. API call history fetchers - one per Chrome AI API
//
// Each fetcher sends a GET_HISTORY request through the content script
// to the service worker, which queries IndexedDB filtered by API name.
// ---------------------------------------------------------------------------

function createHistoryFetcher(apiName: string): () => Promise<unknown[]> {
  return function (): Promise<unknown[]> {
    return WindowMessageBridge.sendRequest<unknown[]>(
      WindowMessageType.GET_HISTORY_REQUEST,
      WindowMessageType.GET_HISTORY_RESPONSE,
      { payload: { apiName, origin: window.location.origin } },
    );
  };
}

for (const apiName of Object.values(ChromeAiApiName)) {
  // Convert "LanguageModel" -> "languageModel", "LanguageDetector" -> "languageDetector"
  const key = apiName.charAt(0).toLowerCase() + apiName.slice(1);
  window.webai[key] = window.webai[key] || {};
  window.webai[key].getHistory = createHistoryFetcher(apiName);
}

// ---------------------------------------------------------------------------
// 4. Wrap existing Chrome AI APIs for telemetry and routing
//
// Only APIs that actually exist on `window` are instantiated and wrapped.
// ---------------------------------------------------------------------------

let wrapApiEnabled = true;
let activeProviderId = 'chrome';
const wrappers = new Map<ChromeAiApiName, ChromeAiApiWrapper>();

function syncApiWrappers(): void {
  if (!wrapApiEnabled) {
    for (const wrapper of wrappers.values()) {
      wrapper.unwrap();
    }
    wrappers.clear();
    return;
  }

  for (const apiName of Object.values(ChromeAiApiName)) {
    if (ChromeAiApiWrapper.isApiPresent(apiName)) {
      let wrapper = wrappers.get(apiName);
      if (!wrapper) {
        wrapper = new ChromeAiApiWrapper(apiName, () => activeProviderId, ownExtensionOrigin);
        wrappers.set(apiName, wrapper);
      }
      wrapper.wrap();
    } else if (wrappers.has(apiName)) {
      wrappers.get(apiName)!.unwrap();
      wrappers.delete(apiName);
    }
  }
}

syncApiWrappers();

// ---------------------------------------------------------------------------
// 5. Diagnosis eval listener
//
// Responds to requests from the content script (originating from the side panel
// or devtools panel) to check which Chrome AI APIs exist on `window`.
// ---------------------------------------------------------------------------

const onDiagnosisEvalRequest = (event: MessageEvent) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== WindowMessageType.DIAGNOSIS_EVAL_REQUEST) return;

  const result: DiagnosisEvalResult = {
    [ChromeAiApiName.SUMMARIZER]: typeof window.Summarizer !== 'undefined',
    [ChromeAiApiName.LANGUAGE_MODEL]: typeof window.LanguageModel !== 'undefined',
    [ChromeAiApiName.TRANSLATOR]: typeof window.Translator !== 'undefined',
    [ChromeAiApiName.LANGUAGE_DETECTOR]: typeof window.LanguageDetector !== 'undefined',
    [ChromeAiApiName.WRITER]: typeof window.Writer !== 'undefined',
    [ChromeAiApiName.REWRITER]: typeof window.Rewriter !== 'undefined',
    [ChromeAiApiName.PROOFREADER]: typeof window.Proofreader !== 'undefined',
    [ChromeAiApiName.DECISION_MODEL]: typeof (window as any).DecisionModel !== 'undefined',
  };

  const meta: DiagnosisEvalMeta = {
    polyfilledApis: decisionModelPolyfilled ? [ChromeAiApiName.DECISION_MODEL] : [],
    hasWebWorkers: hasActiveWebWorkers(),
    wrappingActive: wrapApiEnabled,
  };

  window.postMessage(
    {
      type: WindowMessageType.DIAGNOSIS_EVAL_RESPONSE,
      messageId: event.data.messageId,
      data: result,
      meta,
    },
    '*',
  );
};

window.addEventListener('message', onDiagnosisEvalRequest);

// ---------------------------------------------------------------------------
// 6. Apply settings pushed by the content script
//
// Settings load asynchronously at document_start and may also be re-pushed live
// when the user updates settings in the Side Panel or DevTools.
// ---------------------------------------------------------------------------

const onSettingsPush = (event: MessageEvent) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== WindowMessageType.SETTINGS_PUSH) return;
  const settings = event.data.data as SettingsPushData;

  wrapApiEnabled = settings.wrapApi !== false;
  if (settings.activeProviderId) {
    activeProviderId = settings.activeProviderId;
  }

  if (!settings.classifierPolyfill && ClassifierPolyfillInstaller.isInstalled) {
    // Unwrap DecisionModel before uninstalling so the polyfill class methods stay clean.
    const decisionWrapper = wrappers.get(ChromeAiApiName.DECISION_MODEL);
    if (decisionWrapper) {
      decisionWrapper.unwrap();
      wrappers.delete(ChromeAiApiName.DECISION_MODEL);
    }
    ClassifierPolyfillInstaller.uninstall();
    decisionModelPolyfilled = false;
    window.webai.decisions.isPolyfilled = false;
  } else if (settings.classifierPolyfill !== false && !ClassifierPolyfillInstaller.isInstalled) {
    decisionModelPolyfilled = ClassifierPolyfillInstaller.install();
    window.webai.decisions.isPolyfilled = decisionModelPolyfilled;
  }

  syncApiWrappers();
};

window.addEventListener('message', onSettingsPush);

(window as any)[INJECTED_CLEANUP_KEY] = () => {
  window.removeEventListener('message', onDiagnosisEvalRequest);
  window.removeEventListener('message', onSettingsPush);
  for (const wrapper of wrappers.values()) {
    wrapper.unwrap();
  }
  wrappers.clear();
  if (decisionModelPolyfilled) {
    ClassifierPolyfillInstaller.uninstall();
    decisionModelPolyfilled = false;
  }
  for (const restoreWorker of workerRestoreCallbacks) {
    restoreWorker();
  }
  workerRestoreCallbacks.length = 0;
};
