import {SidebarLayout} from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { CreateGroupPopupComponent } from '@/shared/components/layout/create-group-popup/create-group-popup';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ChangeDetectorRef,
  signal, computed, inject
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { User } from '@/core/models/user.models';
import { UsersService } from '@/core/services/users.service';
import { TabsComponent } from '@/shared/components/ui/tabs';
import { TabItemComponent } from "../../../../shared/components/ui/tab-item/tab-item";
import { TabContentComponent } from "../../../../shared/components/ui/tab-content/tab-content";
import { CourseUnit } from '@/core/models/course-unit.models';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { ArrayComponent, Columns, RowActions, Messages, LoadingState} from '@/shared/components/ui/array/array';
import { UserRegisterPopup} from '@/shared/components/layout/user-register-popup/user-register-popup';
import {InputComponent} from '@/shared/components/ui/input/input';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import { Router } from '@angular/router';
import { DeleteConfirmationPopupComponent } from '@/shared/components/layout/delete-confirmation-popup/delete-confirmation-popup';
import {CourseGroupsService} from '@/core/services/course-groups.service';
import {CourseGroup} from '@/core/models/course-group.models';
import {CourseRegisterPopup} from '@/shared/components/layout/course-register-popup/course-register-popup';

type UnifiedData =
  | { type: 'courseUnit', name: string, description: string, data: CourseUnit }
  | { type: 'group', name: string, description: string, data: CourseGroup };
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TabsComponent, TabItemComponent, TabContentComponent, SidebarLayout, ArrayComponent, UserRegisterPopup, InputComponent, ButtonComponent, CreateGroupPopupComponent, CourseRegisterPopup,DeleteConfirmationPopupComponent],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage implements OnInit, AfterViewChecked {
  constructor() {
    this.getRowActionsCourses = this.getRowActionsCourses.bind(this);
  }

  @ViewChild(TabsComponent) tabsComponent!: TabsComponent;
  activeTab: string = 'ues';

  public servUsers= inject(UsersService)
  private servCourse= inject(CourseUnitsService)
  private servCourseGroup= inject(CourseGroupsService)
  private cdRef= inject(ChangeDetectorRef)

  UsersArray !: User[]

  private readonly courses=signal<CourseUnit[]>([]);
  private readonly groups=signal<CourseGroup[]>([]);

  showEditUserPopup: boolean = false;
  showCreateUserPopup: boolean = false;
  showEditCourseUnitPopup: boolean = false;
  showCreateCourseUnitPopup: boolean = false; // New signal for create popup
  selectedUser: User | null = null;
  selectedCourseUnit: CourseUnit | null = null;
  selectedGroup: CourseGroup | null = null;

  showCreateGroupPopup: boolean = false;

  readonly createdGroupPopUp = signal<CourseUnit | null>(null);
  showDeleteUserPopup: boolean = false;
  userToDelete: User | null = null;

  showDeleteCoursePopup: boolean = false;
  courseToDelete: CourseUnit | null = null;

  readonly unifiedCoursesAndGroupsArray =computed(() => {
    // Combine courses and groups into a unified array where all groups are course units is next to their parent course unit
    const unifiedArray: UnifiedData [] = [];
    this.courses().forEach(courseUnit => {
      unifiedArray.push({ type: 'courseUnit', name: courseUnit.code, description: courseUnit.name, data: courseUnit });
      if (courseUnit.groups?.length) {

        //@ts-ignore -unexpected behavior of client typing against server typing
        courseUnit.groups.forEach(g=> unifiedArray.push({ type: 'group', name: `--> ${g.name}`, description: g.description??`Groupe ${g.name}`, data: g }));
      }
    });
    return unifiedArray;
  })

  ngOnInit(): void {
    this.servUsers.getUsers().subscribe(
      response => {
        console.log(response);
        this.UsersArray = response.data.users;
      }
    );

    this.servCourse.getCourseUnits().subscribe(
      response => {
        console.log(response);
        this.courses.set(response.data.courseUnits);
      }
    );

    this.servCourseGroup.getGroups().subscribe(
      response => {
        console.log(response);
        this.groups.set(response.data.groups);
      }
    )
  }

  ngAfterViewChecked() {
    if (this.tabsComponent) {
      const currentTab = this.tabsComponent.getActiveTab();
      if (this.activeTab !== currentTab) {
        this.activeTab = currentTab;
        this.cdRef.detectChanges();
      }
    }
  }

  columnsUsers: Columns = [
    {
      label: 'Nom',
      mapToKey: 'fullName', //correspond a UsersArray.fullName
      showOnSmall: true
    },
    {
      label: 'Email',
      mapToKey: 'email',
      showOnSmall: false
    },
    {
      label: 'Téléphone',
      mapToKey: 'phone',
      showOnSmall: false
    },
    {
      label: 'Rôles',
      mapToKey: 'roles',
      showOnSmall: true
    }
  ];

  rowActionsUsers: RowActions<User> = [
    {
      label: 'Modifier',
      onTriggered: (user: User) => {
        this.servUsers.getUserById(user._id).subscribe(
          response => {
            this.selectedUser = response.data.user;
            this.showEditUserPopup = true;
          }
        );
      }
    },
    {
      label: 'Supprimer',
      onTriggered: (user: User) => {
        this.userToDelete = user;
        this.showDeleteUserPopup = true;
      }
    }
  ];

  columnsCourses: Columns = [
    {
      label: 'Nom',
      mapToKey: 'name',
      showOnSmall: true
    },
    {
      label: 'Description',
      mapToKey: 'description',
      showOnSmall: false
    }
  ];

  getRowActionsCourses(item: UnifiedData): RowActions<UnifiedData> {
    if (item.type === 'courseUnit') {
      return [
        {
          label: 'Modifier',
          onTriggered: () => {
            this.servCourse.getCourseUnitById((item.data as CourseUnit)._id).subscribe(
              response => {
                this.selectedCourseUnit = response.data.courseUnit;
                this.showEditCourseUnitPopup = true;
              }
            );
          }
        },
        {
          label: 'Supprimer',
          onTriggered: () => {
            this.courseToDelete = item.data as CourseUnit;
            this.showDeleteCoursePopup = true;
          }
        },
        {
          label: 'Ajouter un groupe',
          onTriggered: () => {
            console.log('Ajouter un groupe au cours:', item.data as CourseUnit);
            this.createdGroupPopUp.set(item.data as CourseUnit);
          }
        }
      ];
    } else if (item.type === 'group') {
      return [
        {
          label: 'Modifier un groupe',
          onTriggered: () => {
            console.log('Modifier un groupe:', item.data as CourseGroup);
            this.selectedGroup = item.data as CourseGroup;
            // Implement your logic to modify a group
          }
        },
        {
          label: 'Assigner un utilisateur',
          onTriggered: () => {
            console.log('Assigner un utilisateur au groupe:', item.data as CourseGroup);
            // Implement your logic to assign a user to a group
          }
        },
        {
          label: 'Supprimer un groupe',
          onTriggered: () => {
            console.log('Supprimer un groupe:', item.data as CourseGroup);
            // Implement your logic to delete a group
          }
        }
      ];
    }
    return [];
  }

  messagesUsers: Messages = {
    onLoading: 'Chargement des utilisateurs...',
    onAllLoaded: 'Tous les utilisateurs ont été chargés',
    onError: 'Erreur lors du chargement des utilisateurs'
  };

  messagesCourses: Messages = {
    onLoading: 'Chargement des cours...',
    onAllLoaded: 'Tous les cours ont été chargés',
    onError: 'Erreur lors du chargement des cours'
  };

  loadingStateUsers: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: true // Changez en false si vous voulez tester le chargement infini
  };

  loadingStateCourses: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: true // Changez en false si vous voulez tester le chargement infini
  };

  private currentPage = 1;
  private pageSize = 10;

  loadMoreUsers() {
    if (this.loadingStateUsers.isLoading || this.loadingStateUsers.allLoaded) {
      return;
    }

    this.loadingStateUsers.isLoading = true;
  }

  loadMoreCourses() {
    if (this.loadingStateCourses.isLoading || this.loadingStateCourses.allLoaded) {
      return;
    }

    this.loadingStateCourses.isLoading = true;
  }

  onUserUpdated(updatedUser: User): void {
    // Chercher l'index de l'utilisateur mis à jour dans le tableau
    const index = this.UsersArray.findIndex(u => u._id === updatedUser._id);

    this.servUsers.getUsers().subscribe(
      response => {
        this.UsersArray = response.data.users;
      }
    );

    // Tu peux afficher une notif ou console.log
    console.log('Utilisateur mis à jour :', updatedUser);
  }

  onCourseUnitUpdated(updatedCourseUnit: CourseUnit): void {
    this.courses.update(courses => {
      const index = courses.findIndex(cu => cu._id === updatedCourseUnit._id);
      if (index !== -1) {
        courses[index] = updatedCourseUnit;
      }
      return [...courses];
    });
    console.log('UE mise à jour :', updatedCourseUnit);
  }

  confirmDeleteUser(): void {
    if (this.userToDelete) {
      this.servUsers.deleteUser(this.userToDelete._id).subscribe(
        () => {
          this.UsersArray = this.UsersArray.filter(u => u._id !== this.userToDelete!._id);
          this.cancelDeleteUser();
        },
        error => {
          console.error('Error deleting user:', error);
          this.cancelDeleteUser();
        }
      );
    }
  }

  cancelDeleteUser(): void {
    this.showDeleteUserPopup = false;
    this.userToDelete = null;
  }

  confirmDeleteCourse(): void {
    if (this.courseToDelete) {
      this.servCourse.deleteCourseUnit(this.courseToDelete._id).subscribe(
        () => {
          this.courses.update(courses => courses.filter(cu => cu._id !== this.courseToDelete!._id));
          this.cancelDeleteCourse();
        },
        error => {
          console.error('Error deleting course:', error);
          this.cancelDeleteCourse();
        }
      );
    }
  }

  cancelDeleteCourse(): void {
    this.showDeleteCoursePopup = false;
    this.courseToDelete = null;
  }

  navigateToRegister() {
    this.showCreateUserPopup = true;
  }

  onUserCreated(newUser: User): void {
    this.UsersArray = [...this.UsersArray, newUser];
    this.showCreateUserPopup = false;
    // Optionally, refresh the users list from the service if needed
    // this.servUsers.getUsers().subscribe(response => {
    //   this.UsersArray = response.data.users;
    // });
  }

  onCloseCreateUserPopup(): void {
    this.showCreateUserPopup = false;
  }

  navigateToCourse() {
    this.showCreateCourseUnitPopup = true;
  }

  onCourseUnitCreated(newCourseUnit: CourseUnit): void {
    this.courses.update(courses => [...courses, newCourseUnit]);
    this.showCreateCourseUnitPopup = false;
  }

  onCloseCreateCourseUnitPopup(): void {
    this.showCreateCourseUnitPopup = false;
  }

  navigateToGroup() {
    this.showCreateGroupPopup = true;
  }

  onCreateGroup(groupData: CourseGroup) {
    console.log('Nouveau groupe créé:', groupData);
    // Optionally, refresh the course units or groups list after creation
    // For example, if you want to see the new group immediately:
    // this.servCourse.getCourseUnits().subscribe(response => {
    //   this.CoursesArray = response.data.courseUnits;
    // });
  }

  handleClosePopUp(){
    this.createdGroupPopUp.set(null);
  }
}
