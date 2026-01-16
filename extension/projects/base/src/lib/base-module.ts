import { NgModule } from '@angular/core';
import { Base } from './base';
import { ModelManager } from './managers/model.manager';
import { TranslatorManager } from './managers/translator.manager';
import { SummarizerManager } from './managers/summarizer.manager';
import { WriterManager } from './managers/writer.manager';
import { RewriterManager } from './managers/rewriter.manager';
import { ProofreaderManager } from './managers/proofreader.manager';
import { LanguageDetectorManager } from './managers/language-detector.manager';
import { PromptManager } from './managers/prompt.manager';

@NgModule({
  declarations: [
    Base
  ],
  imports: [
  ],
  exports: [
    Base
  ],
  providers: [
    ModelManager,
    TranslatorManager,
    SummarizerManager,
    WriterManager,
    RewriterManager,
    ProofreaderManager,
    LanguageDetectorManager,
    PromptManager
  ],
})
export class BaseModule { }