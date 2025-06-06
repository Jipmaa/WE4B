import { NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CoursComponent } from './components/cours/cours.component';
import { ListecoursComponent } from './components/listecours/listecours.component';
import { LoginComponent } from './components/login/login.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserformComponent } from './components/userform/userform.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    CoursComponent,
    ListecoursComponent,
    LoginComponent,
    UserformComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule, // pour les formulaires
    ReactiveFormsModule, // pour les formulaires réactifs
  ],
  providers: [
    HttpClient
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] //pour les icônes
})
export class AppModule { }
