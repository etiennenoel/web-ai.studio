/**
 * The Chrome built-in AI APIs that the extension wraps and monitors.
 * Values match the global constructor names on window (e.g., window.LanguageModel).
 */
export enum ChromeAiApiName {
  LANGUAGE_MODEL = 'LanguageModel',
  SUMMARIZER = 'Summarizer',
  TRANSLATOR = 'Translator',
  LANGUAGE_DETECTOR = 'LanguageDetector',
  WRITER = 'Writer',
  REWRITER = 'Rewriter',
  PROOFREADER = 'Proofreader',
}
