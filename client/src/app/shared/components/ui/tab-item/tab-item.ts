import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-item.html',
  styles: [`
    :host {
      @apply contents;
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

  getClasses() {
    if (this.isActive) {
      return 'w-full min-w-0 px-3 py-1.5 bg-white rounded-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex justify-center items-center gap-2.5 text-black font-medium text-sm';
    }
    if (this.disabled) {
      return 'w-full min-w-0 px-3 py-1.5 rounded-sm flex justify-center items-center gap-2.5 text-muted-foreground/60 font-medium cursor-not-allowed text-sm';
    }
    return 'w-full min-w-0 px-3 py-1.5 rounded-sm flex justify-center items-center gap-2.5 text-muted-foreground font-medium hover:bg-primary/10 focus:bg-primary/10 cursor-pointer transition-colors text-sm';
  }
}
