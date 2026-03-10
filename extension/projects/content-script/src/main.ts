import { APP_VERSION } from '../../base/src/lib/version';
import { HardwareInformation } from '../../base/src/lib/interfaces/hardware-info.interface';

declare const chrome: any;

console.log('WebAI Extension Content Script injected.');

// 1. Inject script into the page DOM
const script = document.createElement('script');
script.textContent = `
  window.webai = window.webai || {};
  window.webai.version = '${APP_VERSION}'; // Matches manifest version
  
  window.webai.getHardwareInformation = function(): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = 'webai-hw-info-' + Date.now() + '-' + Math.random();
      
      const listener = (event: any) => {
        if (event.source !== window) return;
        if (event.data && event.data.type === 'WEBAI_HW_INFO_RESPONSE' && event.data.messageId === messageId) {
          window.removeEventListener('message', listener);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.data);
          }
        }
      };
      
      window.addEventListener('message', listener);
      window.postMessage({ type: 'WEBAI_HW_INFO_REQUEST', messageId: messageId }, '*');
    });
  };
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

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
