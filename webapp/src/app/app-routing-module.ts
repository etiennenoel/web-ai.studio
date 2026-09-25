import {Routes} from '@angular/router';
import {LayoutComponent} from './components/layout/layout.component';
import {ChatPage} from './pages/chat/chat.page';
import {TranslationPage} from './pages/translation/translation.page';
import {RouteEnum} from './enums/route.enum';
import {WritingAssistancePage} from './pages/writing-assistance/writing-assistance.page';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {CortexPage} from './pages/cortex/cortex.page';
import {CortexInsightsPage} from './pages/cortex-insights/cortex-insights.page';
import {PrivacyPolicyPage} from './pages/privacy-policy/privacy-policy.page';
import {TermsOfServicePage} from './pages/terms-of-service/terms-of-service.page';
import {BugsPage} from './pages/bugs/bugs.page';
import {FirstCreateShouldFullyLoadTheModelPage} from './pages/bugs/first-create-should-fully-load-the-model/first-create-should-fully-load-the-model.page';
import {EvalsPage} from './pages/evals/evals.page';
import {ExtensionLandingPage} from './pages/extension-landing/extension-landing.page';
import {DemosPage} from './pages/demos/demos.page';
import { TranslationDemoComponent } from './pages/demos/features/translation-demo.component';
import { SummarizationDemoComponent } from './pages/demos/features/summarization-demo.component';
import { ProofreadingDemoComponent } from './pages/demos/features/proofreading-demo.component';
import { ToneChangerDemoComponent } from './pages/demos/features/tone-changer-demo.component';
import { BrainstormingDemoComponent } from './pages/demos/features/brainstorming-demo.component';
import { WriteJavascriptDemoComponent } from './pages/demos/features/write-javascript-demo.component';
import { WriteHtmlCssDemoComponent } from './pages/demos/features/write-html-css-demo.component';
import { Eli5DemoComponent } from './pages/demos/features/eli5-demo.component';
import { SqlGeneratorDemoComponent } from './pages/demos/features/sql-generator-demo.component';
import { WriteEmailDemoComponent } from './pages/demos/features/write-email-demo.component';
import { OcrDemoComponent } from './pages/demos/features/ocr-demo.component';
import { ImageDescriptionDemoComponent } from './pages/demos/features/image-description-demo.component';
import { ExplainMemeDemoComponent } from './pages/demos/features/explain-meme-demo.component';
import { FridgeRecipeDemoComponent } from './pages/demos/features/fridge-recipe-demo.component';
import { ImageCategorizationDemoComponent } from './pages/demos/features/image-categorization-demo.component';
import { AudioTranscriptionDemoComponent } from './pages/demos/features/audio-transcription-demo.component';
import { MeetingNotesDemoComponent } from './pages/demos/features/meeting-notes-demo.component';
import { AudioSummarizationDemoComponent } from './pages/demos/features/audio-summarization-demo.component';
import { StructuredJsonDemoComponent } from './pages/demos/features/structured-json-demo.component';
import { ExtractEntitiesDemoComponent } from './pages/demos/features/extract-entities-demo.component';
import { ImageAudioQueryDemoComponent } from './pages/demos/features/image-audio-query-demo.component';
import { ReceiptToJsonDemoComponent } from './pages/demos/features/receipt-to-json-demo.component';
import { DocumentChatDemoComponent } from './pages/demos/features/document-chat-demo.component';
import { SemanticSearchDemoComponent } from './pages/demos/features/semantic-search-demo.component';
import { SmartTriageDemoComponent } from './pages/demos/features/smart-triage-demo.component';
import { DuplicateDetectorDemoComponent } from './pages/demos/features/duplicate-detector-demo.component';
import { ClusterLabelDemoComponent } from './pages/demos/features/cluster-label-demo.component';
import { SemanticCacheDemoComponent } from './pages/demos/features/semantic-cache-demo.component';
import { CommandPaletteDemoComponent } from './pages/demos/features/command-palette-demo.component';
import { SemanticWordGameDemoComponent } from './pages/demos/features/semantic-word-game-demo.component';
import { LiveTranslatedCaptionsDemoComponent } from './pages/demos/features/live-translated-captions-demo.component';
import { SpeakToFillDemoComponent } from './pages/demos/features/speak-to-fill-demo.component';
import { AsrQualityTiersDemoComponent } from './pages/demos/features/asr-quality-tiers-demo.component';
import { ContextualBiasingDemoComponent } from './pages/demos/features/contextual-biasing-demo.component';
import { PolyglotChatDemoComponent } from './pages/demos/features/polyglot-chat-demo.component';
import { ProofreaderInlineDemoComponent } from './pages/demos/features/proofreader-inline-demo.component';
import { UniversalInboxDemoComponent } from './pages/demos/features/universal-inbox-demo.component';
import { TonePadDemoComponent } from './pages/demos/features/tone-pad-demo.component';
import { SummarizerMatrixDemoComponent } from './pages/demos/features/summarizer-matrix-demo.component';
import { ReplyComposerDemoComponent } from './pages/demos/features/reply-composer-demo.component';
import { DictateAndPolishDemoComponent } from './pages/demos/features/dictate-and-polish-demo.component';
import { CameraQaDemoComponent } from './pages/demos/features/camera-qa-demo.component';
import { DrawAndGuessDemoComponent } from './pages/demos/features/draw-and-guess-demo.component';
import { StoryTimeDemoComponent } from './pages/demos/features/story-time-demo.component';
import { ToolCallingDemoComponent } from './pages/demos/features/tool-calling-demo.component';
import { ScreenshotToCodeDemoComponent } from './pages/demos/features/screenshot-to-code-demo.component';
import { RegexLabDemoComponent } from './pages/demos/features/regex-lab-demo.component';
import { CsvQaDemoComponent } from './pages/demos/features/csv-qa-demo.component';
import { SessionBranchingDemoComponent } from './pages/demos/features/session-branching-demo.component';
import { LocalizationQaDemoComponent } from './pages/demos/features/localization-qa-demo.component';
import { OmniboxDemoComponent } from './pages/demos/features/omnibox-demo.component';
import { ModerationCascadeDemoComponent } from './pages/demos/features/moderation-cascade-demo.component';
import { StudyKitDemoComponent } from './pages/demos/features/study-kit-demo.component';
import { PhotoSearchDemoComponent } from './pages/demos/features/photo-search-demo.component';
import { TongueTwisterDemoComponent } from './pages/demos/features/tongue-twister-demo.component';
import { MysteryLanguageDemoComponent } from './pages/demos/features/mystery-language-demo.component';
import { BestPracticesPage } from './pages/best-practices/best-practices.page';
import { SessionManagementPage } from './pages/best-practices/session-management/session-management.page';
import { PerformancePage } from './pages/best-practices/performance/performance.page';
import { StreamingPage } from './pages/best-practices/streaming/streaming.page';
import { StructuredOutputPage } from './pages/best-practices/structured-output/structured-output.page';
import { UserExperiencePage } from './pages/best-practices/user-experience/user-experience.page';
import { GetStartedPage } from './pages/docs/get-started/get-started.page';
import { CheckAvailabilityPage } from './pages/docs/check-availability/check-availability.page';
import { DocsErrorsPage } from './pages/docs/errors/errors.page';
import { DocsHomePage } from './pages/docs/docs-home.page';
import { TrackingDownloadPage } from './pages/docs/tracking-download/tracking-download.page';
import { AbortingOperationsPage } from './pages/docs/aborting-operations/aborting-operations.page';
import { PromptApiPage } from './pages/docs/apis/prompt-api.page';
import { SummarizerApiPage } from './pages/docs/apis/summarizer-api.page';
import { WriterApiPage } from './pages/docs/apis/writer-api.page';
import { RewriterApiPage } from './pages/docs/apis/rewriter-api.page';
import { TranslatorApiPage } from './pages/docs/apis/translator-api.page';
import { LanguageDetectorApiPage } from './pages/docs/apis/language-detector-api.page';
import { ProofreaderApiPage } from './pages/docs/apis/proofreader-api.page';
import { SemanticEmbedderApiPage } from './pages/docs/apis/semantic-embedder-api.page';
import { ClassifierApiPage } from './pages/docs/apis/classifier-api.page';
import { PromptPlaygroundPage } from './pages/playgrounds/prompt/prompt.page';
import { SummarizerPlaygroundPage } from './pages/playgrounds/summarizer/summarizer.page';
import { WriterPlaygroundPage } from './pages/playgrounds/writer/writer.page';
import { RewriterPlaygroundPage } from './pages/playgrounds/rewriter/rewriter.page';
import { TranslatorPlaygroundPage } from './pages/playgrounds/translator/translator.page';
import { LanguageDetectorPlaygroundPage } from './pages/playgrounds/language-detector/language-detector.page';
import { ProofreaderPlaygroundPage } from './pages/playgrounds/proofreader/proofreader.page';
import { SemanticEmbedderPlaygroundPage } from './pages/playgrounds/semantic-embedder/semantic-embedder.page';
import { ClassifierPlaygroundPage } from './pages/playgrounds/classifier/classifier.page';
import { WebSpeechPlaygroundPage } from './pages/playgrounds/web-speech/web-speech.page';
import { NoteEditorPage } from './pages/labs/note-editor/note-editor.page';
import { ConsumerHardwareAnalysisPage } from './pages/dashboards/consumer-hardware-analysis/consumer-hardware-analysis.page';
import { System1TicketRouterDemoComponent } from './pages/demos/features/system1-ticket-router-demo.component';
import { LiveDraftGuardrailsDemoComponent } from './pages/demos/features/live-draft-guardrails-demo.component';
import { ChameleonAdaptiveUiDemoComponent } from './pages/demos/features/chameleon-adaptive-ui-demo.component';
import { NlCatalogMatcherDemoComponent } from './pages/demos/features/nl-catalog-matcher-demo.component';
import { System1System2CascadeDemoComponent } from './pages/demos/features/system1-system2-cascade-demo.component';
import { SmartClipboardPasteDemoComponent } from './pages/demos/features/smart-clipboard-paste-demo.component';
import { FocusNotificationShieldDemoComponent } from './pages/demos/features/focus-notification-shield-demo.component';
import { InstantFormAutofillDemoComponent } from './pages/demos/features/instant-form-autofill-demo.component';

