import { APP_VERSION } from '../../base/src/lib/version';
import { HardwareInformation } from '../../base/src/lib/interfaces/hardware-info.interface';

declare const chrome: any;

console.log('WebAI Extension Content Script injected.');

// The content script executes in an "isolated world". 
// This means that even though it shares the same DOM as the host page,
// it does NOT share the same Javascript context (e.g. the same `window` object).
// If we attach properties to `window` here, the host page's scripts will never see them.
// Therefore, we MUST inject a `<script>` tag into the DOM to run code in the host page's context.

// Check settings before injecting the wrapping script
chrome.runtime.sendMessage({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, (response: any) => {
  // If chrome.runtime.lastError occurs, we assume default (true)
  const wrapApi = response && response.value !== undefined ? response.value : true;
  
  if (wrapApi) {
    // 1. Inject script into the page DOM
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
      script.remove();
    };
  } else {
    console.log('WebAI Extension: API wrapping is disabled in settings.');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'diagnose_apis') {
    const messageId = 'webai-diag-' + Date.now() + '-' + Math.random();
    
    const listener = (event: any) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'WEBAI_DIAGNOSIS_EVAL_RESPONSE' && event.data.messageId === messageId) {
        window.removeEventListener('message', listener);
        sendResponse({ data: event.data.data });
      }
    };
    
    window.addEventListener('message', listener);
    window.postMessage({ type: 'WEBAI_DIAGNOSIS_EVAL_REQUEST', messageId: messageId }, '*');
    
    // Return true to indicate we wish to send a response asynchronously
    return true;
  }
});

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
  } else if (event.data && event.data.type === 'WEBAI_ROUTING_REQUEST') {
    const messageId = event.data.messageId;
    chrome.runtime.sendMessage({ action: 'get_setting', key: 'activeProviderId', defaultValue: 'chrome' }, (response: any) => {
      const routing = response?.value || 'chrome';
      window.postMessage({ type: 'WEBAI_ROUTING_RESPONSE', messageId: messageId, data: { modelRouting: routing } }, '*');
    });
  } else if (event.data && event.data.type === 'WEBAI_GEMINI_REQUEST') {
    const messageId = event.data.messageId;
    const payload = event.data.payload;
    
    chrome.runtime.sendMessage({ action: 'get_setting', key: 'activeProviderId', defaultValue: 'chrome' }, (actResp: any) => {
      const activeProviderId = actResp?.value || 'chrome';
      chrome.runtime.sendMessage({ action: 'get_setting', key: 'providers', defaultValue: [] }, (provResp: any) => {
        const providers = provResp?.value || [];
        const provider = providers.find((p: any) => p.id === activeProviderId) || { type: 'chrome' };
        
        const rawArg = payload.args && payload.args.length > 0 ? payload.args[0] : '';
        let fallbackText = '';
        if (typeof rawArg === 'string') {
          fallbackText = rawArg;
        } else {
          fallbackText = JSON.stringify(rawArg);
        }

        if (provider.type === 'gemini') {
          const apiKey = provider.apiKey || '';
          if (!apiKey) {
            window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, error: 'Gemini API Key is missing for this provider.' }, '*');
            return;
          }
          
          let contents: any[] = [];

          if (typeof rawArg === 'string') {
            contents.push({ role: 'user', parts: [{ text: rawArg }] });
          } else if (Array.isArray(rawArg)) {
            for (const msg of rawArg) {
              const role = msg.role === 'assistant' ? 'model' : 'user';
              let parts: any[] = [];
              if (typeof msg.content === 'string') {
                parts.push({ text: msg.content });
              } else if (Array.isArray(msg.content)) {
                for (const item of msg.content) {
                  if (item.type === 'text') {
                    parts.push({ text: item.value || '' });
                  } else if ((item.type === 'image' || item.type === 'audio') && item.value && item.value.dataUrl) {
                    const dataUrl = item.value.dataUrl;
                    const splitDataUrl = dataUrl.split(',');
                    if (splitDataUrl.length === 2) {
                      const mimeMatch = splitDataUrl[0].match(/:(.*?);/);
                      const mimeType = mimeMatch ? mimeMatch[1] : item.value.type;
                      parts.push({
                        inlineData: {
                          mimeType: mimeType,
                          data: splitDataUrl[1]
                        }
                      });
                    }
                  } else {
                    parts.push({ text: JSON.stringify(item) });
                  }
                }
              } else {
                parts.push({ text: JSON.stringify(msg.content) });
              }
              contents.push({ role, parts });
            }
          } else if (typeof rawArg === 'object') {
            contents.push({ role: 'user', parts: [{ text: JSON.stringify(rawArg) }] });
          }

          if (payload.api === 'Summarizer') {
             contents = [{ role: 'user', parts: [{ text: `Summarize the following text:\n\n${fallbackText}` }] }];
          } else if (payload.api === 'Writer') {
             contents = [{ role: 'user', parts: [{ text: `Write about the following topic:\n\n${fallbackText}` }] }];
          } else if (payload.api === 'Rewriter') {
             contents = [{ role: 'user', parts: [{ text: `Rewrite the following text:\n\n${fallbackText}` }] }];
          } else if (payload.api === 'Translator') {
             contents = [{ role: 'user', parts: [{ text: `Translate the following text:\n\n${fallbackText}` }] }];
          }

          const modelId = provider.modelId || 'gemini-1.5-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contents })
          }).then(async res => {
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Gemini API Error: ${res.status} ${errBody}`);
            }
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, data: text }, '*');
          }).catch(err => {
             window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, error: err.message }, '*');
          });

        } else if (provider.type === 'openai') {
          const endpointUrl = provider.endpointUrl;
          if (!endpointUrl) {
            window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, error: 'Endpoint URL is missing for this OpenAI provider.' }, '*');
            return;
          }

          let messages: any[] = [];

          if (provider.systemPrompt) {
            messages.push({ role: 'system', content: provider.systemPrompt });
          }

          if (typeof rawArg === 'string') {
            messages.push({ role: 'user', content: rawArg });
          } else if (Array.isArray(rawArg)) {
            for (const msg of rawArg) {
              const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : msg.role;
              let contentStr = '';
              if (typeof msg.content === 'string') {
                contentStr = msg.content;
              } else if (Array.isArray(msg.content)) {
                contentStr = msg.content.map((c: any) => c.text || c.value || JSON.stringify(c)).join('\n');
              } else {
                contentStr = JSON.stringify(msg.content);
              }
              messages.push({ role, content: contentStr });
            }
          } else if (typeof rawArg === 'object') {
            messages.push({ role: 'user', content: JSON.stringify(rawArg) });
          }

          if (payload.api === 'Summarizer') {
             messages = [{ role: 'user', content: `Summarize the following text:\n\n${fallbackText}` }];
          } else if (payload.api === 'Writer') {
             messages = [{ role: 'user', content: `Write about the following topic:\n\n${fallbackText}` }];
          } else if (payload.api === 'Rewriter') {
             messages = [{ role: 'user', content: `Rewrite the following text:\n\n${fallbackText}` }];
          } else if (payload.api === 'Translator') {
             messages = [{ role: 'user', content: `Translate the following text:\n\n${fallbackText}` }];
          }

          // Ensure system prompt is first if needed
          if (provider.systemPrompt && messages.length > 0 && messages[0].role !== 'system') {
            messages.unshift({ role: 'system', content: provider.systemPrompt });
          }

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (provider.apiKey) {
            headers['Authorization'] = `Bearer ${provider.apiKey}`;
          }

          const body: any = {
            messages: messages,
            temperature: 0.7,
            stream: false
          };
          if (provider.modelId) {
            body.model = provider.modelId;
          } else {
            body.model = 'local-model'; // Fallback for some strict wrappers
          }

          fetch(endpointUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
          }).then(async res => {
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Local Provider Error: ${res.status} ${errBody}`);
            }
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || '';
            window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, data: text }, '*');
          }).catch(err => {
            window.postMessage({ type: 'WEBAI_GEMINI_RESPONSE', messageId, error: err.message }, '*');
          });
        }
      });
    });
  } else if (event.data && event.data.type === 'WEBAI_API_CALL') {
    // Forward the API call log to the background script
    chrome.runtime.sendMessage({
      action: 'log_api_call',
      payload: event.data.payload
    }, () => {
      // Ignore response or error to avoid console warnings
      if (chrome.runtime.lastError) {
        // do nothing
      }
    });
  } else if (event.data && event.data.type === 'WEBAI_GET_HISTORY') {
    const messageId = event.data.messageId;
    chrome.runtime.sendMessage({
      action: 'get_api_history',
      payload: event.data.payload
    }, (response: any) => {
      if (chrome.runtime.lastError) {
        window.postMessage({ 
          type: 'WEBAI_GET_HISTORY_RESPONSE', 
          messageId: messageId, 
          error: chrome.runtime.lastError.message 
        }, '*');
        return;
      }
      
      window.postMessage({ 
        type: 'WEBAI_GET_HISTORY_RESPONSE', 
        messageId: messageId, 
        data: response.data,
        error: response.error
      }, '*');
    });
  }
});
