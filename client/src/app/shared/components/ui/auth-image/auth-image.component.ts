import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {LucideAngularModule} from 'lucide-angular';

@Component({
  selector: 'app-auth-image',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (src && imageUrl()) {
      <img
        [src]="imageUrl()"
        [alt]="alt"
        [width]="width"
        [height]="height"
        [class]="className"
        [style.width.px]="width"
        [style.height.px]="height">
    } @else if (isLoading()) {
      <div
        [class]="'bg-gray-200 animate-pulse flex items-center justify-center ' + className"
        [style.width.px]="width"
        [style.height.px]="height">
        <lucide-icon name="loader-circle" class="animate-spin text-gray-500" [size]="16"/>
      </div>
    } @else {
      <div
        [class]="'bg-gray-300 flex items-center justify-center ' + className"
        [style.width.px]="width"
        [style.height.px]="height">
        <lucide-icon [name]="fallbackIcon" class="text-gray-500" [size]="16"/>
      </div>
    }
  `
})
export class AuthImageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);

  @Input({required: true}) src: string | null | undefined = null;
  @Input() alt: string = '';
  @Input() width: number | null = null;
  @Input() height: number | null = null;
  @Input() className: string = '';
  @Input() fallbackIcon: string = 'image-off';

  imageUrl = signal<string | null>(null);
  isLoading = signal<boolean>(true);

  private subscription?: Subscription;

  ngOnInit() {
    this.loadImage();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    // Clean up blob URL if it exists
    const url = this.imageUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  private loadImage() {
    if (!this.src) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    // Fetch the image with authentication
    this.subscription = this.http.get(this.src, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        // Create a blob URL for the image
        const url = URL.createObjectURL(blob);
        this.imageUrl.set(url);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load authenticated image:', error);
        this.imageUrl.set(null);
        this.isLoading.set(false);
      }
    });
  }
}
