import { Component, Input } from '@angular/core';
import {filter, Subscription} from 'rxjs';
import {NavigationEnd, Router} from '@angular/router';

@Component({
  selector: 'app-header-item',
  imports: [],
  templateUrl: './header-item.html',
})
export class HeaderItem {
  @Input({ required: true }) label!: string;
  @Input({ required: false }) link?: string;
  @Input({ required: false }) disabled?: boolean;

  public isDisabled: boolean = this.disabled || false;
  private routerSubscription?: Subscription;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.computeDisabledState();

    // Subscribe to router events to update disabled state when route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.computeDisabledState();
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private computeDisabledState(): void {
    if (!this.link) {
      this.isDisabled = this.disabled ?? true;
      return;
    }

    // Check if current route matches the link
    const currentUrl = this.router.url;
    const linkPath = this.link.startsWith('/') ? this.link : '/' + this.link;

    // Disable if current route matches the link (user is already on this page)
    this.isDisabled = currentUrl === linkPath;
  }
}
