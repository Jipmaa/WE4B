import { Component, Input, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';

export type SidebarDirection = 'left' | 'right';

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    IconButtonComponent
  ],
  templateUrl: './sidebar.html',
  styles: [`
    @reference "../../../../../styles.css";
    :host {
      @apply flex flex-col;
    }
  `]
})
export class Sidebar {
  @Input() title: string = 'Title';
  @Input() direction: SidebarDirection = 'left';
  @Input() initialOpen: boolean = false;

  isOpen = signal(this.initialOpen);

  leftIcon = computed(() => this.isOpen() ? 'panel-left-close' : 'panel-left-open');
  rightIcon = computed(() => this.isOpen() ? 'panel-right-close' : 'panel-right-open');

  isLeftDirection = computed(() => this.direction === 'left');
  isRightDirection = computed(() => this.direction === 'right');

  toggleSidebar() {
    this.isOpen.update(value => !value);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Close sidebar on Escape key
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.toggleSidebar();
    }
  }

  ngOnInit() {
    this.isOpen.set(this.initialOpen);
  }
}
