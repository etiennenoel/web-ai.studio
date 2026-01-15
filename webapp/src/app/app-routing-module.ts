import {Routes} from '@angular/router';
import {LayoutComponent} from './components/layout/layout.component';
import {ChatPage} from './pages/chat/chat.page';
import {TranslationPage} from './pages/translation/translation.page';
import {RouteEnum} from './enums/route.enum';
import {WritingAssistancePage} from './pages/writing-assistance/writing-assistance.page';
import {EvalsPage} from './pages/evals/evals.page';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {CortexPage} from './pages/cortex/cortex.page';
import {AxonPage} from './pages/cortex/axon/axon.page';

const routes: Routes = [  {
  path: "",
  component: LayoutComponent,
  children: [
    {
      path: "",
      component: ChatPage,
      data: {
        route: RouteEnum.Translation
      }
    },
    {
      path: "chat",
      component: ChatPage,
      data: {
        route: RouteEnum.Translation
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
      path: "evals",
      component: EvalsPage,
      data: {
        route: RouteEnum.Evals
      }
    },
    {
      path: "cortex",
      component: CortexPage,
      data: {
        route: RouteEnum.Cortex
      }
    },
    {
      path: "cortex/axon",
      component: AxonPage,
      data: {
        route: RouteEnum.Axon
      }
    },
    {
      path: 'docs',
      loadChildren: () => import('./pages/docs/docs.module').then(m => m.DocsModule)
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
