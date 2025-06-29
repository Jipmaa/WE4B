import { Component, Input, forwardRef, ViewChild, ElementRef, OnInit, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

type TextareaVariant = 'default' | 'filled' | 'flushed';
type TextareaSize = 'sm' | 'md' | 'lg';
type ValidationState = 'error' | 'warning' | 'success' | null;

@Component({
  selector: 'app-textarea',
  templateUrl: './textarea.html',
  imports: [LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ]
})
export class TextareaComponent implements ControlValueAccessor, OnInit {
  @Input() label?: string;
  @Input() name?: string;
  @Input() placeholder?: string;
  @Input() variant: TextareaVariant = 'default';
  @Input() size: TextareaSize = 'md';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() rows = 4;
  @Input() maxLength?: number;
  @Input() resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';

  // Validation props
  @Input() hasError = false;
  @Input() hasWarning = false;
  @Input() hasSuccess = false;
  @Input() errorText?: string;
  @Input() warningText?: string;
  @Input() successText?: string;
  @Input() helpText?: string;

  // Accessibility props
  @Input() ariaLabel?: string;
  @Input() ariaDescribedBy?: string;

  @ViewChild('textareaElement') textareaElement!: ElementRef;

  value = signal('');
  isFocused = signal(false);

  private onChange = (_value: string) => {};
  private onTouched = () => {};

  ngOnInit() {
    // Component initialization
  }

  get validationState(): ValidationState {
    if (this.hasError) return 'error';
    if (this.hasWarning) return 'warning';
    if (this.hasSuccess) return 'success';
    return null;
  }

  get baseClasses(): string {
    const baseClasses = 'block w-full rounded-md border transition-colors focus:outline-none focus:ring-2 placeholder:opacity-60';

    const sizeClasses = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    const variantClasses = {
      default: this.getDefaultVariantClasses(),
      filled: this.getFilledVariantClasses(),
      flushed: this.getFlushedVariantClasses()
    };

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${resizeClasses[this.resize]}`;
  }

  private getDefaultVariantClasses(): string {
    const state = this.validationState;

    if (this.disabled) {
      return 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed';
    }

    switch (state) {
      case 'error':
        return 'border-red-300 bg-white text-gray-900 focus:border-red-500 focus:ring-red-500';
      case 'warning':
        return 'border-orange-300 bg-white text-gray-900 focus:border-orange-500 focus:ring-orange-500';
      case 'success':
        return 'border-green-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500';
      default:
        return 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500';
    }
  }

  private getFilledVariantClasses(): string {
    const state = this.validationState;

    if (this.disabled) {
      return 'border-transparent bg-gray-100 text-gray-500 cursor-not-allowed';
    }

    switch (state) {
      case 'error':
        return 'border-transparent bg-red-50 text-gray-900 focus:border-red-500 focus:ring-red-500';
      case 'warning':
        return 'border-transparent bg-orange-50 text-gray-900 focus:border-orange-500 focus:ring-orange-500';
      case 'success':
        return 'border-transparent bg-green-50 text-gray-900 focus:border-green-500 focus:ring-green-500';
      default:
        return 'border-transparent bg-gray-50 text-gray-900 focus:border-blue-500 focus:ring-blue-500';
    }
  }

  private getFlushedVariantClasses(): string {
    const state = this.validationState;

    if (this.disabled) {
      return 'border-0 border-b border-gray-300 bg-transparent text-gray-500 cursor-not-allowed rounded-none px-0';
    }

    switch (state) {
      case 'error':
        return 'border-0 border-b border-red-300 bg-transparent text-gray-900 focus:border-red-500 focus:ring-0 focus:border-b-2 rounded-none px-0';
      case 'warning':
        return 'border-0 border-b border-orange-300 bg-transparent text-gray-900 focus:border-orange-500 focus:ring-0 focus:border-b-2 rounded-none px-0';
      case 'success':
        return 'border-0 border-b border-green-300 bg-transparent text-gray-900 focus:border-green-500 focus:ring-0 focus:border-b-2 rounded-none px-0';
      default:
        return 'border-0 border-b border-gray-300 bg-transparent text-gray-900 focus:border-blue-500 focus:ring-0 focus:border-b-2 rounded-none px-0';
    }
  }

  get labelClasses(): string {
    const baseClasses = 'block text-sm font-medium mb-1';
    const state = this.validationState;

    switch (state) {
      case 'error':
        return `${baseClasses} text-red-700`;
      case 'warning':
        return `${baseClasses} text-orange-700`;
      case 'success':
        return `${baseClasses} text-green-700`;
      default:
        return `${baseClasses} text-gray-700`;
    }
  }

  get helpTextClasses(): string {
    return 'mt-1 text-xs text-gray-500';
  }

  get validationTextClasses(): string {
    const baseClasses = 'mt-1 text-xs flex items-center gap-1';
    const state = this.validationState;

    switch (state) {
      case 'error':
        return `${baseClasses} text-red-600`;
      case 'warning':
        return `${baseClasses} text-orange-600`;
      case 'success':
        return `${baseClasses} text-green-600`;
      default:
        return `${baseClasses} text-gray-500`;
    }
  }

  get characterCountClasses(): string {
    if (!this.maxLength) return 'mt-1 text-xs text-gray-500';

    const currentLength = this.value().length;
    const isNearLimit = currentLength > this.maxLength * 0.8;
    const isOverLimit = currentLength > this.maxLength;

    if (isOverLimit) {
      return 'mt-1 text-xs text-red-600';
    } else if (isNearLimit) {
      return 'mt-1 text-xs text-orange-600';
    }

    return 'mt-1 text-xs text-gray-500';
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  focus(): void {
    this.textareaElement?.nativeElement?.focus();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value.set(value || '');
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
