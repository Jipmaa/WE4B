import { Component, Input, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-content.html',
  styles: [`
    @reference "../../../../../styles.css";

    .tab-content-panel {
      @apply ring-offset-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
      @apply mt-2;
    }

    .tab-content-panel.hidden {
      @apply hidden;
    }

    .tab-content-panel.active {
      @apply block;
    }

    :host {
      @apply w-full;
    }
  `]
})
export class TabContentComponent {
  @Input() value!: string;
  @Input() forceMount: boolean = false; // If true, content is always rendered but hidden with CSS

  public isActive: boolean = false;
  public contentId: string = '';
  public ariaLabelledBy: string = '';

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (!this.value) {
      throw new Error('TabContent component requires a "value" input');
    }
  }

  // Methods called by parent tabs component
  public setActive(active: boolean) {
    this.isActive = active;

    // Update the tabindex for proper focus management
    const panel = this.elementRef.nativeElement.querySelector('.tab-content-panel');
    if (panel) {
      panel.setAttribute('tabindex', active ? '0' : '-1');
    }
  }

  public setId(id: string) {
    this.contentId = id;
  }

  public setAriaLabelledBy(labelledBy: string) {
    this.ariaLabelledBy = labelledBy;
  }

  // Method to focus the content panel
  public focus() {
    const panel = this.elementRef.nativeElement.querySelector('.tab-content-panel');
    if (panel && this.isActive) {
      panel.focus();
    }
  }

  // Getter for checking if content should be rendered
  public get shouldRender(): boolean {
    return this.isActive || this.forceMount;
  }
}
