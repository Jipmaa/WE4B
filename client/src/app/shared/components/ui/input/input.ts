import {
  Component,
  forwardRef,
  OnInit,
  input,
  output,
  model,
  computed,
  effect,
  signal,
  HostBinding,
  ElementRef,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'flushed';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

@Component({
  selector: 'app-input',
  imports: [LucideAngularModule],
  templateUrl: './input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements OnInit, ControlValueAccessor {
  @HostBinding('style.display') display = 'contents';

  // Input signals
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly type = input<InputType>('text');
  readonly name = input<string>('');
  readonly id = input<string>('');
  readonly required = input<boolean>(false);
  readonly autocomplete = input<string>('');
  readonly maxlength = input<number | null>(null);
  readonly minlength = input<number | null>(null);
  readonly min = input<string | number | null>(null);
  readonly max = input<string | number | null>(null);
  readonly step = input<string | number | null>(null);
  readonly pattern = input<string>('');
  readonly beforeIcon = input<string | null>(null);
  readonly afterIcon = input<string | null>(null);
  readonly label = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly ariaLabelledBy = input<string>('');
  readonly ariaDescribedBy = input<string>('');
  readonly helpText = input<string>('');
  readonly errorText = input<string>('');
  readonly hasError = input<boolean>(false);
  readonly hasWarning = input<boolean>(false);
  readonly hasSuccess = input<boolean>(false);
  readonly size = input<InputSize>('md');
  readonly variant = input<InputVariant>('default');

  // Output signals
  readonly valueChange = output<string>();
  readonly inputFocus = output<FocusEvent>();
  readonly inputBlur = output<FocusEvent>();
  readonly inputChange = output<Event>();
  readonly keyup = output<KeyboardEvent>();
  readonly keydown = output<KeyboardEvent>();
  readonly beforeIconClick = output<MouseEvent>();
  readonly afterIconClick = output<MouseEvent>();

  // Model for two-way binding
  readonly value = model<string>('');

  // Internal state signals
  private readonly _isFocused = signal<boolean>(false);
  private readonly _isDisabled = signal<boolean>(false);
  private readonly _generatedId = signal<string>('');
  private readonly _generatedName = signal<string>('');

  // ViewChild for input element
  private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  // ControlValueAccessor callbacks
  private onChange = (value: string) => {};
  private onTouched = () => {};


  // Computed properties
  readonly computedId = computed(() => {
    return this.id() || this._generatedId();
  });

  readonly computedName = computed(() => {
    return this.name() || this._generatedName();
  });

  readonly isFocused = computed(() => this._isFocused());
  readonly isDisabled = computed(() => this.disabled() || this._isDisabled());

  readonly inputClasses = computed(() => {
    const baseClasses = 'flex-1 bg-transparent border-0 outline-none text-sm font-normal leading-tight placeholder:opacity-60';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    const disabledClasses = this.isDisabled() ? 'cursor-not-allowed opacity-50' : '';
    return `${baseClasses} ${sizeClasses[this.size()]} ${disabledClasses}`.trim();
  });

  readonly containerClasses = computed(() => {
    const baseClasses = 'w-full inline-flex justify-start items-center gap-2.5 overflow-hidden transition-all duration-200';
    const sizeClasses = {
      sm: 'px-2 py-1.5 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };
    const variantClasses = {
      default: 'rounded-lg outline outline-1 outline-offset-[-1px]',
      filled: 'rounded-lg bg-muted',
      flushed: 'border-b border-border rounded-none'
    };

    let stateClasses = '';
    const variant = this.variant();

    if (this.hasError()) {
      stateClasses = variant === 'default' ? 'outline-destructive' :
        variant === 'filled' ? 'bg-destructive/10 outline outline-1 outline-destructive' :
          'border-destructive';
    } else if (this.hasWarning()) {
      stateClasses = variant === 'default' ? 'outline-yellow-500' :
        variant === 'filled' ? 'bg-yellow-50 outline outline-1 outline-yellow-500' :
          'border-yellow-500';
    } else if (this.hasSuccess()) {
      stateClasses = variant === 'default' ? 'outline-green-500' :
        variant === 'filled' ? 'bg-green-50 outline outline-1 outline-green-500' :
          'border-green-500';
    } else if (this.isFocused()) {
      stateClasses = variant === 'default' ? 'outline-primary outline-2' :
        variant === 'filled' ? 'outline outline-2 outline-primary' :
          'border-primary border-2';
    } else {
      stateClasses = variant === 'default' ? 'outline-border' :
        variant === 'filled' ? '' :
          'border-border';
    }

    const disabledClasses = this.isDisabled() ? 'opacity-50 cursor-not-allowed' : 'cursor-text';
    return `${baseClasses} ${sizeClasses[this.size()]} ${variantClasses[variant]} ${stateClasses} ${disabledClasses}`.trim();
  });

  readonly ariaDescribedByValue = computed(() => {
    const ids: string[] = [];
    const ariaDescribedBy = this.ariaDescribedBy();
    const helpText = this.helpText();
    const errorText = this.errorText();
    const hasError = this.hasError();
    const computedId = this.computedId();

    if (ariaDescribedBy) ids.push(ariaDescribedBy);
    if (helpText) ids.push(`${computedId}-help`);
    if (errorText && hasError) ids.push(`${computedId}-error`);

    return ids.join(' ') || '';
  });

  constructor() {
    if (!this.id()) {
      this._generatedId.set(`input-${Math.random().toString(36).substr(2, 9)}`);
    }
    if (!this.name()) {
      this._generatedName.set(this._generatedId() || `input-${Math.random().toString(36).substr(2, 9)}`);
    }

    // Effect to sync disabled state
    effect(() => {
      this._isDisabled.set(this.disabled());
    });

    // Effect to emit value changes
    effect(() => {
      const currentValue = this.value();
      this.valueChange.emit(currentValue);
    });
  }

  ngOnInit(): void {
    // Initialize computed values
    this.computedId();
    this.computedName();
  }

  // Handle input event
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = input.value;

    this.value.set(newValue);
    this.onChange(newValue);
    this.inputChange.emit(event);
  }

  // ControlValueAccessor implementation
  writeValue(value: string | null): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled.set(isDisabled);
  }

  // Event handlers
  onFocus(event: FocusEvent): void {
    this._isFocused.set(true);
    this.inputFocus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this._isFocused.set(false);
    this.onTouched();
    this.inputBlur.emit(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keyup.emit(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }

  onBeforeIconClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.beforeIconClick.emit(event);
  }

  onAfterIconClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.afterIconClick.emit(event);
  }

  onContainerClick(): void {
    if (!this.isDisabled() && !this.readonly()) {
      this.focusInput();
    }
  }

  focusInput(): void {
    const inputEl = this.inputElement();
    if (inputEl) {
      inputEl.nativeElement.focus();
    }
  }
}
