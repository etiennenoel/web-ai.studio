import {ChatPage} from './pages/chat/chat.page';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MagienoDragAndDropComponent} from '@magieno/angular-drag-and-drop';
import {MagienoBootstrapDropdownComponent} from '@magieno/angular-bootstrap-dropdown';
import {MagienoCodeEditorModule} from '@magieno/angular-code-editor';
import {MagienoCoreModule, RootComponent} from '@magieno/angular-core';
import {MagienoMediaModule} from '@magieno/angular-media';
import {MagienoAdvancedTableComponent} from '@magieno/angular-advanced-table';
import {MagienoAIModule} from '@magieno/angular-ai';
import {NgbOffcanvas, NgbOffcanvasModule, NgbTooltip, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';
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
import {MagienoAdvancedFormsModule} from '@magieno/angular-advanced-forms';
import { CortexPage } from './pages/cortex/cortex.page';
import { AxonPage } from './pages/cortex/axon/axon.page';
import {AxonTestSuiteExecutor} from './pages/cortex/axon/axon-test-suite.executor';
import {
  LanguageDetectorShortStringColdStartAxonTest
} from './pages/cortex/axon/tests/language-detector-short-string-cold-start.axon-test';

@NgModule({
  declarations: [
    ChatPage,
    LayoutComponent,
    HeaderComponent,
    SidebarComponent,
    TranslationPage,
    WritingAssistancePage,
    EvalsPage,
    PromptCodeModal,

    AutoScrollDirective,
     CortexPage,
     AxonPage,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    MagienoDragAndDropComponent,
    MagienoBootstrapDropdownComponent,
    MagienoCodeEditorModule,
    MagienoCoreModule,
    MagienoMediaModule,
    MagienoAdvancedTableComponent,
    MagienoAIModule,
    NgbTooltipModule,
    NgbOffcanvasModule,
    MagienoAdvancedFormsModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Axon
    AxonTestSuiteExecutor,

    LanguageDetectorShortStringColdStartAxonTest,
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
