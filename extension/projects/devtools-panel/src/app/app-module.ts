import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastComponent } from './components/toast/toast.component';
import { HistoryListComponent } from './components/history-list/history-list.component';
import { OverviewComponent } from './panels/overview/overview.component';
import { ModelsComponent } from './panels/models/models.component';
import { PromptComponent } from './panels/prompt/prompt.component';
import { SummarizerComponent } from './panels/summarizer/summarizer.component';
import { TranslatorComponent } from './panels/translator/translator.component';
import { DetectorComponent } from './panels/detector/detector.component';
import { ProofreaderComponent } from './panels/proofreader/proofreader.component';
import { WriterComponent } from './panels/writer/writer.component';
import { RewriterComponent } from './panels/rewriter/rewriter.component';
import { ModelDownloadCard } from './components/model-download-card/model-download-card';
import { ApiStatusComponent } from './components/api-status/api-status.component';
import {BaseModule} from "base";

@NgModule({
  declarations: [
    App,
    SidebarComponent,
    ToastComponent,
    HistoryListComponent,
    OverviewComponent,
    ModelsComponent,
    PromptComponent,
    SummarizerComponent,
    TranslatorComponent,
    DetectorComponent,
    ProofreaderComponent,
    WriterComponent,
    RewriterComponent,
    ModelDownloadCard,
    ApiStatusComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    BaseModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
