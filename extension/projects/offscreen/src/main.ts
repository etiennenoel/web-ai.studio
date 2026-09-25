import { ClassifierModelStore } from './classifier-model-store';
import { ClassifierEngine } from './classifier-engine';
import { ClassifierRuntimeMessageHandler } from './classifier-runtime-message.handler';
import {
  CLASSIFIER_REQUEST_ACTION,
  CLASSIFIER_RUNTIME_TARGET,
} from '../../base/src/lib/classifier/messaging/classifier-runtime-target.const';
import { ClassifierRuntimeRequest } from '../../base/src/lib/classifier/interfaces/classifier-runtime-request.interface';
import { ClassifierRuntimeOp } from '../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { serializeClassifierError } from '../../base/src/lib/classifier/messaging/classifier-error.utils';

declare const chrome: any;

/**
 * Offscreen document entry point. Hosts the Classifier polyfill runtime
 * (LiteRT.js + Laya) for every tab and extension page.
 *
 * The listener is registered synchronously. `ping` is answered right away so
 * clients can detect the document; the model store opens lazily on the first
 * real request, and any failure to open it is reported with its cause.
 */
let handlerPromise: Promise<ClassifierRuntimeMessageHandler> | null = null;

function getHandler(): Promise<ClassifierRuntimeMessageHandler> {
  if (!handlerPromise) {
    handlerPromise = ClassifierModelStore.open()
      .then((store) => new ClassifierRuntimeMessageHandler(new ClassifierEngine(store)))
      .catch((e) => {
        handlerPromise = null;
        const cause = e instanceof Error ? e.message : String(e);
        throw new DOMException(
          `Classifier runtime storage (Origin Private File System) could not be opened: ${cause}`,
          'InvalidStateError',
        );
      });
  }
  return handlerPromise;
}

chrome.runtime.onMessage.addListener(
  (message: ClassifierRuntimeRequest, _sender: unknown, sendResponse: (response: unknown) => void): boolean => {
    if (!message || message.target !== CLASSIFIER_RUNTIME_TARGET || message.action !== CLASSIFIER_REQUEST_ACTION) {
      return false;
    }
    if (message.op === ClassifierRuntimeOp.PING) {
      sendResponse({ ok: true, value: 'pong' });
      return false;
    }
    getHandler()
      .then((handler) => handler.handle(message))
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: serializeClassifierError(e) }));
    return true;
  },
);

console.log('WebAI Extension: classifier offscreen runtime started.');
