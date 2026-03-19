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

window.addEventListener('message', (event: any) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'WEBAI_DIAGNOSIS_EVAL_REQUEST') {
    const result = {
      Summarizer: typeof window.Summarizer !== 'undefined',
      LanguageModel: typeof window.LanguageModel !== 'undefined',
      Translator: typeof window.Translator !== 'undefined',
      LanguageDetector: typeof window.LanguageDetector !== 'undefined',
      Writer: typeof window.Writer !== 'undefined',
      Rewriter: typeof window.Rewriter !== 'undefined',
      Proofreader: typeof window.Proofreader !== 'undefined'
    };
    window.postMessage({
      type: 'WEBAI_DIAGNOSIS_EVAL_RESPONSE',
      messageId: event.data.messageId,
      data: result
    }, '*');
  }
});

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

window.webai.translator = window.webai.translator || {};
window.webai.translator.getHistory = createHistoryFetcher('Translator');

window.webai.languageDetector = window.webai.languageDetector || {};
window.webai.languageDetector.getHistory = createHistoryFetcher('LanguageDetector');

window.webai.writer = window.webai.writer || {};
window.webai.writer.getHistory = createHistoryFetcher('Writer');

window.webai.rewriter = window.webai.rewriter || {};
window.webai.rewriter.getHistory = createHistoryFetcher('Rewriter');

window.webai.proofreader = window.webai.proofreader || {};
window.webai.proofreader.getHistory = createHistoryFetcher('Proofreader');

