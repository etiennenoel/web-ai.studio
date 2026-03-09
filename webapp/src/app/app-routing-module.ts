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

const routes: Routes = [
  {
    path: "cortex",
    component: CortexPage,
    data: {
      route: RouteEnum.Cortex
    }
  },
  {
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
        path: "privacy-policy",
        component: PrivacyPolicyPage,
        data: {
          route: RouteEnum.PrivacyPolicy
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
