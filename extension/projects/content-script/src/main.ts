import { APP_VERSION } from '../../base/src/lib/version';
import { HardwareInformation } from '../../base/src/lib/interfaces/hardware-info.interface';

declare const chrome: any;

console.log('WebAI Extension Content Script injected.');

// The content script executes in an "isolated world". 
// This means that even though it shares the same DOM as the host page,
// it does NOT share the same Javascript context (e.g. the same `window` object).
// If we attach properties to `window` here, the host page's scripts will never see them.
// Therefore, we MUST inject a `<script>` tag into the DOM to run code in the host page's context.

// 1. Inject script into the page DOM
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => {
  script.remove();
};

// 2. Listen for messages from the injected script
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data && event.data.type === 'WEBAI_HW_INFO_REQUEST') {
    const messageId = event.data.messageId;
    
    // Gather WebGL info
    let gpuRenderer = 'unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      console.error('Error getting WebGL info', e);
    }

    // Gather WebGPU info
    let webgpuInfo: any = null;
    try {
      if ((navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter && (adapter as any).info) {
          webgpuInfo = {
            vendor: (adapter as any).info.vendor,
            architecture: (adapter as any).info.architecture,
            device: (adapter as any).info.device,
            description: (adapter as any).info.description
          };
        }
      }
    } catch (e) {
      console.error('Error getting WebGPU info', e);
    }
    
    // Gather basic navigator info
    const navigatorInfo = {
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      userAgent: navigator.userAgent
    };
    
    // Get info from background script (chrome.system)
    chrome.runtime.sendMessage({ action: 'getHardwareInformation' }, (response: any) => {
      if (chrome.runtime.lastError) {
        window.postMessage({ 
          type: 'WEBAI_HW_INFO_RESPONSE', 
          messageId: messageId, 
          error: chrome.runtime.lastError.message 
        }, '*');
        return;
      }
      
      const data: HardwareInformation = {
        webgl_renderer: gpuRenderer,
        webgpu: webgpuInfo,
        navigator: navigatorInfo,
        cpu: response?.cpu || null,
        memory: response?.memory || null
      };
      
      window.postMessage({ 
        type: 'WEBAI_HW_INFO_RESPONSE', 
        messageId: messageId, 
        data: data 
      }, '*');
    });
  }
});
