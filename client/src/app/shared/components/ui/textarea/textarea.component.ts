import { Component, Input, forwardRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-1">
      @if (label) {
        <label class="block text-sm font-medium text-gray-700">{{ label }}</label>
      }

      <textarea
        #textarea
        [placeholder]="placeholder"
        [rows]="rows"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus()"
        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-vertical"
        [class.border-red-300]="hasError"
        [class.focus:ring-red-500]="hasError"
        [class.focus:border-red-500]="hasError">
      </textarea>

      @if (error || errorText) {
        <p class="text-sm text-red-600">{{ error || errorText }}</p>
      }

      @if (hint && !error) {
        <p class="text-sm text-gray-500">{{ hint }}</p>
      }
    </div>
  `
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() rows = 3;
  @Input() disabled = false;
  @Input() error?: string;
  @Input() errorText?: string;
  @Input() hint?: string;
  @Input() hasError = false;

  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;

  value = '';

  private onChange = (_value: string) => {};
  private onTouched = () => {};

  onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur() {
    this.onTouched();
  }

  onFocus() {
    // Can be used for additional focus handling if needed
  }

  focus() {
    this.textareaRef?.nativeElement.focus();
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
