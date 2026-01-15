import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  {
    path: '',
    component: DocsComponent,
    children: [
      { path: '', redirectTo: 'intro', pathMatch: 'full' },
      { path: 'intro', component: DocsIntroComponent },
      { path: 'course-foundations', component: DocsFoundationsComponent },
      { path: 'course-chatbot', component: DocsChatbotComponent },
      { path: 'course-tools', component: DocsToolsComponent },
      { path: 'ref-prompt', component: DocsRefPromptComponent },
      { path: 'ref-summarizer', component: DocsRefSummarizerComponent },
      { path: 'ref-writer', component: DocsRefWriterComponent },
      { path: 'ref-rewriter', component: DocsRefRewriterComponent },
      { path: 'ref-proofreader', component: DocsRefProofreaderComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocsRoutingModule { }
