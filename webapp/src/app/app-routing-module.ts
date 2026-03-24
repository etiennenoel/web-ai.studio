import {Routes} from '@angular/router';
import {LayoutComponent} from './components/layout/layout.component';
import {ChatPage} from './pages/chat/chat.page';
import {TranslationPage} from './pages/translation/translation.page';
import {RouteEnum} from './enums/route.enum';
import {WritingAssistancePage} from './pages/writing-assistance/writing-assistance.page';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {CortexPage} from './pages/cortex/cortex.page';
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

const routes: Routes = [
  {
    path: "cortex",
    component: CortexPage,
    data: {
      route: RouteEnum.Cortex
    }
  },
  {
    path: "bugs",
    component: BugsPage,
    data: {
      route: RouteEnum.Bugs
    }
  },
  {
    path: "bugs/first-create-should-fully-load-the-model",
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
        path: "docs",
        component: DocsHomePage,
        data: {
          route: RouteEnum.Docs
        }
      },
      {
        path: "docs/get-started",
        component: GetStartedPage,
        data: {
          route: RouteEnum.GetStarted
        }
      },
      {
        path: "docs/check-availability",
        component: CheckAvailabilityPage,
        data: {
          route: RouteEnum.CheckAvailability
        }
      },
      {
        path: "docs/tracking-download",
        component: TrackingDownloadPage,
        data: {
          route: RouteEnum.TrackingDownload
        }
      },
      {
        path: "docs/aborting-operations",
        component: AbortingOperationsPage,
        data: {
          route: RouteEnum.AbortingOperations
        }
      },
      {
        path: "docs/errors",
        component: DocsErrorsPage,
        data: {
          route: RouteEnum.Errors
        }
      },
      {
        path: "docs/prompt-api",
        component: PromptApiPage,
        data: {
          route: RouteEnum.PromptApi
        }
      },
      {
        path: "docs/summarizer",
        component: SummarizerApiPage,
        data: {
          route: RouteEnum.SummarizerApi
        }
      },
      {
        path: "docs/writer",
        component: WriterApiPage,
        data: {
          route: RouteEnum.WriterApi
        }
      },
      {
        path: "docs/rewriter",
        component: RewriterApiPage,
        data: {
          route: RouteEnum.RewriterApi
        }
      },
      {
        path: "docs/translator",
        component: TranslatorApiPage,
        data: {
          route: RouteEnum.TranslatorApi
        }
      },
      {
        path: "docs/language-detector",
        component: LanguageDetectorApiPage,
        data: {
          route: RouteEnum.LanguageDetectorApi
        }
      },
      {
        path: "docs/proofreader",
        component: ProofreaderApiPage,
        data: {
          route: RouteEnum.ProofreaderApi
        }
      },
      {
        path: "extension",
        component: ExtensionLandingPage,
        data: {
          route: RouteEnum.Extension
        }
      },
      {
        path: "",
        component: ChatPage,
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "evals",
        component: EvalsPage,
        data: {
          route: RouteEnum.Evals
        }
      },
      {
        path: "translation",
        component: TranslationPage,
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "writing-assistance",
        component: WritingAssistancePage,
        data: {
          route: RouteEnum.Translation
        }
      },
      {
        path: "demos",
        component: DemosPage,
        data: {
          route: RouteEnum.Demos
        }
      },
            {
        path: "demos/translation",
        component: TranslationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/summarization",
        component: SummarizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/proofreading",
        component: ProofreadingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/tone-changer",
        component: ToneChangerDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/brainstorming",
        component: BrainstormingDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-javascript",
        component: WriteJavascriptDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-html-css",
        component: WriteHtmlCssDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/eli5",
        component: Eli5DemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/sql-generator",
        component: SqlGeneratorDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/write-email",
        component: WriteEmailDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/ocr",
        component: OcrDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-description",
        component: ImageDescriptionDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/explain-meme",
        component: ExplainMemeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/fridge-recipe",
        component: FridgeRecipeDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-categorization",
        component: ImageCategorizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/audio-transcription",
        component: AudioTranscriptionDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/meeting-notes",
        component: MeetingNotesDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/audio-summarization",
        component: AudioSummarizationDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/structured-json",
        component: StructuredJsonDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/extract-entities",
        component: ExtractEntitiesDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/image-audio-query",
        component: ImageAudioQueryDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "demos/receipt-to-json",
        component: ReceiptToJsonDemoComponent,
        data: {
          route: RouteEnum.Demos
        }
      },
      {
        path: "privacy-policy",
        component: PrivacyPolicyPage,
        data: {
          route: RouteEnum.PrivacyPolicy
        }
      },
      {
        path: "terms-of-service",
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
