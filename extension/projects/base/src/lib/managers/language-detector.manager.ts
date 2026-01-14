/// <reference lib="dom" />
/// <reference types="@types/dom-chromium-ai" />
import { Injectable } from '@angular/core';
import { ApiStatus } from '../enums/api-status.enum';
import { ApiStatusResult } from '../interfaces/api-status-result.interface';

@Injectable({
  providedIn: 'root'
})
export class LanguageDetectorManager {

  async getAvailability(options?: any): Promise<Availability> {
    if (!('LanguageDetector' in window)) {
      return 'unavailable';
    }
    // @ts-ignore
    return await window.LanguageDetector.availability(options);
  }

  async create(options?: any): Promise<any> {
    // @ts-ignore
    return await window.LanguageDetector.create(options);
  }

  getCodeSnippet(input: string): string {
    const escapedInput = input.replace(/"/g, '\\"');
    return `const detector = await LanguageDetector.create();
const result = await detector.detect("${escapedInput}");
console.log(result);`;
  }

  async getStatus(): Promise<ApiStatusResult> {
    const checks = [];
    let status = ApiStatus.UNKNOWN;
    let message = '';
    let errorHtml: string | undefined = undefined;

    const hasGlobal = 'LanguageDetector' in window;
    checks.push({
      titleHtml: 'Global Object (<code>window.LanguageDetector</code>)',
      success: hasGlobal
    });

    if (!hasGlobal) {
      errorHtml = `
        <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Troubleshooting Steps</h4>
        <div class="text-xs text-red-100">
            <p class="mb-2">The <code>window.LanguageDetector</code> object was not found. This shouldn't happen, unless you are using an unsupported version of Chrome. Please contact us. You can also try these steps:</p>
            <ul class="list-disc pl-4 space-y-1">
                <li>Navigate to <code>chrome://flags</code>.</li>
                <li>Search for <strong>"Language Detection API"</strong> and enable it.</li>
                <li>Relaunch Chrome.</li>
                <li>Reload the extension.</li>
            </ul>
        </div>
      `;
      return {
        status: ApiStatus.UNAVAILABLE,
        message: 'Language Detector API is not supported.',
        checks,
        errorHtml
      };
    }

    try {
      // @ts-ignore
      const availability = await window.LanguageDetector.availability();
      
      checks.push({
        titleHtml: 'Availability Check',
        success: availability !== 'no' && availability !== 'unavailable'
      });

      status = availability as ApiStatus;

      if (status === ApiStatus.AVAILABLE || status === 'readily' as any) {
          message = 'Ready';
          status = ApiStatus.AVAILABLE;
      } else if (status === ApiStatus.DOWNLOADABLE) {
          message = 'Model available for download.';
          status = ApiStatus.DOWNLOADABLE;
          errorHtml = `
            <h4 class="text-xs font-bold text-orange-200 uppercase mb-2"><i class="fa-solid fa-cloud-arrow-down mr-1"></i> Model Download Required</h4>
            <div class="text-xs text-orange-100">
                <p class="mb-2">The Language Detector API model needs to be downloaded before it can be used.</p>
                <ul class="list-disc pl-4 space-y-1">
                    <li>Go to the <strong>Models</strong> tab in this extension.</li>
                    <li>Locate the relevant model and click <strong>Download</strong>.</li>
                    <li>Once downloaded, the API will become available.</li>
                </ul>
            </div>
          `;
      } else if (status === ApiStatus.DOWNLOADING) {
          message = 'Model is downloading.';
      } else {
          message = 'Language Detector API unavailable.';
          status = ApiStatus.UNAVAILABLE;
          errorHtml = `
            <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-ban mr-1"></i> API Unavailable</h4>
            <div class="text-xs text-red-100">
                <p class="mb-2">The Language Detector API is currently unavailable for reasons unknown. This might be a temporary issue or indicate a problem with your browser configuration.</p>
                <ul class="list-disc pl-4 space-y-1">
                    <li>Please file a bug.</li>
                </ul>
            </div>
          `;
      }

    } catch (e: any) {
      status = ApiStatus.ERROR;
      message = `Error: ${e.message}`;
      checks.push({
        titleHtml: `Check Failed: ${e.message}`,
        success: false
      });
      errorHtml = `
        <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-exclamation-triangle mr-1"></i> Error Details</h4>
        <div class="text-xs text-red-100">
            <p class="mb-2">An error occurred while checking the Language Detector API availability: <code>${e.message}</code></p>
            <ul class="list-disc pl-4 space-y-1">
                <li>Please file a bug.</li>
            </ul>
        </div>
      `;
    }

    return { status, message, checks, errorHtml };
  }
}
