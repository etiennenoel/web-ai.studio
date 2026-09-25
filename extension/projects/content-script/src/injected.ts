import { APP_VERSION } from '../../base/src/lib/version';
import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { ChromeAiApiName } from '../../shared/enums/chrome-ai-api-name.enum';
import { WindowMessageBridge } from '../../shared/messaging/window-message-bridge';
import { ChromeAiApiWrapper } from './api-wrapping/chrome-ai-api-wrapper';
import { DiagnosisEvalResult, SettingsPushData } from '../../shared/interfaces/window-messages.interface';
import { ClassifierPolyfillInstaller } from './polyfill/classifier-polyfill.installer';
import { ClassifierPageBridge } from './polyfill/classifier-page-bridge';
import { ClassifierRuntimeOp } from '../../base/src/lib/classifier/enums/classifier-runtime-op.enum';

declare global {
  interface Window {
    webai: any;
  }
}

// ---------------------------------------------------------------------------
// 1. Initialize the window.webai namespace
// ---------------------------------------------------------------------------

window.webai = window.webai || {};
window.webai.version = APP_VERSION;

// ---------------------------------------------------------------------------
// 1b. Classifier API polyfill
//
// Defined before wrapping so the wrapper below records its calls like any
// native API. Removed again if the setting is off (see SETTINGS_PUSH).
// ---------------------------------------------------------------------------

const classifierPolyfilled = ClassifierPolyfillInstaller.install();
window.webai.classifier = window.webai.classifier || {};
window.webai.classifier.isPolyfilled = classifierPolyfilled;
/** Prints the polyfill runtime state (offscreen document, active model, cached models) to help debugging. */
window.webai.classifier.diagnose = async function (): Promise<unknown> {
  const report: Record<string, unknown> = {
    isPolyfilled: classifierPolyfilled,
    hasClassifier: typeof window.Classifier !== 'undefined',
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
// 4. Diagnosis eval listener
//
// Responds to requests from the content script (originating from the devtools
// panel) to check which Chrome AI APIs exist on the current page's window.
// ---------------------------------------------------------------------------

window.addEventListener('message', (event: MessageEvent) => {
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
    [ChromeAiApiName.CLASSIFIER]: typeof window.Classifier !== 'undefined',
  } as DiagnosisEvalResult;

  window.postMessage(
    {
      type: WindowMessageType.DIAGNOSIS_EVAL_RESPONSE,
      messageId: event.data.messageId,
      data: result,
    },
    '*',
  );
});

// ---------------------------------------------------------------------------
// 5. Wrap all Chrome AI APIs for telemetry and routing
// ---------------------------------------------------------------------------

const wrappers = Object.values(ChromeAiApiName).map((apiName) => new ChromeAiApiWrapper(apiName));
for (const wrapper of wrappers) wrapper.wrap();

// ---------------------------------------------------------------------------
// 6. Apply settings pushed by the content script
//
// Settings load asynchronously, so wrapping and the polyfill start enabled and
// are rolled back here when the user turned them off.
// ---------------------------------------------------------------------------

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== WindowMessageType.SETTINGS_PUSH) return;
  const settings = event.data.data as SettingsPushData;

  if (!settings.wrapApi) {
    for (const wrapper of wrappers) wrapper.unwrap();
  }
  if (!settings.classifierPolyfill && ClassifierPolyfillInstaller.isInstalled) {
    ClassifierPolyfillInstaller.uninstall();
    window.webai.classifier.isPolyfilled = false;
  }
});
