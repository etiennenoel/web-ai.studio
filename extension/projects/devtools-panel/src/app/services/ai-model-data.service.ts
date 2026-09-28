import { Injectable } from '@angular/core';
import { AiModel } from '../interfaces/data/ai-model.interface';
import { ApiAvailability } from '../interfaces/data/api-availability.interface';
import { SystemStatus } from '../interfaces/data/system-status.interface';
import { StorageStats } from '../interfaces/data/storage-stats.interface';
import { RecentActivity } from '../interfaces/data/recent-activity.interface';
import { PanelTab } from '../enums/panel-tab.enum';
import { ClassifierManager, DEFAULT_AVAILABILITY_TIMEOUT_MS, withAvailabilityTimeout } from 'base';

@Injectable({
  providedIn: 'root'
})
export class AiModelDataService {
    constructor(private readonly classifierManager: ClassifierManager) {}

    private readonly MOCK_MODELS: AiModel[] = [
        { name: 'Gemini Nano 3.0 4B GPU', status: 'available' },
        { name: 'Gemini Nano 3.0 2B GPU', status: 'downloading', progress: 60 },
        { name: 'Gemini Nano 3.0 2B CPU', status: 'downloadable' },
    ];

    private readonly MOCK_ACTIVITY: RecentActivity[] = [
        { id: '1', description: 'Translated "Hello" to French', timestamp: '2 mins ago', apiIcon: 'fa-solid fa-globe', status: 'success' },
        { id: '2', description: 'Summarized article content', timestamp: '15 mins ago', apiIcon: 'fa-solid fa-compress', status: 'success' },
        { id: '3', description: 'Failed to generate text', timestamp: '1 hour ago', apiIcon: 'fa-solid fa-pen-nib', status: 'error' },
    ];

    public getModels(): Promise<AiModel[]> {
        return Promise.resolve([...this.MOCK_MODELS]);
    }

    public getInitialApiCapabilities(): ApiAvailability[] {
        return [
            { id: 'prompt', name: 'Prompt API', description: 'Interactive chat & instructions', status: 'unknown', icon: 'fa-solid fa-comments', panelTabId: PanelTab.PROMPT },
            { id: 'summarizer', name: 'Summarizer API', description: 'Condense text content', status: 'unknown', icon: 'fa-solid fa-compress', panelTabId: PanelTab.SUMMARIZER },
            { id: 'writer', name: 'Writer API', description: 'Generate new content', status: 'unknown', icon: 'fa-solid fa-pen-nib', panelTabId: PanelTab.WRITER },
            { id: 'rewriter', name: 'Rewriter API', description: 'Refine & edit text', status: 'unknown', icon: 'fa-solid fa-wand-magic-sparkles', panelTabId: PanelTab.REWRITER },
            { id: 'detector', name: 'Language Detector', description: 'Identify languages', status: 'unknown', icon: 'fa-solid fa-language', panelTabId: PanelTab.DETECTOR },
            { id: 'translator', name: 'Translator API', description: 'Translate text', status: 'unknown', icon: 'fa-solid fa-globe', panelTabId: PanelTab.TRANSLATOR },
            { id: 'proofreader', name: 'Proofreader API', description: 'Fix grammar & typos', status: 'unknown', icon: 'fa-solid fa-check-double', panelTabId: PanelTab.PROOFREADER },
            { id: 'classifier', name: 'Classifier API', description: 'Typed decisions (polyfill)', status: 'unknown', icon: 'fa-solid fa-signs-post', panelTabId: PanelTab.CLASSIFIER },
        ];
    }

    public async getApiAvailability(onUpdate?: (capabilities: ApiAvailability[]) => void): Promise<ApiAvailability[]> {
        const apiAvailabilities = this.getInitialApiCapabilities();
        onUpdate?.(apiAvailabilities);

        let targetLanguage = "es";
        if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
            for (const lang of navigator.languages) {
                if (lang.startsWith("en") === false) {
                    targetLanguage = lang;
                    break;
                }
            }
        }

        const win = self as any;
        const checks: Record<string, () => Promise<any>> = {
            prompt: () => typeof win.LanguageModel !== 'undefined' && typeof win.LanguageModel.availability === 'function'
                ? withAvailabilityTimeout(win.LanguageModel.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            summarizer: () => typeof win.Summarizer !== 'undefined' && typeof win.Summarizer.availability === 'function'
                ? withAvailabilityTimeout(win.Summarizer.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            writer: () => typeof win.Writer !== 'undefined' && typeof win.Writer.availability === 'function'
                ? withAvailabilityTimeout(win.Writer.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            rewriter: () => typeof win.Rewriter !== 'undefined' && typeof win.Rewriter.availability === 'function'
                ? withAvailabilityTimeout(win.Rewriter.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            detector: () => typeof win.LanguageDetector !== 'undefined' && typeof win.LanguageDetector.availability === 'function'
                ? withAvailabilityTimeout(win.LanguageDetector.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            translator: () => typeof win.Translator !== 'undefined' && typeof win.Translator.availability === 'function'
                ? withAvailabilityTimeout(win.Translator.availability({ sourceLanguage: "en", targetLanguage }), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            proofreader: () => typeof win.Proofreader !== 'undefined' && typeof win.Proofreader.availability === 'function'
                ? withAvailabilityTimeout(win.Proofreader.availability(), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable')
                : Promise.resolve('unavailable'),
            classifier: () => withAvailabilityTimeout(this.classifierManager.availability({}), DEFAULT_AVAILABILITY_TIMEOUT_MS, 'unavailable'),
        };

        await Promise.all(
            apiAvailabilities.map(async (cap) => {
                try {
                    const fn = checks[cap.id];
                    cap.status = fn ? await fn() : 'unavailable';
                } catch (e) {
                    cap.status = "error";
                    cap.error = (e as Error).message;
                }
                onUpdate?.(apiAvailabilities);
            })
        );

        return apiAvailabilities;
    }

    public getSystemStatus(): Promise<SystemStatus> {
        return Promise.resolve({
            vramUsage: '~1.2 GB',
            baseModel: 'Gemini Nano 3.0 4B'
        });
    }

    public getStorageStats(): Promise<StorageStats> {
        return Promise.resolve({
            modelsSize: '1.2 GB',
            languagePacksSize: '150 MB',
            totalSize: '1.35 GB'
        });
    }

    public getRecentActivity(): Promise<RecentActivity[]> {
        return Promise.resolve([...this.MOCK_ACTIVITY]);
    }
}
