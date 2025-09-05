import { NgModule } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { AppModule } from './app-module';
import { serverRoutes } from './app.routes.server';
import {RootComponent} from '@magieno/angular-core';

@NgModule({
  imports: [AppModule],
  providers: [provideServerRendering(withRoutes(serverRoutes))],
  bootstrap: [RootComponent],
})
export class AppServerModule {}
