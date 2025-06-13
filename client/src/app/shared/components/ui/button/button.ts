import {Component, EventEmitter, HostBinding, Input, OnInit, Output} from '@angular/core';
import {LucideAngularModule} from 'lucide-angular';

type ButtonVariant =  // all text black by default
  | 'default' // filled primary
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'ghost-destructive'

type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [
    LucideAngularModule
  ],
  templateUrl: './button.html',
})
export class ButtonComponent implements OnInit {
  @HostBinding('style.display') display = 'contents';

  ngOnInit(): void {
    // Generate unique ID if not provided
    if (!this.id) {
      this.id = `button-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Core button properties
  @Input() variant: ButtonVariant = 'default';
  @Input() size: ButtonSize = 'md';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  // HTML attributes
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() value: string = '';

  // Accessibility properties
  @Input() ariaLabel: string = '';
  @Input() ariaLabelledBy: string = '';
  @Input() ariaDescribedBy: string = '';
  @Input() ariaExpanded: boolean | null = null;
  @Input() ariaPressed: boolean | null = null;
  @Input() ariaControls: string = '';
  @Input() ariaHaspopup: boolean | string | null = null;

  // Icon properties (for leading/trailing icons via lucide)
  @Input() leadingIcon: string = '';
  @Input() trailingIcon: string = '';
  @Input() iconSize: number = 16;

  // Events
  @Output() buttonClick = new EventEmitter<MouseEvent>();
  @Output() buttonFocus = new EventEmitter<FocusEvent>();
  @Output() buttonBlur = new EventEmitter<FocusEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex justify-center items-center gap-2 overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium';

    // Size classes
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs rounded-sm min-h-[24px]',
      md: 'px-3 py-2 text-sm rounded-sm min-h-[32px]',
      lg: 'px-4 py-3 text-base rounded-md min-h-[40px]'
    };

    // Variant classes
    const variantClasses = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50 active:bg-primary/80',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/50 active:bg-secondary/70',
      ghost: 'bg-transparent text-foreground hover:bg-secondary/50 focus:ring-secondary/50 active:bg-secondary/60',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/50 active:bg-destructive/80',
      'ghost-destructive': 'bg-transparent text-destructive hover:bg-destructive/10 focus:ring-destructive/50 active:bg-destructive/20'
    };

    // State classes
    const stateClasses = this.disabled || this.loading
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : 'cursor-pointer';

    // Width classes
    const widthClasses = this.fullWidth ? 'w-full' : '';

    // Loading classes
    const loadingClasses = this.loading ? 'relative' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${stateClasses} ${widthClasses} ${loadingClasses}`.trim();
  }

  get isDisabled(): boolean {
    return this.disabled || this.loading;
  }

  get ariaLabelValue(): string {
    if (this.loading) {
      return this.ariaLabel ? `${this.ariaLabel} (loading)` : 'Loading';
    }
    return this.ariaLabel;
  }

  // Event handlers
  onClick(event: MouseEvent): void {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.buttonClick.emit(event);
  }

  onFocus(event: FocusEvent): void {
    this.buttonFocus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.buttonBlur.emit(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle Enter and Space for accessibility
    if ((event.key === 'Enter' || event.key === ' ') && !this.isDisabled) {
      event.preventDefault();
      this.onClick(event as any);
    }
    this.keydown.emit(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keyup.emit(event);
  }

}
