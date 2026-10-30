import { DecisionModel } from './classifier.polyfill';

/**
 * Defines `window.DecisionModel` when the browser has no native implementation.
 * Native implementations always win; the polyfill never replaces one.
 */
export class ClassifierPolyfillInstaller {
  private static installed = false;

  static install(): boolean {
    if (typeof window === 'undefined') return false;
    const hasNativeDecisionModel =
      'DecisionModel' in window &&
      (window as any).DecisionModel !== undefined &&
      (window as any).DecisionModel !== null;
    if (hasNativeDecisionModel) return false;

    // Bundlers may rename the class; keep the public name the explainer uses.
    Object.defineProperty(DecisionModel, 'name', { value: 'DecisionModel', configurable: true });
    Object.defineProperty(window, 'DecisionModel', {
      value: DecisionModel,
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
    if ((window as any).DecisionModel === DecisionModel) {
      delete (window as any).DecisionModel;
    }
    ClassifierPolyfillInstaller.installed = false;
  }
}
