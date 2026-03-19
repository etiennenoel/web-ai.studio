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
    path: "extension",
    component: ExtensionLandingPage,
    data: {
      route: RouteEnum.Extension
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
