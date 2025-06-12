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
import { UeformComponent } from './components/ueform/ueform.component';
import { NavbarItemComponent } from './components/navbar-item/navbar-item.component';
import { UiFormInputComponent } from './components/ui-form-input/ui-form-input.component';
import {icons, LucideAngularModule} from "lucide-angular";
import { ButtonComponent } from './components/button/button.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    CoursComponent,
    ListecoursComponent,
    LoginComponent,
    UserformComponent,
    UeformComponent,
    NavbarItemComponent,
    UiFormInputComponent,
    ButtonComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule, // for forms
    ReactiveFormsModule, // for reactive forms
    LucideAngularModule.pick(icons),  // for icons
  ],
  providers: [
    HttpClient
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] //pour les icônes
})
export class AppModule { }