async function sanitizeForPostMessage(obj: any, maxDepth = 10): Promise<any> {
  if (maxDepth < 0) return undefined;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
    return obj;
  }
  
  if (obj instanceof EventTarget && !(obj instanceof HTMLImageElement || obj instanceof HTMLVideoElement || obj instanceof HTMLCanvasElement)) return { __type: 'EventTarget' };
  if (obj instanceof ReadableStream) return { __type: 'ReadableStream' };
  
  const isImageSource = (
    (typeof window !== 'undefined' && 'ImageBitmap' in window && obj instanceof (window as any).ImageBitmap) ||
    (typeof window !== 'undefined' && 'ImageData' in window && obj instanceof (window as any).ImageData) ||
    (typeof window !== 'undefined' && 'HTMLImageElement' in window && obj instanceof (window as any).HTMLImageElement) ||
    (typeof window !== 'undefined' && 'HTMLVideoElement' in window && obj instanceof (window as any).HTMLVideoElement) ||
    (typeof window !== 'undefined' && 'HTMLCanvasElement' in window && obj instanceof (window as any).HTMLCanvasElement) ||
    (typeof window !== 'undefined' && 'OffscreenCanvas' in window && obj instanceof (window as any).OffscreenCanvas)
  );

  if (isImageSource) {
    let width = obj.width;
    let height = obj.height;
    if (typeof HTMLVideoElement !== 'undefined' && obj instanceof HTMLVideoElement) {
      width = obj.videoWidth;
      height = obj.videoHeight;
    } else if (typeof HTMLImageElement !== 'undefined' && obj instanceof HTMLImageElement) {
      width = obj.naturalWidth || obj.width;
      height = obj.naturalHeight || obj.height;
    } else if (typeof window !== 'undefined' && 'ImageBitmap' in window && obj instanceof (window as any).ImageBitmap) {
      width = obj.width;
      height = obj.height;
    } else if (typeof window !== 'undefined' && 'ImageData' in window && obj instanceof (window as any).ImageData) {
      width = obj.width;
      height = obj.height;
    }

    try {
      if (width > 0 && height > 0) {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (typeof window !== 'undefined' && 'ImageData' in window && obj instanceof (window as any).ImageData) {
            ctx.putImageData(obj, 0, 0);
          } else {
            ctx.drawImage(obj as any, 0, 0, width, height);
          }
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          return { __type: 'Blob', size: blob.size, type: 'image/png', dataUrl: dataUrl, width, height };
        }
      }
    } catch (e) {
      // Ignore errors (like cross-origin tainting) and fall back below
    }
    
    // Fallback if canvas manipulation failed (e.g., CORS tainting) or dimensions were 0
    if (typeof HTMLImageElement !== 'undefined' && obj instanceof HTMLImageElement && obj.src) {
      return { __type: 'Blob', size: 0, type: 'image/png', dataUrl: obj.src, width, height };
    }
    if (typeof HTMLVideoElement !== 'undefined' && obj instanceof HTMLVideoElement && (obj.src || obj.currentSrc)) {
      return { __type: 'Blob', size: 0, type: 'video/mp4', dataUrl: obj.currentSrc || obj.src, width, height };
    }
    
    return { __type: 'Blob', size: 0, type: 'image/png', width, height }; // ultimate fallback
  }

  if (typeof Blob !== 'undefined' && obj instanceof Blob) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(obj);
      });
      return { __type: 'Blob', size: obj.size, type: obj.type, dataUrl: dataUrl };
    } catch (e) {
      return { __type: 'Blob', size: obj.size, type: obj.type };
    }
  }
  if (typeof ArrayBuffer !== 'undefined' && (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer)) return { __type: 'BufferData', byteLength: obj.byteLength };

  if (Array.isArray(obj)) {
    const arr = [];
    for (const item of obj) {
      if (item === undefined || item === null) {
        arr.push(item);
      } else {
        arr.push(await sanitizeForPostMessage(item, maxDepth - 1));
      }
    }
    return arr;
  }

  if (typeof obj.toJSON === 'function') {
    try {
      return await sanitizeForPostMessage(obj.toJSON(), maxDepth - 1);
    } catch(e) {}
  }

  const isPrimitiveWrapper = obj instanceof String || obj instanceof Number || obj instanceof Boolean;

  const result: any = {};
  let hasProps = false;
  
  let currentObj = obj;
  const seenProps = new Set<string>();
  
  while (currentObj && currentObj !== Object.prototype && currentObj !== String.prototype && currentObj !== Number.prototype && currentObj !== Boolean.prototype) {
    for (const key of Object.getOwnPropertyNames(currentObj)) {
      if (key === 'constructor' || seenProps.has(key)) continue;
      
      // Skip array-like index properties and length on String wrappers
      if (isPrimitiveWrapper && (!isNaN(parseInt(key)) || key === 'length')) continue;

      seenProps.add(key);
      try {
        const val = obj[key];
        if (typeof val !== 'function') {
          hasProps = true;
          result[key] = await sanitizeForPostMessage(val, maxDepth - 1);
        }
      } catch(e) {}
    }
    currentObj = Object.getPrototypeOf(currentObj);
  }

  if (!hasProps) {
    if (isPrimitiveWrapper) return obj.valueOf();
    if (typeof obj.toString === 'function' && obj.toString !== Object.prototype.toString) {
      try { return obj.toString(); } catch(e) {}
    }
  }

  if (isPrimitiveWrapper && hasProps) {
    result.__value = obj.valueOf();
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
        let accumulatedResponse = '';
        return new ReadableStream({
          async pull(controller) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                emitStage(callId, sessionId, method, 'completed', { response: accumulatedResponse });
                controller.close();
              } else {
                if (!firstTokenSeen) {
                  firstTokenSeen = true;
                  emitStage(callId, sessionId, method, 'first_token');
                }
                if (typeof value === 'string') {
                  accumulatedResponse += value;
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
        const sanitizedOptions = await sanitizeForPostMessage(options || {});
        emitStage(callId, callId, 'create', 'create', { options: sanitizedOptions });

        try {
          const originalInstance = await originalCreate.call(this, options);
          emitStage(callId, callId, 'create', 'completed');

          return new Proxy(originalInstance, {
            get(target, prop, receiver) {
              const value = Reflect.get(target, prop, target);
              if (typeof value === 'function') {
                const methodName = prop.toString();
                const explicitlyWrapped = [
                  'prompt', 'promptStreaming', 'append',
                  'summarize', 'summarizeStreaming',
                  'translate', 'translateStreaming',
                  'detect', 'write', 'writeStreaming',
                  'rewrite', 'rewriteStreaming',
                  'proofread', 'proofreadStreaming',
                  'clone', 'destroy'
                ].includes(methodName);

                if (!explicitlyWrapped) {
                  return value.bind(target);
                }

                return function(...args: any[]) {
                  const methodCallId = crypto.randomUUID();
                  
                  sanitizeForPostMessage(args).then(sanitizedArgs => {
                    emitStage(methodCallId, callId, methodName, 'execute', { args: sanitizedArgs });
                  });

                  try {
                    const result = value.apply(target, args);
                    
                    if (result && typeof result.then === 'function') {
                      return result.then(async (res: any) => {
                        if (res instanceof ReadableStream) {
                          return handleStream(res, methodCallId, callId, methodName);
                        }
                        const sanitizedRes = await sanitizeForPostMessage(res);
                        emitStage(methodCallId, callId, methodName, 'completed', { response: sanitizedRes });
                        return res;
                      }).catch((err: any) => {
                        emitStage(methodCallId, callId, methodName, 'error', { errorMessage: err?.message || String(err) });
                        throw err;
                      });
                    } else if (result instanceof ReadableStream) {
                      return handleStream(result, methodCallId, callId, methodName);
                    } else {
                      sanitizeForPostMessage(result).then(sanitizedRes => {
                        emitStage(methodCallId, callId, methodName, 'completed', { response: sanitizedRes });
                      });
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
wrapAPI('Translator');
wrapAPI('LanguageDetector');
wrapAPI('Writer');
wrapAPI('Rewriter');
wrapAPI('Proofreader');
