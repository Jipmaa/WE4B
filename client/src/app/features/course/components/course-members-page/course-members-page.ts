import {Component, computed, inject, signal, ViewChild, ElementRef} from '@angular/core';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {CourseGroupsService} from '@/core/services/course-groups.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {map, switchMap, of} from 'rxjs';
import {CommonModule} from '@angular/common';
import {LucideAngularModule} from 'lucide-angular';
import {UserCard} from '@/features/course/components/user-card/user-card';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';
import {PopulatedGroupUser} from '@/core/models/course-group.models';
import {getCurrentAcademicPeriod} from '@/shared/utils/academic-period';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import { RecentActivitySidebar } from '@/shared/components/ui/recent-activity-sidebar/recent-activity-sidebar';


@Component({
  selector: 'app-course-members-page',
  imports: [
    SidebarLayout,
    CommonModule,
    LucideAngularModule,
    UserCard,
    IconButtonComponent,
    ButtonComponent,
    RecentActivitySidebar
  ],
  templateUrl: './course-members-page.html',
})
export class CourseMembersPage {

  private readonly courseGroupsService = inject(CourseGroupsService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('groupButton', { read: ElementRef }) groupButtonRef?: ElementRef<HTMLButtonElement>;

  // Get groups with course info
  protected readonly groupsData = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug') || ''),
      switchMap(slug => {
        if (!slug) {
          return of(null);
        }
        return this.courseGroupsService.getGroupsByCourseUnitSlug(slug);
      }),
      map(response => response?.success ? response.data : null)
    ),
    { initialValue: null }
  );

  // Loading and error states
  readonly isLoading = computed(() => this.courseGroupsService.isLoading());
  readonly error = computed(() => this.courseGroupsService.error());

  protected readonly groups = computed(() => this.groupsData()?.groups || []);
  protected readonly courseUnit = computed(() => this.groupsData()?.courseUnit || null);

  readonly groupFilterOptions = computed(
    () => {
      const all = { value: '$internal_all', label: 'Tous les groupes' };
      const groupsArray = this.groups();

      if (!groupsArray || groupsArray.length === 0) {
        return [all];
      }

      const groups = groupsArray.map(group => ({
        value: group._id,
        label: `${group.name} (${(group as any).kind} - ${(group as any).day})`
      }));
      return [all, ...groups];
    }
  );

  readonly selectedGroupFilter = signal('$internal_all');
  readonly currentSemesterOnly = signal(true);
  readonly filterDropdownOpen = signal(false);
  readonly groupSubDropdownOpen = signal(false);
  readonly subDropdownPosition = signal<'left' | 'bottom'>('left');

  protected readonly currentAcademicPeriod = computed(() => {
    try {
      return getCurrentAcademicPeriod();
    } catch {
      return null;
    }
  });

  // Get all unique users from selected groups
  protected readonly allUsers = computed(() => {
    const selectedGroup = this.selectedGroupFilter();
    const groups = this.groups();
    const currentSemesterFilter = this.currentSemesterOnly();
    const currentPeriod = this.currentAcademicPeriod();

    let users: PopulatedGroupUser[];

    if (selectedGroup === '$internal_all') {
      // Get all users from all groups
      const userMap = new Map<string, PopulatedGroupUser>();
      groups.forEach(group => {
        (group as any).users?.forEach((userRef: PopulatedGroupUser) => {
          userMap.set(userRef.user._id, userRef);
        });
      });
      users = Array.from(userMap.values());
    } else {
      // Get users from selected group only
      const selectedGroupData = groups.find(g => g._id === selectedGroup);
      users = (selectedGroupData as any)?.users || [];
    }

    // Filter by current semester if enabled
    if (currentSemesterFilter && currentPeriod) {
      users = users.filter((userRef: PopulatedGroupUser) => {
        // Teachers are always shown regardless of semester
        if (userRef.role === 'teacher') {
          return true;
        }
        // Students are filtered by semester and year
        return userRef.semester === currentPeriod.semester &&
               userRef.year === currentPeriod.year;
      });
    }

    return users;
  });

  // Group users by role
  protected readonly groupedUsers = computed(() => {
    const users = this.allUsers();
    const teachers: PopulatedGroupUser[] = [];
    const students: PopulatedGroupUser[] = [];

    users.forEach((userRef: PopulatedGroupUser) => {
      if (userRef.role === 'teacher') {
        teachers.push(userRef);
      } else if (userRef.role === 'student') {
        students.push(userRef);
      }
    });

    return { teachers, students };
  });


  protected onToggleCurrentSemester() {
    this.currentSemesterOnly.set(!this.currentSemesterOnly());
  }

  onToggleFilterDropdown() {
    this.filterDropdownOpen.set(!this.filterDropdownOpen());
    if (!this.filterDropdownOpen()) {
      this.groupSubDropdownOpen.set(false);
    }
  }

  onCloseFilterDropdown() {
    this.filterDropdownOpen.set(false);
    this.groupSubDropdownOpen.set(false);
  }

  onToggleGroupSubDropdown() {
    if (!this.groupSubDropdownOpen()) {
      this.calculateSubDropdownPosition();
    }
    this.groupSubDropdownOpen.set(!this.groupSubDropdownOpen());
  }

  private calculateSubDropdownPosition() {
    if (!this.groupButtonRef?.nativeElement) return;

    const button = this.groupButtonRef.nativeElement;
    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Sub-dropdown dimensions (approximate)
    const dropdownWidth = 256; // w-64 = 16rem = 256px
    const dropdownHeight = 256; // max-h-64 = 16rem = 256px

    // Check if we're on mobile (less than 640px)
    const isMobile = viewportWidth < 640;

    if (isMobile) {
      // On mobile, always position below
      this.subDropdownPosition.set('bottom');
    } else {
      // On desktop, check available space - never use right to prevent overflow
      const spaceLeft = rect.left;
      const spaceBelow = viewportHeight - rect.bottom;

      // Prefer left if there's enough space, otherwise bottom
      if (spaceLeft >= dropdownWidth + 8) { // 8px margin
        this.subDropdownPosition.set('left');
      } else if (spaceBelow >= dropdownHeight + 8) {
        this.subDropdownPosition.set('bottom');
      } else {
        // Fallback to left even if it overflows (but it's contained)
        this.subDropdownPosition.set('left');
      }
    }
  }

  onSelectGroupFilter(groupId: string) {
    this.selectedGroupFilter.set(groupId);
    this.groupSubDropdownOpen.set(false);
  }

  readonly selectedGroupLabel = computed(() => {
    const selectedId = this.selectedGroupFilter();
    if (selectedId === '$internal_all') {
      return 'Tous les groupes';
    }
    const group = this.groups().find(g => g._id === selectedId);
    return group ? `${group.name} (${(group as any).kind} - ${(group as any).day})` : 'Groupe sélectionné';
  });

  subDropdownClasses = computed(() => {
    const position = this.subDropdownPosition();
    const baseClasses = 'absolute z-60 w-64 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto';

    switch (position) {
      case 'left':
        return `${baseClasses} right-full top-0 mr-1`;
      case 'bottom':
      default:
        return `${baseClasses} top-full left-0 mt-1 sm:w-full`;
    }
  });

  // Get the course title for display
  protected readonly courseTitle = computed(() => {
    const unit = this.courseUnit();
    return unit ? `${unit.code} - ${unit.name}` : 'Course Members';
  });
}
