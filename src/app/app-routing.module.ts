import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { CoursComponent } from './components/cours/cours.component';
import { ListecoursComponent } from './components/listecours/listecours.component';
import { LoginGuard } from './guard/login.guard';
import { UserformComponent } from './components/userform/userform.component';

const routes: Routes = [
  {path : '', component : LoginComponent},
  {path : 'listecours', component : ListecoursComponent, canActivate: [LoginGuard]},
  {path : 'userform', component : UserformComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }