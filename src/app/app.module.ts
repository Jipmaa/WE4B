import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { CoursComponent } from './cours/cours.component';
import { ListecoursComponent } from './listecours/listecours.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    CoursComponent,
    ListecoursComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
