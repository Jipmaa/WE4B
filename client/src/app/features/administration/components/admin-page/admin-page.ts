import {SidebarLayout} from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { CreateGroupPopupComponent } from '@/shared/components/layout/create-group-popup/create-group-popup';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ChangeDetectorRef,
  signal
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
import {CourseGroupsService} from '@/core/services/course-groups.service';
import {CourseGroup} from '@/core/models/course-group.models';
import {CourseRegisterPopup} from '@/shared/components/layout/course-register-popup/course-register-popup';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TabsComponent, TabItemComponent, TabContentComponent, SidebarLayout, ArrayComponent, UserRegisterPopup, InputComponent, ButtonComponent, CreateGroupPopupComponent, CourseRegisterPopup],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage implements OnInit, AfterViewChecked {
  @ViewChild(TabsComponent) tabsComponent!: TabsComponent;
  activeTab: string = 'ues';

  UsersArray !: User[]
  CoursesArray !: CourseUnit[]

  showEditUserPopup: boolean = false;
  showCreateUserPopup: boolean = false;
  showEditCourseUnitPopup: boolean = false;
  showCreateCourseUnitPopup: boolean = false; // New signal for create popup
  selectedUser: User | null = null;
  selectedCourseUnit: CourseUnit | null = null;
  selectedGroup: CourseGroup | null = null;

  showCreateGroupPopup: boolean = false;

  readonly createdGroupPopUp = signal<CourseUnit | null>(null);

  constructor(
    public servUsers: UsersService,
    private servCourse: CourseUnitsService,
    private servCourseGroup: CourseGroupsService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.servUsers.getUsers().subscribe(
      response => {
        console.log(response);
        this.UsersArray = response.data.users;
      }
    );

    this.servCourse.getCourseUnits().subscribe(
      response => {
        console.log(response);
        this.CoursesArray = response.data.courseUnits;
      }
    );
  }

  ngOnInit(): void {
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
        console.log('Supprimer utilisateur:', user);
        // Implémentez votre logique de suppression ici
      }
    },
    {
      label: 'Voir détails',
      onTriggered: (user: User) => {
        console.log('Voir détails utilisateur:', user);
        // Implémentez votre logique de visualisation ici
      }
    }
  ];

  columnsCourses: Columns = [
    {
      label: 'Nom',
      mapToKey: 'code',
      showOnSmall: true
    },
    {
      label: 'Description',
      mapToKey: 'name',
      showOnSmall: false
    },
    {
      label: 'Groupes',
      mapToKey: 'groups',
      showOnSmall: false,
      render: (courseUnit: CourseUnit) => {
        if (courseUnit.groups && courseUnit.groups.length > 0) {
          return courseUnit.groups.map(group => (group as any).name).join(', ');
        }
        return 'Aucun groupe';
      }
    }
  ];

  rowActionsCourses: RowActions<CourseUnit> = [
    {
      label: 'Modifier',
      onTriggered: (courseUnit: CourseUnit) => {
        this.servCourse.getCourseUnitById(courseUnit._id).subscribe(
          response => {
            this.selectedCourseUnit = response.data.courseUnit;
            this.showEditCourseUnitPopup = true;
          }
        );
      }
    },
    {
      label: 'Supprimer',
      onTriggered: (courseUnit: CourseUnit) => {
        console.log('Supprimer un cours:', courseUnit);
        // Implémentez votre logique de suppression ici
      }
    },
    {
      label: 'Voir détails',
      onTriggered: (courseUnit: CourseUnit) => {
        console.log('Voir détails des cours:', courseUnit);
        // Implémentez votre logique de visualisation ici
      }
    },
    {
      label: 'Ajouter un groupe',
      onTriggered: (courseUnit: CourseUnit) => {
        console.log('Ajouter un groupe au cours:', courseUnit);
        // Implémentez votre logique de visualisation ici
        this.createdGroupPopUp.set(courseUnit);
      }
    }
  ];

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

    if (index !== -1) {
      // Remplacer l'ancien utilisateur par le nouveau dans le tableau
      this.UsersArray[index] = updatedUser;

      // Forcer le tableau à se mettre à jour si besoin
      this.UsersArray = [...this.UsersArray];
    }

    // Tu peux afficher une notif ou console.log
    console.log('Utilisateur mis à jour :', updatedUser);
  }

  onCourseUnitUpdated(updatedCourseUnit: CourseUnit): void {
    const index = this.CoursesArray.findIndex(cu => cu._id === updatedCourseUnit._id);

    if (index !== -1) {
      this.CoursesArray[index] = updatedCourseUnit;
      this.CoursesArray = [...this.CoursesArray];
    }
    console.log('UE mise à jour :', updatedCourseUnit);
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
    this.CoursesArray = [...this.CoursesArray, newCourseUnit];
    this.showCreateCourseUnitPopup = false;
    // Optionally, refresh the course units list from the service if needed
    // this.servCourse.getCourseUnits().subscribe(response => {
    //   this.CoursesArray = response.data.courseUnits;
    // });
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
