import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CoursComponent } from './cours/cours.component';
import { ListecoursComponent } from './listecours/listecours.component';
import { LoginGuard } from './guard/login.guard';

const routes: Routes = [
  {path : '', component : LoginComponent},
  {path : 'listecours', component : ListecoursComponent, canActivate: [LoginGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }