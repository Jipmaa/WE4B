import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { User } from '@/core/models/user.models';
import { AdminPageList } from './admin-page-list/admin-page-list';
import { UsersService } from '@/core/services/users.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AdminPageList],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage {

  UsersArray !: User[]

  showContent: string | null = null;

  constructor(public servUe: UsersService) {
      this.servUe.getUsers().subscribe(
        response => {
          console.log(response);
          this.UsersArray = response.data.users;
        }
      )
    }
  
    ngOnInit(): void {
  
    }

  displayList(type: string): void {
    this.showContent = type;
  }
}
