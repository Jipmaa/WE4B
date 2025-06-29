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
import { DeleteConfirmationPopupComponent } from '@/shared/components/layout/delete-confirmation-popup/delete-confirmation-popup';
import {CourseGroupsService} from '@/core/services/course-groups.service';
import {CourseGroup} from '@/core/models/course-group.models';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TabsComponent, TabItemComponent, TabContentComponent, SidebarLayout, ArrayComponent, UserRegisterPopup, InputComponent, ButtonComponent, CreateGroupPopupComponent, DeleteConfirmationPopupComponent],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage implements OnInit, AfterViewChecked {
  @ViewChild(TabsComponent) tabsComponent!: TabsComponent;
  activeTab: string = 'ues';

  UsersArray !: User[]
  CoursesArray !: CourseUnit[]

  showEditUserPopup: boolean = false;
  selectedUser: User | null = null;
  selectedCourseUnit: CourseUnit | null = null;
  selectedGroup: CourseGroup | null = null;

  showCreateGroupPopup: boolean = false;

  readonly createdGroupPopUp = signal<CourseUnit | null>(null);
  showDeleteUserPopup: boolean = false;
  userToDelete: User | null = null;

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
    )
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
        this.userToDelete = user;
        this.showDeleteUserPopup = true;
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
    }
  ];

  rowActionsCourses: RowActions<CourseUnit> = [
    {
      label: 'Modifier',
      onTriggered: (courseUnit: CourseUnit) => {
        this.servCourse.getCourseUnitById(courseUnit._id).subscribe(
          response => {
            this.selectedCourseUnit = response.data.courseUnit;
            this.showEditUserPopup = true;
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

    this.servUsers.getUsers().subscribe(
      response => {
        this.UsersArray = response.data.users;
      }
    );

    // Tu peux afficher une notif ou console.log
    console.log('Utilisateur mis à jour :', updatedUser);
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

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToCourse() {
    this.router.navigate(['/register/courseunits']);
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
