import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { ClassifierRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';
import { ClassifierRuntimeClient } from '../../../base/src/lib/classifier/messaging/classifier-runtime-client';
import { serializeClassifierError } from '../../../base/src/lib/classifier/messaging/classifier-error.utils';
import { ClassifierRuntimeResponse } from '../../../base/src/lib/classifier/interfaces/classifier-runtime-response.interface';

/**
 * Forwards WEBAI_CLASSIFIER_REQUEST messages from the page's `Classifier`
 * polyfill to the offscreen runtime and posts the answer back. Download
 * progress relayed by the service worker is posted as WEBAI_CLASSIFIER_PROGRESS.
 */
export class ClassifierRequestHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.CLASSIFIER_REQUEST;

  async handle(message: ClassifierRequestMessage): Promise<void> {
    let data: ClassifierRuntimeResponse;
    try {
      const value = await ClassifierRuntimeClient.request(message.op, message.payload, {
        requestId: message.requestId,
        onProgress: (loaded) =>
          window.postMessage(
            { type: WindowMessageType.CLASSIFIER_PROGRESS, requestId: message.requestId, loaded },
            '*',
          ),
      });
      data = { ok: true, value };
    } catch (e) {
      data = { ok: false, error: serializeClassifierError(e) };
    }
    window.postMessage({ type: WindowMessageType.CLASSIFIER_RESPONSE, messageId: message.messageId, data }, '*');
  }
}
