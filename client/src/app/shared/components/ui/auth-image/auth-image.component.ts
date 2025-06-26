import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-auth-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (imageUrl()) {
      <img 
        [src]="imageUrl()" 
        [alt]="alt"
        [width]="width"
        [height]="height"
        [class]="class"
        [style.width.px]="width"
        [style.height.px]="height">
    } @else if (isLoading()) {
      <div 
        [class]="'bg-gray-200 animate-pulse flex items-center justify-center ' + class"
        [style.width.px]="width"
        [style.height.px]="height">
        <span class="text-gray-400 text-xs">Loading...</span>
      </div>
    } @else {
      <div 
        [class]="'bg-gray-300 flex items-center justify-center ' + class"
        [style.width.px]="width"
        [style.height.px]="height">
        <span class="text-gray-500 text-xs">Failed</span>
      </div>
    }
  `
})
export class AuthImageComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  
  @Input({ required: true }) src!: string;
  @Input() alt: string = '';
  @Input() width: number = 32;
  @Input() height: number = 32;
  @Input() class: string = '';
  
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