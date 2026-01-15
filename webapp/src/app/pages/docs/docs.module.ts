import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocsRoutingModule } from './docs-routing.module';
import { DocsComponent } from './docs.component';
import { DocsIntroComponent } from './pages/intro/intro.component';
import { DocsFoundationsComponent } from './pages/course-foundations/course-foundations.component';
import { DocsChatbotComponent } from './pages/course-chatbot/course-chatbot.component';
import { DocsToolsComponent } from './pages/course-tools/course-tools.component';
import { DocsRefPromptComponent } from './pages/reference/prompt/ref-prompt.component';
import { DocsRefSummarizerComponent } from './pages/reference/summarizer/ref-summarizer.component';
import { DocsRefWriterComponent } from './pages/reference/writer/ref-writer.component';
import { DocsRefRewriterComponent } from './pages/reference/rewriter/ref-rewriter.component';
import { DocsRefProofreaderComponent } from './pages/reference/proofreader/ref-proofreader.component';

@NgModule({
  declarations: [
    DocsComponent,
    DocsIntroComponent,
    DocsFoundationsComponent,
    DocsChatbotComponent,
    DocsToolsComponent,
    DocsRefPromptComponent,
    DocsRefSummarizerComponent,
    DocsRefWriterComponent,
    DocsRefRewriterComponent,
    DocsRefProofreaderComponent
  ],
  imports: [
    CommonModule,
    DocsRoutingModule
  ]
})
export class DocsModule { }
