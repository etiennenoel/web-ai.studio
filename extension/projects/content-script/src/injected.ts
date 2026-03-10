import { APP_VERSION } from '../../base/src/lib/version';

declare global {
  interface Window {
    webai: any;
  }
}

window.webai = window.webai || {};
window.webai.version = APP_VERSION; // Matches manifest version

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
