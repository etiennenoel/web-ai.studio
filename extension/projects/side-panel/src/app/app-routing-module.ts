import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview';
import { SettingsComponent } from './settings/settings';
import { DiagnosisComponent } from 'base';

const routes: Routes = [
  { path: '', component: OverviewComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'diagnosis', component: DiagnosisComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
