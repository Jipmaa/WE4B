import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  HostBinding
} from '@angular/core';
import { filter, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-header-item',
  imports: [],
  templateUrl: './header-item.html',
})
export class HeaderItem implements OnInit, OnDestroy {
  @HostBinding('style.width') width = '100%';

  @Input({ required: true }) label!: string;
  @Input({ required: false }) link?: string;
  @Input({ required: false }) disabled?: boolean;
  @Input({ required: false }) variant: 'desktop' | 'mobile' = 'desktop';

  // Accessibility-related inputs
  @Input({ required: false }) menuRole?: string;
  @Input({ required: false }) menuIndex?: number;
  @Input({ required: false }) isFirst?: boolean;

  // Accessibility-related outputs
  @Output() menuFocus = new EventEmitter<number>();
  @Output() menuKeydown = new EventEmitter<{event: KeyboardEvent, index: number}>();
  @Output() menuActivate = new EventEmitter<void>();

  @ViewChild('focusableElement') focusableElement!: ElementRef<HTMLElement>;

  public isDisabled: boolean = this.disabled || false;
  public tabIndex: number = -1;
  private routerSubscription?: Subscription;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.computeDisabledState();

    // Set initial tabindex for menu context
    if (this.menuRole && this.menuIndex !== undefined) {
      this.tabIndex = this.isFirst ? 0 : -1;
    }

    // Subscribe to router events to update disabled state when route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.computeDisabledState();
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  onFocus(): void {
    if (this.menuIndex !== undefined) {
      this.menuFocus.emit(this.menuIndex);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.menuRole && this.menuIndex !== undefined) {
      // Handle Enter and Space for activation
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.onActivate();
        return;
      }

      // Emit keydown event for parent to handle navigation
      this.menuKeydown.emit({ event, index: this.menuIndex });
    }
  }

  onActivate(): void {
    if (!this.isDisabled) {
      // Handle link navigation or button click
      if (this.link) {
        this.router.navigate([this.link]);
      }

      if (this.menuRole) {
        this.menuActivate.emit();
      }
    }
  }

  // Method to be called by parent for focus management
  focus(): void {
    if (this.focusableElement) {
      this.focusableElement.nativeElement.focus();
    }
  }

  // Method to be called by parent for tabindex management
  setFocusState(isFocused: boolean): void {
    this.tabIndex = isFocused ? 0 : -1;
  }

  get componentClasses(): string {
    const baseClasses = 'px-1.5 py-1 rounded-xs flex justify-start items-start gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';

    if (this.variant === 'mobile') {
      if (this.isDisabled) {
        return `${baseClasses} text-gray-400 cursor-not-allowed hover:bg-transparent opacity-40 w-full`;
      } else {
        return `${baseClasses} text-gray-700 hover:bg-blue-50 hover:text-blue-900 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:opacity-40 w-full`;
      }
    } else {
      return `${baseClasses} text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:opacity-40`;
    }
  }

  private computeDisabledState(): void {
    if (!this.link) {
      this.isDisabled = this.disabled ?? true;
      return;
    }

    // Check if current route matches the link
    const currentUrl = this.router.url;
    const linkPath = this.link.startsWith('/') ? this.link : '/' + this.link;

    // Disable if current route matches the link (user is already on this page)
    this.isDisabled = currentUrl === linkPath;
  }
}
