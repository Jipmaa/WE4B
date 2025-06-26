import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CourseBox} from '@/features/course/components/course-box/course-box';
import { CourseUnit } from '@/core/models/course-unit.models';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';

@Component({
  standalone: true,
  selector: 'app-courses-page',
  imports: [CourseBox, SidebarLayout, InputComponent, LucideAngularModule],
  templateUrl: './courses-page.html'
})
export class CoursesPage implements OnInit {
  testCourse?: CourseUnit;

  ngOnInit() {
    // Ici tu chargerais tes données depuis un service
    this.loadCourses();
  }

  private loadCourses() {
    // Exemple de données - à remplacer par le service
    this.testCourse =
      {
        _id: '1',
        slug: 'web-development-4b',
        name: 'Advanced Web Development',
        code: 'WE4B',
        capacity: 30,
        img: 'https://blog.zegocloud.com/wp-content/uploads/2024/03/types-of-web-development-services.jpg',
        activities: [{
          _id: '1',
          name: 'Algèbre',
          description: 'Cours complet d\'algèbre linéaire et de géométrie vectorielle',
          activities: []
        }],
        userRole: 'student',
        createdAt: new Date(),
        updatedAt: new Date()
      }
  }
}
