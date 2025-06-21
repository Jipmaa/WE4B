import {Component, EventEmitter, HostBinding, Input, OnInit, Output, inject} from '@angular/core';
import {LucideAngularModule} from 'lucide-angular';
import {IdGeneratorService} from '@/core/services/id-generator.service';

type IconButtonVariant =
  | 'default' // filled primary
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'ghost-destructive'
  | 'outline';

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type IconButtonShape = 'square' | 'rounded' | 'circle';

@Component({
  selector: 'app-icon-button',
  imports: [
    LucideAngularModule
  ],
  templateUrl: './icon-button.html',
})
export class IconButtonComponent implements OnInit {
  @HostBinding('style.display') display = 'contents';
  private readonly idGenerator = inject(IdGeneratorService);

  ngOnInit(): void {
    // Generate unique ID using the ID generator service
    this.id = this.idGenerator.generateId('icon-button', this.id);
  }

  // Core button properties
  @Input() variant: IconButtonVariant = 'default';
  @Input() size: IconButtonSize = 'md';
  @Input() shape: IconButtonShape = 'rounded';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
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

  // Icon properties
  @Input() icon: string = '';
  @Input() iconSize: number = 16;

  // Events
  @Output() buttonClick = new EventEmitter<MouseEvent>();
  @Output() buttonFocus = new EventEmitter<FocusEvent>();
  @Output() buttonBlur = new EventEmitter<FocusEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex justify-center items-center overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium';

    // Size classes (square dimensions for icon buttons)
    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-14 h-14 text-xl'
    };

    // Shape classes
    const shapeClasses = {
      square: 'rounded-none',
      rounded: this.size === 'xs' ? 'rounded-sm' : this.size === 'sm' ? 'rounded' : 'rounded-md',
      circle: 'rounded-full'
    };

    // Variant classes
    const variantClasses = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50 active:bg-primary/80',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/50 active:bg-secondary/70',
      ghost: 'bg-transparent text-foreground hover:bg-secondary/50 focus:ring-secondary/50 active:bg-secondary/60',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/50 active:bg-destructive/80',
      'ghost-destructive': 'bg-transparent text-destructive hover:bg-destructive/10 focus:ring-destructive/50 active:bg-destructive/20',
      outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring/50 active:bg-accent/80'
    };

    // State classes
    const stateClasses = this.disabled || this.loading
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : 'cursor-pointer';

    // Loading classes
    const loadingClasses = this.loading ? 'relative' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${shapeClasses[this.shape]} ${variantClasses[this.variant]} ${stateClasses} ${loadingClasses}`.trim();
  }

  get computedIconSize(): number {
    if (this.iconSize !== 16) {
      return this.iconSize; // Use custom size if provided
    }

    // Default icon sizes based on button size
    const iconSizes = {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24
    };

    return iconSizes[this.size];
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
