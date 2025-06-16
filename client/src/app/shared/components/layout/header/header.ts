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
import { Router } from '@angular/router';
import { HeaderItem } from '@/shared/components/layout/header-item/header-item';
import { User } from '@/core/models/auth.models';
import { NgOptimizedImage } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [
    HeaderItem,
    NgOptimizedImage,
    LucideAngularModule
  ]
})
export class Header implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileMenu') mobileMenu!: ElementRef<HTMLElement>;
  @ViewChildren('menuItem') menuItems!: QueryList<HeaderItem>;

  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  protected readonly user: User | null = null;
  private isOpen = false;
  private currentFocusedIndex = 0;
  private keydownListener?: (event: KeyboardEvent) => void;

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

  async logout() {
    this.authService.logout().subscribe({
      next: async () => {
        await this.router.navigate(['/accounts/login']);
      }
    });
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

  onMenuItemKeydown(event: KeyboardEvent, index: number) {
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
