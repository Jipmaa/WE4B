import { Component } from '@angular/core';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';

@Component({
  selector: 'app-courses-page',
  imports: [
    SidebarLayout,
    InputComponent,
    LucideAngularModule
  ],
  templateUrl: './courses-page.html',
})
export class CoursesPage {

}
