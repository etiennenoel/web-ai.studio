import { Classifier } from './classifier.polyfill';

/**
 * Defines `window.Classifier` when the browser has no native implementation.
 * Native implementations always win; the polyfill never replaces one.
 */
export class ClassifierPolyfillInstaller {
  private static installed = false;

  static install(): boolean {
    if (typeof window === 'undefined') return false;
    if ('Classifier' in window && (window as any).Classifier !== undefined) return false;
    // Bundlers may rename the class; keep the public name the explainer uses.
    Object.defineProperty(Classifier, 'name', { value: 'Classifier', configurable: true });
    Object.defineProperty(window, 'Classifier', {
      value: Classifier,
      writable: true,
      configurable: true,
      enumerable: false,
    });
    ClassifierPolyfillInstaller.installed = true;
    return true;
  }

  static get isInstalled(): boolean {
    return ClassifierPolyfillInstaller.installed;
  }

  /** Removes the polyfill (never a native implementation). */
  static uninstall(): void {
    if (!ClassifierPolyfillInstaller.installed) return;
    if ((window as any).Classifier === Classifier) {
      delete (window as any).Classifier;
    }
    ClassifierPolyfillInstaller.installed = false;
  }
}
