import {SidebarLayout} from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TabsComponent, TabItemComponent, TabContentComponent, SidebarLayout, ArrayComponent, UserRegisterPopup, InputComponent, ButtonComponent],
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

  constructor(
    public servUsers: UsersService,
    private servCourse: CourseUnitsService,
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
    }
  ];

  rowActionsCourses: RowActions<CourseUnit> = [
    {
      label: 'Modifier',
      onTriggered: (courseUnit: CourseUnit) => {
        console.log('Modifier course:', courseUnit);
        // Implémentez votre logique de modification ici
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

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToCourse() {
    this.router.navigate(['/register/courseunits']);
  }

  navigateToGroup() {
    //this.router.navigate(['/register']);
  }
}
