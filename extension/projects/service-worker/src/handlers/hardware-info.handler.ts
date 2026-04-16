import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

/**
 * Handles GET_HARDWARE_INFO messages by querying chrome.system.cpu
 * and chrome.system.memory APIs.
 *
 * These APIs are only available in the service worker context (they require
 * the "system.cpu" and "system.memory" permissions). The content script
 * collects WebGL/WebGPU/navigator info locally and combines it with the
 * CPU/memory data returned here.
 */
export class HardwareInfoHandler implements RuntimeMessageHandler {
  readonly handledActions = [RuntimeMessageAction.GET_HARDWARE_INFO];

  async handle(_request: RuntimeMessage, _sender: any): Promise<unknown> {
    const [cpuInfo, memoryInfo] = await Promise.all([
      new Promise((resolve) => chrome.system.cpu.getInfo(resolve)),
      new Promise((resolve) => chrome.system.memory.getInfo(resolve)),
    ]);

    return { cpu: cpuInfo, memory: memoryInfo };
  }
}
