import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '@/core/models/user.models';
import { CourseGroup } from '@/core/models/course-group.models';
import { UsersService } from '@/core/services/users.service';
import { CourseGroupsService } from '@/core/services/course-groups.service';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../ui/button/button';
import { IconButtonComponent } from '../../ui/icon-button/icon-button';
import { InputComponent } from '../../ui/input/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assign-user-to-group-popup',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconButtonComponent, InputComponent, FormsModule],
  templateUrl: './assign-user-to-group-popup.html',
})
export class AssignUserToGroupPopupComponent {
  @Input() isOpen = false;
  @Input() group: CourseGroup | null = null;
  @Output() closePopup = new EventEmitter<void>();
  @Output() userAssigned = new EventEmitter<void>();

  users: User[] = [];
  searchTerm = '';
  selectedUserId = '';
  isLoading = false;
  error: string | null = null;

  constructor(
    private usersService: UsersService,
    private courseGroupsService: CourseGroupsService
  ) {}

  ngOnChanges() {
    if (this.isOpen) {
      this.loadUsers();
    }
  }

  loadUsers() {
    this.isLoading = true;
    this.usersService.getUsers().subscribe({
      next: (response) => {
        this.users = response.data.users;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users.';
        this.isLoading = false;
      },
    });
  }

  get filteredUsers() {
    if (!this.searchTerm) {
      return this.users;
    }
    return this.users.filter(user =>
      user.fullName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  assignUser() {
    if (!this.selectedUserId || !this.group) {
      return;
    }

    this.isLoading = true;
    this.courseGroupsService
      .assignUserToGroup(this.group._id, this.selectedUserId)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.userAssigned.emit();
          this.onClose();
        },
        error: (err) => {
          this.error = 'Failed to assign user.';
          this.isLoading = false;
        },
      });
  }

  onClose() {
    this.closePopup.emit();
    this.searchTerm = '';
    this.selectedUserId = '';
    this.error = null;
  }
}
