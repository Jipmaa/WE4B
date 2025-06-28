import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CourseActivitiesService } from '@/core/services/course-activities.service';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { CourseGroupsService } from '@/core/services/course-groups.service';
import { CourseActivity, FileDepositoryActivity } from '@/core/models/course-activity.models';
import { CourseUnit } from '@/core/models/course-unit.models';
import { CourseGroup } from '@/core/models/course-group.models';
import { map, startWith, catchError } from 'rxjs';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import { CourseBox } from '@/shared/components/ui/course-box/course-box';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  standalone: true,
  imports: [CommonModule, SidebarLayout, CourseBox],
})
export class DashboardPage implements OnInit {
  private readonly courseActivitiesService = inject(CourseActivitiesService);
  private readonly authService = inject(AuthService);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly courseGroupsService = inject(CourseGroupsService);

  readonly activities = toSignal(
    this.courseActivitiesService.getActivities().pipe(
      map(response => response.data.activities),
      catchError(error => {
        console.error('Failed to load activities:', error);
        return of([]);
      })
    ),
    { initialValue: [] as CourseActivity[] }
  );

  readonly fileDepositoryActivities = toSignal(
    this.courseActivitiesService.getActivities({ activityType: 'file-depository' }).pipe(
      map(response => response.data.activities as FileDepositoryActivity[]),
      catchError(error => {
        console.error('Failed to load file depository activities:', error);
        return of([]);
      })
    ),
    { initialValue: [] as FileDepositoryActivity[] }
  );

  readonly userCourseUnits = toSignal(
    this.courseUnitsService.getUserCourseUnits().pipe(
      map(response => response.data.courseUnits),
      catchError(error => {
        console.error('Failed to load user course units:', error);
        return of([]);
      }),
      startWith([])
    ),
    { initialValue: [] as CourseUnit[] }
  );

  // Signal pour les groupes de cours de l'utilisateur
  readonly userCourseGroups = toSignal(
    this.courseGroupsService.getUserCourseGroups().pipe(
      map(response => response.data.groups),
      catchError(error => {
        console.error('Failed to load user course groups:', error);
        return of([]);
      }),
      startWith([])
    ),
    { initialValue: [] as CourseGroup[] }
  );

  readonly courseUnitMap = computed(() => {
    const map = new Map<string, CourseUnit>();
    for (const course of this.userCourseUnits()) {
      map.set(course._id, course);
    }
    return map;
  });

  ngOnInit() {
    // Forcer le chargement des données
    this.loadInitialData();
  }

