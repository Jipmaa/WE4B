import { AuthService } from '@/core/services/auth.service';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { HeaderItem } from '@/shared/components/layout/header-item/header-item';
import { LucideAngularModule } from 'lucide-angular';
import { UserProfilePopup } from '@/shared/components/ui/user-profile-popup/user-profile-popup';
import { AuthImageComponent } from '../../ui/auth-image/auth-image.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [
    HeaderItem,
    LucideAngularModule,
    UserProfilePopup,
    AuthImageComponent
  ]
})
export class Header implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileMenu') mobileMenu!: ElementRef<HTMLElement>;
  @ViewChildren('menuItem') menuItems!: QueryList<HeaderItem>;

  readonly authService = inject(AuthService);
  protected readonly user = this.authService.user;
  private isOpen = false;
  private currentFocusedIndex = 0;
  private keydownListener?: (event: KeyboardEvent) => void;

  // Profile popup state
  isProfilePopupOpen = false;

  onToggleMenu() {
    if (this.isOpened) {
      this.onCloseMenu();
    } else {
      this.onOpenMenu();
    }
  }

  onOpenMenu() {
    this.isOpen = true;
    this.currentFocusedIndex = 0;

    // Focus the first menu item after a short delay to ensure the menu is rendered
    setTimeout(() => {
      this.focusMenuItemAtIndex(0);
    }, 10);
  }

  onCloseMenu() {
    this.isOpen = false;
    this.currentFocusedIndex = 0;

    // Return focus to the menu button
    setTimeout(() => {
      this.mobileMenuButton?.nativeElement?.focus();
    }, 10);
  }

  get isOpened() {
    return this.isOpen;
  }

  ngOnInit(): void {
    this.authService.user();
  }

  ngAfterViewInit() {
    // Set up global keydown listener for escape key
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);
  }

  ngOnDestroy() {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  onMenuButtonKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onToggleMenu();
        break;
      case 'ArrowDown':
        if (!this.isOpened) {
          event.preventDefault();
          this.onOpenMenu();
        }
        break;
      case 'Escape':
        if (this.isOpened) {
          event.preventDefault();
          this.onCloseMenu();
        }
        break;
    }
  }

  onMenuKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.onCloseMenu();
        break;
      case 'Tab':
        // Allow normal tab behavior but close menu when tabbing out
        if (event.shiftKey && this.currentFocusedIndex === 0) {
          // Shift+Tab from first item
          event.preventDefault();
          this.onCloseMenu();
        } else if (!event.shiftKey && this.currentFocusedIndex === this.getMenuItemsCount() - 1) {
          // Tab from last item
          event.preventDefault();
          this.onCloseMenu();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateToNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateToPreviousItem();
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToFirstItem();
        break;
      case 'End':
        event.preventDefault();
        this.navigateToLastItem();
        break;
    }
  }

  onMenuItemKeydown(event: KeyboardEvent, _index: number) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateToNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateToPreviousItem();
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToFirstItem();
        break;
      case 'End':
        event.preventDefault();
        this.navigateToLastItem();
        break;
      case 'Escape':
        event.preventDefault();
        this.onCloseMenu();
        break;
    }
  }

  onMenuItemFocus(index: number) {
    this.currentFocusedIndex = index;
  }

  onMenuItemActivate() {
    // Menu item was activated, close the menu
    this.onCloseMenu();
  }

  onOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCloseMenu();
    }
  }

  onGlobalKeydown(event: KeyboardEvent) {
    // Close menu on escape key from anywhere
    if (event.key === 'Escape' && this.isOpened) {
      this.onCloseMenu();
    }
  }

  // Profile popup functions
  onAvatarClick() {
    this.isProfilePopupOpen = true;
  }

  onProfilePopupClose() {
    this.isProfilePopupOpen = false;
  }

  private navigateToNextItem() {
    const nextIndex = (this.currentFocusedIndex + 1) % this.getMenuItemsCount();
    this.focusMenuItemAtIndex(nextIndex);
  }

  private navigateToPreviousItem() {
    const prevIndex = this.currentFocusedIndex === 0
      ? this.getMenuItemsCount() - 1
      : this.currentFocusedIndex - 1;
    this.focusMenuItemAtIndex(prevIndex);
  }

  private navigateToFirstItem() {
    this.focusMenuItemAtIndex(0);
  }

  private navigateToLastItem() {
    this.focusMenuItemAtIndex(this.getMenuItemsCount() - 1);
  }

  private focusMenuItemAtIndex(index: number) {
    const menuItemsArray = this.menuItems.toArray();
    if (index >= 0 && index < menuItemsArray.length) {
      this.currentFocusedIndex = index;

      // Update focus state for all menu items
      menuItemsArray.forEach((item, i) => {
        if (item && item.setFocusState) {
          item.setFocusState(i === index);
        }
      });

      // Focus the target menu item
      const targetItem = menuItemsArray[index];
      if (targetItem && targetItem.focus) {
        targetItem.focus();
      }
    }
  }

  private getMenuItemsCount(): number {
    return this.menuItems ? this.menuItems.length : 0;
  }
}
