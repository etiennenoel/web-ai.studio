import {ChatPage} from './pages/chat/chat.page';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgbCarouselModule, NgbDropdownModule, NgbOffcanvas, NgbOffcanvasModule, NgbTooltip, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';
import { LayoutComponent } from './components/layout/layout.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TranslationPage } from './pages/translation/translation.page';
import { WritingAssistancePage } from './pages/writing-assistance/writing-assistance.page';

import {
  NgModule,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  provideZonelessChangeDetection, isDevMode
} from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { PromptCodeModal } from './components/prompt-code-modal/prompt-code-modal';
import { TranslationCodeModal } from './components/translation-code-modal/translation-code-modal';
import { WritingAssistanceCodeModal } from './components/writing-assistance-code-modal/writing-assistance-code-modal';
import {AutoScrollDirective} from './directives/auto-scroll.directive';
import { CortexPage } from './pages/cortex/cortex.page';
import {AxonTestSuiteExecutor} from './pages/cortex/axon/axon-test-suite.executor';
import {
  LanguageDetectorShortStringColdStartAxonTest
} from './pages/cortex/axon/tests/language-detector/language-detector-short-string-cold-start.axon-test';
import { AxonTestStatusBadgeComponent } from './pages/cortex/axon/components/axon-test-status-badge/axon-test-status-badge.component';
import {
  LanguageDetectorShortStringWarmStartAxonTest
} from './pages/cortex/axon/tests/language-detector/language-detector-short-string-warm-start.axon-test';
import {
  TranslatorShortStringEnglishToFrenchColdStartAxonTest
} from './pages/cortex/axon/tests/translator/translator-short-string-english-to-french-cold-start.axon-test';
import {
  TranslatorShortStringEnglishToFrenchWarmStartAxonTest
} from './pages/cortex/axon/tests/translator/translator-short-string-english-to-french-warm-start.axon-test';
import {
  SummarizerLongNewsArticleColdStartAxonTest
} from './pages/cortex/axon/tests/summarizer/summarizer-long-news-article-cold-start.axon-test';
import {
  SummarizerLongNewsArticleWarmStartAxonTest
} from './pages/cortex/axon/tests/summarizer/summarizer-long-news-article-warm-start.axon-test';
import {
  PromptTextFactAnalysisColdStartAxonTest
} from './pages/cortex/axon/tests/prompt-text/prompt-text-fact-analysis-cold-start.axon-test';
import {
  PromptTextEthicalAndCreativeColdStartAxonTest
} from './pages/cortex/axon/tests/prompt-text/prompt-text-ethical-and-creative-cold-start.axon-test';
import {
  PromptTextTechnicalChallengeStartAxonTest
} from './pages/cortex/axon/tests/prompt-text/prompt-text-technical-challenge-start.axon-test';
import { PromptImageOcrHandwrittenLetter1ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-letter-1-cold-start.axon-test';
import { PromptImageOcrHandwrittenLetter2ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-letter-2-cold-start.axon-test';
import { PromptImageOcrHandwrittenLetter3ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-letter-3-cold-start.axon-test';
import { PromptImageOcrHandwrittenName1ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-name-1-cold-start.axon-test';
import { PromptImageOcrHandwrittenName2ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-name-2-cold-start.axon-test';
import { PromptImageOcrHandwrittenName3ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-name-3-cold-start.axon-test';
import { PromptImageOcrComputerFontColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-computer-font-cold-start.axon-test';
import { PromptImageDescribeColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-describe-cold-start.axon-test';
import { PromptImageExplainMemeColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-explain-meme-cold-start.axon-test';
import { PromptImageExplainEmotionColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-explain-emotion-cold-start.axon-test';
import { PromptAudioTranscription119ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-audio/prompt-audio-transcription-119-cold-start.axon-test';
import { PromptAudioTranscription4167ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-audio/prompt-audio-transcription-4167-cold-start.axon-test';
import { PromptAudioTranscription46ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-audio/prompt-audio-transcription-46-cold-start.axon-test';
import { PromptAudioTranscription5670ColdStartAxonTest } from './pages/cortex/axon/tests/prompt-audio/prompt-audio-transcription-5670-cold-start.axon-test';
import { CodeModal } from './modals/code/code.modal';
import {AppComponent} from './app.component';
import {MarkdownPipe} from './shared/pipes/markdown.pipe';
import {ChatComponent} from './components/chat/chat.component';
import {MarkdownRendererComponent} from './components/markdown-renderer/markdown-renderer.component';
import {PromptInputComponent} from './components/prompt-input/prompt-input.component';
import {CodeEditorComponent} from './shared/components/code-editor/code-editor.component';
import {WritingAssistanceInputComponent} from './components/writing-assistance-input/writing-assistance-input.component';
import {AttachmentModalComponent} from './components/prompt-input/attachment-modal/attachment-modal.component';
import {LatencyLoaderComponent} from './components/latency-loader/latency-loader.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { PrivacyPolicyPage } from './pages/privacy-policy/privacy-policy.page';
import { TermsOfServicePage } from './pages/terms-of-service/terms-of-service.page';
import { BugsPage } from './pages/bugs/bugs.page';
import { FirstCreateShouldFullyLoadTheModelPage } from './pages/bugs/first-create-should-fully-load-the-model/first-create-should-fully-load-the-model.page';
import {EvalsPage} from './pages/evals/evals.page';
import {ExtensionLandingPage} from './pages/extension-landing/extension-landing.page';
import {HistoryListComponent} from './components/history-list/history-list.component';

import {CameraModalComponent} from './components/prompt-input/camera-modal/camera-modal.component';
import {AudioRecordingModalComponent} from './components/prompt-input/audio-recording-modal/audio-recording-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatPage,
    LayoutComponent,
    HeaderComponent,
    SidebarComponent,
    TranslationPage,
    WritingAssistancePage,
    PrivacyPolicyPage,
    TermsOfServicePage,
    ExtensionLandingPage,
    HistoryListComponent,
    FirstCreateShouldFullyLoadTheModelPage,
    BugsPage,
    PromptCodeModal,
    TranslationCodeModal,
    WritingAssistanceCodeModal,
    EvalsPage,

    AutoScrollDirective,
     CortexPage,
     AxonTestStatusBadgeComponent,

    // Modals
     CodeModal,
     MarkdownPipe,
     MarkdownRendererComponent,
     ChatComponent,
     PromptInputComponent,
     CodeEditorComponent,
     WritingAssistanceInputComponent,
     AttachmentModalComponent,
     CameraModalComponent,
     AudioRecordingModalComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgbTooltipModule,
    NgbOffcanvasModule,
    NgbCarouselModule,
    NgbDropdownModule,
    LatencyLoaderComponent,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Axon
    AxonTestSuiteExecutor,

    // Language Detector
    LanguageDetectorShortStringColdStartAxonTest,
    LanguageDetectorShortStringWarmStartAxonTest,

    // Translator
    TranslatorShortStringEnglishToFrenchColdStartAxonTest,
    TranslatorShortStringEnglishToFrenchWarmStartAxonTest,

    // Summarizer
    SummarizerLongNewsArticleColdStartAxonTest,
    SummarizerLongNewsArticleWarmStartAxonTest,

    // Prompt API Text
    PromptTextFactAnalysisColdStartAxonTest,
    PromptTextEthicalAndCreativeColdStartAxonTest,
    PromptTextTechnicalChallengeStartAxonTest,

    // Prompt API Image
    PromptImageOcrHandwrittenLetter1ColdStartAxonTest,
    PromptImageOcrHandwrittenLetter2ColdStartAxonTest,
    PromptImageOcrHandwrittenLetter3ColdStartAxonTest,
    PromptImageOcrHandwrittenName1ColdStartAxonTest,
    PromptImageOcrHandwrittenName2ColdStartAxonTest,
    PromptImageOcrHandwrittenName3ColdStartAxonTest,
    PromptImageOcrComputerFontColdStartAxonTest,
    PromptImageDescribeColdStartAxonTest,
    PromptImageExplainMemeColdStartAxonTest,
    PromptImageExplainEmotionColdStartAxonTest,

    // Prompt API Audio
    PromptAudioTranscription119ColdStartAxonTest,
    PromptAudioTranscription4167ColdStartAxonTest,
    PromptAudioTranscription46ColdStartAxonTest,
    PromptAudioTranscription5670ColdStartAxonTest,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
