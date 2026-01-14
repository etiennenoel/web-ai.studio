import { Injectable } from '@angular/core';
import { AiModel } from '../interfaces/data/ai-model.interface';
import { ApiAvailability } from '../interfaces/data/api-availability.interface';
import { SystemStatus } from '../interfaces/data/system-status.interface';
import { StorageStats } from '../interfaces/data/storage-stats.interface';
import { RecentActivity } from '../interfaces/data/recent-activity.interface';
import { PanelTab } from '../enums/panel-tab.enum';

@Injectable({
  providedIn: 'root'
})
export class AiModelDataService {
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

    public async getApiAvailability(): Promise<ApiAvailability[]> {
        const apiAvailabilities: ApiAvailability[] = [];

        // Prompt API
        const prompt: ApiAvailability = { id: 'prompt', name: 'Prompt API', description: 'Interactive chat & instructions', status: 'unknown', icon: 'fa-solid fa-comments', panelTabId: PanelTab.PROMPT };
        apiAvailabilities.push(prompt);
        try {
            // @ts-expect-error
            prompt.status = await LanguageModel.availability();
        } catch (e) {
            prompt.status = "error";
            prompt.error = (e as Error).message;
        }

        // Summarizer API
        const summarizer: ApiAvailability = { id: 'summarizer', name: 'Summarizer API', description: 'Condense text content', status: 'unknown', icon: 'fa-solid fa-compress', panelTabId: PanelTab.SUMMARIZER };
        apiAvailabilities.push(summarizer);
        try {
            // @ts-expect-error
            summarizer.status = await Summarizer.availability();
        } catch (e) {
            summarizer.status = "error";
            summarizer.error = (e as Error).message;
        }

        // Writer API
        const writer: ApiAvailability = { id: 'writer', name: 'Writer API', description: 'Generate new content', status: 'unknown', icon: 'fa-solid fa-pen-nib', panelTabId: PanelTab.WRITER };
        apiAvailabilities.push(writer);
        try {
            // @ts-expect-error
            writer.status = await Writer.availability();
        } catch (e) {
            writer.status = "error";
            writer.error = (e as Error).message;
        }

        // Rewriter API
        const rewriter: ApiAvailability = { id: 'rewriter', name: 'Rewriter API', description: 'Refine & edit text', status: 'unknown', icon: 'fa-solid fa-wand-magic-sparkles', panelTabId: PanelTab.REWRITER };
        apiAvailabilities.push(rewriter);
        try {
            // @ts-expect-error
            rewriter.status = await Rewriter.availability();
        } catch (e) {
            rewriter.status = "error";
            rewriter.error = (e as Error).message;
        }

        // Detector API
        const detector: ApiAvailability = { id: 'detector', name: 'Language Detector', description: 'Identify languages', status: 'unknown', icon: 'fa-solid fa-language', panelTabId: PanelTab.DETECTOR };
        apiAvailabilities.push(detector);
        try {
            // @ts-expect-error
            detector.status = await LanguageDetector.availability();
        } catch (e) {
            detector.status = "error";
            detector.error = (e as Error).message;
        }

        // Translator API
        const translator: ApiAvailability = { id: 'translator', name: 'Translator API', description: 'Translate text', status: 'unknown', icon: 'fa-solid fa-globe', panelTabId: PanelTab.TRANSLATOR };
        apiAvailabilities.push(translator);
        try {
            let targetLanguage = "es"; // Default language to avoid failure

            for(const lang of navigator.languages) {
                if(lang.startsWith("en") === false) {
                    targetLanguage = lang;
                    break;
                }
            }

            // @ts-expect-error
            translator.status = await Translator.availability({
                sourceLanguage: "en",
                targetLanguage,
            });
        } catch (e) {
            translator.status = "error";
            translator.error = (e as Error).message;
        }

        // Proofreader API
        const proofreader: ApiAvailability = { id: 'proofreader', name: 'Proofreader API', description: 'Fix grammar & typos', status: 'unknown', icon: 'fa-solid fa-check-double', panelTabId: PanelTab.PROOFREADER };
        apiAvailabilities.push(proofreader);
        try {
            // @ts-expect-error
            proofreader.status = await Proofreader.availability();
        } catch (e) {
            proofreader.status = "error";
            proofreader.error = (e as Error).message;
        }

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
