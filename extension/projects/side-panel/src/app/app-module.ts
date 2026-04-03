import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { OverviewComponent } from './overview/overview';
import { SettingsComponent } from './settings/settings';
import { SettingsComponent as LibSettingsComponent, DiagnosisComponent } from 'base';

@NgModule({
  declarations: [
    App,
    OverviewComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    LibSettingsComponent,
    DiagnosisComponent
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
