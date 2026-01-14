import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './panels/overview/overview.component';
import { ModelsComponent } from './panels/models/models.component';
import { PromptComponent } from './panels/prompt/prompt.component';
import { SummarizerComponent } from './panels/summarizer/summarizer.component';
import { TranslatorComponent } from './panels/translator/translator.component';
import { DetectorComponent } from './panels/detector/detector.component';
import { ProofreaderComponent } from './panels/proofreader/proofreader.component';
import { WriterComponent } from './panels/writer/writer.component';
import { RewriterComponent } from './panels/rewriter/rewriter.component';
import { PanelTab } from './enums/panel-tab.enum';

const routes: Routes = [
  { path: '', redirectTo: PanelTab.OVERVIEW, pathMatch: 'full' },
  { path: PanelTab.OVERVIEW, component: OverviewComponent },
  { path: PanelTab.MODELS, component: ModelsComponent },
  { path: PanelTab.PROMPT, component: PromptComponent },
  { path: PanelTab.SUMMARIZER, component: SummarizerComponent },
  { path: PanelTab.TRANSLATOR, component: TranslatorComponent },
  { path: PanelTab.DETECTOR, component: DetectorComponent },
  { path: PanelTab.PROOFREADER, component: ProofreaderComponent },
  { path: PanelTab.WRITER, component: WriterComponent },
  { path: PanelTab.REWRITER, component: RewriterComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }