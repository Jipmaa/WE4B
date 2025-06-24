import { Component, Input, OnInit, OnDestroy, AfterContentInit, ContentChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TabItemComponent } from '../tab-item/tab-item';
import { TabContentComponent } from '../tab-content/tab-content';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.html',
  styles: [`
    @reference "../../../../../styles.css";

    .tabs-container {
      @apply w-full min-w-0;
    }

    .tab-list {
      @apply min-w-0;
    }

    .tab-content-container {
      @apply ring-offset-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
    }

    :host {
      @apply w-full block min-w-0;
    }
  `]
})
export class TabsComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() id!: string;
  @Input() ariaLabel?: string;
  @Input() defaultTab?: string;

  public gridTemplateColumns: string = '';

  @ContentChildren(TabItemComponent) tabItems!: QueryList<TabItemComponent>;
  @ContentChildren(TabContentComponent) tabContents!: QueryList<TabContentComponent>;

  private destroy$ = new Subject<void>();
  private currentActiveTab: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    if (!this.id) {
      throw new Error('Tabs component requires an "id" input');
    }
  }

  ngAfterContentInit() {
    this.setupTabItems();
    this.setupKeyboardNavigation();

    // Listen to query parameter changes after content is initialized
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const tabFromUrl = params[this.id];
        if (tabFromUrl) {
          this.activateTab(tabFromUrl, false);
        } else if (!this.currentActiveTab) {
          // No tab in URL and no active tab, use default or first tab
          this.initializeDefaultTab();
        }
      });

    // Initialize default tab if no URL parameter (fallback)
    setTimeout(() => {
      if (!this.currentActiveTab) {
        this.initializeDefaultTab();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupTabItems() {
    if (!this.tabItems || !this.tabContents) return;

    // Set up grid columns based on number of tabs
    const tabCount = this.tabItems.length;
    this.gridTemplateColumns = `repeat(${tabCount}, minmax(0, 1fr))`;

    this.tabItems.forEach((tabItem, index) => {
      // Set up ARIA attributes
      tabItem.setTabIndex(index === 0 ? 0 : -1);
      tabItem.setAriaControls(`${this.id}-content-${tabItem.value}`);
      tabItem.setId(`${this.id}-tab-${tabItem.value}`);

      // Listen to tab item clicks
      tabItem.tabClick.pipe(takeUntil(this.destroy$)).subscribe((value: string) => {
        this.activateTab(value, true);
      });

      // Listen to keyboard events
      tabItem.keyboardEvent.pipe(takeUntil(this.destroy$)).subscribe((event: KeyboardEvent) => {
        this.handleKeyboardNavigation(event, tabItem.value);
      });
    });

    this.tabContents.forEach(tabContent => {
      tabContent.setId(`${this.id}-content-${tabContent.value}`);
      tabContent.setAriaLabelledBy(`${this.id}-tab-${tabContent.value}`);
    });
  }

  private setupKeyboardNavigation() {
    const tabList = this.elementRef.nativeElement.querySelector('[role="tablist"]');
    if (tabList) {
      tabList.addEventListener('keydown', this.handleTabListKeydown.bind(this));
    }
  }

  private handleTabListKeydown(event: KeyboardEvent) {
    if (!this.tabItems) return;

    const tabItems = this.tabItems.toArray();
    const currentIndex = tabItems.findIndex(item => item.value === this.currentActiveTab);

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % tabItems.length;
        this.focusAndActivateTab(tabItems[nextIndex].value);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? tabItems.length - 1 : currentIndex - 1;
        this.focusAndActivateTab(tabItems[prevIndex].value);
        break;

      case 'Home':
        event.preventDefault();
        this.focusAndActivateTab(tabItems[0].value);
        break;

      case 'End':
        event.preventDefault();
        this.focusAndActivateTab(tabItems[tabItems.length - 1].value);
        break;
    }
  }

  private handleKeyboardNavigation(event: KeyboardEvent, tabValue: string) {
    // This is handled by the tablist keydown handler
  }

  private focusAndActivateTab(tabValue: string) {
    this.activateTab(tabValue, true);
    if (this.tabItems) {
      const tabItem = this.tabItems.find(item => item.value === tabValue);
      if (tabItem) {
        tabItem.focus();
      }
    }
  }

  private initializeDefaultTab() {
    if (!this.tabItems) return;

    const tabItems = this.tabItems.toArray();
    if (tabItems.length === 0) return;

    let initialTab = this.defaultTab;

    // If no default specified or default not found, use first tab
    if (!initialTab || !tabItems.find(item => item.value === initialTab)) {
      initialTab = tabItems[0].value;
    }

    this.activateTab(initialTab, true);
  }

  private activateTab(tabValue: string, updateUrl: boolean = false) {
    if (this.currentActiveTab === tabValue) return;

    // Check if content children are available
    if (this.tabItems && this.tabContents) {
      // Deactivate current tab
      this.tabItems.forEach(item => {
        const isActive = item.value === tabValue;
        item.setActive(isActive);
        item.setTabIndex(isActive ? 0 : -1);
      });

      this.tabContents.forEach(content => {
        content.setActive(content.value === tabValue);
      });
    }

    this.currentActiveTab = tabValue;

    // Update URL if requested
    if (updateUrl) {
      const queryParams = { ...this.route.snapshot.queryParams };
      queryParams[this.id] = tabValue;

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  // Public method to programmatically activate a tab
  public setActiveTab(tabValue: string) {
    this.activateTab(tabValue, true);
  }

  // Public method to get current active tab
  public getActiveTab(): string {
    return this.currentActiveTab;
  }
}
