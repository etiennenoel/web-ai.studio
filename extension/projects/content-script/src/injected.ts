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

function createHistoryFetcher(apiName: string) {
  return function(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const messageId = 'webai-history-' + Date.now() + '-' + Math.random();
      
      const listener = (event: any) => {
        if (event.source !== window) return;
        if (event.data && event.data.type === 'WEBAI_GET_HISTORY_RESPONSE' && event.data.messageId === messageId) {
          window.removeEventListener('message', listener);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.data);
          }
        }
      };
      
      window.addEventListener('message', listener);
      window.postMessage({ 
        type: 'WEBAI_GET_HISTORY', 
        messageId: messageId,
        payload: {
          apiName: apiName,
          origin: window.location.origin
        }
      }, '*');
    });
  };
}

window.webai.languageModel = window.webai.languageModel || {};
window.webai.languageModel.getHistory = createHistoryFetcher('LanguageModel');

window.webai.summarizer = window.webai.summarizer || {};
window.webai.summarizer.getHistory = createHistoryFetcher('Summarizer');

function sanitizeForPostMessage(obj: any, maxDepth = 3): any {
  if (maxDepth < 0) return undefined;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
    return obj;
  }
  
  if (obj instanceof EventTarget) return { __type: 'EventTarget' };
  if (obj instanceof ReadableStream) return { __type: 'ReadableStream' };
  if (typeof Blob !== 'undefined' && obj instanceof Blob) return { __type: 'Blob', size: obj.size, type: obj.type };
  if (typeof ArrayBuffer !== 'undefined' && (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer)) return { __type: 'BufferData', byteLength: obj.byteLength };

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForPostMessage(item, maxDepth - 1));
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeForPostMessage(obj[key], maxDepth - 1);
  }
  return result;
}

function wrapAPI(apiName: string) {
  if (typeof window !== 'undefined' && apiName in window) {
    const apiObj = (window as any)[apiName];
    if (apiObj && typeof apiObj.create === 'function') {
      const originalCreate = apiObj.create;

      function emitStage(callId: string, sessionId: string, method: string, stage: string, extra: any = {}) {
        try {
          window.postMessage({
            type: 'WEBAI_API_CALL',
            payload: {
              id: callId,
              sessionId: sessionId,
              api: apiName,
              method: method,
              stage: stage,
              origin: window.location.origin,
              timestamp: Date.now(),
              ...extra
            }
          }, '*');
        } catch (e) {
          console.warn('WebAI Extension: Could not send API call log', e);
        }
      }

      const handleStream = (stream: ReadableStream, callId: string, sessionId: string, method: string) => {
        const reader = stream.getReader();
        let firstTokenSeen = false;
        return new ReadableStream({
          async pull(controller) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                emitStage(callId, sessionId, method, 'completed');
                controller.close();
              } else {
                if (!firstTokenSeen) {
                  firstTokenSeen = true;
                  emitStage(callId, sessionId, method, 'first_token');
                }
                controller.enqueue(value);
              }
            } catch (err: any) {
              emitStage(callId, sessionId, method, 'error', { errorMessage: err?.message || String(err) });
              controller.error(err);
            }
          },
          cancel(reason) {
            stream.cancel(reason);
          }
        });
      };

      apiObj.create = async function(options?: any) {
        const callId = crypto.randomUUID();
        emitStage(callId, callId, 'create', 'create', { options: sanitizeForPostMessage(options || {}) });

        try {
          const originalInstance = await originalCreate.call(this, options);
          emitStage(callId, callId, 'create', 'completed');

          return new Proxy(originalInstance, {
            get(target, prop, receiver) {
              const value = Reflect.get(target, prop, receiver);
              if (typeof value === 'function') {
                return function(...args: any[]) {
                  const methodCallId = crypto.randomUUID();
                  const methodName = prop.toString();
                  
                  emitStage(methodCallId, callId, methodName, 'execute', { args: sanitizeForPostMessage(args) });

                  try {
                    const result = value.apply(target, args);
                    
                    if (result instanceof Promise) {
                      return result.then(res => {
                        if (res instanceof ReadableStream) {
                          return handleStream(res, methodCallId, callId, methodName);
                        }
                        emitStage(methodCallId, callId, methodName, 'completed');
                        return res;
                      }).catch(err => {
                        emitStage(methodCallId, callId, methodName, 'error', { errorMessage: err?.message || String(err) });
                        throw err;
                      });
                    } else if (result instanceof ReadableStream) {
                      return handleStream(result, methodCallId, callId, methodName);
                    } else {
                      emitStage(methodCallId, callId, methodName, 'completed');
                      return result;
                    }
                  } catch (err: any) {
                    emitStage(methodCallId, callId, methodName, 'error', { errorMessage: err?.message || String(err) });
                    throw err;
                  }
                };
              }
              return value;
            }
          });
        } catch (err: any) {
          emitStage(callId, callId, 'create', 'error', { errorMessage: err?.message || String(err) });
          throw err;
        }
      };
    }
  }
}

wrapAPI('LanguageModel');
wrapAPI('Summarizer');
