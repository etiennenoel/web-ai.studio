import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { HwInfoRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { HardwareInformation } from '../../../base/src/lib/interfaces/hardware-info.interface';
import { WindowMessageHandler } from './window-message-handler.interface';

declare const chrome: any;

/**
 * Handles WEBAI_HW_INFO_REQUEST by collecting hardware information from
 * three sources and combining them into a single response:
 *
 * 1. **WebGL** - GPU renderer string (collected locally via canvas)
 * 2. **WebGPU** - Adapter info (collected locally via navigator.gpu)
 * 3. **Navigator** - hardwareConcurrency, deviceMemory, userAgent (local)
 * 4. **CPU/Memory** - Detailed info from chrome.system APIs (via service worker)
 *
 * Items 1-3 are collected in the content script because they require DOM access.
 * Item 4 requires the chrome.system permission, only available to the service worker.
 */
export class HwInfoHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.HW_INFO_REQUEST;

  async handle(message: HwInfoRequestMessage): Promise<void> {
    const messageId = message.messageId;

    const gpuRenderer = this.collectWebGlRenderer();
    const webgpuInfo = await this.collectWebGpuInfo();
    const navigatorInfo = this.collectNavigatorInfo();

    // Request CPU/memory from service worker (requires chrome.system permission)
    chrome.runtime.sendMessage(
      { action: RuntimeMessageAction.GET_HARDWARE_INFO },
      (response: any) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: WindowMessageType.HW_INFO_RESPONSE,
            messageId,
            error: chrome.runtime.lastError.message,
          }, '*');
          return;
        }

        const data: HardwareInformation = {
          webgl_renderer: gpuRenderer,
          webgpu: webgpuInfo,
          navigator: navigatorInfo,
          cpu: response?.cpu || null,
          memory: response?.memory || null,
        };

        window.postMessage({
          type: WindowMessageType.HW_INFO_RESPONSE,
          messageId,
          data,
        }, '*');
      },
    );
  }

  /** Extracts the GPU renderer string via the WEBGL_debug_renderer_info extension. */
  private collectWebGlRenderer(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      console.error('Error getting WebGL info', e);
    }
    return 'unknown';
  }

  /** Queries the WebGPU adapter for device information. */
  private async collectWebGpuInfo(): Promise<HardwareInformation['webgpu']> {
    try {
      if ((navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter?.info) {
          return {
            vendor: adapter.info.vendor,
            architecture: adapter.info.architecture,
            device: adapter.info.device,
            description: adapter.info.description,
          };
        }
      }
    } catch (e) {
      console.error('Error getting WebGPU info', e);
    }
    return null;
  }

  /** Collects basic navigator properties available to the content script. */
  private collectNavigatorInfo(): HardwareInformation['navigator'] {
    return {
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      userAgent: navigator.userAgent,
    };
  }
}
