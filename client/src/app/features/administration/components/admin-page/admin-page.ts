import {SidebarLayout} from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { User } from '@/core/models/user.models';
import { UsersService } from '@/core/services/users.service';
import { TabsComponent } from '@/shared/components/ui/tabs';
import { TabItemComponent } from "../../../../shared/components/ui/tab-item/tab-item";
import { TabContentComponent } from "../../../../shared/components/ui/tab-content/tab-content";
import { CourseUnit } from '@/core/models/course-unit.models';
import { CourseUnitsService } from '@/core/services/course-units.service';
//import { InfiniteTableComponent, Columns, RowActions, Messages, LoadingState } from './infinite-table.component';
import { ArrayComponent, Columns, RowActions, Messages, LoadingState} from '@/shared/components/ui/array/array';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TabsComponent, TabItemComponent, TabContentComponent, SidebarLayout, ArrayComponent],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage implements OnInit {

  UsersArray !: User[]
  CoursesArray !: CourseUnit[]

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
        console.log('Modifier utilisateur:', user);
        // Implémentez votre logique de modification ici
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

  loadingState: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: true // Changez en false si vous voulez tester le chargement infini
  };

  private currentPage = 1;
  private pageSize = 10;

  loadMoreUsers() {
    if (this.loadingState.isLoading || this.loadingState.allLoaded) {
      return;
    }

    this.loadingState.isLoading = true;
  }

  constructor(public servUsers: UsersService, private servCourse: CourseUnitsService) {
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
}
