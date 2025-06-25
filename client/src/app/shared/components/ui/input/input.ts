import { Component, Input, Output, EventEmitter, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IdGeneratorService } from '@/core/services/id-generator.service';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'flushed';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  private readonly idGenerator = inject(IdGeneratorService);

  @Input() placeholder: string = '';
  @Input() type: InputType = 'text';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() required: boolean = false;
  @Input() name: string = '';
  @Input() id: string = '';
  @Input() label: string = '';
  @Input() ariaLabel: string = '';
  @Input() helpText: string = '';
  @Input() errorText: string = '';
  @Input() warningText: string = '';
  @Input() successText: string = '';
  @Input() hasError: boolean = false;
  @Input() hasWarning: boolean = false;
  @Input() isValid: boolean = false;
  @Input() size: InputSize = 'md';
  @Input() variant: InputVariant = 'default';
  @Input() autocomplete: string = "off";

  @Output() valueChange = new EventEmitter<string>();
  @Output() inputFocus = new EventEmitter<FocusEvent>();
  @Output() inputBlur = new EventEmitter<FocusEvent>();
  @Output() inputChange = new EventEmitter<Event>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();

  value: string = '';
  isFocused: boolean = false;
  inputId: string = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor() {
    // Generate unique ID using the ID generator service
    this.inputId = this.idGenerator.generateId('input', this.id);
  }

  get inputClasses(): string {
    const baseClasses = 'flex-1 bg-transparent border-0 outline-none font-normal leading-tight placeholder:opacity-60';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    const disabledClasses = this.disabled ? 'cursor-not-allowed opacity-50' : '';
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
    } else if (this.isValid) {
      stateClasses = this.variant === 'default' ? 'outline-green-500' :
        this.variant === 'filled' ? 'bg-green-50 outline outline-1 outline-green-500' :
          'border-green-500';
    } else if (this.isFocused) {
      stateClasses = this.variant === 'default' ? 'outline-blue-500 outline-2' :
        this.variant === 'filled' ? 'outline outline-2 outline-blue-500' :
          'border-blue-500 border-2';
    } else {
      stateClasses = this.variant === 'default' ? 'outline-gray-300' :
        this.variant === 'filled' ? '' :
          'border-gray-300';
    }

    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text';

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${stateClasses} ${disabledClasses}`.trim();
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.inputChange.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.isFocused = false;
    this.onTouched();
    this.inputBlur.emit(event);
  }

  onFocus(event: FocusEvent): void {
    this.isFocused = true;
    this.inputFocus.emit(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keyup.emit(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }

  onContainerClick(): void {
    if (!this.disabled && !this.readonly) {
      const inputEl = document.getElementById(this.inputId) as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
