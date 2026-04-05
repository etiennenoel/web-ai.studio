import { Component, OnInit, ChangeDetectorRef, NgZone, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const chrome: any;

@Component({
  selector: 'lib-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]">
      <!-- Header -->
      <div *ngIf="showHeader" class="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50 dark:bg-[#292a2d] px-6 py-4 flex items-center gap-3">
        <h2 class="text-lg font-bold tracking-wide">Settings</h2>
      </div>

      <!-- Content -->
      <div class="p-6 flex-1 overflow-y-auto">
        <h3 *ngIf="showHeader" class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Settings</h3>
        
        <div class="space-y-4">
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

          <!-- Model Routing -->
          <div class="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-[#292a2d] border border-gray-300 dark:border-[#3c4043] rounded-xl transition-all">
            <label for="modelRouting" class="font-medium text-gray-800 dark:text-gray-200">Select the backend for API calls:</label>
            <select 
              id="modelRouting" 
              [(ngModel)]="modelRouting" 
              (change)="saveSettings()"
              [disabled]="loading"
              class="bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
            >
              <option value="chrome">Built-In AI APIs (Chrome JS APIs)</option>
              <option value="gemini-3-flash-preview">Gemini 3.1 Flash</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
            </select>
            <div *ngIf="modelRouting !== 'chrome' && !geminiApiKey" class="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-2 rounded-md flex items-start gap-2">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span>You have selected a Gemini model, but no Gemini API Key is set.</span>
            </div>
          </div>

          <div class="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-[#292a2d] border border-gray-300 dark:border-[#3c4043] rounded-xl transition-all">
            <label class="font-medium text-gray-800 dark:text-gray-200">Gemini API Key</label>
            <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Used when routing requests to Gemini models instead of the built-in Chrome AI.
            </div>
            <input 
              type="password" 
              class="w-full px-3 py-2 border border-gray-300 dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="AIzaSy..."
              [(ngModel)]="geminiApiKey"
              (change)="saveSettings()"
              [disabled]="loading"
            >
          </div>
        </div>

        <div *ngIf="savedMessage" class="mt-4 flex items-center text-sm text-green-700 dark:text-green-400 font-medium transition-opacity bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800/50 p-3 rounded-lg w-fit">
          <i class="fa-solid fa-check-circle mr-2"></i> Settings saved successfully
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit {
  @Input() showHeader: boolean = true;
  
  wrapApiEnabled: boolean = true;
  modelRouting: string = 'chrome';
  geminiApiKey: string = '';
  loading: boolean = true;
  savedMessage: boolean = false;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, (response: any) => {
        this.ngZone.run(() => {
          if (!chrome.runtime.lastError) {
            this.wrapApiEnabled = response?.value !== false;
          }
          
          chrome.runtime.sendMessage({ action: 'get_setting', key: 'model_routing', defaultValue: 'chrome' }, (modelResponse: any) => {
            this.ngZone.run(() => {
              if (!chrome.runtime.lastError) {
                this.modelRouting = modelResponse?.value || 'chrome';
              }
              
              chrome.runtime.sendMessage({ action: 'get_setting', key: 'gemini_api_key', defaultValue: '' }, (keyResponse: any) => {
                this.ngZone.run(() => {
                  if (!chrome.runtime.lastError) {
                    this.geminiApiKey = keyResponse?.value || '';
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
      this.loading = false;
    }
  }

  saveSettings() {
    this.loading = true;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'set_setting', key: 'wrap_api', value: this.wrapApiEnabled }, (response: any) => {
        this.ngZone.run(() => {
          if (chrome.runtime.lastError) {
            console.error('Error saving wrap_api setting:', chrome.runtime.lastError);
          }
          
          chrome.runtime.sendMessage({ action: 'set_setting', key: 'model_routing', value: this.modelRouting }, (modelResponse: any) => {
            this.ngZone.run(() => {
              if (chrome.runtime.lastError) {
                console.error('Error saving model_routing setting:', chrome.runtime.lastError);
              }
              
              chrome.runtime.sendMessage({ action: 'set_setting', key: 'gemini_api_key', value: this.geminiApiKey }, (keyResponse: any) => {
                this.ngZone.run(() => {
                  this.loading = false;
                  if (chrome.runtime.lastError) {
                    console.error('Error saving gemini_api_key setting:', chrome.runtime.lastError);
                  } else {
                    this.showSavedMessage();
                  }
                  this.cdr.detectChanges();
                });
              });
            });
          });
        });
      });
    } else {
      this.loading = false;
    }
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
