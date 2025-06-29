import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-file-input',
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-2">
      @if (label) {
        <label class="block text-sm font-medium text-gray-700">{{ label }}</label>
      }

      <div class="flex items-center justify-center w-full">
        <label
          class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          [class.border-red-300]="hasError"
          [class.bg-red-50]="hasError">

          <div class="flex flex-col items-center justify-center pt-5 pb-6">
            <lucide-icon name="upload" class="w-8 h-8 mb-4 text-gray-500"></lucide-icon>
            <p class="mb-2 text-sm text-gray-500">
              <span class="font-semibold">{{ placeholder || 'Cliquez pour télécharger' }}</span>
            </p>
            @if (acceptDescription) {
              <p class="text-xs text-gray-500">{{ acceptDescription }}</p>
            }
            @if (maxFiles && maxFiles > 1) {
              <p class="text-xs text-gray-500">Maximum {{ maxFiles }} fichiers</p>
            }
          </div>

          <input
            #fileInput
            type="file"
            class="hidden"
            [multiple]="multiple"
            [accept]="accept"
            (change)="onFileChange($event)"
          />
        </label>
      </div>

      @if (selectedFiles.length > 0) {
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Fichiers sélectionnés:</h4>
          <div class="space-y-1">
            @for (file of selectedFiles; track file.name) {
              <div class="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                <div class="flex items-center space-x-2">
                  <lucide-icon name="file" class="w-4 h-4 text-blue-600"></lucide-icon>
                  <span class="text-sm text-blue-800">{{ file.name }}</span>
                  <span class="text-xs text-blue-600">({{ formatFileSize(file.size) }})</span>
                </div>
                <button
                  type="button"
                  (click)="removeFile(file)"
                  class="p-1 text-blue-400 hover:text-blue-600 transition-colors">
                  <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
              </div>
            }
          </div>
        </div>
      }

      @if (error) {
        <p class="text-sm text-red-600">{{ error }}</p>
      }
    </div>
  `
})
export class FileInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() multiple = false;
  @Input() accept?: string;
  @Input() acceptDescription?: string;
  @Input() maxFiles?: number;
  @Input() maxSize?: number; // in bytes
  @Input() error?: string;
  @Input() hasError = false;

  @Output() fileSelected = new EventEmitter<File[]>();
  @Output() validationError = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFiles: File[] = [];

  private onChange = (_files: File[]) => {};
  private onTouched = () => {};

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    // Validate files
    const validationError = this.validateFiles(files);
    if (validationError) {
      this.validationError.emit(validationError);
      return;
    }

    if (this.multiple) {
      // Add to existing files if multiple is allowed
      const newFiles = [...this.selectedFiles];
      for (const file of files) {
        if (!newFiles.some(f => f.name === file.name)) {
          newFiles.push(file);
        }
      }

      // Check total file count
      if (this.maxFiles && newFiles.length > this.maxFiles) {
        this.validationError.emit(`Maximum ${this.maxFiles} fichiers autorisés`);
        return;
      }

      this.selectedFiles = newFiles;
    } else {
      this.selectedFiles = files.slice(0, 1);
    }

    this.onChange(this.selectedFiles);
    this.onTouched();
    this.fileSelected.emit(this.selectedFiles);

    // Clear the input
    input.value = '';
  }

  removeFile(fileToRemove: File) {
    this.selectedFiles = this.selectedFiles.filter(file => file !== fileToRemove);
    this.onChange(this.selectedFiles);
    this.fileSelected.emit(this.selectedFiles);
  }

  private validateFiles(files: File[]): string | null {
    for (const file of files) {
      // Check file size
      if (this.maxSize && file.size > this.maxSize) {
        return `Le fichier ${file.name} est trop volumineux (max ${this.formatFileSize(this.maxSize)})`;
      }

      // Check file type if accept is specified
      if (this.accept) {
        const acceptedTypes = this.accept.split(',').map(type => type.trim());
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return type === fileExtension;
          } else if (type.includes('/*')) {
            return mimeType.startsWith(type.replace('/*', ''));
          } else {
            return type === mimeType;
          }
        });

        if (!isAccepted) {
          return `Le type de fichier ${fileExtension} n'est pas autorisé`;
        }
      }
    }

    return null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ControlValueAccessor implementation
  writeValue(files: File[]): void {
    this.selectedFiles = files || [];
  }

  registerOnChange(fn: (files: File[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(_isDisabled: boolean): void {
    // Could implement disabled state if needed
  }
}
