import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.html',
  imports: [
    CommonModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileInputComponent),
      multi: true
    }
  ]
})
export class FileInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() required = false;
  @Input() maxSizeBytes = 50 * 1024 * 1024; // 50MB default
  @Input() acceptedTypes = '';
  @Input() placeholder = 'Cliquez pour sélectionner un fichier';
  @Input() helpText = '';
  @Input() hasError = false;
  @Input() errorText = '';
  @Input() disabled = false;

  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() validationError = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  isDragOver = false;

  private onChange = (_value: File | null) => {};
  private onTouched = () => {};

  // ControlValueAccessor implementation
  writeValue(value: File | null): void {
    this.selectedFile = value;
  }

  registerOnChange(fn: (value: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.handleFileSelection(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) {
      this.isDragOver = true;
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.disabled) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onRemoveFile() {
    this.selectedFile = null;
    this.onChange(null);
    this.fileSelected.emit(null);
    this.onTouched();

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  triggerFileInput() {
    if (!this.disabled) {
      this.fileInput?.nativeElement?.click();
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.triggerFileInput();
    }
  }

  private handleFileSelection(file: File | null) {
    if (!file) {
      this.onRemoveFile();
      return;
    }

    // Validate file size
    if (file.size > this.maxSizeBytes) {
      const maxSizeMB = (this.maxSizeBytes / 1024 / 1024).toFixed(0);
      const errorMessage = `Le fichier ne peut pas dépasser ${maxSizeMB}MB`;
      this.validationError.emit(errorMessage);
      return;
    }

    // Validate file type if specified
    if (this.acceptedTypes && this.acceptedTypes.trim() !== '') {
      const acceptedTypesArray = this.acceptedTypes.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;

      const isAccepted = acceptedTypesArray.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        return mimeType.startsWith(type.replace('*', ''));
      });

      if (!isAccepted) {
        this.validationError.emit('Type de fichier non autorisé');
        return;
      }
    }

    this.selectedFile = file;
    this.onChange(file);
    this.fileSelected.emit(file);
    this.onTouched();
  }

  getFileSizeDisplay(): string {
    if (!this.selectedFile) return '';
    const sizeInMB = this.selectedFile.size / 1024 / 1024;
    return sizeInMB < 1
      ? `${(sizeInMB * 1024).toFixed(0)} KB`
      : `${sizeInMB.toFixed(2)} MB`;
  }

  getMaxSizeDisplay(): string {
    const maxSizeMB = this.maxSizeBytes / 1024 / 1024;
    return maxSizeMB < 1
      ? `${(maxSizeMB * 1024).toFixed(0)} KB`
      : `${maxSizeMB.toFixed(0)} MB`;
  }
}