  private loadInitialData() {
    // Charger les cours de l'utilisateur
    this.courseUnitsService.getUserCourseUnits().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('User course units loaded:', response.data.courseUnits);
        }
      },
      error: (error) => {
        console.error('Failed to load user course units:', error);
      }
    });

    // Charger les groupes de cours de l'utilisateur
    this.courseGroupsService.getUserCourseGroups().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('User course groups loaded:', response.data.groups);
          console.log('Groups with schedule info:', response.data.groups.filter(g => g.day && g.from && g.to));
        }
      },
      error: (error) => {
        console.error('Failed to load user course groups:', error);
      }
    });
  }

  // Computed signal pour le cours/groupe actuel
  readonly currentCourseGroup = computed(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const groups = this.userCourseGroups();
    console.log('Checking current course group. Current day:', currentDay, 'Current minutes:', currentMinutes);
    console.log('Available groups:', groups);

    if (groups.length === 0) {
      console.log('No groups available');
      return null;
    }

    // Filtrer les groupes avec des informations de planning
    const groupsWithSchedule = groups.filter(group =>
      group.day && group.from && group.to
    );
    console.log('Groups with schedule:', groupsWithSchedule);

    const currentGroup = groupsWithSchedule.find(group => {
      const groupDay = this.courseGroupsService.dayNameToNumber(group.day!);
      const fromMinutes = this.courseGroupsService.timeToMinutes(group.from!);
      const toMinutes = this.courseGroupsService.timeToMinutes(group.to!);

      console.log(`Group ${group.name}: day=${groupDay}, from=${fromMinutes}, to=${toMinutes}`);

      const isCurrentDay = groupDay === currentDay;
      const isCurrentTime = fromMinutes <= currentMinutes && toMinutes >= currentMinutes;

      console.log(`Is current day: ${isCurrentDay}, Is current time: ${isCurrentTime}`);

      return isCurrentDay && isCurrentTime;
    });

    console.log('Current group found:', currentGroup);
    return currentGroup || null;
  });

  // Computed signal pour les cours/groupes à venir
  readonly upcomingCourseGroups = computed(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const groups = this.userCourseGroups();
    console.log('Checking upcoming course groups. Current day:', currentDay, 'Current minutes:', currentMinutes);

    if (groups.length === 0) {
      return [];
    }

    // Filtrer les groupes avec des informations de planning
    const groupsWithSchedule = groups.filter(group =>
      group.day && group.from && group.to
    );

    // Get all upcoming groups (including today but later, and future days)
    const upcomingGroups = groupsWithSchedule
      .filter(group => {
        const groupDay = this.courseGroupsService.dayNameToNumber(group.day!);
        const fromMinutes = this.courseGroupsService.timeToMinutes(group.from!);

        // Future days this week
        if (groupDay > currentDay) {
          return true;
        }
        // Same day but later time
        if (groupDay === currentDay && fromMinutes > currentMinutes) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const aDayNumber = this.courseGroupsService.dayNameToNumber(a.day!);
        const bDayNumber = this.courseGroupsService.dayNameToNumber(b.day!);
        const aFromMinutes = this.courseGroupsService.timeToMinutes(a.from!);
        const bFromMinutes = this.courseGroupsService.timeToMinutes(b.from!);

        // Sort by day first, then by time
        if (aDayNumber !== bDayNumber) {
          return aDayNumber - bDayNumber;
        }
        return aFromMinutes - bFromMinutes;
      })
      .slice(0, 3); // Limit to 3 upcoming groups

    console.log('Upcoming groups found:', upcomingGroups);
    return upcomingGroups;
  });

  // Computed signal pour obtenir le CourseUnit correspondant au groupe actuel
  readonly currentCourse = computed(() => {
    const currentGroup = this.currentCourseGroup();
    if (!currentGroup) {
      console.log('No current group, no current course');
      return null;
    }

    const courseUnitMap = this.courseUnitMap();
    const course = courseUnitMap.get(currentGroup.courseUnit);
    console.log('Current course found:', course);
    return course || null;
  });

  // Computed signal pour obtenir les CourseUnits correspondant aux groupes à venir
  readonly upcomingCourses = computed(() => {
    const upcomingGroups = this.upcomingCourseGroups();
    const courseUnitMap = this.courseUnitMap();

    const courses: CourseUnit[] = [];
    const seenCourseIds = new Set<string>();

    for (const group of upcomingGroups) {
      const course = courseUnitMap.get(group.courseUnit);
      if (course && !seenCourseIds.has(course._id)) {
        courses.push(course);
        seenCourseIds.add(course._id);
      }
    }

    console.log('Upcoming courses found:', courses);
    return courses;
  });

  // Computed signals pour les informations de debug
  readonly groupsWithScheduleCount = computed(() => {
    return this.userCourseGroups().filter(g => g.day && g.from && g.to).length;
  });

  readonly hasAnyGroups = computed(() => {
    return this.userCourseGroups().length > 0;
  });

  readonly hasGroupsWithSchedule = computed(() => {
    return this.groupsWithScheduleCount() > 0;
  });

  // Méthode pour obtenir le nom de l'unité de cours
  getCourseUnitName(courseUnitId: string): string {
    const courseUnitMap = this.courseUnitMap();
    const courseUnit = courseUnitMap.get(courseUnitId);
    return courseUnit?.name || 'Cours inconnu';
  }

  // Méthode de debug pour tester les horaires
  debugCurrentTime() {
    const now = new Date();
    console.log('=== DEBUG CURRENT TIME ===');
    console.log('Current date:', now.toLocaleString());
    console.log('Current day (0=Sunday):', now.getDay());
    console.log('Current minutes since midnight:', now.getHours() * 60 + now.getMinutes());
    console.log('User course units:', this.userCourseUnits());
    console.log('User course groups:', this.userCourseGroups());
    console.log('Current course group:', this.currentCourseGroup());
    console.log('Current course:', this.currentCourse());
    console.log('Upcoming course groups:', this.upcomingCourseGroups());
    console.log('Upcoming courses:', this.upcomingCourses());
    console.log('=== END DEBUG ===');
  }
}
