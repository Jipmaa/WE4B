import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  HostListener
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
  description?: string;
}

type SelectVariant = 'default' | 'filled' | 'flushed';
type SelectSize = 'sm' | 'md' | 'lg';
type ValidationState = 'error' | 'warning' | 'success' | null;

@Component({
  selector: 'app-select',
  templateUrl: './select.html',
  imports: [LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() label?: string;
  @Input() placeholder = 'Select an option';
  @Input() variant: SelectVariant = 'default';
  @Input() size: SelectSize = 'md';
  @Input() disabled = false;
  @Input() required = false;
  @Input() options: SelectOption[] = [];
  @Input() searchable = false;
  @Input() clearable = false;
  @Input() multiple = false;
  @Input() maxHeight = '200px';

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

  // Events
  @Output() optionSelected = new EventEmitter<SelectOption>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() dropdownOpen = new EventEmitter<void>();
  @Output() dropdownClose = new EventEmitter<void>();

  @ViewChild('triggerElement') triggerElement!: ElementRef;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownElement') dropdownElement!: ElementRef<HTMLDivElement>;

  isOpen = signal(false);
  searchTerm = signal('');
  selectedValue = signal<any>(this.multiple ? [] : null);
  focusedOptionIndex = signal(-1);

  private onChange = (value: any) => {};
  private onTouched = () => {};

  ngOnInit() {
    // Component initialization
  }

  ngOnDestroy() {
    // Cleanup
  }

  get validationState(): ValidationState {
    if (this.hasError) return 'error';
    if (this.hasWarning) return 'warning';
    if (this.hasSuccess) return 'success';
    return null;
  }

  get filteredOptions(): SelectOption[] {
    if (!this.searchable || !this.searchTerm()) {
      return this.options;
    }

    const term = this.searchTerm().toLowerCase();
    return this.options.filter(option =>
      option.label.toLowerCase().includes(term) ||
      option.description?.toLowerCase().includes(term)
    );
  }

  get selectedOption(): SelectOption | null {
    if (this.multiple) return null;
    return this.options.find(option => option.value === this.selectedValue()) || null;
  }

  get selectedOptions(): SelectOption[] {
    if (!this.multiple) return [];
    const values = Array.isArray(this.selectedValue()) ? this.selectedValue() : [];
    return this.options.filter(option => values.includes(option.value));
  }

  get displayText(): string {
    if (this.multiple) {
      const selected = this.selectedOptions;
      if (selected.length === 0) return this.placeholder;
      if (selected.length === 1) return selected[0].label;
      return `${selected.length} selected`;
    }

    return this.selectedOption?.label || this.placeholder;
  }

  get triggerClasses(): string {
    const baseClasses = 'relative w-full text-left rounded-md border transition-colors focus:outline-none focus:ring-2 cursor-pointer flex items-center justify-between';

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

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]}`;
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

  toggleDropdown(): void {
    if (this.disabled) return;

    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    this.isOpen.set(true);
    this.focusedOptionIndex.set(-1);
    this.dropdownOpen.emit();

    if (this.searchable) {
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 0);
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.focusedOptionIndex.set(-1);
    this.dropdownClose.emit();
    this.onTouched();
  }

  selectOption(option: SelectOption): void {
    if (option.disabled) return;

    if (this.multiple) {
      const currentValues = Array.isArray(this.selectedValue()) ? this.selectedValue() : [];
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter((v: any) => v !== option.value)
        : [...currentValues, option.value];

      this.selectedValue.set(newValues);
      this.onChange(newValues);
    } else {
      this.selectedValue.set(option.value);
      this.onChange(option.value);
      this.closeDropdown();
    }

    this.optionSelected.emit(option);
  }

  clearSelection(): void {
    if (this.disabled) return;

    const newValue = this.multiple ? [] : null;
    this.selectedValue.set(newValue);
    this.onChange(newValue);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.searchChange.emit(target.value);
    this.focusedOptionIndex.set(-1);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else {
          this.focusNextOption();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen()) {
          this.focusPreviousOption();
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else {
          this.selectFocusedOption();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;

      case 'Tab':
        if (this.isOpen()) {
          this.closeDropdown();
        }
        break;
    }
  }

  private focusNextOption(): void {
    const options = this.filteredOptions.filter(o => !o.disabled);
    if (options.length === 0) return;

    const currentIndex = this.focusedOptionIndex();
    const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    this.focusedOptionIndex.set(nextIndex);
  }

  private focusPreviousOption(): void {
    const options = this.filteredOptions.filter(o => !o.disabled);
    if (options.length === 0) return;

    const currentIndex = this.focusedOptionIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    this.focusedOptionIndex.set(prevIndex);
  }

  private selectFocusedOption(): void {
    const options = this.filteredOptions.filter(o => !o.disabled);
    const focusedIndex = this.focusedOptionIndex();

    if (focusedIndex >= 0 && focusedIndex < options.length) {
      this.selectOption(options[focusedIndex]);
    }
  }

  isOptionSelected(option: SelectOption): boolean {
    if (this.multiple) {
      const values = Array.isArray(this.selectedValue()) ? this.selectedValue() : [];
      return values.includes(option.value);
    }

    return this.selectedValue() === option.value;
  }

  getOptionClasses(option: SelectOption, index: number): string {
    const baseClasses = 'flex items-center gap-2 cursor-pointer select-none py-2 px-3 hover:bg-primary/5 w-full';
    const isSelected = this.isOptionSelected(option);
    const isFocused = this.focusedOptionIndex() === index;

    let classes = baseClasses;

    if (option.disabled) {
      classes += ' text-gray-400 cursor-not-allowed';
    } else if (isSelected) {
      classes += ' bg-primary/10 text-primary';
    } else {
      classes += ' text-gray-900';
    }

    if (isFocused && !option.disabled) {
      classes += ' bg-primary/10';
    }

    return classes;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isOpen()) return;

    const target = event.target as Node;
    if (this.triggerElement?.nativeElement &&
        !this.triggerElement.nativeElement.contains(target) &&
        this.dropdownElement?.nativeElement &&
        !this.dropdownElement.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.selectedValue.set(value);
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
