import {ChatPage} from './pages/chat/chat.page';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgbCarouselModule, NgbDropdownModule, NgbOffcanvas, NgbOffcanvasModule, NgbTooltip, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';
import { LayoutComponent } from './components/layout/layout.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TranslationPage } from './pages/translation/translation.page';
import { WritingAssistancePage } from './pages/writing-assistance/writing-assistance.page';
import { EvalsPage } from './pages/evals/evals.page';
import {
  NgModule,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  provideZonelessChangeDetection
} from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing-module';
import { PromptCodeModal } from './components/prompt-code-modal/prompt-code-modal';
import {AutoScrollDirective} from './directives/auto-scroll.directive';
import { CortexPage } from './pages/cortex/cortex.page';
import { AxonPage } from './pages/cortex/axon/axon.page';
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
import { CodeModal } from './modals/code/code.modal';
import {AppComponent} from './app.component';
import {MarkdownPipe} from './shared/pipes/markdown.pipe';
import {ChatComponent} from './components/chat/chat.component';
import {PromptInputComponent} from './components/prompt-input/prompt-input.component';
import {CodeEditorComponent} from './shared/components/code-editor/code-editor.component';
import {WritingAssistanceInputComponent} from './components/writing-assistance-input/writing-assistance-input.component';
import {AttachmentModalComponent} from './components/prompt-input/attachment-modal/attachment-modal.component';
import {BetaLayoutComponent} from './components/layout/beta-layout/beta-layout.component';
import {QuickAccessCardComponent} from './components/layout/beta-layout/quick-access-card/quick-access-card.component';
import {AvailableApiCardComponent} from './components/layout/beta-layout/available-api-card/available-api-card.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatPage,
    LayoutComponent,
    BetaLayoutComponent,
    HeaderComponent,
    SidebarComponent,
    TranslationPage,
    WritingAssistancePage,
    EvalsPage,
    PromptCodeModal,

    AutoScrollDirective,
     CortexPage,
     AxonPage,
     AxonTestStatusBadgeComponent,

    // Modals
     CodeModal,
     MarkdownPipe,
     ChatComponent,
     PromptInputComponent,
     CodeEditorComponent,
     WritingAssistanceInputComponent,
     AttachmentModalComponent,
     QuickAccessCardComponent,
     AvailableApiCardComponent,
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
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