const routes: Routes = [
  {
    path: "cortex",

    title: "Cortex",
    component: CortexPage,
    data: {
      route: RouteEnum.Cortex
    }
  },
  {
    path: "cortex-insights",

    title: "Cortex Insights",
    component: CortexInsightsPage,
    data: {
      route: RouteEnum.CortexInsights
    }
  },
  {
    path: "bugs",

    title: "Bugs",
    component: BugsPage,
    data: {
      route: RouteEnum.Bugs
    }
  },
  {
    path: "bugs/first-create-should-fully-load-the-model",

    title: "Bug: First Create Should Fully Load The Model",
    component: FirstCreateShouldFullyLoadTheModelPage,
    data: {
      route: RouteEnum.Bugs
    }
  },
  {
    path: "",
    component: LayoutComponent,
    children: [
      {
        path: "best-practices",

        title: "Best Practices",
        component: BestPracticesPage,
        data: {
          route: RouteEnum.BestPractices
        }
      },
      {
        path: "best-practices/session-management",

        title: "Session Management Best Practices",
        component: SessionManagementPage,
        data: {
          route: RouteEnum.BestPracticesSessionManagement
        }
      },
      {
        path: "best-practices/performance",

        title: "Performance Best Practices",
        component: PerformancePage,
        data: {
          route: RouteEnum.BestPracticesPerformance
        }
      },
      {
        path: "best-practices/streaming",

        title: "Streaming Best Practices",
        component: StreamingPage,
        data: {
          route: RouteEnum.BestPracticesStreaming
        }
      },
      {
        path: "best-practices/structured-output",

        title: "Structured Output Best Practices",
        component: StructuredOutputPage,
        data: {
          route: RouteEnum.BestPracticesStructuredOutput
        }
      },
      {
        path: "best-practices/user-experience",

        title: "User Experience Best Practices",
        component: UserExperiencePage,
        data: {
          route: RouteEnum.BestPracticesUserExperience
        }
      },
      {
        path: "docs",

        title: "Docs",
        component: DocsHomePage,
        data: {
          route: RouteEnum.Docs
        }
      },
      {
        path: "docs/get-started",

        title: "Get Started Docs",
        component: GetStartedPage,
        data: {
          route: RouteEnum.GetStarted
        }
      },
      {
        path: "docs/check-availability",

        title: "Check Availability Docs",
        component: CheckAvailabilityPage,
        data: {
          route: RouteEnum.CheckAvailability
        }
      },
      {
        path: "docs/tracking-download",

        title: "Tracking Download Docs",
        component: TrackingDownloadPage,
        data: {
          route: RouteEnum.TrackingDownload
        }
      },
      {
        path: "docs/aborting-operations",

        title: "Aborting Operations Docs",
        component: AbortingOperationsPage,
        data: {
          route: RouteEnum.AbortingOperations
        }
      },
      {
        path: "docs/errors",

        title: "Errors Docs",
        component: DocsErrorsPage,
        data: {
          route: RouteEnum.Errors
        }
      },
      {
        path: "docs/prompt-api",

        title: "Prompt API Docs",
        component: PromptApiPage,
        data: {
          route: RouteEnum.PromptApi
        }
      },
      {
        path: "docs/summarizer",

        title: "Summarizer Docs",
        component: SummarizerApiPage,
        data: {
          route: RouteEnum.SummarizerApi
        }
      },
      {
        path: "docs/writer",

        title: "Writer Docs",
        component: WriterApiPage,
        data: {
          route: RouteEnum.WriterApi
        }
      },
      {
        path: "docs/rewriter",

        title: "Rewriter Docs",
        component: RewriterApiPage,
        data: {
          route: RouteEnum.RewriterApi
        }
      },
      {
        path: "docs/translator",

        title: "Translator Docs",
        component: TranslatorApiPage,
        data: {
          route: RouteEnum.TranslatorApi
        }
      },
      {
        path: "docs/language-detector",

        title: "Language Detector Docs",
        component: LanguageDetectorApiPage,
        data: {
          route: RouteEnum.LanguageDetectorApi
        }
      },
      {
        path: "docs/proofreader",

        title: "Proofreader Docs",
        component: ProofreaderApiPage,
        data: {
          route: RouteEnum.ProofreaderApi
        }
      },
      {
        path: "docs/semantic-embedder",

        title: "Semantic Embedder Docs",
        component: SemanticEmbedderApiPage,
        data: {
          route: RouteEnum.SemanticEmbedderApi
        }
      },
      {
        path: "docs/classifier",

        title: "Classifier Docs",
        component: ClassifierApiPage,
        data: {
          route: RouteEnum.ClassifierApi
        }
      },
      {
        path: "playgrounds/prompt",

        title: "Prompt Playground",
        component: PromptPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsPrompt
        }
      },
      {
        path: "playgrounds/summarizer",

        title: "Summarizer Playground",
        component: SummarizerPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsSummarizer
        }
      },
      {
        path: "playgrounds/writer",

        title: "Writer Playground",
        component: WriterPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsWriter
        }
      },
      {
        path: "playgrounds/rewriter",

        title: "Rewriter Playground",
        component: RewriterPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsRewriter
        }
      },
      {
        path: "playgrounds/translator",

        title: "Translator Playground",
        component: TranslatorPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsTranslator
        }
      },
      {
        path: "playgrounds/language-detector",

        title: "Language Detector Playground",
        component: LanguageDetectorPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsLanguageDetector
        }
      },
      {
        path: "playgrounds/proofreader",

        title: "Proofreader Playground",
        component: ProofreaderPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsProofreader
        }
      },
      {
        path: "playgrounds/semantic-embedder",

        title: "Semantic Embedder Playground",
        component: SemanticEmbedderPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsSemanticEmbedder
        }
      },
      {
        path: "playgrounds/classifier",

        title: "Classifier Playground",
        component: ClassifierPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsClassifier
        }
      },
      {
        path: "playgrounds/web-speech",

        title: "Web Speech Playground",
        component: WebSpeechPlaygroundPage,
        data: {
          route: RouteEnum.PlaygroundsWebSpeech
        }
      },
      {
        path: "labs/note-editor",

        title: "Note Editor Lab",
        component: NoteEditorPage,
        data: {
          route: RouteEnum.LabsNoteEditor
        }
      },
      {
        path: "dashboards/consumer-hardware-analysis",

        title: "Consumer Hardware Analysis",
        component: ConsumerHardwareAnalysisPage,
        data: {
          route: RouteEnum.DashboardsConsumerHardware
        }
      },
      {
        path: "extension",

        title: "Extension",
        component: ExtensionLandingPage,
        data: {
          route: RouteEnum.Extension
        }
      },
      {
        path: "",

        title: "Chat",
        component: ChatPage,
        pathMatch: "full",
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "evals",

        title: "Evals",
        component: EvalsPage,
        data: {
          route: RouteEnum.Evals
        }
      },
      {
        path: "translation",

        title: "Translation",
        component: TranslationPage,
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "writing-assistance",

        title: "Writing Assistance",
        component: WritingAssistancePage,
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "demos",

        title: "Demos",
        component: DemosPage,
        data: {
          route: RouteEnum.Demos
        }
      },
            {
        path: "demos/translation",

        title: "Demo: Translation",
        component: TranslationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/summarization",

        title: "Demo: Summarization",
        component: SummarizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/proofreading",

        title: "Demo: Proofreading",
        component: ProofreadingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/tone-changer",

        title: "Demo: Tone Changer",
        component: ToneChangerDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/brainstorming",

        title: "Demo: Brainstorming",
        component: BrainstormingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-javascript",

        title: "Demo: Write Javascript",
        component: WriteJavascriptDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-html-css",

        title: "Demo: Write HTML CSS",
        component: WriteHtmlCssDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/eli5",

        title: "Demo: ELI5",
        component: Eli5DemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/sql-generator",

        title: "Demo: SQL Generator",
        component: SqlGeneratorDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-email",

        title: "Demo: Write Email",
        component: WriteEmailDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/ocr",

        title: "Demo: OCR",
        component: OcrDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-description",

        title: "Demo: Image Description",
        component: ImageDescriptionDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/explain-meme",

        title: "Demo: Explain Meme",
        component: ExplainMemeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/fridge-recipe",

        title: "Demo: Fridge Recipe",
        component: FridgeRecipeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-categorization",

        title: "Demo: Image Categorization",
        component: ImageCategorizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/audio-transcription",

        title: "Demo: Audio Transcription",
        component: AudioTranscriptionDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/meeting-notes",

        title: "Demo: Meeting Notes",
        component: MeetingNotesDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/audio-summarization",

        title: "Demo: Audio Summarization",
        component: AudioSummarizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/structured-json",

        title: "Demo: Structured JSON",
        component: StructuredJsonDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/extract-entities",

        title: "Demo: Extract Entities",
        component: ExtractEntitiesDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-audio-query",

        title: "Demo: Image Audio Query",
        component: ImageAudioQueryDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/receipt-to-json",

        title: "Demo: Receipt To JSON",
        component: ReceiptToJsonDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/document-chat",

        title: "Demo: Document Chat",
        component: DocumentChatDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/semantic-search",

        title: "Demo: Semantic Search",
        component: SemanticSearchDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/smart-triage",

        title: "Demo: Smart Triage",
        component: SmartTriageDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/duplicate-detector",

        title: "Demo: Duplicate Detector",
        component: DuplicateDetectorDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/cluster-and-label",

        title: "Demo: Cluster And Label",
        component: ClusterLabelDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/semantic-cache",

        title: "Demo: Semantic Cache",
        component: SemanticCacheDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/command-palette",

        title: "Demo: Command Palette",
        component: CommandPaletteDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/semantic-word-game",

        title: "Demo: Semantic Word Game",
        component: SemanticWordGameDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/live-translated-captions",

        title: "Demo: Live Translated Captions",
        component: LiveTranslatedCaptionsDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/speak-to-fill",

        title: "Demo: Speak To Fill",
        component: SpeakToFillDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/asr-quality-tiers",

        title: "Demo: ASR Quality Tiers",
        component: AsrQualityTiersDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/contextual-biasing",

        title: "Demo: Contextual Biasing",
        component: ContextualBiasingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/polyglot-chat",

        title: "Demo: Polyglot Chat",
        component: PolyglotChatDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/proofreader-inline",

        title: "Demo: Proofreader Inline",
        component: ProofreaderInlineDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/universal-inbox",

        title: "Demo: Universal Inbox",
        component: UniversalInboxDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/tone-pad",

        title: "Demo: Tone Pad",
        component: TonePadDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/summarizer-matrix",

        title: "Demo: Summarizer Matrix",
        component: SummarizerMatrixDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/reply-composer",

        title: "Demo: Reply Composer",
        component: ReplyComposerDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/dictate-and-polish",

        title: "Demo: Dictate And Polish",
        component: DictateAndPolishDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/camera-qa",

        title: "Demo: Camera Qa",
        component: CameraQaDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/draw-and-guess",

        title: "Demo: Draw And Guess",
        component: DrawAndGuessDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/story-time",

        title: "Demo: Story Time",
        component: StoryTimeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/tool-calling",

        title: "Demo: Tool Calling",
        component: ToolCallingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/screenshot-to-code",

        title: "Demo: Screenshot To Code",
        component: ScreenshotToCodeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/regex-lab",

        title: "Demo: Regex Lab",
        component: RegexLabDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/csv-qa",

        title: "Demo: CSV Qa",
        component: CsvQaDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/session-branching",

        title: "Demo: Session Branching",
        component: SessionBranchingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/localization-qa",

        title: "Demo: Localization Qa",
        component: LocalizationQaDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/omnibox",

        title: "Demo: Omnibox",
        component: OmniboxDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/moderation-cascade",

        title: "Demo: Moderation Cascade",
        component: ModerationCascadeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/study-kit",

        title: "Demo: Study Kit",
        component: StudyKitDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/photo-search",

        title: "Demo: Photo Search",
        component: PhotoSearchDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/tongue-twister",

        title: "Demo: Tongue Twister",
        component: TongueTwisterDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/mystery-language",

        title: "Demo: Mystery Language",
        component: MysteryLanguageDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/system1-ticket-router",

        title: "Demo: System1 Ticket Router",
        component: System1TicketRouterDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/live-draft-guardrails",

        title: "Demo: Live Draft Guardrails",
        component: LiveDraftGuardrailsDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/chameleon-adaptive-ui",

        title: "Demo: Chameleon Adaptive UI",
        component: ChameleonAdaptiveUiDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/nl-catalog-matcher",

        title: "Demo: NL Catalog Matcher",
        component: NlCatalogMatcherDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/system1-system2-cascade",

        title: "Demo: System1 System2 Cascade",
        component: System1System2CascadeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/smart-clipboard-paste",

        title: "Demo: Smart Clipboard Paste",
        component: SmartClipboardPasteDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/focus-notification-shield",

        title: "Demo: Focus Notification Shield",
        component: FocusNotificationShieldDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/instant-form-autofill",

        title: "Demo: Instant Form Autofill",
        component: InstantFormAutofillDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "privacy-policy",

        title: "Privacy Policy",
        component: PrivacyPolicyPage,
        data: {
          route: RouteEnum.PrivacyPolicy
        }
      },
      {
        path: "terms-of-service",

        title: "Terms Of Service",
        component: TermsOfServicePage,
        data: {
          route: RouteEnum.TermsOfService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
