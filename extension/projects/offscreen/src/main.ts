import { ClassifierModelStore } from './classifier-model-store';
import { ClassifierEngine } from './classifier-engine';
import { ClassifierRuntimeMessageHandler } from './classifier-runtime-message.handler';
import {
  CLASSIFIER_REQUEST_ACTION,
  CLASSIFIER_RUNTIME_TARGET,
} from '../../base/src/lib/classifier/messaging/classifier-runtime-target.const';
import { ClassifierRuntimeRequest } from '../../base/src/lib/classifier/interfaces/classifier-runtime-request.interface';
import { serializeClassifierError } from '../../base/src/lib/classifier/messaging/classifier-error.utils';

declare const chrome: any;

/**
 * Offscreen document entry point. Hosts the Classifier polyfill runtime
 * (LiteRT.js + Laya) for every tab and extension page.
 *
 * The listener is registered synchronously so requests that arrive while the
 * store is still opening are queued behind `ready`.
 */
const ready: Promise<ClassifierRuntimeMessageHandler> = ClassifierModelStore.open().then(
  (store) => new ClassifierRuntimeMessageHandler(new ClassifierEngine(store)),
);

chrome.runtime.onMessage.addListener(
  (message: ClassifierRuntimeRequest, _sender: unknown, sendResponse: (response: unknown) => void): boolean => {
    if (!message || message.target !== CLASSIFIER_RUNTIME_TARGET || message.action !== CLASSIFIER_REQUEST_ACTION) {
      return false;
    }
    ready
      .then((handler) => handler.handle(message))
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: serializeClassifierError(e) }));
    return true;
  },
);

console.log('WebAI Extension: classifier offscreen runtime started.');
