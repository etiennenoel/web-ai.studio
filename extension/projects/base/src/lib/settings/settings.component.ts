import { Component, OnInit, ChangeDetectorRef, NgZone, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const chrome: any;

export interface Provider {
  id: string;
  name: string;
  type: 'chrome' | 'gemini' | 'openai';
  isEditable: boolean;
  endpointUrl?: string;
  modelId?: string;
  apiKey?: string;
  systemPrompt?: string;
}

const DEFAULT_PROVIDERS: Provider[] = [
  { id: 'chrome', name: 'Built-In AI APIs (Chrome JS APIs)', type: 'chrome', isEditable: false },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', type: 'gemini', modelId: 'gemini-3.1-flash', isEditable: true },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', type: 'gemini', modelId: 'gemini-3.1-flash-lite', isEditable: true },
];

@Component({
  selector: 'lib-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]">
      <!-- Header -->
      <div *ngIf="showHeader" class="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50 dark:bg-[#292a2d] px-6 py-4 flex items-center gap-3 shrink-0">
        <h2 class="text-lg font-bold tracking-wide">Settings</h2>
      </div>

      <!-- Content -->
      <div class="p-6 flex-1 overflow-y-auto relative">
        <h3 *ngIf="showHeader" class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Settings</h3>
        
        <div class="space-y-6 max-w-4xl">
          
          <!-- API Wrapping -->
          <label class="flex items-start gap-4 cursor-pointer group p-4 bg-gray-50 dark:bg-[#292a2d] border border-gray-300 dark:border-[#3c4043] hover:border-gray-400 dark:hover:border-[#5f6368] rounded-xl transition-all">
            <div class="flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                class="w-5 h-5 rounded border-gray-500 bg-white dark:bg-[#202124] text-blue-500 focus:ring-blue-600 ring-offset-gray-50 dark:ring-offset-[#292a2d] transition-colors cursor-pointer"
                [(ngModel)]="wrapApiEnabled"
                (change)="saveSettings()"
                [disabled]="loading"
              >
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-800 dark:text-gray-200 group-hover:text-white transition-colors">Enable API Wrapping</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                When enabled, the extension wraps the built-in AI APIs (LanguageModel, Summarizer, etc.) in the page to record calls to the History panel. Disabling this prevents the extension from seeing or modifying any API calls.
              </div>
            </div>
          </label>

          <!-- Provider Selection -->
          <div class="flex flex-col gap-3 p-5 bg-gray-50 dark:bg-[#292a2d] border border-gray-300 dark:border-[#3c4043] rounded-xl transition-all">
            <div>
              <h4 class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Active Provider</h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Select the backend that powers the Built-In AI API calls across your browser.</p>
            </div>
            <div class="flex gap-2">
              <select 
                [(ngModel)]="activeProviderId" 
                (change)="saveSettings()"
                [disabled]="loading"
                class="bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              >
                <option *ngFor="let p of providers" [value]="p.id">{{ p.name }}</option>
              </select>
              <button 
                (click)="startAddProvider()"
                class="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <i class="fas fa-plus"></i> Add
              </button>
            </div>

            <!-- Active Provider Warnings -->
            <div *ngIf="activeProvider?.type === 'gemini' && !activeProvider?.apiKey" class="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-2 rounded-md flex items-start gap-2">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span>This Gemini provider requires an API Key. Please edit it below.</span>
            </div>
            <div *ngIf="activeProvider?.type === 'openai' && !activeProvider?.endpointUrl" class="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-2 rounded-md flex items-start gap-2">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span>This OpenAI provider requires an Endpoint URL. Please edit it below.</span>
            </div>
          </div>

          <!-- Configured Providers List -->
          <div>
            <h4 class="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-3">Configured Providers</h4>
            <div class="grid gap-3">
              <div *ngFor="let p of providers" class="flex items-center justify-between p-3 bg-white dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-gray-100 dark:bg-[#3c4043] flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <i *ngIf="p.type === 'chrome'" class="fa-brands fa-chrome"></i>
                    <i *ngIf="p.type === 'gemini'" class="fa-solid fa-wand-magic-sparkles"></i>
                    <i *ngIf="p.type === 'openai'" class="fa-solid fa-server"></i>
                  </div>
                  <div>
                    <div class="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      {{ p.name }}
                      <span *ngIf="p.id === activeProviderId" class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] rounded uppercase tracking-wider font-bold">Active</span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span *ngIf="p.type === 'chrome'">Native Browser API</span>
                      <span *ngIf="p.type === 'gemini'">Gemini API | {{ p.modelId }}</span>
                      <span *ngIf="p.type === 'openai'">Local Server | {{ p.endpointUrl }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button (click)="editProvider(p)" class="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button *ngIf="p.isEditable" (click)="deleteProvider(p)" class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div *ngIf="savedMessage" class="fixed bottom-6 right-6 flex items-center text-sm text-green-700 dark:text-green-400 font-medium transition-opacity bg-green-50 dark:bg-green-900 shadow-lg border border-green-300 dark:border-green-800 p-3 rounded-lg w-fit z-50">
          <i class="fa-solid fa-check-circle mr-2"></i> Settings saved successfully
        </div>
      </div>

      <!-- Add/Edit Provider Modal -->
      <div *ngIf="editingProvider" class="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#5f6368] rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90%]">
          <div class="p-4 border-b border-gray-200 dark:border-[#3c4043] flex justify-between items-center">
            <h3 class="font-bold text-gray-900 dark:text-white">{{ isNewProvider ? 'Add Provider' : 'Edit Provider' }}</h3>
            <button (click)="cancelEdit()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto space-y-4">
            
            <div *ngIf="!editingProvider.isEditable" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300 mb-4">
              This is a default provider. You can only edit its API credentials or overrides.
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider Type</label>
              <select [(ngModel)]="editingProvider.type" [disabled]="!editingProvider.isEditable" class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="gemini">Gemini API</option>
                <option value="openai">OpenAI Compatible (Local/Custom Server)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider Name</label>
              <input type="text" [(ngModel)]="editingProvider.name" [disabled]="!editingProvider.isEditable" placeholder="e.g. My LM Studio" class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none disabled:opacity-50 disabled:cursor-not-allowed">
            </div>

            <div *ngIf="editingProvider.type === 'openai'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Endpoint URL</label>
              <input type="text" [(ngModel)]="editingProvider.endpointUrl" placeholder="http://localhost:1234/v1/chat/completions" class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-mono">
              <p class="text-[10px] text-gray-500 mt-1">LM Studio: http://localhost:1234/v1/chat/completions | llama.cpp: http://localhost:8080/v1/chat/completions</p>
            </div>

            <div *ngIf="editingProvider.type !== 'chrome'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Model ID (Optional)</label>
              <input type="text" [(ngModel)]="editingProvider.modelId" [disabled]="!editingProvider.isEditable && editingProvider.type === 'gemini'" placeholder="e.g. gemini-3.1-flash" class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed">
            </div>

            <div *ngIf="editingProvider.type !== 'chrome'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input type="password" [(ngModel)]="editingProvider.apiKey" placeholder="AIzaSy... or custom key" class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-mono">
              <p *ngIf="editingProvider.type === 'openai'" class="text-[10px] text-gray-500 mt-1">Some local servers require a dummy key (e.g. 'lm-studio')</p>
            </div>

            <div *ngIf="editingProvider.type === 'openai'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">System Prompt Override (Optional)</label>
              <textarea [(ngModel)]="editingProvider.systemPrompt" rows="3" placeholder="Force a specific system prompt..." class="bg-gray-50 dark:bg-[#171717] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none resize-y"></textarea>
              <p class="text-[10px] text-gray-500 mt-1">Useful to coerce small local models to behave properly.</p>
            </div>

          </div>

          <div class="p-4 border-t border-gray-200 dark:border-[#3c4043] flex justify-end gap-2 bg-gray-50 dark:bg-[#292a2d] rounded-b-xl">
            <button (click)="cancelEdit()" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3c4043] rounded-lg transition-colors">Cancel</button>
            <button (click)="saveEditedProvider()" [disabled]="!isValidProvider(editingProvider)" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">Save Provider</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit {
  @Input() showHeader: boolean = true;
  
  wrapApiEnabled: boolean = true;
  providers: Provider[] = [];
  activeProviderId: string = 'chrome';
  loading: boolean = true;
  savedMessage: boolean = false;

  editingProvider: Provider | null = null;
  isNewProvider: boolean = false;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.loadSettings();
  }

  get activeProvider(): Provider | undefined {
    return this.providers.find(p => p.id === this.activeProviderId);
  }

  loadSettings() {
    this.loading = true;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, (response: any) => {
        this.ngZone.run(() => {
          if (!chrome.runtime.lastError) {
            this.wrapApiEnabled = response?.value !== false;
          }
          
          chrome.runtime.sendMessage({ action: 'get_setting', key: 'providers', defaultValue: DEFAULT_PROVIDERS }, (provResponse: any) => {
            this.ngZone.run(() => {
              if (!chrome.runtime.lastError) {
                // Merge loaded providers with defaults if they are missing
                let loadedProviders = provResponse?.value || DEFAULT_PROVIDERS;
                // Just to be safe, if for some reason the array is empty, reset to default
                if (loadedProviders.length === 0) {
                  loadedProviders = [...DEFAULT_PROVIDERS];
                }
                
                // Keep the same length for default ones, map API keys
                const finalProviders = [];
                for (const defP of DEFAULT_PROVIDERS) {
                  const existing = loadedProviders.find((lp: Provider) => lp.id === defP.id);
                  if (existing) {
                    finalProviders.push({ ...defP, ...existing });
                  } else {
                    finalProviders.push(defP);
                  }
                }
                // Add any custom ones
                for (const loaded of loadedProviders) {
                  if (!DEFAULT_PROVIDERS.find(dp => dp.id === loaded.id)) {
                    finalProviders.push(loaded);
                  }
                }

                this.providers = finalProviders;
              }
              
              chrome.runtime.sendMessage({ action: 'get_setting', key: 'activeProviderId', defaultValue: 'chrome' }, (actResponse: any) => {
                this.ngZone.run(() => {
                  if (!chrome.runtime.lastError) {
                    this.activeProviderId = actResponse?.value || 'chrome';
                  }
                  
                  // Ensure active provider exists
                  if (!this.providers.some(p => p.id === this.activeProviderId)) {
                    this.activeProviderId = this.providers[0]?.id || 'chrome';
                  }

                  this.loading = false;
                  this.cdr.detectChanges();
                });
              });
            });
          });
        });
      });
    } else {
      this.providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
      this.loading = false;
    }
  }

  saveSettings() {
    this.loading = true;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'set_setting', key: 'wrap_api', value: this.wrapApiEnabled }, () => {
        chrome.runtime.sendMessage({ action: 'set_setting', key: 'providers', value: this.providers }, () => {
          chrome.runtime.sendMessage({ action: 'set_setting', key: 'activeProviderId', value: this.activeProviderId }, () => {
            this.ngZone.run(() => {
              this.loading = false;
              this.showSavedMessage();
              this.cdr.detectChanges();
            });
          });
        });
      });
    } else {
      this.loading = false;
      this.showSavedMessage();
    }
  }

  startAddProvider() {
    this.isNewProvider = true;
    this.editingProvider = {
      id: 'provider-' + Date.now(),
      name: 'New Provider',
      type: 'openai',
      isEditable: true,
      endpointUrl: 'http://localhost:1234/v1/chat/completions'
    };
  }

  editProvider(provider: Provider) {
    this.isNewProvider = false;
    this.editingProvider = JSON.parse(JSON.stringify(provider)); // Deep clone
  }

  cancelEdit() {
    this.editingProvider = null;
  }

  saveEditedProvider() {
    if (!this.editingProvider) return;
    
    if (this.isNewProvider) {
      this.providers.push(this.editingProvider);
      this.activeProviderId = this.editingProvider.id;
    } else {
      const index = this.providers.findIndex(p => p.id === this.editingProvider!.id);
      if (index >= 0) {
        this.providers[index] = this.editingProvider;
      }
    }
    
    this.editingProvider = null;
    this.saveSettings();
  }

  deleteProvider(provider: Provider) {
    if (!provider.isEditable) return;
    if (confirm(`Are you sure you want to delete "${provider.name}"?`)) {
      this.providers = this.providers.filter(p => p.id !== provider.id);
      if (this.activeProviderId === provider.id) {
        this.activeProviderId = this.providers[0]?.id || 'chrome';
      }
      this.saveSettings();
    }
  }

  isValidProvider(p: Provider | null): boolean {
    if (!p) return false;
    if (p.type !== 'chrome' && (!p.name || p.name.trim() === '')) return false;
    if (p.type === 'openai' && (!p.endpointUrl || p.endpointUrl.trim() === '')) return false;
    return true;
  }

  private showSavedMessage() {
    this.savedMessage = true;
    setTimeout(() => {
      this.ngZone.run(() => {
        this.savedMessage = false;
        this.cdr.detectChanges();
      });
    }, 2000);
  }
}