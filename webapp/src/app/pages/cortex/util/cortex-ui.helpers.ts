import { BuiltInAiApi } from '../../../enums/built-in-ai-api.enum';
import { TestStatus } from '../../../enums/test-status.enum';

/**
 * Static utility class for Cortex UI presentation logic.
 *
 * Why this exists: The Cortex page component contained 8+ methods that purely map
 * data values to CSS classes and icon names. These are view helpers with no state
 * dependencies — they belong in a utility class, not a component. This also makes
 * them reusable across the extracted sub-components (sidebar, comparison table, etc.)
 * without needing to pass the parent component as a dependency.
 */
export class CortexUiHelpers {

  // -- API Icons --

  /** Maps a Built-in AI API enum to its Bootstrap Icon class */
  static getIconForApi(api: BuiltInAiApi): string {
    switch (api) {
      case BuiltInAiApi.LanguageDetector: return 'bi-search';
      case BuiltInAiApi.Translator: return 'bi-translate';
      case BuiltInAiApi.Summarizer: return 'bi-card-text';
      case BuiltInAiApi.PromptWithImage: return 'bi-image';
      case BuiltInAiApi.Prompt:
      case BuiltInAiApi.PromptWithAudio:
        return 'bi-chat-text';
      case BuiltInAiApi.Proofreader: return 'bi-spellcheck';
      case BuiltInAiApi.Rewriter: return 'bi-pencil-square';
      case BuiltInAiApi.Writer: return 'bi-pen';
      default: return 'bi-cpu';
    }
  }

  // -- Test Status Icons --

  /** Maps a TestStatus to an icon class with color (e.g., green check, spinning arrow) */
  static getTestStatusIcon(status: TestStatus): string {
    switch (status) {
      case TestStatus.Success: return 'bi-check-circle-fill text-emerald-500';
      case TestStatus.Executing: return 'bi-arrow-repeat animate-spin text-indigo-500';
      case TestStatus.Error:
      case TestStatus.Fail: return 'bi-x-circle-fill text-rose-500';
      case TestStatus.Skipped: return 'bi-slash-circle text-slate-400';
      default: return 'bi-circle text-slate-400';
    }
  }

  /**
   * Determines the status icon for a scenario (group of tests).
   * Priority: error > executing > all-success > idle
   */
  static getScenarioStatusIcon(tests: { results: { status: TestStatus } }[]): string {
    if (tests.some(t => t.results.status === TestStatus.Error || t.results.status === TestStatus.Fail)) {
      return 'bi-x-circle-fill text-rose-500';
    }
    if (tests.some(t => t.results.status === TestStatus.Executing)) {
      return 'bi-arrow-repeat animate-spin text-indigo-500';
    }
    if (tests.every(t => t.results.status === TestStatus.Success || t.results.status === TestStatus.Skipped)) {
      if (tests.some(t => t.results.status === TestStatus.Success)) {
        return 'bi-check-circle-fill text-emerald-500';
      }
    }
    return 'bi-circle text-slate-400';
  }

  // -- Filter & Badge Styling --

  /** Returns an icon class for a filter type (e.g., 'compute' -> CPU/GPU icons) */
  static getFilterIcon(filterType: string, value: string): string {
    if (filterType === 'compute') {
      if (value === 'CPU') return 'bi-cpu';
      if (value === 'GPU') return 'bi-gpu-card';
      if (value === 'NPU') return 'bi-motherboard';
      if (value === 'Cloud') return 'bi-cloud';
      return 'bi-pc-horizontal';
    }
    if (filterType === 'engine') return 'bi-gear-fill';
    if (filterType === 'variant') return 'bi-box-seam';
    if (filterType === 'api') return 'bi-plugin';
    return 'bi-tag';
  }

  /**
   * Returns Tailwind CSS classes for a badge variant.
   * Each variant has light + dark mode styles.
   */
  static getBadgeClass(variant: string): string {
    const variants: { [key: string]: string } = {
      default: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      current: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
      purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
      cloud: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    };
    if (variant === 'Cloud') return variants['cloud'];
    return variants[variant] || variants['default'];
  }

  /** Returns badge CSS classes for a specific filter type and value combination */
  static getFilterBadgeClass(filterType: string, value: string): string {
    if (filterType === 'compute') {
      if (value === 'GPU') return this.getBadgeClass('purple');
      if (value === 'CPU') return this.getBadgeClass('default');
      if (value === 'Cloud') return this.getBadgeClass('cloud');
      return this.getBadgeClass('emerald');
    }
    if (filterType === 'engine') return this.getEngineColorClass(value);
    if (filterType === 'variant') return this.getVariantColorClass(value);
    if (filterType === 'api') return 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400';
    return this.getBadgeClass('default');
  }

  // -- Execution Type (CPU/GPU/NPU/Cloud) Styling --

  /** Returns an icon class for an execution type */
  static getExecutionTypeIcon(type?: string): string {
    switch (type?.toUpperCase()) {
      case 'CPU': return 'bi-cpu';
      case 'GPU': return 'bi-gpu-card';
      case 'NPU': return 'bi-motherboard';
      case 'CLOUD': return 'bi-cloud';
      default: return 'bi-gear';
    }
  }

  /** Returns Tailwind color classes for a model variant badge */
  static getVariantColorClass(variant?: string): string {
    switch (variant?.toUpperCase()) {
      case 'NANO V3 4B': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50';
      case 'NANO V3 2B': return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800/50';
      case 'GEMINI 3.1 FLASH': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50';
      case 'GEMINI 3.1 FLASH LITE': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50';
      case 'GEMMA3 4B': return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50';
      case 'GEMMA3N 4B': return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800/50';
      case 'GEMMA4 2B': return 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-800/50';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  }

  /** Returns Tailwind color classes for an engine badge */
  static getEngineColorClass(engine?: string): string {
    switch (engine?.toUpperCase()) {
      case 'LLM IE': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50';
      case 'LITERT-LM': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
      case 'LM STUDIO': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50';
      case 'GEMINI API': return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800/50';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  }

  /** Returns Tailwind color classes for an execution type badge */
  static getExecutionTypeColorClass(type?: string): string {
    switch (type?.toUpperCase()) {
      case 'CPU': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      case 'GPU': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50';
      case 'NPU': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'CLOUD': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  }
}
