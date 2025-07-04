import {Component, Input, TemplateRef, ContentChild, HostBinding} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Sidebar } from '@/shared/components/ui/sidebar/sidebar';
import { PreferenceKey } from '@/core/services/user-preferences.service';

@Component({
  selector: 'app-sidebar-layout',
  imports: [
    CommonModule,
    NgTemplateOutlet,
    Sidebar
  ],
  templateUrl: './sidebar-layout.html'
})
export class SidebarLayout {
  @HostBinding('class') class = 'block h-full w-full';

  @Input() title: string = '';
  @Input() leftSidebarOpen: boolean = false;
  @Input() rightSidebarOpen: boolean = false;
  @Input() leftSidebarTitle: string = 'Menu';
  @Input() rightSidebarTitle: string = 'Options';
  @Input() leftSidebarStorageKey?: PreferenceKey;
  @Input() rightSidebarStorageKey?: PreferenceKey;
  @Input() main2Title: string = '';
  @Input() showMain2: boolean = false;

  @ContentChild('leftSidebar') leftSidebarContent?: TemplateRef<any>;
  @ContentChild('rightSidebar') rightSidebarContent?: TemplateRef<any>;
  @ContentChild('actionButtons') actionButtonsContent?: TemplateRef<any>;
  @ContentChild('leadingContent') leadingContent?: TemplateRef<any>;
  @ContentChild('mainContent') mainContentTemplate?: TemplateRef<any>;
  @ContentChild('main2ActionButtons') main2ActionButtonsContent?: TemplateRef<any>;
  @ContentChild('main2Content') main2ContentTemplate?: TemplateRef<any>;

  get hasLeftSidebar(): boolean {
    return !!this.leftSidebarContent;
  }

  get hasRightSidebar(): boolean {
    return !!this.rightSidebarContent;
  }

  get hasActionButtons(): boolean {
    return !!this.actionButtonsContent;
  }

  get hasMain2ActionButtons(): boolean {
    return !!this.main2ActionButtonsContent;
  }

  get hasMain2(): boolean {
    return this.showMain2 && !!this.main2ContentTemplate;
  }

  get hasLeadingContent(): boolean {
    return !!this.leadingContent;
  }
}
