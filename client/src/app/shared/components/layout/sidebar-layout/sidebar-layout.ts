import {Component, Input, TemplateRef, ContentChild, HostBinding} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Sidebar } from '@/shared/components/ui/sidebar/sidebar';

export type SidebarPosition = 'left' | 'right' | null;

@Component({
  selector: 'app-sidebar-layout',
  imports: [
    CommonModule,
    NgTemplateOutlet,
    Sidebar
  ],
  templateUrl: './sidebar-layout.html',
  styleUrl: './sidebar-layout.css'
})
export class SidebarLayout {
  @HostBinding('class') class = 'block h-[calc(100vh-3rem)] w-full';

  @Input() title: string = '';
  @Input() leftSidebarOpen: boolean = false;
  @Input() rightSidebarOpen: boolean = false;
  @Input() leftSidebarTitle: string = 'Menu';
  @Input() rightSidebarTitle: string = 'Options';

  @ContentChild('leftSidebar') leftSidebarContent?: TemplateRef<any>;
  @ContentChild('rightSidebar') rightSidebarContent?: TemplateRef<any>;
  @ContentChild('actionButtons') actionButtonsContent?: TemplateRef<any>;
  @ContentChild('mainContent') mainContentTemplate?: TemplateRef<any>;

  get hasLeftSidebar(): boolean {
    return !!this.leftSidebarContent;
  }

  get hasRightSidebar(): boolean {
    return !!this.rightSidebarContent;
  }

  get hasActionButtons(): boolean {
    return !!this.actionButtonsContent;
  }
}
