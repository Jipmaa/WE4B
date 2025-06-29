import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '@/core/models/user.models';
import { CourseGroup } from '@/core/models/course-group.models';
import { UsersService } from '@/core/services/users.service';
import { CourseGroupsService } from '@/core/services/course-groups.service';
import { AuthService } from '@/core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { SelectComponent, SelectOption } from '@/shared/components/ui/select';
import { getCurrentAcademicPeriod } from '@/shared/utils/academic-period';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assign-user-to-group-popup',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconButtonComponent, SelectComponent, FormsModule],
  templateUrl: './assign-user-to-group-popup.html',
})
export class AssignUserToGroupPopupComponent {
  @Input() isOpen = false;
  @Input() group: CourseGroup | null = null;
  @Output() closePopup = new EventEmitter<void>();
  @Output() userAssigned = new EventEmitter<void>();

  users: User[] = [];
  selectedUserId = '';
  selectedSemester: 1 | 2 | null = 1;
  selectedYear = '';
  selectedRole: 'student' | 'teacher' = 'student';
  selectedSemesterValue = '';
  isForeverAssignment = false;
  isLoading = false;
  error: string | null = null;

  constructor(
    private usersService: UsersService,
    private courseGroupsService: CourseGroupsService,
    private authService: AuthService
  ) {
    const current = getCurrentAcademicPeriod();
    this.selectedSemester = current.semester;
    this.selectedYear = current.year;
    this.selectedSemesterValue = `${current.semester}-${current.year}`;
  }

  ngOnChanges() {
    if (this.isOpen) {
      this.loadUsers();
    }
  }

  loadUsers() {
    if (!this.group) return;

    this.isLoading = true;
    this.courseGroupsService.getAvailableUsersForGroup(this.group._id).subscribe({
      next: (response) => {
        this.users = response.data.users;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load available users.';
        this.isLoading = false;
      },
    });
  }

  get userOptions(): SelectOption[] {
    return this.users.map(user => ({
      value: user._id,
      label: user.fullName,
      description: user.email
    }));
  }

  get semesterOptions(): SelectOption[] {
    const current = getCurrentAcademicPeriod();
    const next = this.getNextAcademicPeriod();

    return [
      {
        value: 'forever',
        label: 'Forever (Permanent Assignment)',
        description: 'User remains in group permanently'
      },
      {
        value: `${current.semester}-${current.year}`,
        label: `Current Semester (${current.year} S${current.semester})`,
        description: this.getSemesterDescription(current)
      },
      {
        value: `${next.semester}-${next.year}`,
        label: `Next Semester (${next.year} S${next.semester})`,
        description: this.getSemesterDescription(next)
      }
    ];
  }

  get roleOptions(): SelectOption[] {
    return [
      {
        value: 'student',
        label: 'Student',
        description: 'Regular group member'
      },
      {
        value: 'teacher',
        label: 'Teacher',
        description: 'Group instructor'
      }
    ];
  }

  get selectedUser(): User | null {
    return this.users.find(user => user._id === this.selectedUserId) || null;
  }

  get selectedUserCanBeTeacher(): boolean {
    const user = this.selectedUser;
    return user?.roles.includes('teacher') || false;
  }

  get canSelectRole(): boolean {
    // Only allow role selection if the selected user exists and can be a teacher
    return this.selectedUserCanBeTeacher;
  }

  get roleSelectionDisabled(): boolean {
    return !this.canSelectRole;
  }

  private getNextAcademicPeriod() {
    const current = getCurrentAcademicPeriod();
    if (current.semester === 1) {
      return { year: current.year, semester: 2 as const };
    } else {
      const currentStartYear = parseInt(current.year.split('-')[0]);
      return {
        year: `${currentStartYear + 1}-${currentStartYear + 2}`,
        semester: 1 as const
      };
    }
  }

  private getSemesterDescription(period: { year: string; semester: 1 | 2 }): string {
    const months = period.semester === 1
      ? 'September - January'
      : 'February - June';
    return months;
  }

  onUserSelected(option: SelectOption): void {
    this.selectedUserId = option.value;

    // Auto-set role based on selected user's capabilities
    const user = this.selectedUser;
    if (user) {
      if (!user.roles.includes('teacher')) {
        // If user is not a teacher, force role to student
        this.selectedRole = 'student';
        return;
      }
      // If the user can be teacher, preselect teacher role
      this.selectedRole = 'teacher';
    }
  }

  onSemesterSelected(option: SelectOption): void {
    this.selectedSemesterValue = option.value;

    if (option.value === 'forever') {
      this.isForeverAssignment = true;
      this.selectedSemester = null;
      this.selectedYear = '';
    } else {
      this.isForeverAssignment = false;
      const [semester, year] = option.value.split('-');
      this.selectedSemester = parseInt(semester) as 1 | 2;
      this.selectedYear = year;
    }
  }

  onRoleSelected(option: SelectOption): void {
    this.selectedRole = option.value;
  }

  assignUser() {
    if (!this.selectedUserId || !this.group) {
      return;
    }

    // For non-forever assignments, semester selection is required
    if (!this.isForeverAssignment && (!this.selectedSemester || !this.selectedYear)) {
      return;
    }

    this.isLoading = true;

    // Build payload conditionally
    const payload: any = {
      userId: this.selectedUserId,
      role: this.selectedRole
    };

    // Only add semester/year if not forever assignment
    if (!this.isForeverAssignment && this.selectedSemester && this.selectedYear) {
      payload.semester = this.selectedSemester;
      payload.year = this.selectedYear;
    }

    this.courseGroupsService
      .addUserToGroup(this.group._id, payload)
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
    this.selectedUserId = '';
    const current = getCurrentAcademicPeriod();
    this.selectedSemester = current.semester;
    this.selectedYear = current.year;
    this.selectedSemesterValue = `${current.semester}-${current.year}`;
    this.selectedRole = 'student';
    this.isForeverAssignment = false;
    this.error = null;
  }
}
