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
import { PromptImageOcrHandwrittenColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-handwritten-cold-start.axon-test';
import { PromptImageOcrComputerFontColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-ocr-computer-font-cold-start.axon-test';
import { PromptImageDescribeColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-describe-cold-start.axon-test';
import { PromptImageExplainMemeColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-explain-meme-cold-start.axon-test';
import { PromptImageExplainEmotionColdStartAxonTest } from './pages/cortex/axon/tests/prompt-image/prompt-image-explain-emotion-cold-start.axon-test';
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
import { BugsPage } from './pages/bugs/bugs.page';
import { FirstCreateShouldFullyLoadTheModelPage } from './pages/bugs/first-create-should-fully-load-the-model/first-create-should-fully-load-the-model.page';

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
    FirstCreateShouldFullyLoadTheModelPage,
    BugsPage,
    PromptCodeModal,

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
    PromptImageOcrHandwrittenColdStartAxonTest,
    PromptImageOcrComputerFontColdStartAxonTest,
    PromptImageDescribeColdStartAxonTest,
    PromptImageExplainMemeColdStartAxonTest,
    PromptImageExplainEmotionColdStartAxonTest,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
