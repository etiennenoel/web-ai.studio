import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// We don't import injected.ts directly because it executes immediately.
// We will load it dynamically or test its side effects.

describe('injected script', () => {
  beforeEach(() => {
    // Reset window state
    (window as any).webai = undefined;
    (window as any).LanguageModel = {
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue('Hello')
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize window.webai and create history fetchers', async () => {
    // Dynamically import to run the script
    await import('./injected');

    expect(window.webai).toBeDefined();
    expect(window.webai.version).toBeDefined();
    expect(typeof window.webai.getHardwareInformation).toBe('function');
    
    expect(window.webai.languageModel.getHistory).toBeDefined();
    expect(window.webai.summarizer.getHistory).toBeDefined();
    expect(window.webai.translator.getHistory).toBeDefined();
  });

  it('should wrap LanguageModel.create', async () => {
    const originalCreate = (window as any).LanguageModel.create;
    vi.resetModules();
    await import('./injected');
    
    // The create method should be overwritten
    expect((window as any).LanguageModel.create).not.toBe(originalCreate);
  });
});
