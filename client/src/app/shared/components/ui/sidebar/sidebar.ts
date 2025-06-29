import { Component, Input, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { UserPreferencesService, PreferenceKey } from '@/core/services/user-preferences.service';

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
export class Sidebar implements OnInit {
  @Input() title: string = 'Title';
  @Input() direction: SidebarDirection = 'left';
  @Input() initialOpen: boolean = false;
  @Input() storageKey?: PreferenceKey;

  private userPreferencesService = inject(UserPreferencesService);
  private preferenceManager: ReturnType<UserPreferencesService['createPreferenceSignal']> | null = null;

  isOpen = signal(this.initialOpen);

  leftIcon = computed(() => this.isOpen() ? 'panel-left-close' : 'panel-left-open');
  rightIcon = computed(() => this.isOpen() ? 'panel-right-close' : 'panel-right-open');

  isLeftDirection = computed(() => this.direction === 'left');
  isRightDirection = computed(() => this.direction === 'right');

  toggleSidebar() {
    const newValue = !this.isOpen();
    this.isOpen.set(newValue);
    
    if (this.preferenceManager) {
      this.preferenceManager.set(newValue);
    }
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
    if (this.storageKey) {
      this.preferenceManager = this.userPreferencesService.createPreferenceSignal(this.storageKey);
      this.isOpen.set(this.preferenceManager.signal());
    } else {
      this.isOpen.set(this.initialOpen);
    }
  }
}
