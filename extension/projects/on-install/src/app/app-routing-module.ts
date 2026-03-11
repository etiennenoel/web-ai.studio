import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from 'base';
// We don't have an OnInstallComponent, the logic is in AppComponent.
// Let's just use empty routes but we can check the URL in AppComponent.

const routes: Routes = [
  { path: 'settings', component: SettingsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
