import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Encapsulates all hardware and environment detection for the Cortex benchmarking system.
 *
 * Why this exists: Hardware info (CPU model, NPU type, memory, OS, browser) was embedded
 * directly in the Cortex page component as 10+ methods. That logic has nothing to do with
 * the page's view responsibilities — it's system detection that should be independently
 * testable and reusable (e.g., the execution drawer and report export also need it).
 *
 * Hardware info comes from the companion browser extension via `window.webai.getHardwareInformation()`.
 * When the extension isn't installed, we fall back to user-agent heuristics for OS/browser.
 */
@Injectable({ providedIn: 'root' })
export class HardwareInfoService {

  /** Raw hardware payload from the browser extension, or null if unavailable */
  hardwareInfo: any = null;

  /** Whether the web-ai.studio companion extension is detected in the current browser */
  isExtensionInstalled = true; // Default true so we don't flash a warning on load

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Attempts to detect the companion extension by checking for `window.webai`.
   * Called during page init with retry logic because the extension's content script
   * may inject after Angular bootstraps.
   */
  detectExtension(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const check = () => {
      this.isExtensionInstalled = typeof window !== 'undefined' && typeof (window as any).webai !== 'undefined';
      if (this.isExtensionInstalled && !this.hardwareInfo) {
        this.loadFromExtension();
      }
    };

    check();

    // The extension content script may not be injected yet at this point.
    // Retry for up to 1 second to give it time to load.
    if (!this.isExtensionInstalled) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        check();
        if (this.isExtensionInstalled || attempts > 20) {
          clearInterval(interval);
        }
      }, 50);
    }
  }

  /** Fetches detailed hardware info from the companion extension */
  async loadFromExtension(): Promise<void> {
    try {
      this.hardwareInfo = await (window as any).webai.getHardwareInformation();
    } catch (e) {
      console.error('Failed to get hardware info from extension', e);
    }
  }

  /** Returns a human-readable CPU description, or 'Extension Required' if unavailable */
  getComputeUnit(): string {
    if (this.hardwareInfo?.cpu?.modelName) {
      const cores = this.hardwareInfo.cpu.numOfProcessors;
      return cores ? `${this.hardwareInfo.cpu.modelName} (${cores}-Core)` : this.hardwareInfo.cpu.modelName;
    }
    return 'Extension Required';
  }

  /**
   * Infers the NPU (Neural Processing Unit) type from the CPU model name.
   *
   * Why heuristic-based: There is no web API to directly query NPU presence.
   * We match known CPU families to their associated NPU hardware.
   */
  getNpuInfo(): string {
    const cpu = this.getComputeUnit();
    if (cpu.includes('Apple M')) return 'Apple Neural Engine';
    if (cpu.includes('Snapdragon')) return 'Qualcomm Hexagon';
    if (cpu.includes('Intel')) return 'Intel NPU (if available)';
    if (cpu.includes('AMD')) return 'AMD Ryzen AI (if available)';
    return 'Unknown or None';
  }

  /** Returns formatted memory info like "16 GB RAM", or 'Extension Required' */
  getMemoryInfo(): string {
    if (this.hardwareInfo?.memory?.capacity) {
      const gb = Math.round(this.hardwareInfo.memory.capacity / (1024 * 1024 * 1024));
      return `${gb} GB RAM`;
    }
    return 'Extension Required';
  }

  /**
   * Detects the operating system from navigator.userAgentData or user-agent string.
   * Prefers the modern userAgentData API when available, falls back to UA parsing.
   */
  getOsProfile(): string {
    if (typeof navigator === 'undefined') return 'Unknown OS';

    const uaData = (navigator as any).userAgentData;
    if (uaData?.platform) return uaData.platform;

    const ua = navigator.userAgent;
    if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X (\d+[_.]\d+[_.]?\d*)/);
      return match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
    } else if (ua.includes('Windows NT 10.0')) {
      return 'Windows 10/11';
    } else if (ua.includes('Linux')) {
      return 'Linux';
    } else if (ua.includes('Android')) {
      return 'Android';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      return 'iOS / iPadOS';
    }
    return 'Unknown OS';
  }

  /**
   * Detects the browser name and version.
   * Prefers the modern userAgentData.brands API, falls back to UA regex parsing.
   */
  getBrowserInfo(): string {
    if (typeof navigator === 'undefined') return 'Unknown Browser';

    const uaData = (navigator as any).userAgentData;
    if (uaData?.brands) {
      // Filter out the "Not A;Brand" or "Chromium" entries to get the real browser
      const brand = uaData.brands.find((b: any) => !b.brand.includes('Not') && !b.brand.includes('Chromium'));
      if (brand) return `${brand.brand} ${brand.version}`;
    }

    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Edg|Safari|Firefox)\/(\d+([\.\d]+)?)/);
    if (match) {
      let name = match[1];
      if (name === 'Edg') name = 'Edge';
      return `${name} ${match[2]}`;
    }
    return 'Unknown Browser';
  }

  /**
   * Rough heuristic for whether the hardware is well-suited for on-device AI.
   * Apple Silicon and high-memory machines tend to perform best.
   */
  get isHardwareOptimal(): boolean {
    const cpu = this.getComputeUnit();
    const mem = this.getMemoryInfo();
    return cpu.includes('Apple M') || cpu.includes('Snapdragon') || mem.includes('32 GB') || mem.includes('64 GB');
  }
}
