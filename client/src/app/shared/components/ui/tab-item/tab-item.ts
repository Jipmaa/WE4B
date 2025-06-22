import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-item.html',
  styles: [`
    .tab-trigger {
      @apply inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-200;
      @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
      @apply disabled:pointer-events-none disabled:opacity-50;
      @apply border-0 bg-transparent;
    }
    
    .tab-trigger:not(.active) {
      @apply text-muted-foreground hover:text-foreground;
    }
    
    .tab-trigger.active {
      @apply bg-background text-foreground shadow-sm;
    }
    
    :host {
      @apply flex;
    }
  `]
})
export class TabItemComponent {
  @Input() value!: string;
  @Input() disabled: boolean = false;
  
  @Output() tabClick = new EventEmitter<string>();
  @Output() keyboardEvent = new EventEmitter<KeyboardEvent>();

  public isActive: boolean = false;
  public tabIndex: number = -1;
  public ariaControls: string = '';
  public tabId: string = '';

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (!this.value) {
      throw new Error('TabItem component requires a "value" input');
    }
  }

  @HostListener('click')
  onClick() {
    if (!this.disabled) {
      this.tabClick.emit(this.value);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Let the parent tabs component handle navigation keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      this.keyboardEvent.emit(event);
    }
    
    // Handle Enter and Space to activate the tab
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.disabled) {
        this.tabClick.emit(this.value);
      }
    }
  }

  // Methods called by parent tabs component
  public setActive(active: boolean) {
    this.isActive = active;
    this.elementRef.nativeElement.querySelector('button')?.setAttribute('data-state', active ? 'active' : 'inactive');
  }

  public setTabIndex(index: number) {
    this.tabIndex = index;
  }

  public setAriaControls(controls: string) {
    this.ariaControls = controls;
  }

  public setId(id: string) {
    this.tabId = id;
  }

  public focus() {
    this.elementRef.nativeElement.querySelector('button')?.focus();
  }

  // Getter for checking if this tab is currently focused
  public get isFocused(): boolean {
    return document.activeElement === this.elementRef.nativeElement.querySelector('button');
  }
}