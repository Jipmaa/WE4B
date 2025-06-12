import {Component, Input, Output, EventEmitter, forwardRef, OnInit, HostBinding} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-ui-form-input',
  templateUrl: './ui-form-input.component.html',
  styleUrls: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiFormInputComponent),
      multi: true
    }
  ]
})
export class UiFormInputComponent implements OnInit, ControlValueAccessor {

  @HostBinding('style.display') display = 'contents';

  // Keep all your existing @Input and @Output properties as they are
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() type: string = 'text';
  @Input() name: string = '';
  @Input() id: string = '';
  @Input() required: boolean = false;
  @Input() autocomplete: string = '';
  @Input() maxlength: number | null = null;
  @Input() minlength: number | null = null;
  @Input() min: string | number | null = null;
  @Input() max: string | number | null = null;
  @Input() step: string | number | null = null;
  @Input() pattern: string = '';
  @Input() beforeIcon: string | null = null;
  @Input() afterIcon: string | null = null;
  @Input() label: string = '';
  @Input() ariaLabel: string = '';
  @Input() ariaLabelledBy: string = '';
  @Input() ariaDescribedBy: string = '';
  @Input() helpText: string = '';
  @Input() errorText: string = '';
  @Input() hasError: boolean = false;
  @Input() hasWarning: boolean = false;
  @Input() hasSuccess: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'default' | 'filled' | 'flushed' = 'default';

  @Output() valueChange = new EventEmitter<string>();
  @Output() inputFocus = new EventEmitter<FocusEvent>();
  @Output() inputBlur = new EventEmitter<FocusEvent>();
  @Output() inputChange = new EventEmitter<Event>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() beforeIconClick = new EventEmitter<MouseEvent>();
  @Output() afterIconClick = new EventEmitter<MouseEvent>();

  // Internal state
  value = model<string>('');
  private _isFocused: boolean = false;
  public _isDisabled: boolean = false;

  // ControlValueAccessor callbacks
  onChange = (value: string) => {};
  onTouched = () => {};

  ngOnInit(): void {
    if (!this.id) {
      this.id = `input-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!this.name) {
      this.name = this.id;
    }
  }

  // Handle input event
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    console.log(event);
    this.onChange(input.value);
    this.valueChange.emit(this.value);
    this.inputChange.emit(event);
  }

  // ControlValueAccessor methods
  writeValue(value: string | null): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled = isDisabled;
  }

  // Keep all your existing getter methods unchanged
  get isFocused(): boolean {
    return this._isFocused;
  }

  get inputClasses(): string {
    const baseClasses = 'flex-1 bg-transparent border-0 outline-none text-sm font-normal leading-tight placeholder:opacity-60';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    const disabledClasses = this._isDisabled ? 'cursor-not-allowed opacity-50' : '';
    return `${baseClasses} ${sizeClasses[this.size]} ${disabledClasses}`.trim();
  }

  get containerClasses(): string {
    const baseClasses = 'w-full inline-flex justify-start items-center gap-2.5 overflow-hidden transition-all duration-200';
    const sizeClasses = {
      sm: 'px-2 py-1.5 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };
    const variantClasses = {
      default: 'rounded-lg outline outline-1 outline-offset-[-1px]',
      filled: 'rounded-lg bg-gray-50',
      flushed: 'border-b border-gray-300 rounded-none'
    };
    let stateClasses = '';
    if (this.hasError) {
      stateClasses = this.variant === 'default' ? 'outline-red-500' :
        this.variant === 'filled' ? 'bg-red-50 outline outline-1 outline-red-500' :
          'border-red-500';
    } else if (this.hasWarning) {
      stateClasses = this.variant === 'default' ? 'outline-yellow-500' :
        this.variant === 'filled' ? 'bg-yellow-50 outline outline-1 outline-yellow-500' :
          'border-yellow-500';
    } else if (this.hasSuccess) {
      stateClasses = this.variant === 'default' ? 'outline-green-500' :
        this.variant === 'filled' ? 'bg-green-50 outline outline-1 outline-green-500' :
          'border-green-500';
    } else if (this.isFocused) {
      stateClasses = this.variant === 'default' ? 'outline-primary outline-2' :
        this.variant === 'filled' ? 'outline outline-2 outline-primary' :
          'border-primary border-2';
    } else {
      stateClasses = this.variant === 'default' ? 'outline-sky-500/20' :
        this.variant === 'filled' ? '' :
          'border-gray-300';
    }
    const disabledClasses = this._isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text';
    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${stateClasses} ${disabledClasses}`.trim();
  }

  get ariaDescribedByValue(): string {
    const ids: string[] = [];
    if (this.ariaDescribedBy) ids.push(this.ariaDescribedBy);
    if (this.helpText) ids.push(`${this.id}-help`);
    if (this.errorText && this.hasError) ids.push(`${this.id}-error`);
    return ids.join(' ') || '';
  }

  // Event handlers
  onFocus(event: FocusEvent): void {
    this._isFocused = true;
    this.inputFocus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this._isFocused = false;
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
    if (!this._isDisabled && !this.readonly) {
      this.focusInput();
    }
  }

  focusInput(): void {
    const input = document.getElementById(this.id) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }
}
