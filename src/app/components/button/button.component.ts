import { Component, Input, Output, EventEmitter, OnInit, HostBinding } from '@angular/core';

type ButtonVariant =  // all text black by default
  | 'default' // filled primary
  | 'subtle'
  | 'ghost'
  | 'ghost-destructive'

type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: []
})
export class ButtonComponent implements OnInit {

  @HostBinding('style.display') display = 'contents';

  constructor() { }

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
  @Input() loadingIcon: string = 'loader-2';

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
      default: 'bg-primary text-primary-foreground hover:bg-[#2C80A1] focus:ring-primary/50 active:bg-[#1a5a73]',
      subtle: 'bg-[#D7ECF4] text-black hover:bg-[#B8D7E2] focus:ring-[#D7ECF4] active:bg-[#9bc4d4]',
      ghost: 'bg-transparent text-black hover:bg-[#D7ECF4] focus:ring-[#D7ECF4] active:bg-[#B8D7E2]',
      'ghost-destructive': 'bg-transparent text-red-700 hover:bg-[#FEF2F2] focus:ring-red-500/50 active:bg-red-100'
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
