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
import { PerformanceComponent } from './panels/performance/performance.component';
import { HistoryComponent } from './panels/history/history.component';
import { PanelTab } from './enums/panel-tab.enum';
import { SettingsComponent, DiagnosisComponent } from 'base';

const routes: Routes = [
  { path: '', redirectTo: PanelTab.OVERVIEW, pathMatch: 'full' },
  { path: PanelTab.OVERVIEW, component: OverviewComponent },
  { path: PanelTab.PERFORMANCE, component: PerformanceComponent },
  { path: PanelTab.HISTORY, component: HistoryComponent },
  { path: PanelTab.MODELS, component: ModelsComponent },
  { path: PanelTab.DIAGNOSIS, component: DiagnosisComponent },
  { path: PanelTab.PROMPT, component: PromptComponent },
  { path: PanelTab.SUMMARIZER, component: SummarizerComponent },
  { path: PanelTab.TRANSLATOR, component: TranslatorComponent },
  { path: PanelTab.DETECTOR, component: DetectorComponent },
  { path: PanelTab.PROOFREADER, component: ProofreaderComponent },
  { path: PanelTab.WRITER, component: WriterComponent },
  { path: PanelTab.REWRITER, component: RewriterComponent },
  { path: PanelTab.SETTINGS, component: SettingsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }